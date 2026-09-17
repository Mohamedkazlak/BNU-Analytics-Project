-- Purpose:
-- Enforce that exam_attempts.student_id matches the student on the
-- referenced enrollment. Individual FKs currently allow
-- exam_attempt.student_id = A while enrollment_id belongs to student B.
-- Independent of RLS policy rewrites and of application filter behavior.
--
-- Safety:
-- Additive constraint. Does not modify or delete existing rows.
-- If any violating row exists, this migration raises and records nothing
-- (the runner wraps the file in a transaction). It never rewrites data to
-- make the constraint pass.
-- UNIQUE (enrollments.id, student_id) is implied by PRIMARY KEY (id) but
-- PostgreSQL requires an explicit unique constraint on the referenced
-- columns.
--
-- Evidence (local seed / imported dataset):
-- SELECT count(*) FROM exam_attempts a
-- JOIN enrollments e ON e.id = a.enrollment_id
-- WHERE a.student_id IS DISTINCT FROM e.student_id  → 0.
-- The same scan found 0 offering mismatches (exam vs enrollment) and 0
-- section/offering mismatches. Those remain documented as application
-- invariants; encoding offering equality needs a stored offering_id and
-- is not added here.

do $$
declare
  mismatch integer;
begin
  if to_regclass('public.enrollments') is null
     or to_regclass('public.exam_attempts') is null then
    return;
  end if;

  select count(*) into mismatch
  from public.exam_attempts a
  where a.enrollment_id is not null
    and not exists (
      select 1
      from public.enrollments e
      where e.id = a.enrollment_id
        and e.student_id = a.student_id
    );

  if mismatch > 0 then
    raise exception
      'exam_attempts_enrollment_student_fk: % row(s) have enrollment_id/student_id pairs that do not exist on enrollments. Refusing to add the constraint. No rows were modified.',
      mismatch;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'enrollments_id_student_id_key'
      and conrelid = 'public.enrollments'::regclass
  ) then
    alter table public.enrollments
      add constraint enrollments_id_student_id_key unique (id, student_id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'exam_attempts_enrollment_student_fk'
      and conrelid = 'public.exam_attempts'::regclass
  ) then
    alter table public.exam_attempts
      add constraint exam_attempts_enrollment_student_fk
      foreign key (enrollment_id, student_id)
      references public.enrollments (id, student_id);
  end if;
end $$;
