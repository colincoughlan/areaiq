"use client";

import { useState } from "react";

interface AskSource {
  id: string;
  name: string;
  retrievedAt: string;
}

const SUGGESTIONS = [
  "What is changing around this area?",
  "What are the biggest drawbacks?",
  "What evidence supports the FutureScore?",
  "How much housing is being built?",
];

export function AskAreaIQ({ areaId }: { areaId: string }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<AskSource[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "error" | "unconfigured">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function ask(q: string) {
    const trimmed = q.trim();
    if (trimmed.length < 3 || state === "loading") return;
    setQuestion(trimmed);
    setState("loading");
    setAnswer(null);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ areaId, question: trimmed }),
      });
      const data = await res.json();
      if (res.status === 503) {
        setState("unconfigured");
        return;
      }
      if (!res.ok) {
        setErrorMsg(data.error ?? "Something went wrong.");
        setState("error");
        return;
      }
      setAnswer(data.answer);
      setSources(data.sources ?? []);
      setState("idle");
    } catch {
      setErrorMsg("Network error — try again.");
      setState("error");
    }
  }

  return (
    <section className="mt-4 rounded-xl border border-line bg-white p-6">
      <h2 className="text-base font-bold">Ask AreaIQ about this area</h2>
      <p className="mt-1 text-xs text-ink-3">
        Answers come only from this report&apos;s sources, with citations. AI can make
        mistakes — check the linked sources.
      </p>

      <div className="mt-3 flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask(question)}
          placeholder="Ask a plain-English question…"
          aria-label="Ask a question about this area"
          className="flex-1 rounded-full border border-line px-4 py-2.5 text-sm outline-none focus:border-brand"
        />
        <button
          onClick={() => ask(question)}
          disabled={state === "loading"}
          className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {state === "loading" ? "Thinking…" : "Ask"}
        </button>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => ask(s)}
            className="rounded-full border border-line bg-canvas px-3 py-1 text-xs text-ink-2 hover:border-brand hover:text-brand"
          >
            {s}
          </button>
        ))}
      </div>

      {state === "unconfigured" && (
        <p className="mt-3 rounded-lg bg-canvas p-3 text-sm text-ink-2">
          Ask AreaIQ needs an Anthropic API key. Add <code>ANTHROPIC_API_KEY</code> to{" "}
          <code>.env.local</code> and restart the server.
        </p>
      )}
      {state === "error" && (
        <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-risk">{errorMsg}</p>
      )}
      {answer && (
        <div className="mt-3 rounded-lg bg-canvas p-4">
          <p className="whitespace-pre-wrap text-sm text-ink-2">{answer}</p>
          {sources.length > 0 && (
            <div className="mt-3 border-t border-line pt-2 text-[11px] text-ink-3">
              {sources.map((s) => (
                <div key={s.id}>
                  [{s.id}] {s.name} · retrieved {s.retrievedAt}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
