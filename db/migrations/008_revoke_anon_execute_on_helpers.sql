-- Supabase grants EXECUTE on public functions to anon/authenticated explicitly.
-- REVOKE FROM PUBLIC does not remove those grants. Analytics helpers are
-- SECURITY DEFINER and must not be callable via PostgREST as anon.

do $$
declare
  api_role text;
  fn text;
  sigs text[] := array[
    'org_descendants(text)',
    'current_app_account()',
    'current_visible_program_ids()',
    'org_unit_is_visible(text)',
    'current_professor_course_ids()',
    'current_student_course_ids()',
    'student_is_visible(text)',
    'course_is_visible(text)',
    'offering_is_visible(text)',
    'exam_is_visible(text)',
    'exam_attempt_is_visible(text, text)',
    'attempt_is_visible(text)',
    'exam_class_average(text)',
    'get_user_for_login(text)',
    'get_exam_averages(text[])'
  ];
begin
  foreach api_role in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = api_role) then
      foreach fn in array sigs loop
        execute format('revoke all on function %s from %I', fn, api_role);
      end loop;
      if exists (
        select 1
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname = 'rls_auto_enable'
          and pg_get_function_identity_arguments(p.oid) = ''
      ) then
        execute format('revoke all on function rls_auto_enable() from %I', api_role);
      end if;
      if to_regclass('public.schema_migrations') is not null then
        execute format('revoke all on table public.schema_migrations from %I', api_role);
      end if;
    end if;
  end loop;
end $$;

grant execute on function org_descendants(text) to app_user;
grant execute on function current_app_account() to app_user;
grant execute on function current_visible_program_ids() to app_user;
grant execute on function org_unit_is_visible(text) to app_user;
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
grant execute on function get_exam_averages(text[]) to app_user;
