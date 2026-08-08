import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  mkdir,
  readFile,
  readdir,
  writeFile,
  cp,
  rm,
  symlink,
} from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import type { BuildJob, BuildStatus, OsConfig } from "./types";
import { updateBuildStatus } from "../db/builds";
import {
  HYPRLAND_CONF,
  WAYBAR_CONFIG,
  WAYBAR_STYLE,
  KEYBINDINGS_DOC,
  KEYBINDS_LAUNCHER_SCRIPT,
  HYPRPAPER_CONF,
  HYPRLOCK_CONF,
  HYPRIDLE_CONF,
  WOFI_CONFIG,
  WOFI_STYLE,
  FOOT_CONFIG,
  MAKO_CONFIG,
  FASTFETCH_CONFIG,
  OPERATE_LOGO_ASCII,
  SKEL_BASHRC,
} from "./hyprland";
import {
  firstbootScript,
  FIRSTBOOT_SERVICE_UNIT,
  ADOPT_SCRIPT,
} from "./firstboot";
import { buildArchinstallPreseed } from "./archinstallPreseed";

const DM_NAMES = new Set(["sddm", "gdm", "lightdm", "ly", "lxdm"]);

const DESKTOP_SESSIONS: Record<string, string> = {
  hyprland: "hyprland.desktop",
};

const PROVIDER_MAP: Record<string, string> = {
  mysql: "mariadb",
  "mysql-server": "mariadb",
  "java-runtime": "jre-openjdk",
  "java-environment": "jdk-openjdk",
  cron: "cronie",
  "mail-transfer-agent": "postfix",
};

const checkPackage = (name: string) =>
  new Promise<boolean>((resolve) => {
    const c = spawn("pacman", ["-Si", name], { stdio: "ignore" });
    c.on("close", (code) => resolve(code === 0));
    c.on("error", () => resolve(false));
  });

const BASELINE_PROFILE = "/usr/share/archiso/configs/baseline";
const BUILD_ROOT =
  process.env.OPERATE_BUILD_ROOT ??
  path.join(homedir(), ".cache", "operate-builds");

const SILENT_SDDM_VERSION = "v1.4.2";
const SILENT_SDDM_TARBALL_URL = `https://api.github.com/repos/uiriansan/SilentSDDM/tarball/${SILENT_SDDM_VERSION}`;
const ASSETS_DIR = path.join(BUILD_ROOT, "_assets");
const PKG_CACHE_DIR = path.join(BUILD_ROOT, "_pkgcache");

type JobStore = Map<string, BuildJob>;

declare global {
  // eslint-disable-next-line no-var
  var __operate_jobs: JobStore | undefined;
}

const jobs: JobStore = globalThis.__operate_jobs ?? new Map();
globalThis.__operate_jobs = jobs;

export const getJob = (id: string) => jobs.get(id);

export const listJobs = () => Array.from(jobs.values());

const newJobId = () => randomBytes(6).toString("hex");

