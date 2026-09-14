-- Restore org-scoped RLS without infinite recursion.
-- Apply as the table owner (postgres), not app_user.

begin;

-- ---------------------------------------------------------------------------
-- Scope helpers (used by RLS)
-- SECURITY DEFINER + row_security=off so policies never join RLS tables
-- directly (that recurses under FORCE ROW LEVEL SECURITY).
-- ---------------------------------------------------------------------------

create or replace function org_descendants(root_id text)
returns setof text
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  with recursive tree as (
    select id from org_units where id = root_id
    union all
    select child.id
    from org_units child
    join tree on child.parent_id = tree.id
  )
  select id from tree;
$$;

create or replace function current_app_account()
returns user_accounts
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
declare
  rec user_accounts;
  uid text;
begin
  uid := nullif(current_setting('app.current_user_id', true), '');
  if uid is null then
    return null;
  end if;
  select * into rec from user_accounts where id = uid;
  return rec;
end;
$$;

-- President / VP (university): every program.
-- Sector dean: programs whose parent is the sector.
-- Program director / college academic affairs: their program only.
-- Professor, student, IT: empty here — they use dedicated helpers.
create or replace function current_visible_program_ids()
returns setof text
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
declare
  acct user_accounts;
  node org_units;
begin
  acct := current_app_account();
  if acct is null or acct.scope_id is null then
    return;
  end if;
  if acct.role not in ('senior_management', 'program_director', 'academic_affairs') then
    return;
  end if;
  select * into node from org_units where id = acct.scope_id;
  if not found then
    return;
  end if;
  if node.level = 'university' then
    return query select id from org_units where level = 'program';
  elsif node.level = 'sector' then
    return query select id from org_units where parent_id = node.id and level = 'program';
  else
    return query select node.id;
  end if;
end;
$$;

create or replace function current_professor_course_ids()
returns setof text
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select sca.course_id
  from staff_course_assignments sca
  where sca.staff_person_id = (current_app_account()).person_id;
$$;

create or replace function current_student_course_ids()
returns setof text
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select o.course_id
  from enrollments e
  join course_offerings o on o.id = e.offering_id
  where e.student_id = (current_app_account()).student_id;
$$;

create or replace function student_is_visible(p_id text)
returns boolean
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
  if acct is null or p_id is null then
    return false;
  end if;
  if acct.role = 'student' then
    return p_id = acct.student_id;
  end if;
  if acct.role = 'professor' then
    return exists (
      select 1
      from enrollments e
      join course_offerings o on o.id = e.offering_id
      where e.student_id = p_id
        and o.course_id in (select current_professor_course_ids())
    );
  end if;
  -- IT: anyone sitting (or flagged on) an exam, for live monitoring.
  if acct.role = 'it_academic_integrity' then
    return exists (select 1 from exam_attempts a where a.student_id = p_id)
        or exists (
          select 1
          from integrity_flags f
          join exam_attempts a on a.id = f.attempt_id
          where a.student_id = p_id
        );
  end if;
  return exists (
    select 1 from students s
    where s.id = p_id
      and s.program_id in (select current_visible_program_ids())
  );
end;
$$;

create or replace function course_is_visible(p_id text)
returns boolean
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
  if acct is null or p_id is null then
    return false;
  end if;
  if acct.role = 'professor' then
    return p_id in (select current_professor_course_ids());
  end if;
  if acct.role = 'student' then
    return p_id in (select current_student_course_ids());
  end if;
  if acct.role = 'it_academic_integrity' then
    return exists (
      select 1
      from course_offerings o
      join exams x on x.offering_id = o.id
      where o.course_id = p_id
    );
  end if;
  return exists (
    select 1 from courses c
    where c.id = p_id
      and c.program_id in (select current_visible_program_ids())
  );
end;
$$;

create or replace function offering_is_visible(p_id text)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(course_is_visible(o.course_id), false)
  from course_offerings o
  where o.id = p_id;
$$;

create or replace function exam_is_visible(p_id text)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(offering_is_visible(x.offering_id), false)
  from exams x
  where x.id = p_id;
$$;

