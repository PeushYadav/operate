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

type BuildState = {
  id: string;
  status: BuildStatus;
  log: string;
  isoName?: string;
  error?: string;
};

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
        error: data.error ?? "Failed to start build",
      });
      return;
    }
    setBuild({ id: data.id, status: data.status, log: "" });

    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const r = await fetch(`/api/build/${data.id}`);
      if (!r.ok) return;
      const j = await r.json();
      setBuild({
        id: j.id,
        status: j.status,
        log: j.log,
        isoName: j.isoName,
        error: j.error,
      });
      if (j.status === "done" || j.status === "failed") {
        if (pollRef.current) clearInterval(pollRef.current);
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
            <pre className="text-xs bg-zinc-950 border border-zinc-800 rounded-lg p-4 overflow-x-auto text-zinc-300">
              {JSON.stringify(recommendation.config, null, 2)}
            </pre>
            <button
              onClick={() => startBuild(recommendation.config)}
              disabled={!!build && build.status === "running"}
              className="mt-4 w-full py-3 rounded-lg bg-emerald-500 text-black font-semibold hover:bg-emerald-400 transition disabled:opacity-50"
            >
              {build?.status === "running"
                ? "Building..."
                : build?.status === "done"
                ? "Rebuild ISO"
                : "Build ISO →"}
            </button>
          </div>
        )}

        {build && (
          <div className="mt-6 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="text-lg font-semibold">Build {build.id || "—"}</h3>
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
            {build.error && (
              <p className="text-sm text-red-300 mb-3">{build.error}</p>
            )}
            <pre className="text-xs bg-black border border-zinc-800 rounded-lg p-3 overflow-auto text-zinc-400 max-h-72 whitespace-pre-wrap">
              {build.log || "Waiting for output..."}
            </pre>
            {build.status === "done" && build.id && (
              <a
                href={`/api/build/${build.id}/download`}
                className="mt-4 block w-full text-center py-3 rounded-lg bg-amber-500 text-black font-semibold hover:bg-amber-400 transition"
              >
                Download {build.isoName ?? "operate.iso"}
              </a>
            )}
          </div>
        )}
    </div>
  );
}
