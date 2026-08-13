"use client";

import { useState } from "react";

interface BusinessResult {
  name: string;
  distanceMiles: number;
  address: string | null;
  phone: string | null;
  website: string | null;
  matchType: "tagged" | "name";
}

interface SearchResponse {
  term: string;
  category: { key: string; label: string } | null;
  radiusMiles: number;
  results: BusinessResult[];
  attribution: string;
  error?: string;
}

const SUGGESTIONS = ["dance schools", "yoga studios", "gyms", "preschools", "tutoring"];

export function NearbyBusinessSearch({ areaId }: { areaId: string }) {
  const [term, setTerm] = useState("");
  const [data, setData] = useState<SearchResponse | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function search(q: string) {
    const trimmed = q.trim();
    if (trimmed.length < 2 || state === "loading") return;
    setTerm(trimmed);
    setState("loading");
    setData(null);
    try {
      const res = await fetch(`/api/nearby-business?areaId=${areaId}&q=${encodeURIComponent(trimmed)}`);
      const body = (await res.json()) as SearchResponse;
      if (!res.ok) {
        setErrorMsg(body.error ?? "Something went wrong.");
        setState("error");
        return;
      }
      setData(body);
      setState("idle");
    } catch {
      setErrorMsg("Network error — try again.");
      setState("error");
    }
  }

  return (
    <section className="mt-4 rounded-xl border border-line bg-white p-6">
      <h2 className="text-base font-bold">Is there a competitor nearby?</h2>
      <p className="mt-1 text-xs text-ink-3">
        Live search of OpenStreetMap for named businesses within {data?.radiusMiles ? Math.round(data.radiusMiles) : 3}{" "}
        miles. Coverage depends on what&apos;s mapped in this area — treat a zero result as
        &quot;none found on the map,&quot; not confirmed absence.
      </p>

      <div className="mt-3 flex gap-2">
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search(term)}
          placeholder="e.g. dance schools, yoga studios…"
          aria-label="Search for nearby businesses"
          className="flex-1 rounded-full border border-line px-4 py-2.5 text-sm outline-none focus:border-brand"
        />
        <button
          onClick={() => search(term)}
          disabled={state === "loading"}
          className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {state === "loading" ? "Searching…" : "Search"}
        </button>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => search(s)}
            className="rounded-full border border-line bg-canvas px-3 py-1 text-xs text-ink-2 hover:border-brand hover:text-brand"
          >
            {s}
          </button>
        ))}
      </div>

      {state === "error" && (
        <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-risk">{errorMsg}</p>
      )}

      {data && (
        <div className="mt-3">
          {data.results.length === 0 ? (
            <p className="rounded-lg bg-canvas p-3 text-sm text-ink-2">
              No &quot;{data.term}&quot; results found on the map within {Math.round(data.radiusMiles)} miles.
            </p>
          ) : (
            <ul className="space-y-2">
              {data.results.map((r) => (
                <li key={r.name + r.distanceMiles} className="rounded-lg border border-line p-3 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-semibold text-ink">{r.name}</span>
                    <span className="text-xs text-ink-3">{r.distanceMiles} mi</span>
                  </div>
                  {r.address && <p className="mt-0.5 text-xs text-ink-3">{r.address}</p>}
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    {r.phone && <span className="text-ink-3">{r.phone}</span>}
                    {r.website && (
                      <a href={r.website} target="_blank" rel="noreferrer" className="text-brand underline">
                        website
                      </a>
                    )}
                    {r.matchType === "name" && (
                      <span className="rounded bg-gold-light px-1.5 py-0.5 font-semibold text-gold">
                        name match — verify category
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[11px] text-ink-3">{data.attribution}</p>
        </div>
      )}
    </section>
  );
}
