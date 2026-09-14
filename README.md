# BNU Analytics Dashboard

Assessment reporting and analytics for Benha National University online testing programs.

**Live app**: [https://visual-files.lovable.app](https://visual-files.lovable.app)

This project was built with [Lovable](https://lovable.dev). Continue in the [Lovable editor](https://lovable.dev/projects/9f949ac3-26a0-42dd-bf4b-c8597d91fb59) — commits on the connected branch sync both ways.

## Stack

| Layer    | Tech                                                                      |
| -------- | ------------------------------------------------------------------------- |
| Frontend | React 19, TanStack Start / Router, TanStack Query, Tailwind CSS, Recharts |
| Backend  | FastAPI, asyncpg, Pydantic                                                |
| Data     | PostgreSQL (Row Level Security via `app.current_user_id`)                 |

The frontend talks to the FastAPI server at `http://localhost:8000` (see `src/lib/api.ts`).

## Installation

### Frontend

Requires Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

### Backend

Requires Python 3.9+ and a seeded PostgreSQL database (`db/schema.sql`, `db/seed.sql`).

```sh
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Copy `backend/.env.example` to `backend/.env` and set your `DATABASE_URL`, then start the API:

```sh
uvicorn main:app --reload
```

Interactive OpenAPI docs: [http://localhost:8000/docs](http://localhost:8000/docs)
