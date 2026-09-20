-- Purpose:
-- AI Insights (and integrity/attendance name lookups) joined v_exam_attempts
-- to v_students. That nested-looped attempts × students under RLS and will
-- not scale past the imported ~3.8k attempts. Expose student_name on the
-- attempts view (people is already keyed from students.person_id). Point
-- exam_attempts RLS at student_id / exam_id InitPlans instead of
-- materializing every visible attempt id.
--
-- Safety:
-- Definition-only. Replaces the view and two SELECT policies. Does not
-- modify or delete rows. Does not disable RLS or FORCE RLS. Does not drop
-- tables, indexes, or constraints. Visibility is intended to match
-- current_visible_attempt_ids() / exam_attempt_is_visible().

drop view if exists v_exam_attempts;
create view v_exam_attempts
  with (security_invoker = true)
as
select
  a.id,
  a.exam_id,
  a.student_id,
  st.section,
  pe.full_name as student_name,
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
join people pe on pe.id = st.person_id
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

drop policy if exists exam_attempts_read on exam_attempts;
create policy exam_attempts_read on exam_attempts
  for select using (
    student_id in (select current_visible_student_ids())
    and (
      (select (current_app_account()).role) is distinct from 'professor'
      or exam_id in (select current_visible_exam_ids())
    )
  );

drop policy if exists integrity_flags_read on integrity_flags;
create policy integrity_flags_read on integrity_flags
  for select using (
    (select (current_app_account()).role) = 'it_academic_integrity'
    or (
      (select (current_app_account()).role) in (
        'senior_management',
        'program_director',
        'academic_affairs',
        'professor'
      )
      and exists (
        select 1
        from exam_attempts a
        where a.id = integrity_flags.attempt_id
      )
    )
  );
