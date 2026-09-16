-- Tighten org-unit RLS to authorized scope, redact password hashes from
-- current_app_account(), and constrain get_exam_averages() to visible exams.
-- Idempotent: CREATE OR REPLACE + DROP POLICY IF EXISTS.

begin;

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
  if not found then
    return null;
  end if;
  rec.password_hash := null;
  return rec;
end;
$$;

create or replace function org_unit_is_visible(p_id text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
declare
  acct user_accounts;
  node org_units;
  target org_units;
begin
  acct := current_app_account();
  if acct is null or p_id is null then
    return false;
  end if;

  select * into target from org_units where id = p_id;
  if not found then
    return false;
  end if;

  -- University root is needed for labels / filter ancestry by every role.
  if target.level = 'university' then
    return true;
  end if;

  if acct.scope_id is not null and p_id = acct.scope_id then
    return true;
  end if;

  -- University-wide monitoring: sectors and colleges are required for filters.
  if acct.role = 'it_academic_integrity' then
    return true;
  end if;

  if acct.role = 'senior_management' then
    if acct.scope_id is null then
      return false;
    end if;
    select * into node from org_units where id = acct.scope_id;
    if not found then
      return false;
    end if;
    if node.level = 'university' then
      return true;
    end if;
    if node.level = 'sector' then
      return p_id = node.id
          or (target.level = 'program' and target.parent_id = node.id);
    end if;
    return p_id = node.id or p_id = node.parent_id;
  end if;

  if acct.role in ('program_director', 'academic_affairs') then
    if acct.scope_id is null then
      return false;
    end if;
    select * into node from org_units where id = acct.scope_id;
    if not found then
      return false;
    end if;
    return p_id = node.id or p_id = node.parent_id;
  end if;

  if acct.role = 'professor' then
    return exists (
      select 1
      from courses c
      join org_units p on p.id = c.program_id
      where c.id in (select current_professor_course_ids())
        and (p.id = p_id or p.parent_id = p_id)
    );
  end if;

  if acct.role = 'student' then
    return exists (
      select 1
      from students s
      join org_units p on p.id = s.program_id
      where s.id = acct.student_id
        and (p.id = p_id or p.parent_id = p_id)
    );
  end if;

  return false;
end;
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
      exam_is_visible(a.exam_id)
      or exists (
        select 1
        from exam_attempts mine
        where mine.exam_id = a.exam_id
          and mine.student_id = (current_app_account()).student_id
      )
    )
  group by a.exam_id;
$$;

drop policy if exists org_units_read on org_units;
create policy org_units_read on org_units
  for select using (org_unit_is_visible(id));

drop policy if exists institution_settings_read on institution_settings;
create policy institution_settings_read on institution_settings
  for select using (org_unit_is_visible(org_unit_id));

drop policy if exists people_read on people;
create policy people_read on people
  for select using (
    id = (current_app_account()).person_id
    or (
      (current_app_account()).role <> 'student'
      and (
        exists (
          select 1 from students s
          where s.person_id = people.id and student_is_visible(s.id)
        )
        or exists (
          select 1 from staff st
          where st.person_id = people.id
            and (
              st.person_id = (current_app_account()).person_id
              or org_unit_is_visible(st.org_unit_id)
            )
        )
        or exists (
          select 1
          from course_offerings o
          where o.instructor_id = people.id
            and course_is_visible(o.course_id)
        )
      )
    )
  );

drop policy if exists staff_read on staff;
create policy staff_read on staff
  for select using (
    (current_app_account()).role <> 'student'
    and (
      person_id = (current_app_account()).person_id
      or org_unit_is_visible(org_unit_id)
    )
  );

revoke all on function org_unit_is_visible(text) from public;
grant execute on function org_unit_is_visible(text) to app_user;
grant execute on function current_app_account() to app_user;
grant execute on function get_exam_averages(text[]) to app_user;

comment on function org_unit_is_visible(text) is
  'Whether the session role may see this org_units row. SECURITY DEFINER, RLS off.';

commit;
