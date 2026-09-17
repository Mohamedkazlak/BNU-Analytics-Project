-- Point the demo student login at an imported Computer Science roster student
-- when one exists. Fresh seed databases keep u-student → s7.

do $$
begin
  if to_regclass('public.user_accounts') is null
     or to_regclass('public.students') is null
     or to_regclass('public.transcript_entries') is null then
    return;
  end if;

  update user_accounts u
  set
    person_id = picked.person_id,
    student_id = picked.id,
    scope_id = picked.program_id
  from (
    select st.id, st.person_id, st.program_id
    from students st
    left join transcript_entries t on t.student_id = st.id
    where st.program_id = 'prog-computer-science'
      and st.id like 'stu-%'
    group by st.id, st.person_id, st.program_id
    having count(t.id) > 0
    order by count(t.id) desc, st.id
    limit 1
  ) picked
  where u.id = 'u-student';
end $$;
