-- Fold login helper, corrected class-average helper, FORCE RLS, and grants
-- into an incremental migration for databases created from older schema.sql.

begin;

alter table user_accounts add column if not exists password_hash text;

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

-- Replaces the broken helper that filtered on exam_attempts.participated
-- (that column exists only on v_exam_attempts).
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
  group by a.exam_id;
$$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_user') then
    create role app_user login;
  end if;
end
$$;

grant usage on schema public to app_user;
grant select on all tables in schema public to app_user;

alter table org_units force row level security;
alter table institution_settings force row level security;
alter table academic_years force row level security;
alter table terms force row level security;
alter table people force row level security;
alter table staff force row level security;
alter table students force row level security;
alter table user_accounts force row level security;
alter table courses force row level security;
alter table course_offerings force row level security;
alter table course_sections force row level security;
alter table staff_course_assignments force row level security;
alter table enrollments force row level security;
alter table exams force row level security;
alter table questions force row level security;
alter table exam_attempts force row level security;
alter table attempt_answers force row level security;
alter table integrity_flags force row level security;
alter table transcript_entries force row level security;

revoke all on function get_user_for_login(text) from public;
revoke all on function get_exam_averages(text[]) from public;
grant execute on function get_user_for_login(text) to app_user;
grant execute on function get_exam_averages(text[]) to app_user;

commit;
