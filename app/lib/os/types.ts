export type OsConfig = {
  base: string;
  desktop: string;
  kernel: "linux" | "linux-lts" | "linux-zen" | "linux-hardened";
  bootloader: "systemd-boot" | "grub";
  hostname: string;
  username: string;
  locale: string;
  timezone: string;
  keymap: string;
  packages: string[];
  aurPackages: string[];
  services: string[];
  postInstall: string[];
};

export type RecommendRequest = {
  prompt?: string;
  purpose?: string;
  experience?: "Beginner" | "Intermediate" | "Advanced";
  gpu?: boolean;
};

export type RecommendSuccess = {
  selected_template: string;
  reason: string;
  config: OsConfig;
};

export type RecommendError = {
  error: string;
  details?: string;
  raw?: string;
};

export type RecommendResponse = RecommendSuccess | RecommendError;

export const isRecommendSuccess = (
  res: RecommendResponse,
): res is RecommendSuccess => "config" in res && !!res.config;

export type BuildStatus = "queued" | "running" | "done" | "failed";

export type BuildJob = {
  id: string;
  status: BuildStatus;
  log: string;
  startedAt: number;
  finishedAt?: number;
  isoPath?: string;
  isoName?: string;
  error?: string;
  config: OsConfig;
};
