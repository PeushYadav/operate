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
import type { BuildJob, OsConfig } from "./types";

const DEFAULT_PASSWORD = "operate";
const DM_NAMES = new Set(["sddm", "gdm", "lightdm", "ly", "lxdm"]);

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

const sanitize = (s: string, fallback: string) =>
  /^[a-z0-9-]{1,32}$/.test(s) ? s : fallback;

const appendLog = (job: BuildJob, chunk: string) => {
  job.log += chunk;
  if (job.log.length > 200_000) {
    job.log = job.log.slice(-150_000);
  }
};

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

  const username = sanitize(config.username, "operator");

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

  const localBin = path.join(profileDir, "airootfs", "usr", "local", "bin");
  await mkdir(localBin, { recursive: true });

  const firstbootScript =
    `#!/bin/bash\n` +
    `set -e\n` +
    `USERNAME='${username}'\n` +
    `PASSWORD='${DEFAULT_PASSWORD}'\n` +
    `if ! id "$USERNAME" >/dev/null 2>&1; then\n` +
    `  useradd -m -G wheel -s /bin/bash "$USERNAME"\n` +
    `fi\n` +
    `echo "root:$PASSWORD" | chpasswd\n` +
    `echo "$USERNAME:$PASSWORD" | chpasswd\n`;
  await writeFile(path.join(localBin, "operate-firstboot"), firstbootScript, {
    mode: 0o755,
  });

  const firstbootUnit =
    `[Unit]\n` +
    `Description=Operate first-boot account setup\n` +
    `After=local-fs.target\n` +
    `Before=display-manager.service systemd-user-sessions.service getty@tty1.service\n` +
    `\n` +
    `[Service]\n` +
    `Type=oneshot\n` +
    `ExecStart=/usr/local/bin/operate-firstboot\n` +
    `RemainAfterExit=yes\n` +
    `\n` +
    `[Install]\n` +
    `WantedBy=multi-user.target\n`;
  await writeFile(
    path.join(systemdSystem, "operate-firstboot.service"),
    firstbootUnit,
  );

  const multiUserWants = path.join(systemdSystem, "multi-user.target.wants");
  await mkdir(multiUserWants, { recursive: true });
  await symlink(
    "../operate-firstboot.service",
    path.join(multiUserWants, "operate-firstboot.service"),
  );

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

export async function startBuild(config: OsConfig): Promise<BuildJob> {
  const id = newJobId();
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

  (async () => {
    try {
      job.status = "running";
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
    } catch (err) {
      job.status = "failed";
      job.error = err instanceof Error ? err.message : String(err);
      job.finishedAt = Date.now();
      appendLog(job, `[operate] FAILED: ${job.error}\n`);
    }
  })();

  return job;
}
