# Spec: Ask AreaIQ — cited AI answers (Phase 2, step 4)

## Goal

Plain-English questions about an area, answered only from the area's assembled facts,
with inline source citations. Completes the core MVP loop (search → report → ask).

## Architecture

1. **Context builder** (`src/lib/ai/context.ts`, pure): assembles a numbered fact sheet
   from the area's data — ACS metrics, permit summary, schools, projects, environment —
   each fact tagged `[S1]…[Sn]` with source name and retrieval date. This is the ONLY
   information the model may use.
2. **Prompts** (`src/lib/ai/prompts.ts`, versioned `PROMPT_VERSION`): system prompt
   encodes the product rules (below); user prompt = fact sheet + question.
3. **Validator** (`src/lib/ai/validate.ts`, pure): rejects answers that (a) contain no
   citations, (b) cite source ids not in the fact sheet, (c) use banned labeling
   language, or (d) contain forecast language ("will appreciate", "guaranteed").
   Rejected answers are never shown; the route returns a safe fallback.
4. **Route** (`POST /api/ask`): calls the Anthropic Messages API directly via fetch
   (no SDK dependency), model from `ANTHROPIC_MODEL` (default `claude-haiku-4-5`),
   key from `ANTHROPIC_API_KEY`. Returns 503 with a friendly message when unconfigured.
   In-memory rate limit: 10 requests/min per IP (placeholder until real infra).
5. **Widget** (`AskAreaIQ.tsx`, client): suggested questions, free-text input, cited
   answer display, graceful unconfigured state.

## Product rules enforced in prompt + validator

- Answer ONLY from the fact sheet; say "the data doesn't cover that" otherwise.
- Every factual sentence carries a `[Sn]` citation.
- No "good/bad/safe/unsafe/desirable" area labels; strengths AND tradeoffs framing.
- No appreciation/price forecasts; activity indicators only.
- No demographic steering: never recommend an area based on who lives there.
- Uncertainty is stated (confidence labels are part of the fact sheet).

## Cost control

Max ~1,200 output tokens; fact sheet is compact (<2k tokens); Haiku default keeps cost
per answer well under a cent. Area narratives stay pre-written for now — a future
`generate:summaries` script can regenerate them from the same context builder.

## Acceptance tests

- Context builder: every fact line has a source id; ids are unique and sequential;
  live-data areas include ACS/permits/schools sources; no PII in the sheet.
- Validator: accepts a compliant answer; rejects uncited, invented-id, banned-language,
  and forecast-language answers.
- Route logic (key missing) returns configured=false without calling the API.
