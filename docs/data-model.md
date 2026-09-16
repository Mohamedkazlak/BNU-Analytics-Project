# Data model

The Git schema in `db/schema.sql` is the intended reproducible database.

## Org mapping

Analytics “college” is `org_units` at `level = 'program'`. “Sector” is
`org_units.level = 'sector'`. “Curriculum” is a `courses` row.

## Curriculum metadata

`courses` includes:

- `requirement_level_type text` — curriculum-report values `college` or
  `university`. Default `college` is a **placeholder** when authoritative
  metadata has not been imported. The application does not infer this from
  year level, course code, or course name.
- `counted_in_cumulative_gpa boolean not null default true`
- `pass_fail_subject boolean not null default false`

Those last two flags are independent. GPA rules live in
`backend/services/gpa.py`:

- A course contributes to cumulative GPA only when
  `counted_in_cumulative_gpa = true`.
- A pass/fail subject does not contribute letter-grade quality points when
  `pass_fail_subject = true`.
- Remaining courses use `grade points × credit hours` on a documented 4.0
  table (not an official BNU policy table unless one is supplied later).

## Real vs synthetic

Assessment/grade activity tables have `is_synthetic boolean not null default false`:

- `exams`
- `questions`
- `exam_attempts`
- `attempt_answers`
- `integrity_flags`
- `transcript_entries`

Imported university people, students and course catalogs stay unmarked.
Generated demo assessments are flagged `true`. Filter options and management
overview expose `containsSynthetic` so the UI can label demonstration
statistics. Synthetic data must not be presented as official grades.

## Database setup

### Environment

See `.env.example`. Required for the API:

- `DATABASE_URL` — application role (non-BYPASSRLS in production)
- `JWT_SECRET`
- `CORS_ORIGINS`

Optional: `DATABASE_ADMIN_URL` for migrations.

The API does not rewrite usernames and does not embed passwords.

### Fresh install

```sh
psql "$DATABASE_ADMIN_URL" -v ON_ERROR_STOP=1 -f db/schema.sql
psql "$DATABASE_ADMIN_URL" -v ON_ERROR_STOP=1 -f db/seed.sql
ALTER ROLE app_user LOGIN PASSWORD '...';  # out of band
```

Then point `DATABASE_URL` at `app_user`.

### Existing database

```sh
python backend/run_migration.py
```

The runner records applied files in `public.schema_migrations` and applies
each version once, in a transaction. Use `DATABASE_ADMIN_URL` if
`DATABASE_URL` is the least-privilege app role.

Migrations:

1. `001_curriculum_metadata.sql` — text `college`/`university` plus GPA flags
2. `002_performance_indexes.sql`
3. `003_synthetic-data-markers.sql`
4. `004_exam_attempt_scope_columns.sql`
5. `005_auth_and_exam_average_helpers.sql`
6. `006_synthetic_item_answers.sql`
7. `007_org_unit_rls_and_helpers.sql` — scoped org-unit RLS and helper hardening

## Views

`v_exam_attempts` is the primary analytics view and exposes `sector_id` and
`program_id` so repositories can filter in SQL instead of loading every
attempt into Python.
