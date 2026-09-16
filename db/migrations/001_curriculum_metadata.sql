-- Curriculum GPA eligibility metadata.
-- requirement_level_type stores curriculum-report values: 'college' | 'university'.
-- counted_in_cumulative_gpa and pass_fail_subject are independent flags consumed
-- only by backend/services/gpa.py — never by the React client.
--
-- Defaults are placeholders when authoritative curriculum metadata has not been
-- imported. This migration does not infer requirement level from year_level,
-- course codes, course names, or demo course IDs.

begin;

do $$
declare
  col_udt text;
begin
  select c.udt_name into col_udt
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'courses'
    and c.column_name = 'requirement_level_type';

  if col_udt is null then
    alter table courses
      add column requirement_level_type text not null default 'college';
  elsif col_udt = 'requirement_level_type' then
    -- Previous branch used an invented enum. Map only the university label;
    -- every other legacy value becomes the conservative 'college' default.
    alter table courses alter column requirement_level_type drop default;
    alter table courses
      alter column requirement_level_type type text
      using case requirement_level_type::text
        when 'university_requirement' then 'university'
        when 'university' then 'university'
        else 'college'
      end;
    alter table courses
      alter column requirement_level_type set default 'college';
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'requirement_level_type'
      and t.typtype = 'e'
  ) then
    drop type public.requirement_level_type;
  end if;
end $$;

alter table courses drop constraint if exists courses_requirement_level_type_check;
alter table courses
  add constraint courses_requirement_level_type_check
  check (requirement_level_type in ('college', 'university'));

alter table courses
  add column if not exists counted_in_cumulative_gpa boolean
    not null default true;

alter table courses
  add column if not exists pass_fail_subject boolean
    not null default false;

comment on column courses.requirement_level_type is
  'Curriculum-report requirement level: college or university. Default college is a placeholder until authoritative metadata is imported.';
comment on column courses.counted_in_cumulative_gpa is
  'When false the course is excluded from cumulative GPA. Independent of pass_fail_subject.';
comment on column courses.pass_fail_subject is
  'When true the course does not contribute letter-grade quality points to cumulative GPA.';

commit;
