# BNU Analytics Dashboard

A role-aware academic assessment analytics platform for Benha National University online testing programs.

**Live app:** https://visual-files.lovable.app

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

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TanStack Start/Router, TanStack Query, Tailwind CSS, Recharts |
| Backend | FastAPI, asyncpg, Pydantic, PyJWT |
| Database | PostgreSQL / Supabase, Row Level Security |
| Tooling | Vite, TypeScript, ESLint, Prettier, Vitest, pytest |

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
export DATABASE_URL=...
export JWT_SECRET=...
export CORS_ORIGINS=http://localhost:5173
uvicorn main:app --reload
```

Interactive API documentation is at `/docs`.

### Database

Fresh install:

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/schema.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/seed.sql
```

Existing database:

```sh
python backend/run_migration.py
```

`DATABASE_URL` is required. Do not commit credentials.

## Tests

```sh
npm run lint
npm run typecheck
npm test
pytest
```

CI runs the same commands in `.github/workflows/ci.yml` without production secrets.

## Data model

Organizational scope, people/students, curriculum metadata (including GPA eligibility and pass/fail), offerings, enrollments, exams, questions, attempts, answers, integrity events, and transcript records live in PostgreSQL. Assessment rows can be marked `is_synthetic` so demo activity is distinguishable from imported university records.

**Important:** synthetic assessment results are demonstration data and must never be represented as official university grades.

GPA is computed on the backend (`backend/services/gpa.py`) using a documented 4.0 scale until an official BNU conversion table is supplied.

## Project status

This is a portfolio/prototype analytics system rather than an official university production system. Remaining production work includes secret management in hosted environments, applying migrations on the live Supabase project, confirming RLS policies after schema changes, multi-instance caching if you scale past one API process, observability, and rate limiting.
