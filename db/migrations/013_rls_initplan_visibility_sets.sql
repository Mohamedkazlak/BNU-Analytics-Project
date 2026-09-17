-- Purpose:
-- Stop per-row RLS helper evaluation on analytics views.
-- Policies use uncorrelated `id IN (SELECT current_visible_*_ids())`
-- so PostgreSQL builds a single InitPlan instead of calling SECURITY DEFINER
-- plpgsql helpers once per row of exam_attempts, students, people, and org_units.
--
-- Visibility sets are computed directly from role + assignments + org tree.
-- current_visible_org_unit_ids() does NOT call org_unit_is_visible() per row;
-- the boolean helper wraps the set. University-wide program visibility for
-- senior_management at university scope is unchanged
-- (current_visible_program_ids already returned every program).
--
-- Safety:
-- Definition-only. Does not modify or delete existing rows. Does not disable
-- RLS or FORCE RLS. Does not drop tables, indexes, or constraints.
-- Authorization is intended to be equivalent: the new set-returning helpers
-- encode the same role branches as the previous boolean helpers.
--
-- Evidence:
-- Current seed (app_user u-president, FORCE RLS, 208 exam_attempts):
--   COUNT(*) FROM v_exam_attempts
--     before: Nested Loop + exam_attempt_is_visible/student_is_visible/
--             org_unit_is_visible per row; 64.9ms; 16,798 shared hits;
--             index scans loops=208
--     after:  Hash Join + hashed SubPlan (loops=1); 2.8ms; 99 shared hits
--   v_exam_attempts JOIN v_students
--     before: Nested Loop + the same per-row helpers; 3062ms; 915,396 hits
--     after:  hashed SubPlan (loops=1); 9.8ms; 864 hits
-- Earlier larger local dataset (~3802 attempts) had COUNT(*) ~1112ms /
-- 41,442 hits under per-row helpers and the join timed out at 90s.
-- BYPASSRLS postgres on that dataset was ~10.5ms / 148 hits for COUNT(*).

create or replace function current_visible_org_unit_ids()
returns setof text
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  with acct as (
    select * from current_app_account()
  )
  -- University root is needed for labels / filter ancestry by every role.
  select u.id
  from org_units u, acct
  where acct.id is not null
    and u.level = 'university'

  union

  select acct.scope_id
  from acct
  where acct.id is not null
    and acct.scope_id is not null

  union

  -- University-wide monitoring: sectors and colleges are required for filters.
  select u.id
  from org_units u, acct
  where acct.role = 'it_academic_integrity'

  union

  select u.id
  from org_units u, acct
  join org_units n on n.id = acct.scope_id
  where acct.role = 'senior_management'
    and n.level = 'university'

  union

  select u.id
  from org_units u, acct
  join org_units n on n.id = acct.scope_id
  where acct.role = 'senior_management'
    and n.level = 'sector'
    and u.level = 'program'
    and u.parent_id = n.id

  union

  select n.parent_id
  from acct
  join org_units n on n.id = acct.scope_id
  where acct.role = 'senior_management'
    and n.level not in ('university', 'sector')
    and n.parent_id is not null

  union

  select n.parent_id
  from acct
  join org_units n on n.id = acct.scope_id
  where acct.role in ('program_director', 'academic_affairs')
    and n.parent_id is not null

  union

  select p.id
  from acct
  join staff_course_assignments sca on sca.staff_person_id = acct.person_id
  join courses c on c.id = sca.course_id
  join org_units p on p.id = c.program_id
  where acct.role = 'professor'

  union

  select p.parent_id
  from acct
  join staff_course_assignments sca on sca.staff_person_id = acct.person_id
  join courses c on c.id = sca.course_id
  join org_units p on p.id = c.program_id
  where acct.role = 'professor'
    and p.parent_id is not null

  union

  select p.id
  from acct
  join students s on s.id = acct.student_id
  join org_units p on p.id = s.program_id
  where acct.role = 'student'

  union

  select p.parent_id
  from acct
  join students s on s.id = acct.student_id
  join org_units p on p.id = s.program_id
  where acct.role = 'student'
    and p.parent_id is not null
$$;

create or replace function org_unit_is_visible(p_id text)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(p_id in (select current_visible_org_unit_ids()), false);
$$;

create or replace function current_visible_student_ids()
returns setof text
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
declare
  acct user_accounts;
begin
  acct := current_app_account();
  if acct is null then
    return;
  end if;
  if acct.role = 'student' then
    return query
      select acct.student_id
      where acct.student_id is not null;
    return;
  end if;
  if acct.role = 'professor' then
    return query
      select distinct e.student_id
      from staff_course_assignments sca
      join course_offerings o on o.course_id = sca.course_id
      join enrollments e on e.offering_id = o.id
      where sca.staff_person_id = acct.person_id;
    return;
  end if;
  if acct.role = 'it_academic_integrity' then
    return query
      select distinct a.student_id from exam_attempts a
      union
      select distinct a.student_id
      from integrity_flags f
      join exam_attempts a on a.id = f.attempt_id;
    return;
  end if;
  return query
    select s.id
    from students s
    where s.program_id in (select current_visible_program_ids());
