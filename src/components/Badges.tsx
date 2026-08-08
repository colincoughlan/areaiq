import type { Area, Confidence } from "@/lib/types";
import { DIRECTION_LABEL } from "@/lib/areas";

export function DirectionBadge({ area }: { area: Area }) {
  const stable = area.direction === "stable" || area.direction === "declining";
  return (
    <span
      title={area.directionDetail}
      className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
        stable ? "bg-gray-100 text-ink-2" : "bg-brand-light text-brand"
      }`}
    >
      ↗ {DIRECTION_LABEL[area.direction]}
    </span>
  );
}

const CONF_LABEL: Record<Confidence, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  limited: "Limited data",
};

export function ConfidenceBadge({ level }: { level: Confidence }) {
  return (
    <span className="rounded-md bg-gold-light px-2.5 py-1 text-xs font-semibold text-gold">
      {CONF_LABEL[level]}
    </span>
  );
}

export function RiskBadge({ text }: { text: string }) {
  return (
    <span className="rounded-md bg-red-50 px-2.5 py-1 text-xs font-semibold text-risk">
      ⚠ {text}
    </span>
  );
}

export function SourceTag({ name, ai }: { name: string; ai?: boolean }) {
  return (
    <span
      title={ai ? "AI interpretation of listed sources — not an official record" : name}
      className={`ml-1.5 inline-block whitespace-nowrap rounded px-2 py-0.5 text-[11px] font-medium ${
        ai ? "bg-gold-light text-gold" : "bg-brand-light text-brand"
      }`}
    >
      {ai ? "AI interpretation" : name}
    </span>
  );
}
