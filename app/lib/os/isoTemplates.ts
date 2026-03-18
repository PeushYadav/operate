export const templates = [
  {
    name: "gaming",
    description: "High performance gaming setup with GPU support",
    config: {
      base: "arch",
      desktop: "kde",
      packages: ["steam", "lutris", "nvidia", "gamemode"],
      services: ["bluetooth", "networkmanager"]
    },
  },
  {
    name: "developer",
    description: "Minimal dev environment",
    config: {
      base: "arch",
      desktop: "i3",
      packages: ["neovim", "git", "docker", "nodejs"],
      services: ["networkmanager"]
    },
  },
  {
    name: "general",
    description: "Beginner friendly desktop",
    config: {
      base: "ubuntu",
      desktop: "gnome",
      packages: ["firefox", "vlc", "libreoffice"],
      services: ["networkmanager"]
    },
  },
];
