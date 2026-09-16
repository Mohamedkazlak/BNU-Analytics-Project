# Authorization

Two boundaries must agree:

1. FastAPI authorization (`backend/core/authorization.py`,
   `validate_analytics_filters` in `backend/repositories/accounts.py`)
2. PostgreSQL RLS using `set_config('app.current_user_id', …, true)` on every
   pooled connection (`backend/db/pool.py`)

Hiding a control in React is not authorization.

## Roles

| Account | `user_accounts.role` | Typical `org_units.level` | UI filters |
| --- | --- | --- | --- |
| University senior management | `senior_management` | `university` | Sector, College, Curriculum, Student (sector + college required) |
| Sector dean | `senior_management` | `sector` | College, Curriculum, Student (locked to own sector) |
| Program director | `program_director` | `program` | Curriculum, Student (locked to own college) |
| Academic affairs | `academic_affairs` | `program` | Curriculum, Student (locked to own college) |
| Professor | `professor` | n/a | Student (assigned courses/sections only) |
| IT / academic integrity | `it_academic_integrity` | often null / university | Sector, College, Curriculum, Student |
| Student | `student` | n/a | none (own record only) |

Role and scope are loaded from `user_accounts` on every request
(`get_live_user`). A JWT that claims a different role is ignored.

## Filter rules

- Filters may only **narrow** the authorized scope.
- Sending another sector, college, curriculum or student ID returns 403 (or
  400 for an invalid hierarchy such as a college that does not belong to the
  selected sector).
- Query-string tampering is exercised in `backend/tests/test_scope.py`.

## RLS

RLS remains enabled / FORCE on academic tables in `db/schema.sql`. Policies
key off `app.current_user_id`. Application-level filter checks are extra; they
must not be weaker than RLS. Full policy behavior against a live database is
not proven by the unit tests in CI (those tests mock SQL or call pure Python
authorization). After applying migrations, verify policies in the Supabase
SQL editor if you change roles or tables.
