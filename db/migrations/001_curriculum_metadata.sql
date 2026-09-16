-- Curriculum GPA eligibility metadata.
-- requirement_level_type / counted_in_cumulative_gpa / pass_fail_subject
-- are consumed only by backend/services/gpa.py — never by the React client.

begin;

do $$ begin
  create type requirement_level_type as enum (
    'university_requirement',
    'sector_requirement',
    'program_core',
    'elective'
  );
exception when duplicate_object then null;
end $$;

alter table courses
  add column if not exists requirement_level_type requirement_level_type
    not null default 'program_core';

alter table courses
  add column if not exists counted_in_cumulative_gpa boolean
    not null default true;

alter table courses
  add column if not exists pass_fail_subject boolean
    not null default false;

update courses
set requirement_level_type = case
  when year_level = 1 then 'university_requirement'::requirement_level_type
  else 'program_core'::requirement_level_type
end
where requirement_level_type = 'program_core';

-- Studio elective used to exercise pass/fail GPA exclusion in tests/demo.
update courses
set
  pass_fail_subject = true,
  counted_in_cumulative_gpa = false,
  requirement_level_type = 'elective'
where id = 'c-art-110';

commit;
