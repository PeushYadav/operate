"use client";
import { useState } from "react";

type BuildSummary = {
  id: string;
  hostname: string;
  status: string;
  createdAt: string;
  packageCount: number;
};

type Message = { role: "user" | "assistant"; content: string };

export default function HelpClient({ builds }: { builds: BuildSummary[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(
    builds[0]?.id ?? null,
  );
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = async () => {
    const q = question.trim();
    if (!q || !selectedId) return;
    setError(null);
    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setQuestion("");
    try {
      const res = await fetch("/api/help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buildId: selectedId, question: q }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to get answer");
        return;
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer || "(empty response)" },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  if (builds.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-16">
        <p className="text-xs tracking-[0.2em] uppercase text-zinc-500 font-mono mb-3">
          {"// Help"}
        </p>
        <h1 className="text-4xl md:text-5xl font-serif leading-tight mb-4">
          No builds yet
        </h1>
        <p className="text-sm text-zinc-400 leading-relaxed mb-6">
          Help is personalized to the packages on your build. Create one first
          and the assistant will be able to answer questions in context.
        </p>
        <a
          href="/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 transition"
        >
          Build your first ISO →
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-5 py-16">
      <div className="mb-10">
        <p className="text-xs tracking-[0.2em] uppercase text-zinc-500 font-mono mb-3">
          {"// Help"}
        </p>
        <h1 className="text-4xl md:text-5xl font-serif leading-tight mb-3">
          Ask about your <span className="italic text-zinc-400">build</span>
        </h1>
        <p className="text-sm text-zinc-400 leading-relaxed">
          The assistant knows the exact packages on the build you select.
        </p>
      </div>

      <div className="mb-6">
        <label className="block text-xs font-mono uppercase tracking-wider text-zinc-500 mb-2">
          Build
        </label>
        <div className="flex flex-col gap-2">
          {builds.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setSelectedId(b.id)}
              className={`text-left p-3 rounded-lg border transition ${
                selectedId === b.id
                  ? "border-amber-500 bg-amber-500/5"
                  : "border-zinc-800 bg-zinc-900 hover:border-zinc-600"
              }`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <div className="font-medium text-sm">{b.hostname}</div>
                <div className="text-xs font-mono text-zinc-500">
                  {b.packageCount} pkgs · {b.status}
                </div>
              </div>
              <div className="text-[11px] font-mono text-zinc-600 mt-1">
                {b.id} · {new Date(b.createdAt).toLocaleString()}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        {messages.length === 0 && !loading && (
          <p className="text-xs text-zinc-500 italic mb-4">
            Ask anything — package conflicts, service setup, missing tools, etc.
          </p>
        )}

        {messages.length > 0 && (
          <div className="flex flex-col gap-4 mb-4 max-h-[50vh] overflow-y-auto">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`text-sm whitespace-pre-wrap leading-relaxed ${
                  m.role === "user"
                    ? "self-end max-w-[85%] px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-100"
                    : "self-start max-w-[95%] text-zinc-200"
                }`}
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="text-sm text-zinc-500 italic self-start">
                Thinking…
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask();
              }
            }}
            placeholder="why won't my display manager start?"
            disabled={loading || !selectedId}
            className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={ask}
            disabled={loading || !selectedId || !question.trim()}
            className="px-5 py-2 rounded-lg bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 transition disabled:opacity-50"
          >
            {loading ? "…" : "Ask"}
          </button>
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-400">{error}</p>
        )}
      </div>
    </div>
  );
}
