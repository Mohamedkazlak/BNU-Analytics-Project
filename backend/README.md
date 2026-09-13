# FastAPI Backend

This is the scaffolding for the future FastAPI backend that will serve the BNU Analytics Dashboard.

## Setup

1. Make sure you have Python 3.9+ installed.
2. Create and activate a virtual environment (recommended):
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the server:
   ```bash
   DATABASE_URL="postgresql://user:pass@localhost:5432/postgres" uvicorn main:app --reload
   ```

_(Adjust the `DATABASE_URL` to point to your seeded PostgreSQL instance)._

## How it works

The backend uses `asyncpg` for fast PostgreSQL connections.
A Dependency (`get_db`) looks for the `X-User-Id` header sent by the frontend (which corresponds to `app.current_user_id`), and automatically sets it in the Postgres transaction state. This securely enforces the Row Level Security (RLS) policies defined in `db/schema.sql`.

Currently, it implements a single endpoint (`/api/management-overview`) reading from the `v_exam_attempts` view to demonstrate how data projection translates from the previous mock data into direct SQL queries.

## Next Steps

- Translate the remaining functions from `src/lib/api.ts` into FastAPI endpoints.
- In `src/lib/api.ts`, replace the mock `request(...)` calls with actual `fetch('http://localhost:8000/api/...')` passing `X-User-Id: getActiveDemoUserId()`.
