"use client";
import { useState } from "react";
import Link from "next/link";
import type {
  RecommendResponse,
  RecommendSuccess,
} from "../lib/os/types";
import { isRecommendSuccess } from "../lib/os/types";

export default function RecommendClient() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RecommendSuccess | null>(null);

  const submit = async () => {
    const text = prompt.trim();
    if (text.length < 10) return;
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });
      const data = (await res.json()) as RecommendResponse;
      if (!res.ok || !isRecommendSuccess(data)) {
        setError("error" in data ? data.error : "Failed to generate");
        return;
      }
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-5 py-16">
      <div className="mb-10">
        <p className="text-xs tracking-[0.2em] uppercase text-zinc-500 font-mono mb-3">
          {"// Recommendations"}
        </p>
        <h1 className="text-4xl md:text-5xl font-serif leading-tight mb-3">
          Find your <span className="italic text-zinc-400">distro</span>
        </h1>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Describe what you need. We&rsquo;ll suggest the closest existing
          template — install that distro directly, or sign in to build a custom
          ISO from it.
        </p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 shadow-lg shadow-black/30">
        <label className="block text-xs font-mono uppercase tracking-wider text-zinc-500 mb-2">
          What do you want to do?
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="A lightweight machine for Python data science, with Jupyter and a tiling WM..."
          className="w-full min-h-[140px] p-4 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <button
          type="button"
          onClick={submit}
          disabled={loading || prompt.trim().length < 10}
          className="mt-5 w-full py-3 rounded-lg bg-amber-500 text-black font-semibold hover:bg-amber-400 transition disabled:opacity-50"
        >
          {loading ? "Finding a match…" : "Recommend a distro →"}
        </button>
      </div>

      {error && (
        <div className="mt-6 p-4 rounded-lg border border-red-900 bg-red-950/40 text-sm text-red-300">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-lg font-semibold">
              Closest match: {result.selected_template}
            </h3>
            <span className="text-xs font-mono text-zinc-500">
              {result.config.desktop} · {result.config.kernel}
            </span>
          </div>
          <p className="text-sm text-zinc-400 mb-4">{result.reason}</p>

          <div className="flex items-baseline justify-between mb-2">
            <label className="text-xs font-mono uppercase tracking-wider text-zinc-500">
              Suggested packages
            </label>
            <span className="text-xs font-mono text-zinc-500">
              {result.config.packages.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {result.config.packages.map((pkg) => (
              <span
                key={pkg}
                className="inline-flex items-center px-3 py-1 rounded-full border border-zinc-700 bg-zinc-800 text-xs font-mono text-zinc-200"
              >
                {pkg}
              </span>
            ))}
          </div>

          <div className="border-t border-zinc-800 pt-4 mt-2 flex items-center justify-between gap-3">
            <p className="text-xs text-zinc-500">
              Want this as a bootable ISO?
            </p>
            <Link
              href="/new"
              className="px-4 py-2 rounded-lg border border-amber-500 text-amber-400 text-sm hover:bg-amber-500 hover:text-black transition"
            >
              Build it on /new →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
