"use client";

import { useCallback, useEffect, useState } from "react";

interface PulseVenue {
  id: string;
  name: string;
  category: string;
  address: string;
  offerId: string | null;
  level: string;
  levelLabel: string;
  color: string;
  freshness: string;
  signalCount: number;
  demo?: boolean;
}

export function NeighborhoodPulse({ areaId }: { areaId: string }) {
  const [venues, setVenues] = useState<PulseVenue[] | null>(null);
  const [mode, setMode] = useState<"live" | "demo" | null>(null);
  const [toast, setToast] = useState("");

  const load = useCallback(() => {
    fetch(`/api/pulse?areaId=${encodeURIComponent(areaId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setVenues(d.venues ?? []);
        setMode(d.mode ?? null);
      })
      .catch(() => setVenues([]));
  }, [areaId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000); // refresh the pulse every minute
    return () => clearInterval(t);
  }, [load]);

  async function checkIn(venueId: string) {
    const res = await fetch("/api/pulse", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ venueId }),
    }).catch(() => null);
    if (!res) return;
    const d = await res.json();
    setToast(d.message ?? d.error ?? "");
    setTimeout(() => setToast(""), 3500);
    if (res.ok) load();
  }

  if (venues === null || venues.length === 0) return null;

  return (
    <section className="mt-4 rounded-xl border border-line bg-white p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-bold">Tonight&apos;s pulse</h2>
        {mode === "demo" && (
          <span className="rounded-md bg-gold-light px-2 py-0.5 text-[11px] font-bold text-gold">
            Demo — fictional venues illustrating the feature
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-ink-3">
        Live vibe at participating venues, reported by the businesses and confirmed by guest
        check-ins. Check-ins are anonymous.
      </p>

      <div className="mt-3 space-y-2.5">
        {venues.map((v) => (
          <div key={v.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-line p-3.5">
            <span
              className="h-3.5 w-3.5 flex-none rounded-full"
              style={{ backgroundColor: v.color }}
              aria-label={v.levelLabel}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-bold text-ink">{v.name}</span>
                <span className="text-xs font-semibold" style={{ color: v.color }}>
                  {v.levelLabel}
                </span>
                {v.offerId && (
                  <span className="rounded-md bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">
                    OFFER LIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-ink-3">
                {v.address} · {v.freshness}
                {v.signalCount > 0 && ` · ${v.signalCount} signal${v.signalCount > 1 ? "s" : ""}`}
              </p>
            </div>
            <button
              onClick={() => checkIn(v.id)}
              className="rounded-full border border-brand px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand-light"
            >
              I&apos;m here
            </button>
          </div>
        ))}
      </div>

      {toast && (
        <p className="mt-3 rounded-lg bg-canvas p-2.5 text-center text-xs font-semibold text-ink-2">
          {toast}
        </p>
      )}
      <p className="mt-3 text-[11px] text-ink-3">
        Vibe is information, not judgment — Quiet can mean a perfect table for two. Venues are
        never rolled up into neighborhood ratings.
      </p>
    </section>
  );
}
