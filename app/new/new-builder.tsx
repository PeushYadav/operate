"use client";
import { useEffect, useRef, useState } from "react";
import type {
  OsConfig,
  RecommendRequest,
  RecommendResponse,
  RecommendSuccess,
  BuildStatus,
} from "../lib/os/types";
import { isRecommendSuccess } from "../lib/os/types";

type Mode = "form" | "prompt";
type Experience = "Beginner" | "Intermediate" | "Advanced";

const playBuildCompleteChime = () => {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    const notes = [
      { freq: 783.99, start: 0, dur: 0.45 },
      { freq: 1046.5, start: 0.12, dur: 0.55 },
    ];
    for (const n of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = n.freq;
      gain.gain.setValueAtTime(0, now + n.start);
      gain.gain.linearRampToValueAtTime(0.25, now + n.start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.start + n.dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + n.start);
      osc.stop(now + n.start + n.dur);
    }
    setTimeout(() => void ctx.close(), 1500);
  } catch {
    // AudioContext may be blocked if the page has had no user interaction
  }
};

const playBuildFailedTone = () => {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    // Descending minor-third pair (A4 → F4) with a soft square edge for a
    // distinctly "wrong" colour vs. the success chime's bright sine major-third.
    const notes = [
      { freq: 440.0, start: 0, dur: 0.35 },
      { freq: 349.23, start: 0.18, dur: 0.55 },
    ];
    for (const n of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = n.freq;
      gain.gain.setValueAtTime(0, now + n.start);
      gain.gain.linearRampToValueAtTime(0.15, now + n.start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.start + n.dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + n.start);
      osc.stop(now + n.start + n.dur);
    }
    setTimeout(() => void ctx.close(), 1500);
  } catch {
    // AudioContext may be blocked if the page has had no user interaction
  }
};

type BuildProgressCounts = {
  reached: number;
  downloaded: number;
  installed: number;
  total: number | null;
};

const EMPTY_PROGRESS: BuildProgressCounts = {
  reached: 0,
  downloaded: 0,
  installed: 0,
  total: null,
};

type BuildState = {
  id: string;
  status: BuildStatus;
  log: string;
  progress: BuildProgressCounts;
  startedAt?: number;
  finishedAt?: number;
  serverNow?: number;
  isoName?: string;
  error?: string;
};

// ── Build log → stage derivation ────────────────────────────────────────────
// The raw mkarchiso/pacstrap log is a firehose; the UI shows a stage timeline
// derived from stable marker lines instead, with the raw log collapsed behind
// a toggle for debugging.

type StageState = "pending" | "active" | "done" | "failed";

const STAGE_DEFS: Array<{ label: string; marker: RegExp | null }> = [
  { label: "Preparing build profile", marker: null }, // reached at job start
  {
    label: "Downloading & installing packages",
    marker: /Synchronizing package databases|Packages \(\d+\)/,
  },
  // NB: our own "[operate] customize_airootfs.sh will enable" prep line must
  // not trigger this — match mkarchiso's runtime message only.
  { label: "Configuring system", marker: /Running customize_airootfs\.sh/ },
  {
    label: "Creating ISO image",
    marker: /Creating SquashFS image|Creating EROFS image|Creating ISO image/,
  },
  // mkarchiso prints "Done!" after EVERY step, so the only unambiguous
  // completion marker is our own log line from buildIso.ts
  { label: "Finalizing", marker: /\[operate\] done:/ },
];

type DerivedStage = { label: string; state: StageState; detail?: string };

