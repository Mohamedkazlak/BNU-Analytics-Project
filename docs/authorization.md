# Authorization

Two boundaries must agree:

1. FastAPI authorization (`backend/core/authorization.py`,
   `validate_analytics_filters` in `backend/repositories/accounts.py`)
2. PostgreSQL RLS using `set_config('app.current_user_id', …, true)` on every
   pooled connection (`backend/db/pool.py`)

```text
JWT
 → live user_accounts lookup
 → role + scope
 → application filter validation
 → repository query
 → PostgreSQL RLS
```

Hiding a control in React is not authorization. The in-process AI cache is
also not a security boundary.

## Roles

| Account | `user_accounts.role` | Typical `org_units.level` | UI filters | Org metadata visible via RLS |
| --- | --- | --- | --- | --- |
| University senior management | `senior_management` | `university` | Sector, College, Curriculum, Student (sector + college required) | University, all sectors, all colleges |
| Sector dean | `senior_management` | `sector` | College, Curriculum, Student (locked to own sector) | University, own sector, colleges in that sector |
| Program director | `program_director` | `program` | Curriculum, Student (locked to own college) | University, parent sector, own college |
| Academic affairs | `academic_affairs` | `program` | Curriculum, Student (locked to own college) | Same as program director |
| Professor | `professor` | n/a | Student (assigned courses/sections only) | University plus sector/college of assigned curricula |
| IT / academic integrity | `it_academic_integrity` | often null / university | Sector, College, Curriculum, Student | University-wide org metadata needed for monitoring filters |
| Student | `student` | n/a | none (own record only) | University, own college, parent sector |

Role and scope are loaded from `user_accounts` on every request
(`get_live_user`). A JWT that claims a different role is ignored.

## Filter rules

- Filters may only **narrow** the authorized scope.
- Sending another sector, college, curriculum or student ID returns 403 (or
  400 for an invalid hierarchy such as a college that does not belong to the
  selected sector).
- A professor may access a student only through enrollment → offering →
  assigned course. Knowing a student id is not enough.
- Students querying `studentId` for anyone else receive 403, including
  `GET /api/student-dashboard?studentId=other` and `GET /api/students/{other}`.
- Query-string tampering is covered by `backend/tests/test_scope.py`,
  `backend/tests/test_authorization.py`, and PostgreSQL integration tests.

Student option lists may be paged (`LIMIT` + search). That limit is a UI
constraint, not an access-control mechanism. `hasMoreStudents` tells the
client to search rather than assuming the truncated list is complete.

## RLS

RLS is enabled and FORCED on academic tables in `db/schema.sql`. Policies
call `SECURITY DEFINER` helpers (`search_path = public`, `row_security = off`)
so FORCE RLS cannot recurse. Helpers revoke PUBLIC execute and grant execute
to `app_user` only. `current_app_account()` never returns `password_hash`.

`org_units` is scoped by `org_unit_is_visible()` — not “any authenticated
account.” People and staff rows are limited to the caller’s own person,
visible students, and staff/instructors in visible org units or courses.

The API must connect as a non-`BYPASSRLS` role. In production the process
refuses to start if `DATABASE_URL` is a superuser / BYPASSRLS role (including
Supabase `postgres`). Copy the host’s connection string for `app_user` into
`DATABASE_URL` after an operator sets that role’s password out of band. Direct
Postgres uses `app_user`. Some poolers (including Supabase Supavisor) append
`.<project-ref>` to the username — use that form only when the dashboard
shows it. The API does not rewrite usernames. Migrations may use
`DATABASE_ADMIN_URL`.

CI integration tests create a disposable Postgres database and exercise RLS
with `SET app.current_user_id`.
