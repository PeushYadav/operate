import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  mkdir,
  readFile,
  readdir,
  writeFile,
  cp,
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
} from "./hyprland";

const DEFAULT_PASSWORD = "operate";
const DM_NAMES = new Set(["sddm", "gdm", "lightdm", "ly", "lxdm"]);
const OPERATE_UID = 1000;
const OPERATE_GID = 1000;
const WHEEL_GID = 998;

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

function diagnoseFailure(rawError: string, log: string): string {
  if (
    /signature from .* is invalid/i.test(log) ||
    /corrupted.*PGP signature/i.test(log) ||
    /key .* is unknown/i.test(log)
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
  const skelHypr = path.join(airoot, "etc", "skel", ".config", "hypr");
  const skelWaybar = path.join(airoot, "etc", "skel", ".config", "waybar");
  const etcOperate = path.join(airoot, "etc", "operate");
  const localBin = path.join(airoot, "usr", "local", "bin");

  await mkdir(skelHypr, { recursive: true });
  await mkdir(skelWaybar, { recursive: true });
  await mkdir(etcOperate, { recursive: true });
  await mkdir(localBin, { recursive: true });

  await writeFile(path.join(skelHypr, "hyprland.conf"), HYPRLAND_CONF);
  await writeFile(path.join(skelWaybar, "config"), WAYBAR_CONFIG);
  await writeFile(path.join(skelWaybar, "style.css"), WAYBAR_STYLE);
  await writeFile(path.join(etcOperate, "keybindings.txt"), KEYBINDINGS_DOC);
  await writeFile(
    path.join(localBin, "operate-keybinds"),
    KEYBINDS_LAUNCHER_SCRIPT,
    { mode: 0o755 },
  );
}

function hashPassword(plain: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(8)
      .toString("base64")
      .replace(/[+/=]/g, "")
      .slice(0, 16);
    const child = spawn("openssl", ["passwd", "-6", "-salt", salt, plain]);
    let out = "";
    let err = "";
    child.stdout.on("data", (b: Buffer) => (out += b.toString()));
    child.stderr.on("data", (b: Buffer) => (err += b.toString()));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(out.trim());
      else
        reject(
          new Error(
            `openssl passwd -6 failed (exit ${code}): ${err.trim() || out.trim()}`,
          ),
        );
    });
  });
}

async function bakeUserAndAutologin(
  profileDir: string,
  username: string,
  desktop: string,
  job: BuildJob,
) {
  const airootEtc = path.join(profileDir, "airootfs", "etc");
  await mkdir(airootEtc, { recursive: true });

  const [rootHash, userHash] = await Promise.all([
    hashPassword(DEFAULT_PASSWORD),
    hashPassword(DEFAULT_PASSWORD),
  ]);

  // Days since epoch — shadow(5) "last password change" field
  const today = Math.floor(Date.now() / 86_400_000);

  await writeFile(
    path.join(airootEtc, "passwd"),
    `root:x:0:0:root:/root:/bin/bash\n` +
      `${username}:x:${OPERATE_UID}:${OPERATE_GID}:Operate User:/home/${username}:/bin/bash\n`,
  );

  await writeFile(
    path.join(airootEtc, "shadow"),
    `root:${rootHash}:${today}:0:99999:7:::\n` +
      `${username}:${userHash}:${today}:0:99999:7:::\n`,
  );

  await writeFile(
    path.join(airootEtc, "group"),
    `root:x:0:\n` +
      `wheel:x:${WHEEL_GID}:${username}\n` +
      `${username}:x:${OPERATE_GID}:\n`,
  );

  await writeFile(
    path.join(airootEtc, "gshadow"),
    `root:!*::\n` +
      `wheel:!::${username}\n` +
      `${username}:!::\n`,
  );

  appendLog(
    job,
    `[operate] baked ${username} (uid ${OPERATE_UID}, wheel) into airootfs /etc/{passwd,shadow,group,gshadow}\n`,
  );

  const session = DESKTOP_SESSIONS[desktop];
  if (session) {
    const sddmDir = path.join(airootEtc, "sddm.conf.d");
    await mkdir(sddmDir, { recursive: true });
    await writeFile(
      path.join(sddmDir, "autologin.conf"),
      `[Autologin]\nUser=${username}\nSession=${session}\n`,
    );
    appendLog(
      job,
      `[operate] SDDM autologin configured → ${username} → ${session}\n`,
    );
  }
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

  const requested = Array.from(
    new Set([...existing, config.kernel, ...config.packages]),
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
  const valid = checks.filter((c) => c.ok).map((c) => c.p);
  const dropped = checks.filter((c) => !c.ok).map((c) => c.p);

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

  const presetDir = path.join(etc, "systemd", "system-preset");
  await mkdir(presetDir, { recursive: true });
  const presetLines = config.services.map((s) => {
    const unit = s.endsWith(".service") ? s : `${s}.service`;
    return `enable ${unit}`;
  });
  await writeFile(
    path.join(presetDir, "10-operate.preset"),
    presetLines.join("\n") + "\n",
  );

  const username = sanitize(config.username, "operate");

  const motd =
    `Welcome to your Operate-built Arch Linux ISO.\n` +
    `Hostname: ${hostname}\n` +
    `Locale:   ${config.locale}\n` +
    `Timezone: ${config.timezone}\n` +
    `Desktop:  ${config.desktop}\n` +
    `Kernel:   ${config.kernel}\n` +
    `\n` +
    `Login: root  or  ${username}    Password: ${DEFAULT_PASSWORD}\n`;
  await writeFile(path.join(etc, "motd"), motd);

  const systemdSystem = path.join(etc, "systemd", "system");
  await mkdir(systemdSystem, { recursive: true });

  await bakeUserAndAutologin(profileDir, username, config.desktop, job);

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
  // --no-preserve=mode), so credential files default to 0644 unless we
  // re-assert perms via file_permissions. /etc/shadow is already locked down
  // by baseline; add /etc/gshadow alongside it.
  pd += `\nfile_permissions+=(\n  ["/etc/gshadow"]="0:0:400"\n)\n`;
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
      job.error = diagnoseFailure(rawError, job.log);
      job.finishedAt = Date.now();
      appendLog(job, `[operate] FAILED: ${job.error}\n`);
      await syncStatus("failed");
    }
  })();

  return job;
}
