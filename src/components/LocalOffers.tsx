"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CATEGORY_EMOJI, timeLeftLabel, type Offer } from "@/lib/offers";

type LiveOffer = Offer & { distanceMiles: number };

export function LocalOffers({ areaId }: { areaId: string }) {
  const [offers, setOffers] = useState<LiveOffer[] | null>(null);
  const [mode, setMode] = useState<"live" | "demo" | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/offers?areaId=${encodeURIComponent(areaId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        setOffers(d.offers ?? []);
        setMode(d.mode ?? null);
      })
      .catch(() => !cancelled && setOffers([]));
    return () => {
      cancelled = true;
    };
  }, [areaId]);

  if (offers === null || offers.length === 0) return null;

  return (
    <section className="mt-4 rounded-xl border border-line bg-white p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-bold">
          Live local offers <span className="ml-1 animate-pulse text-good">●</span>
        </h2>
        {mode === "demo" && (
          <span className="rounded-md bg-gold-light px-2 py-0.5 text-[11px] font-bold text-gold">
            Demo — fictional businesses illustrating the feature
          </span>
        )}
      </div>
      <div className="mt-3 space-y-3">
        {offers.map((o) => (
          <div key={o.id} className="rounded-lg border border-line p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span>{CATEGORY_EMOJI[o.category]}</span>
              <span className="font-bold text-ink">{o.businessName}</span>
              <span className="rounded-md bg-brand px-2 py-0.5 text-xs font-bold text-white">
                {o.discountLabel}
              </span>
              <span className="ml-auto whitespace-nowrap text-xs font-semibold text-warn">
                {timeLeftLabel(o.expiresAt)}
              </span>
            </div>
            <p className="mt-1.5 text-sm text-ink-2">{o.title}</p>
            {o.details && <p className="mt-1 text-xs text-ink-3">{o.details}</p>}
            <p className="mt-1.5 text-xs text-ink-3">
              {o.address} · {o.distanceMiles} mi from area center
            </p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-ink-3">
        Offers are posted by local businesses for this area and reviewed before publishing.
        Own a business nearby?{" "}
        <Link href="/business" className="font-semibold text-brand underline">
          Post an offer
        </Link>
      </p>
    </section>
  );
}
