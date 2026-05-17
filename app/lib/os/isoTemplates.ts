import type { OsConfig } from "./types";

export type Template = {
  name: string;
  description: string;
  config: OsConfig;
};

const baseDefaults = {
  base: "arch",
  kernel: "linux" as const,
  bootloader: "systemd-boot" as const,
  hostname: "operate",
  username: "operator",
  locale: "en_US.UTF-8",
  timezone: "UTC",
  keymap: "us",
  aurPackages: [] as string[],
  postInstall: [] as string[],
};

export const templates: Template[] = [
  {
    name: "gaming",
    description: "High performance gaming setup with GPU support",
    config: {
      ...baseDefaults,
      desktop: "kde",
      packages: [
        "plasma-meta",
        "sddm",
        "steam",
        "lutris",
        "gamemode",
        "lib32-gamemode",
        "mangohud",
        "vulkan-icd-loader",
        "lib32-vulkan-icd-loader",
        "discord",
      ],
      services: ["NetworkManager", "bluetooth", "sddm"],
    },
  },
  {
    name: "developer",
    description: "Minimal tiling-WM dev environment",
    config: {
      ...baseDefaults,
      desktop: "i3",
      packages: [
        "i3-wm",
        "i3status",
        "i3lock",
        "dmenu",
        "alacritty",
        "neovim",
        "git",
        "docker",
        "docker-compose",
        "nodejs",
        "npm",
        "python",
        "base-devel",
        "tmux",
        "ripgrep",
        "fzf",
      ],
      services: ["NetworkManager", "docker"],
    },
  },
  {
    name: "general",
    description: "Beginner friendly GNOME desktop",
    config: {
      ...baseDefaults,
      desktop: "gnome",
      packages: [
        "gnome",
        "gdm",
        "firefox",
        "libreoffice-fresh",
        "vlc",
        "thunderbird",
      ],
      services: ["NetworkManager", "gdm"],
    },
  },
];
