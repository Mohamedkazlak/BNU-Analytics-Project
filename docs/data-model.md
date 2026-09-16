# Data model

The Git schema in `db/schema.sql` is the intended reproducible database.

## Org mapping

Analytics “college” is `org_units` at `level = 'program'`. “Sector” is
`org_units.level = 'sector'`. “Curriculum” is a `courses` row.

## Curriculum metadata

`courses` includes:

- `requirement_level_type`
- `counted_in_cumulative_gpa`
- `pass_fail_subject`

GPA rules live in `backend/services/gpa.py`. Courses with
`counted_in_cumulative_gpa = false` are excluded. Pass/fail subjects do not
contribute letter-grade quality points. Remaining courses use
`grade points × credit hours` on a documented 4.0 table (not an official BNU
policy table unless one is supplied later).

## Real vs synthetic

Assessment/grade activity tables have `is_synthetic boolean not null default false`:

- `exams`
- `questions`
- `exam_attempts`
- `attempt_answers`
- `integrity_flags`
- `transcript_entries`

Imported university people, students and course catalogs stay unmarked.
Generated demo assessments are flagged `true`. Synthetic data is for analytics
demonstration only and must not be presented as official grades.

## Migrations

Apply in order from `db/migrations/`:

1. `001_curriculum_metadata.sql`
2. `002_performance_indexes.sql` — `org_units(level, parent_id)` for college
   lists; `(exam_id, status)` for pass-rate aggregates; partial
   `user_accounts(student_id)` for login
3. `003_synthetic-data-markers.sql`
4. `004_exam_attempt_scope_columns.sql`
5. `005_auth_and_exam_average_helpers.sql`
6. `006_synthetic_item_answers.sql`

Fresh databases can load `db/schema.sql` then `db/seed.sql`. Existing
databases should run `python backend/run_migration.py` with `DATABASE_URL`
set (no hardcoded credentials).

## Views

`v_exam_attempts` is the primary analytics view and exposes `sector_id` and
`program_id` so repositories can filter in SQL instead of loading every
attempt into Python.