// pacman flags a corrupted cached package on two lines — the error names the
// package, the ":: File" line names the exact cache file:
//   error: linux: signature from "..." is invalid
//   :: File /…/_pkgcache/linux-7.1.3.arch1-3-x86_64.pkg.tar.zst is corrupted
//      (invalid or corrupted package (PGP signature)).
function findCorruptCachedPackages(log: string): string[] {
  const names = new Set<string>();
  for (const m of log.matchAll(
    /^:: File (\S+\.pkg\.tar\.\w+) is corrupted/gim,
  )) {
    names.add(path.basename(m[1]));
  }
  for (const m of log.matchAll(
    /^error:\s+([^\s:]+):\s+signature from .* is invalid/gim,
  )) {
    names.add(m[1]);
  }
  return [...names];
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// A build killed mid-download leaves *.part files (and, rarely, a fully
// renamed but truncated .pkg) in the shared cache. Sweep the .part debris
// before each build; corrupted full packages are handled reactively by
// deleteCorruptCachedPackages when pacman flags them.
async function sweepStalePartFiles(job: BuildJob) {
  if (!existsSync(PKG_CACHE_DIR)) return;
  const parts = (await readdir(PKG_CACHE_DIR)).filter((f) =>
    f.endsWith(".part"),
  );
  if (!parts.length) return;
  for (const f of parts) {
    await rm(path.join(PKG_CACHE_DIR, f), { force: true });
  }
  appendLog(
    job,
    `[operate] removed ${parts.length} stale partial download(s) from package cache: ${parts.join(", ")}\n`,
  );
}

async function deleteCorruptCachedPackages(names: string[], job: BuildJob) {
  if (!names.length || !existsSync(PKG_CACHE_DIR)) return;
  const cached = await readdir(PKG_CACHE_DIR);
  const victims = new Set<string>();
  for (const name of names) {
    // basename only — never let a log-derived string traverse paths
    const base = path.basename(name);
    // `base` is either an exact cache filename (from ":: File …" lines) or a
    // bare pkgname (from "error: …" lines) — match the latter against cached
    // "<pkgname>-<version>" files, requiring a digit/epoch right after the
    // name so e.g. "linux" can't sweep up linux-firmware
    const asPkgname = new RegExp(`^${escapeRegExp(base)}-[0-9]`);
    for (const f of cached) {
      if (f === base || f === `${base}.sig` || asPkgname.test(f)) {
        victims.add(f);
      }
    }
  }
  for (const f of victims) {
    await rm(path.join(PKG_CACHE_DIR, f), { force: true });
  }
  if (victims.size) {
    appendLog(
      job,
      `[operate] deleted corrupted cached package file(s): ${[...victims].join(", ")}\n`,
    );
  }
}

function diagnoseFailure(rawError: string, log: string): string {
  // "signature from X is invalid" on a NAMED .pkg file is almost always a
  // corrupted file in our shared package cache (e.g. a build killed
  // mid-download), NOT a stale keyring — check for it first. startBuild
  // deletes the named files on failure so the next build self-heals.
  const corrupt = findCorruptCachedPackages(log);
  if (corrupt.length) {
    return (
      `Corrupted package file(s) in the build cache failed signature verification: ` +
      `${corrupt.join(", ")}. They have been deleted from ${PKG_CACHE_DIR} — ` +
      `retry the build (it will re-download them). If this repeats, clear the ` +
      `whole cache directory.`
    );
  }
  if (
    /key .* is unknown/i.test(log) ||
    /key .* could not be looked up remotely/i.test(log) ||
    /signature from .* is (unknown trust|marginal trust)/i.test(log)
  ) {
    return "Host archlinux-keyring is out of date — pacstrap can't verify package signatures. On the host running the build, run: sudo pacman -Sy archlinux-keyring (or a full sudo pacman -Syu).";
  }
  if (/sudo: a password is required/i.test(log)) {
    return "mkarchiso needs passwordless sudo. Configure /etc/sudoers.d to allow `NOPASSWD: /usr/bin/mkarchiso` for the user running the dev server.";
  }
  if (/archiso baseline profile not found/i.test(rawError)) {
    return "archiso is not installed on the host. Run: sudo pacman -S archiso.";
  }
  return rawError;
}

const sanitize = (s: string, fallback: string) =>
  /^[a-z0-9-]{1,32}$/.test(s) ? s : fallback;

const appendLog = (job: BuildJob, chunk: string) => {
  job.log += chunk;
  if (job.log.length > 200_000) {
    job.log = job.log.slice(-150_000);
  }
};

async function applyBootBranding(profileDir: string, job: BuildJob) {
  const touched: string[] = [];

  const entriesDir = path.join(profileDir, "efiboot", "loader", "entries");
  if (existsSync(entriesDir)) {
    for (const entry of await readdir(entriesDir)) {
      if (!entry.endsWith(".conf")) continue;
      const p = path.join(entriesDir, entry);
      const original = await readFile(p, "utf8");
      const updated = original.replace(/^title\s+.*$/im, "title   operate");
      if (updated !== original) {
        await writeFile(p, updated);
        touched.push(`efiboot/${entry}`);
      }
    }
  }

  const loaderConf = path.join(profileDir, "efiboot", "loader", "loader.conf");
  if (existsSync(loaderConf)) {
    let content = await readFile(loaderConf, "utf8");
    content = /^timeout\s+/m.test(content)
      ? content.replace(/^timeout\s+.*$/m, "timeout 2")
      : `timeout 2\n${content}`;
    await writeFile(loaderConf, content);
    touched.push("efiboot/loader.conf");
  }

  const syslinuxDir = path.join(profileDir, "syslinux");
  if (existsSync(syslinuxDir)) {
    for (const f of await readdir(syslinuxDir)) {
      if (!f.endsWith(".cfg")) continue;
      const p = path.join(syslinuxDir, f);
      let content = await readFile(p, "utf8");
      const before = content;
      content = content.replace(/^(\s*MENU LABEL\s+).*$/gim, "$1operate");
      content = content.replace(/^(MENU TITLE\s+).*$/gim, "$1operate");
      if (content !== before) {
        await writeFile(p, content);
        touched.push(`syslinux/${f}`);
      }
    }
  }

  const grubCfg = path.join(profileDir, "grub", "grub.cfg");
  if (existsSync(grubCfg)) {
    let content = await readFile(grubCfg, "utf8");
    const before = content;
    content = content.replace(/menuentry\s+"[^"]*"/g, 'menuentry "operate"');
    content = content.replace(/menuentry\s+'[^']*'/g, "menuentry 'operate'");
    if (content !== before) {
      await writeFile(grubCfg, content);
      touched.push("grub/grub.cfg");
    }
  }

  appendLog(
    job,
    `[operate] bootloader branding applied (${touched.length} files): ${touched.join(", ") || "(none — baseline had no menus)"}\n`,
  );
}

async function writeIssueBanner(profileDir: string) {
  const etc = path.join(profileDir, "airootfs", "etc");
  await mkdir(etc, { recursive: true });
  // \x1b[1;37m = bold white, \x1b[0m = reset. \\n / \\l are agetty placeholders
  // (hostname / tty) that getty expands at runtime.
  const issue = `\n  \x1b[1;37moperate\x1b[0m  \\n on \\l\n\n`;
  await writeFile(path.join(etc, "issue"), issue);
}

async function applyHyprlandDefaults(profileDir: string) {
  const airoot = path.join(profileDir, "airootfs");
  const skel = path.join(airoot, "etc", "skel");
  const skelConfig = path.join(skel, ".config");
  const etcOperate = path.join(airoot, "etc", "operate");
  const localBin = path.join(airoot, "usr", "local", "bin");
  const etcDir = path.join(airoot, "etc");
  const wallpaperDir = path.join(
    airoot,
    "usr",
    "share",
    "backgrounds",
    "operate",
  );

  // dotfiles baked into /etc/skel — every skel entry is a
  // [relative path, content] pair; hypr/waybar/wofi/foot/mako/fastfetch all
  // follow the same amber-on-zinc identity as the web UI
  const skelFiles: Array<[string, string]> = [
    ["hypr/hyprland.conf", HYPRLAND_CONF],
    ["hypr/hyprpaper.conf", HYPRPAPER_CONF],
    ["hypr/hyprlock.conf", HYPRLOCK_CONF],
    ["hypr/hypridle.conf", HYPRIDLE_CONF],
    ["waybar/config", WAYBAR_CONFIG],
    ["waybar/style.css", WAYBAR_STYLE],
    ["wofi/config", WOFI_CONFIG],
    ["wofi/style.css", WOFI_STYLE],
    ["foot/foot.ini", FOOT_CONFIG],
    ["mako/config", MAKO_CONFIG],
    ["fastfetch/config.jsonc", FASTFETCH_CONFIG],
  ];
  for (const [rel, content] of skelFiles) {
    const target = path.join(skelConfig, rel);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
  }
  await writeFile(path.join(skel, ".bashrc"), SKEL_BASHRC);

  await mkdir(etcOperate, { recursive: true });
  await mkdir(localBin, { recursive: true });
  await mkdir(wallpaperDir, { recursive: true });

  await writeFile(path.join(etcOperate, "keybindings.txt"), KEYBINDINGS_DOC);
  await writeFile(path.join(etcOperate, "logo.txt"), OPERATE_LOGO_ASCII);
  await writeFile(
    path.join(localBin, "operate-keybinds"),
    KEYBINDS_LAUNCHER_SCRIPT,
    { mode: 0o755 },
  );

  // wallpaper is a committed repo asset (app/lib/os/assets/wallpaper.png) so
  // build hosts don't need ImageMagick
  const wallpaperSrc = path.join(
    process.cwd(),
    "app",
    "lib",
    "os",
    "assets",
    "wallpaper.png",
  );
  if (existsSync(wallpaperSrc)) {
    await cp(wallpaperSrc, path.join(wallpaperDir, "wallpaper.png"));
  }

  // Live ISOs land in VMs by default (VirtualBox/VMware/etc.), where vmwgfx is
  // commonly broken on the hypervisor and DRM init fails. Without these env
  // vars wlroots refuses to start → Hyprland exits in <1s → SDDM relaunches →
  // login loop with no visible error. ALLOW_SOFTWARE only kicks in when no
  // hardware renderer is available, so this is a no-op on real GPUs.
  // /etc/environment is read by PAM (sddm-helper), so the vars are present
  // before Hyprland's renderer init — config's `env =` lines are too late.
  await writeFile(
    path.join(etcDir, "environment"),
    "WLR_RENDERER_ALLOW_SOFTWARE=1\nWLR_NO_HARDWARE_CURSORS=1\n",
  );
}

async function bakeFirstboot(
  profileDir: string,
  desktop: string,
  job: BuildJob,
) {
  const airoot = path.join(profileDir, "airootfs");
  const localBin = path.join(airoot, "usr", "local", "bin");
  const systemdSystem = path.join(airoot, "etc", "systemd", "system");

  await mkdir(localBin, { recursive: true });
  await mkdir(systemdSystem, { recursive: true });

  const session = DESKTOP_SESSIONS[desktop] ?? "hyprland.desktop";

  await writeFile(
    path.join(localBin, "operate-firstboot"),
    firstbootScript(session),
    { mode: 0o755 },
  );
  await writeFile(
    path.join(systemdSystem, "operate-firstboot.service"),
    FIRSTBOOT_SERVICE_UNIT,
  );

  // Service enablement happens via customize_airootfs.sh — preset files are
  // not auto-applied by mkarchiso or at first boot.

  appendLog(
    job,
    `[operate] first-boot interactive setup installed (script + service; session=${session})\n`,
  );
}

async function writeCustomizeAirootfs(
  profileDir: string,
  services: string[],
  hasFirstboot: boolean,
  job: BuildJob,
) {
  const airoot = path.join(profileDir, "airootfs");
  const rootDir = path.join(airoot, "root");
  await mkdir(rootDir, { recursive: true });

  const units = new Set<string>();
  if (hasFirstboot) units.add("operate-firstboot.service");
  for (const s of services) {
    units.add(s.endsWith(".service") ? s : `${s}.service`);
  }

  // mkarchiso auto-runs /root/customize_airootfs.sh inside arch-chroot during
  // build (see /usr/bin/mkarchiso ~L409). We use it for:
  //
  // 1. systemctl-enable services properly (creates *.target.wants/ symlinks
  //    AND aliases like display-manager.service that preset files alone don't).
  // 2. Initialize and populate the pacman keyring — stock Arch ISOs do this
  //    at first boot via pacman-init.service; doing it at build time means
  //    archinstall can pacstrap-to-disk on first boot without silently
  //    failing every package's signature verification.
  // 3. Write a real /etc/pacman.d/mirrorlist — the one shipped by the
  //    pacman-mirrorlist package has every Server line commented out, so
  //    archinstall's pacstrap step has nowhere to fetch from. The geo
  //    mirror routes to whichever official mirror is closest; the others
  //    are widely-distributed fallbacks.
  // 4. Generate the en_US.UTF-8 locale so archinstall (Python) doesn't crash
  //    on setlocale() before it even draws the TUI.
  // 5. Disable the baseline's competing network/DNS managers (systemd-networkd,
  //    systemd-resolved, cloud-init) so NetworkManager owns the link and DNS.
  //    Without this, /etc/resolv.conf stays a stub and pacman can't resolve
  //    mirror hostnames — archinstall dies fetching core.db / extra.db.
  const script =
    "#!/bin/bash\n" +
    "set -e\n" +
    "\n" +
    "pacman-key --init\n" +
    "pacman-key --populate archlinux\n" +
    "\n" +
    "cat > /etc/pacman.d/mirrorlist <<'MIRRORS'\n" +
    "Server = https://geo.mirror.pkgbuild.com/$repo/os/$arch\n" +
    "Server = https://mirrors.kernel.org/archlinux/$repo/os/$arch\n" +
    "Server = https://mirror.rackspace.com/archlinux/$repo/os/$arch\n" +
    "Server = https://mirror.leaseweb.net/archlinux/$repo/os/$arch\n" +
    "Server = https://mirror.osbeck.com/archlinux/$repo/os/$arch\n" +
    "Server = https://mirrors.mit.edu/archlinux/$repo/os/$arch\n" +
    "MIRRORS\n" +
    "\n" +
    "# archinstall's pacstrap-to-disk runs with the live env's /etc/pacman.conf.\n" +
    "# On VM NAT links (a few MiB/s total) the stock ParallelDownloads=5 starves\n" +
    "# individual streams below pacman's hard low-speed cutoff (1 byte/s over\n" +
    "# 10s) and downloads die with 'Operation too slow', taking the whole\n" +
    "# install transaction with them. Two streams keep both fed;\n" +
    "# DisableDownloadTimeout removes the cutoff entirely for slow-but-alive\n" +
    "# mirrors.\n" +
    "sed -i 's/^ParallelDownloads.*/ParallelDownloads = 2/' /etc/pacman.conf\n" +
    "grep -q '^DisableDownloadTimeout' /etc/pacman.conf || sed -i '/^\\[options\\]/a DisableDownloadTimeout' /etc/pacman.conf\n" +
    "\n" +
    "# /etc/locale.conf says LANG=en_US.UTF-8 but the locale isn't actually\n" +
    "# generated yet (locale.gen ships all-commented). archinstall is Python\n" +
    "# and calls locale.setlocale() at startup — without this it dies before\n" +
    "# even drawing its TUI. Uncomment en_US.UTF-8 and run locale-gen.\n" +
    "sed -i 's/^#en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen\n" +
    "locale-gen\n" +
    "\n" +
    "# Live ISO networking: NetworkManager is the only stack we want — firstboot\n" +
    "# uses nmtui, and we already pull in 'networkmanager' via the package list.\n" +
    "# The archiso baseline ALSO enables systemd-networkd + systemd-resolved AND\n" +
    "# wires cloud-init's target, so three managers race for the link and\n" +
    "# /etc/resolv.conf stays a 65-byte stub. DNS silently fails in the live env,\n" +
    "# so archinstall's `pacman -Sy` can't resolve mirrors and dies with\n" +
    "# 'failed to retrieve core.db / extra.db'. Disable the extras, then tell NM\n" +
    "# to own /etc/resolv.conf as a regular file. (rc-manager=file means NM\n" +
    "# overwrites whatever's there on connection, so we leave the stub in place\n" +
    "# — we can't `rm` it here anyway, mkarchiso bind-mounts the host's\n" +
    "# resolv.conf into the chroot for pacstrap and the bind returns EBUSY.)\n" +
    "systemctl disable systemd-networkd.service systemd-networkd.socket systemd-resolved.service\n" +
    "systemctl mask systemd-networkd-wait-online.service\n" +
    "systemctl disable cloud-init.target cloud-config.service cloud-final.service cloud-init-local.service cloud-init-main.service cloud-init-network.service 2>/dev/null || true\n" +
    "rm -f /etc/systemd/network/20-ethernet.network\n" +
    "mkdir -p /etc/NetworkManager/conf.d\n" +
    "cat > /etc/NetworkManager/conf.d/10-operate.conf <<'NMCONF'\n" +
    "[main]\n" +
    "dns=default\n" +
    "rc-manager=file\n" +
    "NMCONF\n" +
    "\n" +
    [...units].map((u) => `systemctl enable ${u}`).join("\n") +
    "\n";

  await writeFile(path.join(rootDir, "customize_airootfs.sh"), script, {
    mode: 0o755,
  });

  appendLog(
    job,
    `[operate] customize_airootfs.sh will enable: ${[...units].join(", ")}\n`,
  );
}

async function downloadSilentSddmTarball(job: BuildJob): Promise<string> {
  const tarballPath = path.join(
    ASSETS_DIR,
    `silent-sddm-${SILENT_SDDM_VERSION}.tar.gz`,
  );
  if (existsSync(tarballPath)) {
    appendLog(job, `[operate] using cached SilentSDDM tarball: ${tarballPath}\n`);
    return tarballPath;
  }
  await mkdir(ASSETS_DIR, { recursive: true });
  appendLog(
    job,
    `[operate] downloading SilentSDDM ${SILENT_SDDM_VERSION} → ${tarballPath}\n`,
  );
  await new Promise<void>((resolve, reject) => {
    const child = spawn("curl", [
      "-fsSL",
      "-o",
      tarballPath,
      SILENT_SDDM_TARBALL_URL,
    ]);
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`curl exited with ${code} downloading SilentSDDM`));
    });
  });
  return tarballPath;
}

