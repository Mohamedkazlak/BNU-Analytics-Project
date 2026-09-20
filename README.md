# BNU Analytics Dashboard

A role-aware academic assessment analytics platform for Benha National University online testing programs.

## What it does

BNU Analytics turns assessment activity into actionable reporting for university, sector, program, and course-level users. The application covers:

- Management and academic performance dashboards
- Student performance and progress
- Course performance
- Exam participation and activity
- Question/item analysis
- Exam integrity monitoring
- Student directory and profiles
- Role- and scope-aware access
- AI-assisted insights, current standing, and recommendations

## Architecture

```text
React / TanStack Start + Query
        |
        v
FastAPI (services + repositories)
        |
        v
PostgreSQL / Supabase
        |
        +--> RLS (`app.current_user_id`)
        +--> SQL-side analytics filters
```

Production frontend data comes only from FastAPI → PostgreSQL. There is no mock-data execution path.

Longer notes: [architecture](docs/architecture.md), [authorization](docs/authorization.md), [data model](docs/data-model.md), [AI](docs/ai.md).

## Layout

```text
.github/             CI
src/                 Frontend (TanStack Start)
  routes/            File-based pages — do not rename this folder
  components/        Shell, chat, AI cards, dashboard widgets
    dashboard/       Shared panels, filters, overview
  lib/
    api.ts           FastAPI client
    auth/            JWT cookie/token and route guards
    ai/              Decision + chat client
    errors/          SSR error pages
backend/             FastAPI (venv + uvicorn live in this directory)
db/                  schema.sql, seed.sql, migrations/
docs/                Architecture, authorization, data model, AI
public/              Brand assets served by Vite

# Tool configs — must stay at repo root (Vite, tsc, ESLint, pytest look here)
.env.example         Copy to .env; never commit secrets
vite.config.ts       Dev server and production build
vitest.config.ts     Frontend unit tests
tsconfig.json        TypeScript
eslint.config.js     Lint
pytest.ini           Backend tests (`pythonpath = backend`)
```

## Stack

| Layer    | Technology                                                              |
| -------- | ----------------------------------------------------------------------- |
| Frontend | React 19, TanStack Start/Router, TanStack Query, Tailwind CSS, Recharts |
| Backend  | FastAPI, asyncpg, Pydantic, PyJWT                                       |
| Database | PostgreSQL / Supabase, Row Level Security                               |
| Tooling  | Vite, TypeScript, ESLint, Prettier, Vitest, pytest                      |

## Local development

Copy `.env.example` and set secrets. Frontend `VITE_BACKEND_URL` defaults to `http://localhost:8000`.

### Frontend

Requires Node.js 22+ and npm.

```sh
npm install
npm run dev
```

### Backend

Requires Python 3.10+.

```sh
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# Put DATABASE_URL and JWT_SECRET in backend/.env (or the repo-root .env)
uvicorn main:app --reload
```

Interactive API documentation is at `/docs`.

### Database

Copy `.env.example`. Do not commit secrets.

The API uses `DATABASE_URL` as supplied. In production that role must **not**
bypass row-level security (do not use Supabase `postgres` for the app). Create
`app_user`, set its password out of band, and point `DATABASE_URL` at it.
Migrations that need DDL can use `DATABASE_ADMIN_URL`.

Fresh install:

```sh
psql "$DATABASE_ADMIN_URL" -v ON_ERROR_STOP=1 -f db/schema.sql
psql "$DATABASE_ADMIN_URL" -v ON_ERROR_STOP=1 -f db/seed.sql
```

Existing database:

```sh
python backend/run_migration.py
```

The runner records versions in `schema_migrations` and will not re-apply a
file. It owns the transaction for each file. `DATABASE_URL` /
`DATABASE_ADMIN_URL` are required. Do not commit credentials.

## Tests

```sh
npm run lint
npm run typecheck
npm test
pytest
```

CI runs the same commands in `.github/workflows/ci.yml` without production secrets.

## Data model

Organizational scope, people/students, curriculum metadata (`college` /
`university` requirement level, GPA eligibility, pass/fail), offerings,
enrollments, exams, questions, attempts, answers, integrity events, and
transcript records live in PostgreSQL. Assessment rows can be marked
`is_synthetic` so demo activity is distinguishable from imported university
records. The UI shows a notice when a scope contains synthetic assessments.

**Important:** synthetic assessment results are demonstration data and must never be represented as official university grades.

GPA is computed on the backend (`backend/services/gpa.py`) using a documented 4.0 scale until an official BNU conversion table is supplied.

## Project status

This is a portfolio/prototype analytics system rather than an official university production system. Remaining production work includes secret management in hosted environments, pointing the live API at a non-BYPASSRLS database role, multi-instance caching if you scale past one API process, observability, and rate limiting.
