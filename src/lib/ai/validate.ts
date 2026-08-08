/**
 * Post-generation validation. An answer that fails any check is discarded —
 * the user sees a safe fallback, never the rejected text.
 */

export interface ValidationResult {
  ok: boolean;
  reasons: string[];
  citedIds: string[];
}

const BANNED_LABELS =
  /\b(good|bad|safe|unsafe|dangerous|desirable|undesirable|sketchy|rough|nice|ghetto)\b[^.!?]{0,30}\b(neighborhood|area|community|part of town)\b|\b(neighborhood|area|community)\b[^.!?]{0,30}\bis\s+(good|bad|safe|unsafe|dangerous|desirable|undesirable|sketchy|rough)\b/i;

const FORECAST_LANGUAGE =
  /\b(will|going to|guaranteed to|certain to|expect(ed)? to)\s+(appreciate|increase in value|rise in value|go up in value|gain value)\b|\bguaranteed\s+(return|appreciation|growth)\b/i;

const PROTECTED_STEERING =
  /\b(kind|type|sort) of people\b|\bpeople like (you|them)\b/i;

export function extractCitations(text: string): string[] {
  const ids = new Set<string>();
  for (const m of text.matchAll(/\[(S\d+)\]/g)) ids.add(m[1]);
  return [...ids];
}

export function validateAnswer(text: string, allowedSourceIds: string[]): ValidationResult {
  const reasons: string[] = [];
  const cited = extractCitations(text);

  if (text.trim().length === 0) reasons.push("empty answer");
  if (cited.length === 0) reasons.push("no citations");

  const allowed = new Set(allowedSourceIds);
  const invented = cited.filter((id) => !allowed.has(id));
  if (invented.length > 0) reasons.push(`invented source ids: ${invented.join(", ")}`);

  if (BANNED_LABELS.test(text)) reasons.push("banned labeling language");
  if (FORECAST_LANGUAGE.test(text)) reasons.push("forecast language");
  if (PROTECTED_STEERING.test(text)) reasons.push("steering language");

  return { ok: reasons.length === 0, reasons, citedIds: cited };
}

export const FALLBACK_ANSWER =
  "I couldn't produce a properly sourced answer to that question. Try rephrasing, or check the report sections above — every figure there links to its source.";