async function bakeSilentSddmTheme(profileDir: string, job: BuildJob) {
  const tarballPath = await downloadSilentSddmTarball(job);

  const airoot = path.join(profileDir, "airootfs");
  const themeDir = path.join(airoot, "usr", "share", "sddm", "themes", "silent");
  const fontsDir = path.join(airoot, "usr", "share", "fonts", "silent-theme");
  const sddmConfD = path.join(airoot, "etc", "sddm.conf.d");

  await mkdir(themeDir, { recursive: true });
  await mkdir(fontsDir, { recursive: true });
  await mkdir(sddmConfD, { recursive: true });

  // GitHub tarballs wrap contents in a `<user>-<repo>-<sha>/` folder.
  // --strip-components=1 unwraps it so files land directly in themeDir.
  await new Promise<void>((resolve, reject) => {
    const child = spawn("tar", [
      "-xzf",
      tarballPath,
      "-C",
      themeDir,
      "--strip-components=1",
    ]);
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`tar exited with ${code} extracting SilentSDDM`));
    });
  });

  const themeFontsSrc = path.join(themeDir, "fonts");
  if (existsSync(themeFontsSrc)) {
    await cp(themeFontsSrc, fontsDir, { recursive: true });
  }

  await writeFile(
    path.join(sddmConfD, "10-theme.conf"),
    `[General]\n` +
      `InputMethod=qtvirtualkeyboard\n` +
      `GreeterEnvironment=QML2_IMPORT_PATH=/usr/share/sddm/themes/silent/components/,QT_IM_MODULE=qtvirtualkeyboard\n` +
      `\n` +
      `[Theme]\n` +
      `Current=silent\n`,
  );

  appendLog(
    job,
    `[operate] SilentSDDM ${SILENT_SDDM_VERSION} theme + fonts + sddm.conf baked into airootfs\n`,
  );
}

