-- Purpose:
-- Professors must not see other faculty rows.
-- On databases that already have current_visible_person_ids() (013+), tighten
-- that set and point staff_read at it. On older 007-style databases, tighten
-- people_read / staff_read using org_unit_is_visible / course_is_visible.
--
-- Safety:
-- Definition-only. Does not modify or delete existing rows. Does not disable
-- RLS or FORCE RLS. Does not drop tables, indexes, or constraints.

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'current_visible_person_ids'
  ) then
    execute $fn$
      create or replace function current_visible_person_ids()
      returns setof text
      language plpgsql
      stable
      security definer
      set search_path = public
      set row_security = off
      as $body$
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
        if acct.role = 'professor' then
          return query
            select o.instructor_id
            from course_offerings o
            where o.course_id in (select current_visible_course_ids())
              and o.instructor_id is not null;
          return;
        end if;
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
      $body$;
    $fn$;

    execute $cmt$
      comment on function current_visible_person_ids() is
        'Session-visible people. Professors see themselves, assigned students, and instructors of assigned courses — not other faculty.';
    $cmt$;

    drop policy if exists staff_read on staff;
    execute $pol$
      create policy staff_read on staff
        for select using (
          (select (current_app_account()).role) is distinct from 'student'
          and person_id in (select current_visible_person_ids())
        )
    $pol$;
  else
    drop policy if exists people_read on people;
    execute $pol$
      create policy people_read on people
        for select using (
          id = (select (current_app_account()).person_id)
          or (
            (select (current_app_account()).role) is distinct from 'student'
            and (
              exists (
                select 1 from students s
                where s.person_id = people.id and student_is_visible(s.id)
              )
              or exists (
                select 1 from staff st
                where st.person_id = people.id
                  and st.person_id = (select (current_app_account()).person_id)
              )
              or (
                (select (current_app_account()).role) is distinct from 'professor'
                and exists (
                  select 1 from staff st
                  where st.person_id = people.id
                    and org_unit_is_visible(st.org_unit_id)
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
        )
    $pol$;

    drop policy if exists staff_read on staff;
    execute $pol$
      create policy staff_read on staff
        for select using (
          (select (current_app_account()).role) is distinct from 'student'
          and (
            person_id = (select (current_app_account()).person_id)
            or (
              (select (current_app_account()).role) is distinct from 'professor'
              and org_unit_is_visible(org_unit_id)
            )
            or (
              (select (current_app_account()).role) = 'professor'
              and exists (
                select 1 from course_offerings o
                where o.instructor_id = staff.person_id
                  and course_is_visible(o.course_id)
              )
            )
          )
        )
    $pol$;
  end if;
end $$;