end;
$$;

create or replace function current_visible_course_ids()
returns setof text
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
declare
  acct user_accounts;
begin
  acct := current_app_account();
  if acct is null then
    return;
  end if;
  if acct.role = 'professor' then
    return query
      select sca.course_id
      from staff_course_assignments sca
      where sca.staff_person_id = acct.person_id;
    return;
  end if;
  if acct.role = 'student' then
    return query
      select o.course_id
      from enrollments e
      join course_offerings o on o.id = e.offering_id
      where e.student_id = acct.student_id;
    return;
  end if;
  if acct.role = 'it_academic_integrity' then
    return query
      select distinct o.course_id
      from course_offerings o
      join exams x on x.offering_id = o.id;
    return;
  end if;
  return query
    select c.id
    from courses c
    where c.program_id in (select current_visible_program_ids());
end;
$$;

create or replace function current_visible_offering_ids()
returns setof text
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select o.id
  from course_offerings o
  where o.course_id in (select current_visible_course_ids());
$$;

create or replace function current_visible_exam_ids()
returns setof text
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select x.id
  from exams x
  where x.offering_id in (select current_visible_offering_ids());
$$;

create or replace function current_visible_attempt_ids()
returns setof text
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
declare
  acct user_accounts;
begin
  acct := current_app_account();
  if acct is null then
    return;
  end if;
  if acct.role = 'professor' then
    return query
      select a.id
      from exam_attempts a
      join exams x on x.id = a.exam_id
      join course_offerings o on o.id = x.offering_id
      join staff_course_assignments sca
        on sca.course_id = o.course_id
       and sca.staff_person_id = acct.person_id
      where a.student_id in (
        select e.student_id
        from staff_course_assignments assigned
        join course_offerings eo on eo.course_id = assigned.course_id
        join enrollments e on e.offering_id = eo.id
        where assigned.staff_person_id = acct.person_id
      );
    return;
  end if;
  return query
    select a.id
    from exam_attempts a
    where a.student_id in (select current_visible_student_ids());
end;
$$;

create or replace function current_visible_person_ids()
returns setof text
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
declare
  acct user_accounts;
begin
  acct := current_app_account();
  if acct is null then
    return;
  end if;
  return query
    select acct.person_id
    where acct.person_id is not null;
  if acct.role = 'student' then
    return;
  end if;
  return query
    select s.person_id
    from students s
    where s.id in (select current_visible_student_ids());
  return query
    select st.person_id
    from staff st
    where st.person_id = acct.person_id
       or st.org_unit_id in (select current_visible_org_unit_ids());
  return query
    select o.instructor_id
    from course_offerings o
    where o.course_id in (select current_visible_course_ids());
end;
$$;

create or replace function student_is_visible(p_id text)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(p_id in (select current_visible_student_ids()), false);
$$;

create or replace function course_is_visible(p_id text)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(p_id in (select current_visible_course_ids()), false);
$$;

create or replace function offering_is_visible(p_id text)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(p_id in (select current_visible_offering_ids()), false);
$$;

create or replace function exam_is_visible(p_id text)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(p_id in (select current_visible_exam_ids()), false);
$$;

create or replace function exam_attempt_is_visible(p_student_id text, p_exam_id text)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(
    p_student_id in (select current_visible_student_ids())
    and (
      (select (current_app_account()).role) is distinct from 'professor'
      or p_exam_id in (
        select x.id
        from exams x
        join course_offerings o on o.id = x.offering_id
        join staff_course_assignments sca
          on sca.course_id = o.course_id
         and sca.staff_person_id = (select (current_app_account()).person_id)
      )
    ),
    false
  );
$$;

create or replace function attempt_is_visible(p_id text)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(p_id in (select current_visible_attempt_ids()), false);
$$;

create or replace function get_exam_averages(exam_ids text[])
returns table (exam_id text, avg_score numeric)
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select a.exam_id, avg(a.score) as avg_score
  from exam_attempts a
  where a.exam_id = any(exam_ids)
    and a.status <> 'absent'
    and a.score is not null
    and (
      a.exam_id in (select current_visible_exam_ids())
      or exists (
        select 1
        from exam_attempts mine
        where mine.exam_id = a.exam_id
          and mine.student_id = (select (current_app_account()).student_id)
      )
    )
  group by a.exam_id;
$$;

drop policy if exists org_units_read on org_units;
create policy org_units_read on org_units
  for select using (id in (select current_visible_org_unit_ids()));

drop policy if exists institution_settings_read on institution_settings;
create policy institution_settings_read on institution_settings
  for select using (org_unit_id in (select current_visible_org_unit_ids()));

drop policy if exists academic_years_read on academic_years;
create policy academic_years_read on academic_years
  for select using ((select (current_app_account()).id) is not null);

