/**
 * Neighborhood Pulse: pure busyness scoring. Signals decay exponentially
 * (90-minute half-life); merchant reports outweigh guest check-ins 3:1;
 * stale venues read "unknown" rather than lying. Unit-tested.
 */

export type Vibe = "quiet" | "steady" | "lively" | "packed";
export type PulseLevel = Vibe | "unknown";

export interface BusynessSignal {
  kind: "merchant" | "guest";
  at: string; // ISO timestamp
  /** Optional reported vibe; merchant reports always carry one. */
  vibe?: Vibe;
}

export const HALF_LIFE_MINUTES = 90;
export const STALE_AFTER_MINUTES = 180;
export const MERCHANT_WEIGHT = 3;
export const GUEST_WEIGHT = 1;

/** Neutral palette — no good/bad color coding (see spec: vibe, not judgment). */
export const LEVEL_META: Record<PulseLevel, { label: string; color: string }> = {
  quiet: { label: "Quiet", color: "#64748b" },
  steady: { label: "Steady", color: "#0f6b5c" },
  lively: { label: "Lively", color: "#c8862a" },
  packed: { label: "Packed", color: "#e2604f" },
  unknown: { label: "No recent signal", color: "#c3c9d4" },
};

export function decayWeight(signalAt: string, now: Date): number {
  const ageMin = (now.getTime() - new Date(signalAt).getTime()) / 60_000;
  if (ageMin < 0) return 0;
  return Math.pow(0.5, ageMin / HALF_LIFE_MINUTES);
}

export interface PulseResult {
  level: PulseLevel;
  score: number;
  /** Minutes since the freshest signal; null when no signals. */
  freshnessMinutes: number | null;
  signalCount: number;
}

const VIBE_SCORE: Record<Vibe, number> = { quiet: 0.5, steady: 2, lively: 4.5, packed: 7 };

export function computePulse(signals: BusynessSignal[], now = new Date()): PulseResult {
  if (signals.length === 0) {
    return { level: "unknown", score: 0, freshnessMinutes: null, signalCount: 0 };
  }

  let freshest = -Infinity;
  let score = 0;
  let merchantVibe: { vibe: Vibe; weight: number } | null = null;

  for (const s of signals) {
    const at = new Date(s.at).getTime();
    if (at > freshest) freshest = at;
    const w = decayWeight(s.at, now) * (s.kind === "merchant" ? MERCHANT_WEIGHT : GUEST_WEIGHT);
    if (s.kind === "merchant" && s.vibe) {
      // A merchant's stated vibe anchors the score toward what they reported.
      if (!merchantVibe || w > merchantVibe.weight) merchantVibe = { vibe: s.vibe, weight: w };
      score += (VIBE_SCORE[s.vibe] / MERCHANT_WEIGHT) * w;
    } else {
      score += w;
    }
  }

  const freshnessMinutes = Math.max(0, Math.round((now.getTime() - freshest) / 60_000));
  if (freshnessMinutes > STALE_AFTER_MINUTES) {
    return { level: "unknown", score: 0, freshnessMinutes, signalCount: signals.length };
  }

  let level: PulseLevel;
  if (score < 1) level = "quiet";
  else if (score < 3) level = "steady";
  else if (score < 6) level = "lively";
  else level = "packed";

  // A fresh, strong merchant report can't be overridden by a trickle of guests.
  if (merchantVibe && merchantVibe.weight >= 1.5) level = merchantVibe.vibe;

  return { level, score, freshnessMinutes, signalCount: signals.length };
}

export function freshnessLabel(minutes: number | null): string {
  if (minutes == null) return "no signals yet";
  if (minutes < 2) return "just now";
  if (minutes < 60) return `as of ${minutes} min ago`;
  return `as of ${Math.round(minutes / 60)}h ago`;
}

/** Rate limit: one check-in per client per venue per window. Pure check. */
export const CHECKIN_WINDOW_MINUTES = 120;

export function canCheckIn(lastCheckInAt: string | null, now = new Date()): boolean {
  if (!lastCheckInAt) return true;
  return now.getTime() - new Date(lastCheckInAt).getTime() >= CHECKIN_WINDOW_MINUTES * 60_000;
}
