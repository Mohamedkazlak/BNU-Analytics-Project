# AI layer

The AI UI is a **deterministic narrative** over real repository numbers. It
does not call an LLM and must not invent statistics.

## Request path

Dashboard KPIs, charts and tables load through their own FastAPI endpoints.

AI is a separate React Query:

`getAiDecision(filters)` → `POST /api/ai/decision`

The dashboard renders immediately. AI shows a skeleton, then content, or a
non-blocking message if it is slow or unavailable.

## Combined decision

One backend orchestration (`get_ai_decision`) loads `load_ai_context` once
for the authenticated role and current filters, then derives:

- insight
- current standing
- structured recommendations with “Based on” evidence

The previous three parallel endpoints (`/api/insights`, `/api/predictions`,
`/api/recommendations`) still exist but each now reuses the combined path.

```text
POST /api/ai/decision
        ↓
validate filters
        ↓
load one filtered context
        ↓
insight + current standing + recommendations
        ↓
cache
```

## Why the old path timed out

Root cause (not “the model was slow”):

1. The UI fired three heavy requests at once.
2. Each request re-ran the same management / integrity / item-analysis work.
3. Integrity and related helpers loaded broad attempt sets and grouped them
   in Python.
4. The connection pool held a connection for the whole request with no
   statement timeout, so overlapping calls queued behind each other.

Fixes: one shared context, SQL aggregation (including integrity medians / IP
grouping and a SQL `LIMIT` on top flagged attempts), `statement_timeout`,
`asyncio.wait_for` budget (`AI_BUDGET_SECONDS`, default 8), frontend
`AbortController` (~12s), and a short in-process cache.

Do not “fix” remaining slowness by raising those timeouts.

## Current standing vs prediction

Exam offerings in this database are current-term. Until a forecasting model
is wired, the UI label is **Current standing**, `kind` is
`current_standing`, and the copy states that the numbers are not a forecast.
Year counts used in that copy come from the selected analytics scope (filters
and RLS), not from global `course_offerings` history.

`backend/services/predictions.py` is the extension point for a later
model that would use multi-term scores, attendance and course history. No LLM
is used for numerical prediction. The JSON field remains named `prediction`
for compatibility; it is current standing.

## Filters

AI uses the same `AnalyticsFilters` as the dashboard. Cache keys include the
authenticated user, role, scope, filters, academic year, term and data
version. The cache is not a security boundary.

## Limitations

- Template text, not generative AI.
- In-process cache only (single instance, bounded eviction).
- Integrity “risk scores” are fused from recorded signals, not a trained model.
- Unit tests mock repositories; CI integration tests cover schema/RLS, not
  production LLM latency (there is no LLM).
