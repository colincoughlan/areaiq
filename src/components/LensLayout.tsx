"use client";

import { useState, type ReactNode } from "react";
import { LENS_HINT, LENS_LABEL, type Lens } from "@/lib/lens";

/**
 * Reorders a set of pre-rendered report sections by persona lens. Every
 * lens shows every section — this only changes order/emphasis, never what's
 * shown, per the fair-housing "reorder, never filter" rule.
 */
export function LensLayout({
  sections,
  order,
}: {
  sections: Record<string, ReactNode>;
  order: Record<Lens, string[]>;
}) {
  const [lens, setLens] = useState<Lens>("everyone");
  const keys = order[lens];

  return (
    <div>
      <div className="sticky top-[49px] z-30 -mx-4 mb-1 flex flex-wrap items-center gap-2 border-b border-line bg-white/95 px-4 py-2.5 backdrop-blur">
        <span className="text-xs font-semibold text-ink-3">View for:</span>
        <div className="flex gap-1">
          {(Object.keys(LENS_LABEL) as Lens[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLens(l)}
              aria-pressed={lens === l}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                lens === l ? "bg-brand text-white" : "bg-canvas text-ink-2 hover:bg-gray-100"
              }`}
            >
              {LENS_LABEL[l]}
            </button>
          ))}
        </div>
        <span className="text-xs text-ink-3">{LENS_HINT[lens]}</span>
      </div>
      <div>
        {keys.map((k) => (
          <div key={k}>{sections[k]}</div>
        ))}
      </div>
    </div>
  );
}
