# Architecture

BNU Analytics is a role-scoped assessment reporting system. Production data
flows in one direction:

```text
React / TanStack Router + Query
        |
        |  JWT + analytics filters (sector / college / curriculum / student)
        v
FastAPI routers
        |
        |  UserContext from live user_accounts (not the JWT role claim)
        v
Services
        |
        v
Repositories (parameterized SQL + aggregations)
        |
        v
PostgreSQL / Supabase
        |
        +--> Row Level Security (`app.current_user_id`)
        +--> views such as `v_exam_attempts`
```

The frontend is not a security boundary. Role, scope, sector, college,
curriculum and student identifiers sent by the browser are treated as filter
hints. Authorization is applied in FastAPI against the authenticated account
and again in PostgreSQL RLS.

## Source of truth

- Schema: `db/schema.sql` (fresh install) and `db/migrations/` (existing DBs)
- Application data: PostgreSQL. There is no production mock-data path.
- Official GPA / transcript numbers: `backend/services/gpa.py` and
  `backend/repositories/transcript.py`. React only displays API results.

## Analytics filters

Shared shape:

- `sectorId` → `org_units.level = 'sector'`
- `collegeId` → `org_units.level = 'program'` (UI label is “college”)
- `curriculumId` → `courses.id`
- `studentId` → `students.id`

University-wide senior management must select sector and college before
analytics endpoints return data. Other roles have defaults injected from their
authorized `scope_id` and cannot expand that scope.

Filter options (`GET /api/filter-options`) return only values the caller may
use. Student lists are limited and, for professors, restricted to assigned
teaching enrollments.

## AI layer

AI is a deterministic template layer over the same filtered repositories. It
does not call an LLM. Insights, current standing and recommendations share one
`load_ai_context` pass (`POST /api/ai/decision`). Dashboard KPI queries do not
wait for that request.

See `docs/ai.md`.

## Caching

AI results use an in-process TTL cache (`backend/services/ai_cache.py`).
Cache keys include `user_id`, role, scope and filters so one user’s result
cannot be served to another. The cache is not shared across multiple API
workers; that is acceptable for a single-instance prototype.

## Local run

Frontend:

```sh
npm install
npm run dev
```

Backend (from `backend/`):

```sh
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL=...
export JWT_SECRET=...
uvicorn main:app --reload
```

Apply schema or migrations before first use. See `docs/data-model.md`.