// The job log is a ring buffer (server trims it to the last 150KB), so early
// marker lines disappear mid-build. Callers must clamp these values to be
// monotonically increasing across polls — see BuildProgress.
function parseBuildLog(log: string): BuildProgressCounts {
  let reached = 0;
  for (let i = STAGE_DEFS.length - 1; i >= 1; i--) {
    const m = STAGE_DEFS[i].marker;
    if (m && m.test(log)) {
      reached = i;
      break;
    }
  }

  // pacstrap progress: "Packages (247)" gives the total; during the download
  // phase our XferCommand wrapper prints one "[operate-dl] x…" line per
  // package, then the install phase prints one "installing x…" per package.
  // (downloaded can undershoot total — cached packages skip the download.)
  const totalMatch = log.match(/Packages \((\d+)\)/);
  return {
    reached,
    downloaded: log.match(/^\[operate-dl\] /gm)?.length ?? 0,
    installed: log.match(/^installing /gm)?.length ?? 0,
    total: totalMatch ? Number(totalMatch[1]) : null,
  };
}

function buildStageList(
  reached: number,
  status: BuildStatus,
  pkgDetail?: string,
): DerivedStage[] {
  return STAGE_DEFS.map((def, i) => {
    let state: StageState;
    if (status === "done") state = "done";
    else if (i < reached) state = "done";
    else if (i === reached)
      state = status === "failed" ? "failed" : "active";
    else state = "pending";
    return {
      label: def.label,
      state,
      detail: i === 1 && state !== "pending" ? pkgDetail : undefined,
    };
  });
}

const formatElapsed = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
};

function StageIcon({ state }: { state: StageState }) {
  if (state === "done")
    return (
      <span className="w-5 h-5 flex items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 text-[11px]">
        ✓
      </span>
    );
  if (state === "failed")
    return (
      <span className="w-5 h-5 flex items-center justify-center rounded-full bg-red-500/15 text-red-400 text-[11px]">
        ✕
      </span>
    );
  if (state === "active")
    return (
      <span className="w-5 h-5 flex items-center justify-center">
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
      </span>
    );
  return (
    <span className="w-5 h-5 flex items-center justify-center">
      <span className="w-2.5 h-2.5 rounded-full border border-zinc-700" />
    </span>
  );
}

