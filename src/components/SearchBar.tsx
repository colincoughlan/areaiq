"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AREA_ORDER, searchAreas } from "@/lib/areas";
import { searchRegions } from "@/lib/regions";

interface Hit {
  id: string;
  primary: string;
  secondary: string;
  tier: "pilot" | "coverage";
}

/**
 * Searches pilot areas (by sample address + name) and all 334 SoCal regions
 * (by place name + county). Phase 3 swaps in Mapbox address geocoding.
 */
export function SearchBar() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const pilotIds = new Set<string>(AREA_ORDER);
  const pilotHits: Hit[] = searchAreas(query).map((a) => ({
    id: a.id,
    primary: a.sampleAddress,
    secondary: `${a.name} · Full report`,
    tier: "pilot",
  }));
  const regionHits: Hit[] = searchRegions(query, 8)
    .filter((r) => !pilotIds.has(r.id))
    .map((r) => ({
      id: r.id,
      primary: r.name,
      secondary: `${r.county} · Data snapshot`,
      tier: "coverage",
    }));
  const hits = [...pilotHits, ...regionHits].slice(0, 8);

  return (
    <div ref={rootRef} className="relative">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search any SoCal city or community, e.g. Torrance"
        aria-label="Search a Southern California place"
        className="w-full rounded-full border-2 border-line bg-white px-6 py-4 text-base shadow-sm outline-none focus:border-brand"
      />
      {open && query.trim().length >= 2 && (
        <ul className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-line bg-white text-left shadow-lg">
          {hits.length === 0 && (
            <li className="px-4 py-3 text-sm text-ink-3">
              No matching place in the five-county coverage area.
            </li>
          )}
          {hits.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push(`/area/${h.id}`);
                }}
                className="flex w-full items-baseline justify-between gap-3 px-4 py-3 text-sm hover:bg-brand-light"
              >
                <span className={h.tier === "pilot" ? "font-semibold" : ""}>{h.primary}</span>
                <span className="whitespace-nowrap text-xs text-ink-3">{h.secondary}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