async function prepareProfile(
  jobDir: string,
  config: OsConfig,
  job: BuildJob,
) {
  const profileDir = path.join(jobDir, "profile");

  if (!existsSync(BASELINE_PROFILE)) {
    throw new Error(
      `archiso baseline profile not found at ${BASELINE_PROFILE} — install the 'archiso' package`,
    );
  }

  await cp(BASELINE_PROFILE, profileDir, { recursive: true });

  const pkgFile = path.join(profileDir, "packages.x86_64");
  const existing = (await readFile(pkgFile, "utf8"))
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // networkmanager is pinned explicitly: customize_airootfs.sh enables
  // NetworkManager.service, and the LLM's package list doesn't reliably
  // include the package itself.
  const requested = Array.from(
    new Set([...existing, config.kernel, ...config.packages, "networkmanager"]),
  );
  const remapped: string[] = [];
  const substitutions: string[] = [];
  for (const p of requested) {
    const mapped = PROVIDER_MAP[p];
    if (mapped && mapped !== p) {
      substitutions.push(`${p} -> ${mapped}`);
      remapped.push(mapped);
    } else {
      remapped.push(p);
    }
  }
  const deduped = Array.from(new Set(remapped));

  const checks = await Promise.all(
    deduped.map(async (p) => ({ p, ok: await checkPackage(p) })),
  );
  const validMap = new Map(checks.map((c) => [c.p, c.ok]));
  const valid = checks.filter((c) => c.ok).map((c) => c.p);
  const dropped = checks.filter((c) => !c.ok).map((c) => c.p);

  // What archinstall installs on the DISK: the user's validated package set
  // (+ networkmanager), but none of the live-ISO plumbing from the baseline
  // profile (cloud-init, mkinitcpio-archiso, guest agents…). The kernel is
  // handled by the preseed's `kernels` key.
  const targetPackages = Array.from(
    new Set(
      [...config.packages, "networkmanager"]
        .map((p) => PROVIDER_MAP[p] ?? p)
        .filter((p) => validMap.get(p) === true),
    ),
  ).sort();

  if (substitutions.length) {
    appendLog(
      job,
      `[operate] package substitutions: ${substitutions.join(", ")}\n`,
    );
  }
  if (dropped.length) {
    appendLog(
      job,
      `[operate] dropping unknown/AUR packages (not in pacman repos): ${dropped.join(", ")}\n`,
    );
  }

  await writeFile(pkgFile, valid.sort().join("\n") + "\n");

  const pacmanConfPath = path.join(profileDir, "pacman.conf");
  let pacmanConf = await readFile(pacmanConfPath, "utf8");
  pacmanConf = pacmanConf.replace(
    /#\[multilib\]\s*\n#Include\s*=\s*\/etc\/pacman\.d\/mirrorlist/,
    "[multilib]\nInclude = /etc/pacman.d/mirrorlist",
  );
  // pacman 7.x: disable the landlock download sandbox AND serialize downloads.
  // The sandbox + parallel-download combo races on rename(<pkg>.part, <pkg>),
  // leaving one worker to fail with ENOENT after another already committed the
  // file. Both knobs together are the stable fix for mkarchiso on pacman 7.x.
  pacmanConf = pacmanConf.replace(/^#DisableSandbox\s*$/m, "DisableSandbox");
  pacmanConf = pacmanConf.replace(
    /^ParallelDownloads\s*=\s*\d+\s*$/m,
    "ParallelDownloads = 1",
  );
  // Use a dedicated package cache so a build never reuses a corrupted .pkg
  // left behind in the host's /var/cache/pacman/pkg/ by an earlier failed run.
  // pacman silently keeps such files under --noconfirm and they re-fail every
  // subsequent build with "signature is invalid".
  await mkdir(PKG_CACHE_DIR, { recursive: true });
  pacmanConf = pacmanConf.replace(
    /^#CacheDir\s*=.*$/m,
    `CacheDir = ${PKG_CACHE_DIR}/`,
  );
  // Even with sandbox off and serial downloads, pacman 7.x's in-tree downloader
  // intermittently emits "rename <pkg>.part to <pkg> (No such file or directory)"
  // on the first download of a build — curl errors out, the .part gets cleaned
  // up, then the rename runs anyway. Shelling out to curl via XferCommand
  // sidesteps the whole .part/rename dance: curl writes directly to %o.
  // The wrapper echoes one "[operate-dl] <pkg>" line per package so the build
  // log (and the UI's package counter) moves during the download phase —
  // curl itself stays -sS because its progress meter floods the log at one
  // line per 100ms, but errors stay on stderr so failures still surface.
  // Fetches of .sig/.db files are not logged (they'd double the noise).
  const fetchScript = path.join(ASSETS_DIR, "pacman-fetch.sh");
  await mkdir(ASSETS_DIR, { recursive: true });
  await writeFile(
    fetchScript,
    "#!/bin/bash\n" +
      'out="$1" url="$2"\n' +
      'name="${url##*/}"\n' +
      'case "$name" in\n' +
      '  *.pkg.tar.zst|*.pkg.tar.xz) echo "[operate-dl] $name" ;;\n' +
      "esac\n" +
      'exec /usr/bin/curl -L -C - -f -sS -o "$out" "$url" --retry 3 --retry-delay 2 --max-time 600\n',
    { mode: 0o755 },
  );
  pacmanConf = pacmanConf.replace(
    /^#XferCommand\s*=\s*\/usr\/bin\/curl[^\n]*$/m,
    `XferCommand = ${fetchScript} %o %u`,
  );
  await writeFile(pacmanConfPath, pacmanConf);

  const etc = path.join(profileDir, "airootfs", "etc");
  await mkdir(etc, { recursive: true });

  const hostname = sanitize(config.hostname, "operate");
  await writeFile(path.join(etc, "hostname"), hostname + "\n");
  await writeFile(
    path.join(etc, "locale.conf"),
    `LANG=${config.locale}\n`,
  );
  await writeFile(
    path.join(etc, "vconsole.conf"),
    `KEYMAP=${config.keymap}\n`,
  );

  await writeCustomizeAirootfs(profileDir, config.services, true, job);

  const motd =
    `Welcome to your Operate-built Arch Linux ISO.\n` +
    `Hostname: ${hostname}\n` +
    `Locale:   ${config.locale}\n` +
    `Timezone: ${config.timezone}\n` +
    `Desktop:  ${config.desktop}\n` +
    `Kernel:   ${config.kernel}\n` +
    `\n` +
    `On first boot you'll be prompted to install Operate or set up a live user.\n`;
  await writeFile(path.join(etc, "motd"), motd);

  const systemdSystem = path.join(etc, "systemd", "system");
  await mkdir(systemdSystem, { recursive: true });

  await bakeFirstboot(profileDir, config.desktop, job);

  // archinstall preseed — firstboot launches `archinstall --config` with
  // this, so the disk install inherits the user's Operate config instead of
  // producing a vanilla Arch system.
  const etcOperate = path.join(etc, "operate");
  await mkdir(etcOperate, { recursive: true });
  await writeFile(
    path.join(etcOperate, "archinstall.json"),
    buildArchinstallPreseed(config, targetPackages),
  );
  appendLog(
    job,
    `[operate] archinstall preseed baked (${targetPackages.length} target packages)\n`,
  );

  // operate-adopt — copies the Operate identity (dotfiles, theme, wallpaper)
  // onto the installed system after archinstall succeeds.
  const localBin = path.join(profileDir, "airootfs", "usr", "local", "bin");
  await mkdir(localBin, { recursive: true });
  await writeFile(path.join(localBin, "operate-adopt"), ADOPT_SCRIPT, {
    mode: 0o755,
  });

  const sudoersD = path.join(etc, "sudoers.d");
  await mkdir(sudoersD, { recursive: true });
  await writeFile(
    path.join(sudoersD, "10-wheel"),
    "%wheel ALL=(ALL:ALL) ALL\n",
    { mode: 0o440 },
  );

  const hasDM = config.services.some((s) =>
    DM_NAMES.has(s.replace(/\.service$/, "")),
  );
  if (hasDM) {
    await symlink(
      "/usr/lib/systemd/system/graphical.target",
      path.join(systemdSystem, "default.target"),
    );
  }

  if (config.desktop === "hyprland") {
    await applyHyprlandDefaults(profileDir);
    appendLog(job, `[operate] applied Hyprland defaults (waybar + keybinds)\n`);
  }

  const usesSDDM = config.services.some(
    (s) => s.replace(/\.service$/, "") === "sddm",
  );
  if (usesSDDM) {
    await bakeSilentSddmTheme(profileDir, job);
  }

  await applyBootBranding(profileDir, job);
  await writeIssueBanner(profileDir);

  const profileDef = path.join(profileDir, "profiledef.sh");
  let pd = await readFile(profileDef, "utf8");
  pd = pd.replace(
    /iso_name=".*"/,
    `iso_name="operate-${hostname}"`,
  );
  pd = pd.replace(
    /iso_label=".*"/,
    `iso_label="OPERATE_${Date.now().toString(36).toUpperCase()}"`,
  );
  // mkarchiso strips mode bits during the airootfs overlay (cp -af
  // --no-preserve=mode), so executables we drop in need their 0755 re-asserted
  // via profiledef's file_permissions. customize_airootfs.sh in particular
  // MUST be executable or mkarchiso won't run it in the chroot — and that's
  // where we systemctl-enable services.
  pd += `\nfile_permissions+=(\n  ["/usr/local/bin/operate-firstboot"]="0:0:755"\n  ["/usr/local/bin/operate-adopt"]="0:0:755"\n  ["/usr/local/bin/operate-keybinds"]="0:0:755"\n  ["/root/customize_airootfs.sh"]="0:0:755"\n)\n`;
  await writeFile(profileDef, pd);

  return profileDir;
}

async function findIso(outDir: string): Promise<string | undefined> {
  if (!existsSync(outDir)) return undefined;
  const entries = await readdir(outDir);
  return entries.find((e) => e.endsWith(".iso"));
}

function runMkarchiso(
  job: BuildJob,
  profileDir: string,
  workDir: string,
  outDir: string,
) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(
      "sudo",
      [
        "-n",
        "mkarchiso",
        "-v",
        "-w",
        workDir,
        "-o",
        outDir,
        profileDir,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );

    child.stdout.on("data", (b: Buffer) => appendLog(job, b.toString()));
    child.stderr.on("data", (b: Buffer) => appendLog(job, b.toString()));

    child.on("error", (err) => reject(err));
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`mkarchiso exited with code ${code}`));
    });
  });
}

