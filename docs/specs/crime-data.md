# Spec: Safety data — responsible design (build after counsel review)

## Why care is required

Crime data is the highest steering-risk dataset in housing products: block-level crime
heat maps function as demographic redlining, agency reporting practices differ enough
to make cross-city comparison misleading, and "safe/unsafe" labels are the exact
language fair-housing guidance warns against. It's also what families genuinely want.
The design below is the responsible middle.

## Sources (official only)

- CA DOJ OpenJustice: agency-level reported crimes (annual, downloadable CSV).
- FBI Crime Data Explorer API (agency-level, free key).
- Never: crowdsourced crime apps, police-scanner feeds, or incident-level maps.

## Presentation rules

- **City/agency level only** — never block or tract heat maps.
- Rates per 100k residents, violent/property split, and the **5-year trend** (the
  trend is the family-relevant signal; a point-in-time number invites misreading).
- Regional-median comparison, same pattern as other snapshot metrics.
- Mandatory methodology note: reporting differences between agencies, NIBRS
  transition effects, unreported crime. Confidence labels apply.
- Never the words safe/unsafe/dangerous; never adjacent to demographic data;
  never an input to any score.

## Gate

Fair-housing counsel reviews this spec and sample renderings BEFORE implementation.
This is the one dataset where launch order is legal-first, build-second.