create or replace function exam_attempt_is_visible(p_student_id text, p_exam_id text)
returns boolean
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
    return false;
  end if;
  if not student_is_visible(p_student_id) then
    return false;
  end if;
  if acct.role = 'professor' then
    return exists (
      select 1
      from exams x
      join course_offerings o on o.id = x.offering_id
      where x.id = p_exam_id
        and o.course_id in (select current_professor_course_ids())
    );
  end if;
  return true;
end;
$$;

create or replace function attempt_is_visible(p_id text)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(exam_attempt_is_visible(a.student_id, a.exam_id), false)
  from exam_attempts a
  where a.id = p_id;
$$;

-- Class average for a student's own dashboard without leaking other rows.
create or replace function exam_class_average(p_exam_id text)
returns numeric
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
declare
  acct user_accounts;
  result numeric;
begin
  acct := current_app_account();
  if acct is null then
    return null;
  end if;
  if acct.role = 'student' then
    if not exists (
      select 1 from exam_attempts a
      where a.exam_id = p_exam_id and a.student_id = acct.student_id
    ) then
      return null;
    end if;
  elsif not coalesce(exam_is_visible(p_exam_id), false) then
    return null;
  end if;
  select round(avg(score)::numeric, 1) into result
  from exam_attempts
  where exam_id = p_exam_id and status <> 'absent' and score is not null;
  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- Policies call SECURITY DEFINER helpers so FORCE RLS cannot recurse.
-- Visibility:
--   President / VP AA     university (every program)
--   Sector dean           colleges in the sector
--   Program director      own college
--   Academic affairs      students of own college
--   Professor             assigned curricula
--   IT / integrity        live exams + flagged attempts
--   Student               own performance
-- ---------------------------------------------------------------------------

alter table org_units enable row level security;
alter table institution_settings enable row level security;
alter table academic_years enable row level security;
alter table terms enable row level security;
alter table people enable row level security;
alter table staff enable row level security;
alter table students enable row level security;
alter table user_accounts enable row level security;
alter table courses enable row level security;
alter table course_offerings enable row level security;
alter table course_sections enable row level security;
alter table staff_course_assignments enable row level security;
alter table enrollments enable row level security;
alter table exams enable row level security;
alter table questions enable row level security;
alter table exam_attempts enable row level security;
alter table attempt_answers enable row level security;
alter table integrity_flags enable row level security;
alter table transcript_entries enable row level security;

drop policy if exists org_units_read on org_units;
create policy org_units_read on org_units
  for select using ((current_app_account()).id is not null);

drop policy if exists institution_settings_read on institution_settings;
create policy institution_settings_read on institution_settings
  for select using ((current_app_account()).id is not null);

drop policy if exists academic_years_read on academic_years;
create policy academic_years_read on academic_years
  for select using ((current_app_account()).id is not null);

drop policy if exists terms_read on terms;
create policy terms_read on terms
  for select using ((current_app_account()).id is not null);

drop policy if exists people_read on people;
create policy people_read on people
  for select using (
    (current_app_account()).id is not null
    and (
      (current_app_account()).role <> 'student'
      or (current_app_account()).person_id = people.id
    )
  );

drop policy if exists staff_read on staff;
create policy staff_read on staff
  for select using ((current_app_account()).role <> 'student');

drop policy if exists students_read on students;
create policy students_read on students
  for select using (student_is_visible(id));

drop policy if exists user_accounts_read on user_accounts;
create policy user_accounts_read on user_accounts
  for select using (id = (current_app_account()).id);

drop policy if exists courses_read on courses;
create policy courses_read on courses
  for select using (course_is_visible(id));

drop policy if exists course_offerings_read on course_offerings;
create policy course_offerings_read on course_offerings
  for select using (course_is_visible(course_id));

drop policy if exists course_sections_read on course_sections;
create policy course_sections_read on course_sections
  for select using (coalesce(offering_is_visible(offering_id), false));

drop policy if exists staff_course_assignments_read on staff_course_assignments;
create policy staff_course_assignments_read on staff_course_assignments
  for select using (
    (current_app_account()).role not in ('student', 'it_academic_integrity')
    and (
      (
        (current_app_account()).role = 'professor'
        and staff_person_id = (current_app_account()).person_id
      )
      or (
        (current_app_account()).role <> 'professor'
        and course_is_visible(course_id)
      )
    )
  );