drop policy if exists terms_read on terms;
create policy terms_read on terms
  for select using ((select (current_app_account()).id) is not null);

drop policy if exists people_read on people;
create policy people_read on people
  for select using (id in (select current_visible_person_ids()));

drop policy if exists staff_read on staff;
create policy staff_read on staff
  for select using (
    (select (current_app_account()).role) is distinct from 'student'
    and (
      person_id = (select (current_app_account()).person_id)
      or org_unit_id in (select current_visible_org_unit_ids())
    )
  );

drop policy if exists students_read on students;
create policy students_read on students
  for select using (id in (select current_visible_student_ids()));

drop policy if exists user_accounts_read on user_accounts;
create policy user_accounts_read on user_accounts
  for select using (id = (select (current_app_account()).id));

drop policy if exists courses_read on courses;
create policy courses_read on courses
  for select using (id in (select current_visible_course_ids()));

drop policy if exists course_offerings_read on course_offerings;
create policy course_offerings_read on course_offerings
  for select using (course_id in (select current_visible_course_ids()));

drop policy if exists course_sections_read on course_sections;
create policy course_sections_read on course_sections
  for select using (offering_id in (select current_visible_offering_ids()));

drop policy if exists staff_course_assignments_read on staff_course_assignments;
create policy staff_course_assignments_read on staff_course_assignments
  for select using (
    (select (current_app_account()).role) not in ('student', 'it_academic_integrity')
    and (
      (
        (select (current_app_account()).role) = 'professor'
        and staff_person_id = (select (current_app_account()).person_id)
      )
      or (
        (select (current_app_account()).role) is distinct from 'professor'
        and course_id in (select current_visible_course_ids())
      )
    )
  );

drop policy if exists enrollments_read on enrollments;
create policy enrollments_read on enrollments
  for select using (
    (select (current_app_account()).role) is distinct from 'it_academic_integrity'
    and student_id in (select current_visible_student_ids())
    and (
      (select (current_app_account()).role) is distinct from 'professor'
      or offering_id in (select current_visible_offering_ids())
    )
  );

drop policy if exists exams_read on exams;
create policy exams_read on exams
  for select using (offering_id in (select current_visible_offering_ids()));

drop policy if exists questions_read on questions;
create policy questions_read on questions
  for select using (exam_id in (select current_visible_exam_ids()));

drop policy if exists exam_attempts_read on exam_attempts;
create policy exam_attempts_read on exam_attempts
  for select using (id in (select current_visible_attempt_ids()));

drop policy if exists attempt_answers_read on attempt_answers;
create policy attempt_answers_read on attempt_answers
  for select using (attempt_id in (select current_visible_attempt_ids()));

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
      and attempt_id in (select current_visible_attempt_ids())
    )
  );

drop policy if exists transcript_entries_read on transcript_entries;
create policy transcript_entries_read on transcript_entries
  for select using (
    (select (current_app_account()).role) is distinct from 'it_academic_integrity'
    and student_id in (select current_visible_student_ids())
  );

revoke all on function current_visible_student_ids() from public;
revoke all on function current_visible_course_ids() from public;
revoke all on function current_visible_org_unit_ids() from public;
revoke all on function current_visible_offering_ids() from public;
revoke all on function current_visible_exam_ids() from public;
revoke all on function current_visible_attempt_ids() from public;
revoke all on function current_visible_person_ids() from public;

grant execute on function current_visible_student_ids() to app_user;
grant execute on function current_visible_course_ids() to app_user;
grant execute on function current_visible_org_unit_ids() to app_user;
grant execute on function current_visible_offering_ids() to app_user;
grant execute on function current_visible_exam_ids() to app_user;
grant execute on function current_visible_attempt_ids() to app_user;
grant execute on function current_visible_person_ids() to app_user;

do $$
declare
  api_role text;
  fn text;
  sigs text[] := array[
    'current_visible_student_ids()',
    'current_visible_course_ids()',
    'current_visible_org_unit_ids()',
    'current_visible_offering_ids()',
    'current_visible_exam_ids()',
    'current_visible_attempt_ids()',
    'current_visible_person_ids()'
  ];
begin
  foreach api_role in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = api_role) then
      foreach fn in array sigs loop
        execute format('revoke all on function %s from %I', fn, api_role);
      end loop;
    end if;
  end loop;
end $$;

comment on function current_visible_student_ids() is
  'Session-visible student ids. STABLE SECURITY DEFINER, RLS off. Used as an uncorrelated IN-list so RLS can InitPlan once per statement.';
comment on function current_visible_course_ids() is
  'Session-visible course ids. STABLE SECURITY DEFINER, RLS off.';
comment on function current_visible_org_unit_ids() is
  'Session-visible org unit ids computed as a set. Does not call org_unit_is_visible() per row.';
comment on function current_visible_attempt_ids() is
  'Session-visible exam_attempt ids. Professor rows also require the exam course to be assigned.';
comment on function org_unit_is_visible(text) is
  'Whether the session role may see this org_units row. Wrapper over current_visible_org_unit_ids().';
