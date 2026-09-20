# FastAPI backend

Role-scoped analytics API for the BNU dashboard. PostgreSQL row-level security
is enforced per request via `app.current_user_id`.

Root [README](../README.md) has full setup. Copy `../.env.example` to `.env`
at the repo root (or export the same variables) before running.

```sh
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Run from this directory so Python can import `core`, `routers`, `services`,
and `repositories`. Interactive docs: `/docs`.

Apply schema changes with `python run_migration.py` (uses `db/migrations/`
at the repo root, and `DATABASE_ADMIN_URL` when set).
