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
A Dependency (`get_db_conn`) looks for the JWT token sent by the frontend, verifies it, decodes it into a `UserContext` and sets the `app.current_user_id` inside the Postgres transaction state. This securely enforces the Row Level Security (RLS) policies.

## Next Steps

- Translate the remaining functions from `src/lib/api.ts` into FastAPI endpoints.
- In `src/lib/api.ts`, replace the mock `request(...)` calls with actual `fetch('http://localhost:8000/api/...')` passing `Authorization: Bearer <jwt>`.
