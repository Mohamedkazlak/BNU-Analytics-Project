-- Purpose:
-- Harden public.set_updated_at() against search_path hijacking, mark
-- get_user_for_login() STABLE, and add the two missing foreign-key indexes.
--
-- Safety:
-- Additive / definition-only. Does not modify or delete existing rows.
-- CREATE INDEX IF NOT EXISTS is used (not CONCURRENTLY) because
-- backend/run_migration.py wraps each file in a transaction, and
-- CREATE INDEX CONCURRENTLY cannot run inside a transaction. Tables are
-- small (~44 offerings, ~3.8k transcript rows), so a regular index build
-- is appropriate.
--
-- Evidence:
-- Supabase security advisor: function_search_path_mutable on set_updated_at.
-- Supabase performance advisor: unindexed FKs
--   course_offerings.academic_year_id and transcript_entries.course_id.
-- Unique indexes (course_id, academic_year_id, term_id) and
-- (student_id, course_id, academic_year_id) do not cover lookups or
-- referential actions that lead with academic_year_id / course_id.
--
-- Compatible with stub migration tests that lack these tables.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.get_user_for_login(p_id text)
returns table (
    id text,
    person_id text,
    role app_role,
    scope_id text,
    student_id text,
    password_hash text
)
language plpgsql
stable
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

do $$
begin
  if to_regclass('public.course_offerings') is not null then
    execute $sql$
      create index if not exists course_offerings_academic_year_id_idx
        on public.course_offerings (academic_year_id)
    $sql$;
  end if;
  if to_regclass('public.transcript_entries') is not null then
    execute $sql$
      create index if not exists transcript_entries_course_id_idx
        on public.transcript_entries (course_id)
    $sql$;
  end if;
end $$;