export async function startBuild(
  config: OsConfig,
  id: string = newJobId(),
): Promise<BuildJob> {
  const jobDir = path.join(BUILD_ROOT, id);
  await mkdir(jobDir, { recursive: true });

  const job: BuildJob = {
    id,
    status: "queued",
    log: "",
    startedAt: Date.now(),
    config,
  };
  jobs.set(id, job);

  const syncStatus = async (status: BuildStatus, isoName?: string | null) => {
    try {
      await updateBuildStatus({ id, status, isoName });
    } catch (err) {
      appendLog(
        job,
        `[operate] WARN: failed to update build status in DB: ${
          err instanceof Error ? err.message : String(err)
        }\n`,
      );
    }
  };

  (async () => {
    try {
      job.status = "running";
      await syncStatus("running");
      appendLog(job, `[operate] job ${id} starting\n`);
      await sweepStalePartFiles(job);
      const profileDir = await prepareProfile(jobDir, config, job);
      appendLog(job, `[operate] profile prepared at ${profileDir}\n`);

      const workDir = path.join(jobDir, "work");
      const outDir = path.join(jobDir, "out");
      await mkdir(workDir, { recursive: true });
      await mkdir(outDir, { recursive: true });

      appendLog(job, `[operate] invoking sudo -n mkarchiso\n`);
      await runMkarchiso(job, profileDir, workDir, outDir);

      const iso = await findIso(outDir);
      if (!iso) throw new Error("mkarchiso finished but no .iso file found");
      job.isoName = iso;
      job.isoPath = path.join(outDir, iso);
      job.status = "done";
      job.finishedAt = Date.now();
      appendLog(job, `[operate] done: ${job.isoPath}\n`);
      await syncStatus("done", iso);
    } catch (err) {
      job.status = "failed";
      const rawError = err instanceof Error ? err.message : String(err);
      // delete corrupt cached packages BEFORE diagnosing so the error message
      // can truthfully say they're gone and a retry will re-download them
      await deleteCorruptCachedPackages(
        findCorruptCachedPackages(job.log),
        job,
      );
      job.error = diagnoseFailure(rawError, job.log);
      job.finishedAt = Date.now();
      appendLog(job, `[operate] FAILED: ${job.error}\n`);
      await syncStatus("failed");
    }
  })();

  return job;
}
