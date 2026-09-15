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
- AI-assisted insights and recommendations

## Architecture

```text
React / TanStack Start
        |
        v
FastAPI REST API
        |
        v
PostgreSQL / Supabase
        |
        +--> RLS / scope-aware data access
        +--> academic, assessment and integrity data
```

The frontend uses the FastAPI API in production mode; the API uses asyncpg and PostgreSQL. The repository also contains a legacy/mock-data path used during early UI development.

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TanStack Start/Router, TanStack Query, Tailwind CSS, Recharts |
| Backend | FastAPI, asyncpg, Pydantic, PyJWT |
| Database | PostgreSQL / Supabase, Row Level Security |
| Tooling | Vite, TypeScript, ESLint, Prettier |

## Local development

### Frontend

Requires Node.js and npm.

```sh
npm install
npm run dev
```

Set `VITE_BACKEND_URL` when the API is not running on the default local address.

### Backend

Requires Python 3.9+.

```sh
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Configure the following environment variables before starting the API:

```text
DATABASE_URL=...
JWT_SECRET=...
JWT_EXPIRY_MINUTES=480
CORS_ORIGINS=http://localhost:5173
```

Start the API:

```sh
uvicorn main:app --reload
```

Interactive API documentation is available at `/docs` while the local API is running.

## Data model

The database separates organizational scope, people/students, curriculum, offerings, enrollments, exams, questions, attempts, answers, integrity events, and transcript records. Real student/course/enrollment data can therefore act as the foundation while assessment records can be synthetic for demonstration purposes.

**Important:** synthetic assessment results must be treated as demo data and should never be represented as official university grades.

## Project status

This is a portfolio/prototype analytics system rather than an official university production system. Before production deployment, complete security hardening, secret management, automated tests, database migrations, observability, rate limiting, and deployment configuration.
