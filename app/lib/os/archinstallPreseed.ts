import type { OsConfig } from "./types";

// Generates the archinstall preseed baked into the ISO at
// /etc/operate/archinstall.json. The first-boot script launches
// `archinstall --config` with it, so the guided TUI opens pre-filled with
// everything the user chose on the website — the only decisions left are
// picking a disk and hitting Install.
//
// Schema verified against archinstall 4.3 (the version the ISO pulls from
// the repos): lib/args.py parse keys, lib/models/locale.py (sys_lang may
// include ".UTF-8" — installer splits it), lib/models/bootloader.py values,
// examples/config-sample.json. `disk_config` is deliberately omitted — disk
// selection stays interactive; everything else is data we already have.

const BOOTLOADER_MAP: Record<OsConfig["bootloader"], string> = {
  "systemd-boot": "Systemd-boot",
  grub: "Grub",
};

export function buildArchinstallPreseed(
  config: OsConfig,
  targetPackages: string[],
): string {
  // archinstall enables these on the target via `systemctl enable` — plain
  // unit names, no .service suffix needed.
  const services = Array.from(
    new Set([
      ...config.services.map((s) => s.replace(/\.service$/, "")),
      "NetworkManager",
    ]),
  );

  const preseed = {
    script: "guided",
    hostname: config.hostname,
    kernels: [config.kernel],
    bootloader_config: {
      bootloader: BOOTLOADER_MAP[config.bootloader] ?? "Systemd-boot",
      uki: false,
      removable: false,
    },
    locale_config: {
      // Deliberately empty. A non-empty kb_layout makes archinstall boot the
      // half-installed target in systemd-nspawn and run `localectl
      // set-keymap` inside it — which fails on current ISOs ("Unable to set
      // locale ... for console", then "Could not shut down temporary boot of
      // '/mnt'") and aborts the whole install (archinstall #3876). An empty
      // string takes archinstall's documented skip path. The chosen keymap
      // still reaches the target: operate-adopt copies the live
      // /etc/vconsole.conf (written from config.keymap in buildIso.ts) over.
      kb_layout: "",
      sys_lang: config.locale,
      sys_enc: "UTF-8",
    },
    // We ship pipewire in the package set; telling archinstall makes it
    // wire the user services on the target too.
    audio_config: { audio: "pipewire" },
    network_config: { type: "nm" },
    packages: targetPackages,
    services,
    timezone: config.timezone,
    ntp: true,
    swap: { enabled: true, algorithm: "zstd" },
  };

  return JSON.stringify(preseed, null, 2) + "\n";
}