export default function NewBuilder() {
  const [mode, setMode] = useState<Mode>("form");
  const [prompt, setPrompt] = useState("");
  const [purpose, setPurpose] = useState("");
  const [experience, setExperience] = useState<Experience>("Intermediate");
  const [gpu, setGpu] = useState(false);

  const [loading, setLoading] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);
  const [recommendation, setRecommendation] =
    useState<RecommendSuccess | null>(null);
  const [editedPackages, setEditedPackages] = useState<string[]>([]);
  const [newPackageInput, setNewPackageInput] = useState("");

  const [build, setBuild] = useState<BuildState | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const requestRecommendation = async (payload: RecommendRequest) => {
    setLoading(true);
    setRecError(null);
    setRecommendation(null);
    setBuild(null);
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as RecommendResponse;
      if (!res.ok || !isRecommendSuccess(data)) {
        setRecError(
          "error" in data ? data.error : "Failed to generate config",
        );
        return;
      }
      setRecommendation(data);
      setEditedPackages(Array.from(new Set(data.config.packages)));
      setNewPackageInput("");
    } catch (err) {
      setRecError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const submitForm = () => {
    if (!purpose.trim()) {
      setRecError("Enter a purpose first");
      return;
    }
    requestRecommendation({ purpose, experience, gpu });
  };

  const submitPrompt = () => {
    if (prompt.trim().length < 10) return;
    requestRecommendation({ prompt });
  };

  const addPackage = () => {
    const name = newPackageInput.trim();
    if (!name) return;
    if (editedPackages.includes(name)) {
      setNewPackageInput("");
      return;
    }
    setEditedPackages((prev) => [...prev, name]);
    setNewPackageInput("");
  };

  const removePackage = (name: string) => {
    setEditedPackages((prev) => prev.filter((p) => p !== name));
  };

  const startBuild = async (config: OsConfig) => {
    setBuild(null);
    const res = await fetch("/api/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config }),
    });
    const data = await res.json();
    if (!res.ok) {
      setBuild({
        id: "",
        status: "failed",
        log: "",
        progress: EMPTY_PROGRESS,
        error: data.error ?? "Failed to start build",
      });
      return;
    }
    setBuild({
      id: data.id,
      status: data.status,
      log: "",
      progress: EMPTY_PROGRESS,
    });

    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const r = await fetch(`/api/build/${data.id}`);
      if (!r.ok) return;
      const j = await r.json();
      setBuild((prev) => {
        // clamp progress to high-water marks: the server trims the log to its
        // last 150KB, so early marker lines ("Packages (N)", stage markers)
        // vanish mid-build and a raw re-parse would regress
        const parsed = parseBuildLog(j.log);
        const p =
          prev && prev.id === j.id ? prev.progress : EMPTY_PROGRESS;
        return {
          id: j.id,
          status: j.status,
          log: j.log,
          progress: {
            reached: Math.max(p.reached, parsed.reached),
            downloaded: Math.max(p.downloaded, parsed.downloaded),
            installed: Math.max(p.installed, parsed.installed),
            total: parsed.total ?? p.total,
          },
          startedAt: j.startedAt,
          finishedAt: j.finishedAt,
          serverNow: j.now,
          isoName: j.isoName,
          error: j.error,
        };
      });
      if (j.status === "done" || j.status === "failed") {
        if (pollRef.current) clearInterval(pollRef.current);
        if (j.status === "done") playBuildCompleteChime();
        else playBuildFailedTone();
      }
    }, 1500);
  };

  return (
    <div className="max-w-2xl mx-auto px-5 py-16">
        <div className="mb-12">
          <p className="text-xs tracking-[0.2em] uppercase text-zinc-500 font-mono mb-3">
            {"// Linux Distro Builder"}
          </p>
          <h1 className="text-4xl md:text-6xl font-serif leading-tight mb-3">
            Build your <br />
            <span className="italic text-zinc-400">perfect OS</span>
          </h1>
          <p className="text-sm text-zinc-400 max-w-md leading-relaxed">
            Describe your workflow and we&rsquo;ll generate a custom Linux setup tailored exactly for you.
          </p>
        </div>

        <div className="inline-flex bg-zinc-900 border border-zinc-800 rounded-lg p-1 mb-10">
          <button
            onClick={() => setMode("form")}
            className={`px-5 py-2 text-sm rounded-md transition font-medium ${
              mode === "form"
                ? "bg-amber-500 text-black"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Step-by-step
          </button>
          <button
            onClick={() => setMode("prompt")}
            className={`px-5 py-2 text-sm rounded-md transition font-medium ${
              mode === "prompt"
                ? "bg-amber-500 text-black"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Prompt
          </button>
        </div>

        {mode === "prompt" && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 shadow-lg shadow-black/30">
            <label className="block text-xs font-mono uppercase tracking-wider text-zinc-500 mb-2">
              Describe your ideal system
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="I want a fast dev setup with Docker, tiling WM, 16GB RAM..."
              className="w-full min-h-[150px] p-4 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <div className="mt-6">
              <button
                onClick={submitPrompt}
                disabled={loading || prompt.trim().length < 10}
                className="w-full py-3 rounded-lg bg-amber-500 text-black font-semibold hover:bg-amber-400 transition disabled:opacity-50"
              >
                {loading ? "Generating..." : "Generate Config →"}
              </button>
            </div>
          </div>
        )}

        {mode === "form" && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 shadow-lg shadow-black/30">
            <div className="mb-6">
              <h2 className="text-xl font-semibold">System Basics</h2>
              <p className="text-sm text-zinc-400">Define your requirements</p>
            </div>

            <div className="mb-5">
              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-500 mb-2">
                Purpose
              </label>
              <input
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="gaming, dev, daily..."
                className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="mb-6">
              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-500 mb-2">
                Experience
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["Beginner", "Intermediate", "Advanced"] as Experience[]).map(
                  (lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setExperience(lvl)}
                      className={`text-center p-3 rounded-lg border cursor-pointer transition ${
                        experience === lvl
                          ? "border-amber-500 bg-amber-500/10 text-amber-300"
                          : "border-zinc-700 bg-zinc-800 hover:border-zinc-500"
                      }`}
                    >
                      {lvl}
                    </button>
                  ),
                )}
              </div>
            </div>

            <div className="mb-6">
              <button
                onClick={() => setGpu((g) => !g)}
                className="w-full flex justify-between items-center p-3 rounded-lg border border-zinc-700 bg-zinc-800 hover:border-zinc-500 transition text-left"
              >
                <div>
                  <p className="text-sm font-medium">GPU Support</p>
                  <p className="text-xs text-zinc-500">NVIDIA / AMD</p>
                </div>
                <div
                  className={`w-10 h-5 rounded-full relative transition ${
                    gpu ? "bg-amber-500" : "bg-zinc-700"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${
                      gpu ? "left-5" : "left-1"
                    }`}
                  />
                </div>
              </button>
            </div>

            <button
              onClick={submitForm}
              disabled={loading || !purpose.trim()}
              className="w-full py-3 rounded-lg bg-amber-500 text-black font-semibold hover:bg-amber-400 transition disabled:opacity-50"
            >
              {loading ? "Generating..." : "Continue →"}
            </button>
          </div>
        )}

        {recError && (
          <div className="mt-6 p-4 rounded-lg border border-red-900 bg-red-950/40 text-sm text-red-300">
            {recError}
          </div>
        )}

        {recommendation && (
          <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="text-lg font-semibold">
                Template: {recommendation.selected_template}
              </h3>
              <span className="text-xs font-mono text-zinc-500">
                {recommendation.config.desktop} · {recommendation.config.kernel}
              </span>
            </div>
            <p className="text-sm text-zinc-400 mb-4">{recommendation.reason}</p>

            <div className="flex items-baseline justify-between mb-3">
              <label className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                Packages
              </label>
              <span className="text-xs font-mono text-zinc-500">
                {editedPackages.length}
              </span>
            </div>

            {editedPackages.length === 0 ? (
              <p className="text-xs text-zinc-500 italic mb-3">
                No packages — add at least one before building.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 mb-3">
                {editedPackages.map((pkg) => (
                  <span
                    key={pkg}
                    className="inline-flex items-center gap-1.5 pl-3 pr-1 py-1 rounded-full border border-zinc-700 bg-zinc-800 text-xs"
                  >
                    <span className="font-mono text-zinc-200">{pkg}</span>
                    <button
                      type="button"
                      onClick={() => removePackage(pkg)}
                      aria-label={`Remove ${pkg}`}
                      className="w-5 h-5 inline-flex items-center justify-center rounded-full text-zinc-500 hover:text-red-400 hover:bg-zinc-900 transition"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                value={newPackageInput}
                onChange={(e) => setNewPackageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addPackage();
                  }
                }}
                placeholder="add a package (e.g. firefox)"
                className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="button"
                onClick={addPackage}
                disabled={!newPackageInput.trim()}
                className="px-4 py-2 rounded-lg border border-zinc-700 text-zinc-300 text-sm hover:border-amber-400 hover:text-amber-400 transition disabled:opacity-50 disabled:hover:border-zinc-700 disabled:hover:text-zinc-300"
              >
                + Add
              </button>
            </div>

            <button
              onClick={() =>
                startBuild({
                  ...recommendation.config,
                  packages: editedPackages,
                })
              }
              disabled={
                editedPackages.length === 0 ||
                (!!build && build.status === "running")
              }
              className="mt-6 w-full py-3 rounded-lg bg-emerald-500 text-black font-semibold hover:bg-emerald-400 transition disabled:opacity-50"
            >
              {build?.status === "running"
                ? "Building..."
                : build?.status === "done"
                ? "Rebuild ISO"
                : "Build ISO →"}
            </button>
          </div>
        )}

        {build && <BuildProgress build={build} />}
    </div>
  );
}

function BuildProgress({ build }: { build: BuildState }) {
  const [showLog, setShowLog] = useState(false);
  const logRef = useRef<HTMLPreElement | null>(null);

  // keep the raw log pinned to the bottom while it streams
  useEffect(() => {
    if (showLog && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [showLog, build.log]);

  const { reached, downloaded, installed, total } = build.progress;
  // download phase first (counter from [operate-dl] lines), then install
  // phase (counter from pacman's "installing …" lines)
  const pkgDetail =
    total !== null
      ? installed > 0
        ? `installing ${Math.min(installed, total)} / ${total}`
        : `downloading ${Math.min(downloaded, total)} / ${total}`
      : undefined;
  const stages = buildStageList(reached, build.status, pkgDetail);
  const pkgProgress =
    total !== null && total > 0
      ? Math.min(100, (Math.max(installed, downloaded) / total) * 100)
      : null;
  const elapsedEnd = build.finishedAt ?? build.serverNow;
  const elapsed =
    build.startedAt !== undefined && elapsedEnd !== undefined
      ? formatElapsed(elapsedEnd - build.startedAt)
      : null;

  return (
    <div className="mt-6 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <div className="flex items-baseline justify-between mb-5">
        <h3 className="text-lg font-semibold">
          Build{" "}
          <span className="font-mono text-sm text-zinc-400">
            {build.id || "—"}
          </span>
        </h3>
        <div className="flex items-baseline gap-3">
          {elapsed && (
            <span className="text-xs font-mono text-zinc-500">{elapsed}</span>
          )}
          <span
            className={`text-xs font-mono uppercase ${
              build.status === "done"
                ? "text-emerald-400"
                : build.status === "failed"
                ? "text-red-400"
                : "text-amber-400"
            }`}
          >
            {build.status}
          </span>
        </div>
      </div>

      <ol className="space-y-3 mb-4">
        {stages.map((stage) => (
          <li key={stage.label} className="flex items-center gap-3">
            <StageIcon state={stage.state} />
            <span
              className={`text-sm flex-1 ${
                stage.state === "active"
                  ? "text-zinc-100"
                  : stage.state === "done"
                  ? "text-zinc-400"
                  : stage.state === "failed"
                  ? "text-red-300"
                  : "text-zinc-600"
              }`}
            >
              {stage.label}
            </span>
            {stage.detail && (
              <span className="text-xs font-mono text-zinc-500">
                {stage.detail}
              </span>
            )}
          </li>
        ))}
      </ol>

      {pkgProgress !== null && build.status === "running" && (
        <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden mb-4">
          <div
            className="h-full bg-amber-500 rounded-full transition-all duration-700"
            style={{ width: `${pkgProgress}%` }}
          />
        </div>
      )}

      {build.error && (
        <div className="p-3 mb-4 rounded-lg border border-red-900 bg-red-950/40 text-sm text-red-300">
          {build.error}
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowLog((s) => !s)}
        className="text-xs font-mono text-zinc-500 hover:text-zinc-300 transition"
      >
        {showLog ? "▾ hide raw log" : "▸ show raw log"}
      </button>
      {showLog && (
        <pre
          ref={logRef}
          className="mt-2 text-xs bg-black border border-zinc-800 rounded-lg p-3 overflow-auto text-zinc-400 max-h-72 whitespace-pre-wrap"
        >
          {build.log || "Waiting for output..."}
        </pre>
      )}

      {build.status === "done" && build.id && (
        <a
          href={`/api/build/${build.id}/download`}
          className="mt-4 block w-full text-center py-3 rounded-lg bg-amber-500 text-black font-semibold hover:bg-amber-400 transition"
        >
          Download {build.isoName ?? "operate.iso"}
        </a>
      )}
    </div>
  );
}