drop policy if exists enrollments_read on enrollments;
create policy enrollments_read on enrollments
  for select using (
    (current_app_account()).role <> 'it_academic_integrity'
    and student_is_visible(student_id)
    and (
      (current_app_account()).role <> 'professor'
      or exists (
        select 1 from course_offerings o
        where o.id = enrollments.offering_id
          and o.course_id in (select current_professor_course_ids())
      )
    )
  );

drop policy if exists exams_read on exams;
create policy exams_read on exams
  for select using (coalesce(offering_is_visible(offering_id), false));

drop policy if exists questions_read on questions;
create policy questions_read on questions
  for select using (coalesce(exam_is_visible(exam_id), false));

drop policy if exists exam_attempts_read on exam_attempts;
create policy exam_attempts_read on exam_attempts
  for select using (exam_attempt_is_visible(student_id, exam_id));

drop policy if exists attempt_answers_read on attempt_answers;
create policy attempt_answers_read on attempt_answers
  for select using (coalesce(attempt_is_visible(attempt_id), false));

drop policy if exists integrity_flags_read on integrity_flags;
create policy integrity_flags_read on integrity_flags
  for select using (
    (current_app_account()).role = 'it_academic_integrity'
    or (
      (current_app_account()).role in (
        'senior_management',
        'program_director',
        'academic_affairs',
        'professor'
      )
      and coalesce(attempt_is_visible(attempt_id), false)
    )
  );

drop policy if exists transcript_entries_read on transcript_entries;
create policy transcript_entries_read on transcript_entries
  for select using (
    (current_app_account()).role <> 'it_academic_integrity'
    and student_is_visible(student_id)
  );

comment on table org_units is 'University → sector → program tree. scope_id on user_accounts points here.';
comment on table enrollments is 'A student may sit an exam only through an enrollment on that offering.';
comment on table exam_attempts is 'Roster row per enrollment × exam; status=absent means no sitting.';
comment on table transcript_entries is 'Closed academic-year grades when live exam rows are not kept.';
comment on function current_app_account() is 'Reads app.current_user_id (user_accounts.id). Set in the API session.';
comment on function student_is_visible(text) is 'Whether the session role may see this student row.';
comment on function course_is_visible(text) is 'Whether the session role may see this course row.';

-- Login helper: bypass user_accounts RLS for credential lookup.
create or replace function get_user_for_login(p_id text)
returns table (
    id text,
    person_id text,
    role app_role,
    scope_id text,
    student_id text,
    password_hash text
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
    return query
    select u.id, u.person_id, u.role, u.scope_id, u.student_id, u.password_hash
    from user_accounts u
    where u.id = p_id;
end;
$$;

revoke all on function org_descendants(text) from public;
revoke all on function current_app_account() from public;
revoke all on function current_visible_program_ids() from public;
revoke all on function current_professor_course_ids() from public;
revoke all on function current_student_course_ids() from public;
revoke all on function student_is_visible(text) from public;
revoke all on function course_is_visible(text) from public;
revoke all on function offering_is_visible(text) from public;
revoke all on function exam_is_visible(text) from public;
revoke all on function exam_attempt_is_visible(text, text) from public;
revoke all on function attempt_is_visible(text) from public;
revoke all on function exam_class_average(text) from public;
revoke all on function get_user_for_login(text) from public;

grant execute on function org_descendants(text) to app_user;
grant execute on function current_app_account() to app_user;
grant execute on function current_visible_program_ids() to app_user;
grant execute on function current_professor_course_ids() to app_user;
grant execute on function current_student_course_ids() to app_user;
grant execute on function student_is_visible(text) to app_user;
grant execute on function course_is_visible(text) to app_user;
grant execute on function offering_is_visible(text) to app_user;
grant execute on function exam_is_visible(text) to app_user;
grant execute on function exam_attempt_is_visible(text, text) to app_user;
grant execute on function attempt_is_visible(text) to app_user;
grant execute on function exam_class_average(text) to app_user;
grant execute on function get_user_for_login(text) to app_user;

commit;
