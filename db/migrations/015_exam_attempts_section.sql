-- Purpose:
-- v_exam_attempts already joins students. Expose st.section so course
-- performance can GROUP BY section without joining v_students (people +
-- extra org_units RLS). On the imported dataset that join nested-looped
-- 3802×648 rows (~3s after 013; previously timed out under per-row RLS).
--
-- Safety:
-- Definition-only. Replaces the view. Does not modify or delete rows.
-- Does not disable RLS or FORCE RLS. Does not drop tables, indexes, or
-- constraints. Column is additive.

drop view if exists v_exam_attempts;
create view v_exam_attempts
  with (security_invoker = true)
as
select
  a.id,
  a.exam_id,
  a.student_id,
  st.section,
  a.enrollment_id,
  a.score,
  a.time_taken_min,
  a.started_at,
  a.ended_at,
  host(a.ip) as ip,
  a.device,
  a.attempt_count,
  a.late_start,
  a.status,
  (a.status <> 'absent') as participated,
  p.id as program_id,
  p.name as program,
  sec.id as sector_id,
  sec.name as sector,
  c.id as course_id,
  c.code as course_code,
  x.title as exam_title,
  x.scheduled_at
from exam_attempts a
join students st on st.id = a.student_id
join org_units p on p.id = st.program_id
join org_units sec on sec.id = p.parent_id
join exams x on x.id = a.exam_id
join course_offerings o on o.id = x.offering_id
join courses c on c.id = o.course_id;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'app_user') then
    grant select on v_exam_attempts to app_user;
  end if;
end $$;
