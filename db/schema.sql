-- BNU Analytics — PostgreSQL schema
-- This is the target database for the dashboard. Until the app is wired to
-- Postgres, `src/lib/mock-data.ts` mirrors these tables and projects the
-- denormalized view models the UI already consumes.
--
-- Identifiers are stable text keys (uni-bnu, c1, s7, e1, …) so the mock layer
-- and this schema can be swapped without remapping. Prefer bigint identity or
-- UUIDv7 if you later ingest a live SIS; keep these values in a `code` column.
--
-- Requires PostgreSQL 15+ (security_invoker views).
--
-- Apply:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/schema.sql
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/seed.sql

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$ begin
  create type org_level as enum ('university', 'sector', 'program');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type app_role as enum (
    'senior_management',
    'program_director',
    'academic_affairs',
    'professor',
    'it_academic_integrity',
    'student'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type student_status as enum ('active', 'graduated', 'withdrawn');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type exam_status as enum ('scheduled', 'in_progress', 'closing', 'closed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type attempt_status as enum ('absent', 'in_progress', 'submitted', 'void');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type integrity_flag_type as enum (
    'multiple_attempts',
    'fast_submission',
    'late_start',
    'shared_ip',
    'similar_answers'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type academic_standing as enum (
    'Excellent',
    'Good standing',
    'Watch list',
    'At risk'
  );
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Shared trigger
-- ---------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Organization
-- ---------------------------------------------------------------------------

create table if not exists org_units (
  id text primary key,
  parent_id text references org_units (id) on delete restrict,
  level org_level not null,
  code text not null unique,
  name text not null,
  title_for_role text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint org_units_university_root check (
    (level = 'university' and parent_id is null)
    or (level <> 'university' and parent_id is not null)
  )
);

create index if not exists org_units_parent_id_idx on org_units (parent_id);
create index if not exists org_units_level_idx on org_units (level);

drop trigger if exists org_units_set_updated_at on org_units;
create trigger org_units_set_updated_at
  before update on org_units
  for each row execute function set_updated_at();

create table if not exists institution_settings (
  org_unit_id text primary key references org_units (id) on delete cascade,
  pass_mark numeric(5, 2) not null default 60
    check (pass_mark >= 0 and pass_mark <= 100),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Calendar
-- ---------------------------------------------------------------------------

create table if not exists academic_years (
  id text primary key,
  label text not null unique,
  start_date date not null,
  end_date date not null,
  is_current boolean not null default false,
  constraint academic_years_dates check (end_date > start_date)
);

create unique index if not exists academic_years_one_current_idx
  on academic_years (is_current)
  where is_current;

create table if not exists terms (
  id text primary key,
  academic_year_id text not null references academic_years (id) on delete cascade,
  code text not null,
  name text not null,
  start_date date not null,
  end_date date not null,
  unique (academic_year_id, code),
  constraint terms_dates check (end_date > start_date)
);

create index if not exists terms_academic_year_id_idx on terms (academic_year_id);

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------

create table if not exists people (
  id text primary key,
  full_name text not null,
  email text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists people_set_updated_at on people;
create trigger people_set_updated_at
  before update on people
  for each row execute function set_updated_at();

create table if not exists staff (
  person_id text primary key references people (id) on delete cascade,
  title text not null,
  org_unit_id text references org_units (id) on delete set null
);

create index if not exists staff_org_unit_id_idx on staff (org_unit_id);

create table if not exists students (
  id text primary key,
  person_id text not null unique references people (id) on delete restrict,
  student_number text not null unique,
  program_id text not null references org_units (id) on delete restrict,
  section text not null,
  cohort_year smallint not null,
  status student_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint students_program_is_program check (section <> '')
);

create index if not exists students_program_id_idx on students (program_id);
create index if not exists students_section_idx on students (program_id, section);

drop trigger if exists students_set_updated_at on students;
create trigger students_set_updated_at
  before update on students
  for each row execute function set_updated_at();

create table if not exists user_accounts (
  id text primary key,
  person_id text not null references people (id) on delete cascade,
  role app_role not null,
  scope_id text references org_units (id) on delete set null,
  student_id text references students (id) on delete set null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  unique (person_id, role),
  constraint user_accounts_student_role check (
    (role = 'student' and student_id is not null)
    or (role <> 'student' and student_id is null)
  )
);

create index if not exists user_accounts_person_id_idx on user_accounts (person_id);
create index if not exists user_accounts_scope_id_idx on user_accounts (scope_id);
create index if not exists user_accounts_role_idx on user_accounts (role);

-- ---------------------------------------------------------------------------
-- Curriculum
-- ---------------------------------------------------------------------------

create table if not exists courses (
  id text primary key,
  program_id text not null references org_units (id) on delete restrict,
  code text not null,
  name text not null,
  credits smallint not null default 3 check (credits between 1 and 12),
  year_level smallint not null default 1 check (year_level between 1 and 6),
  unique (program_id, code)
);

create index if not exists courses_program_id_idx on courses (program_id);

create table if not exists course_offerings (
  id text primary key,
  course_id text not null references courses (id) on delete cascade,
  academic_year_id text not null references academic_years (id) on delete restrict,
  term_id text not null references terms (id) on delete restrict,
  instructor_id text not null references people (id) on delete restrict,
  unique (course_id, academic_year_id, term_id)
);

create index if not exists course_offerings_course_id_idx on course_offerings (course_id);
create index if not exists course_offerings_instructor_id_idx on course_offerings (instructor_id);
create index if not exists course_offerings_term_id_idx on course_offerings (term_id);

create table if not exists course_sections (
  id text primary key,
  offering_id text not null references course_offerings (id) on delete cascade,
  code text not null,
  unique (offering_id, code)
);

create index if not exists course_sections_offering_id_idx on course_sections (offering_id);

create table if not exists staff_course_assignments (
  staff_person_id text not null references staff (person_id) on delete cascade,
  course_id text not null references courses (id) on delete cascade,
  primary key (staff_person_id, course_id)
);

create index if not exists staff_course_assignments_course_id_idx
  on staff_course_assignments (course_id);

create table if not exists enrollments (
  id text primary key,
  student_id text not null references students (id) on delete cascade,
  offering_id text not null references course_offerings (id) on delete cascade,
  section_id text not null references course_sections (id) on delete restrict,
  enrolled_at timestamptz not null default now(),
  unique (student_id, offering_id)
);

create index if not exists enrollments_offering_id_idx on enrollments (offering_id);
create index if not exists enrollments_section_id_idx on enrollments (section_id);
create index if not exists enrollments_student_id_idx on enrollments (student_id);

-- ---------------------------------------------------------------------------
-- Assessment
-- ---------------------------------------------------------------------------

create table if not exists exams (
  id text primary key,
  offering_id text not null references course_offerings (id) on delete cascade,
  title text not null,
  scheduled_at timestamptz not null,
  duration_minutes smallint not null default 90 check (duration_minutes > 0),
  question_count smallint not null check (question_count > 0),
  pass_mark numeric(5, 2) not null default 60 check (pass_mark >= 0 and pass_mark <= 100),
  status exam_status not null default 'closed',
  created_at timestamptz not null default now()
);

create index if not exists exams_offering_id_idx on exams (offering_id);
create index if not exists exams_scheduled_at_idx on exams (scheduled_at);
create index if not exists exams_status_idx on exams (status);

create table if not exists questions (
  id text primary key,
  exam_id text not null references exams (id) on delete cascade,
  number smallint not null,
  topic text not null,
  prompt text not null,
  max_score numeric(6, 2) not null default 1 check (max_score > 0),
  unique (exam_id, number)
);

create index if not exists questions_exam_id_idx on questions (exam_id);

create table if not exists exam_attempts (
  id text primary key,
  exam_id text not null references exams (id) on delete cascade,
  student_id text not null references students (id) on delete cascade,
  enrollment_id text not null references enrollments (id) on delete cascade,
  score numeric(5, 2) check (score is null or (score >= 0 and score <= 100)),
  time_taken_min smallint,
  started_at timestamptz,
  ended_at timestamptz,
  ip inet,
  device text,
  attempt_count smallint not null default 1 check (attempt_count >= 1),
  late_start boolean not null default false,
  status attempt_status not null,
  unique (exam_id, student_id),
  constraint exam_attempts_times check (
    ended_at is null or started_at is null or ended_at >= started_at
  ),
  constraint exam_attempts_absent_score check (
    (status = 'absent' and score is null)
    or (status <> 'absent')
  )
);

create index if not exists exam_attempts_exam_id_idx on exam_attempts (exam_id);
create index if not exists exam_attempts_student_id_idx on exam_attempts (student_id);
create index if not exists exam_attempts_enrollment_id_idx on exam_attempts (enrollment_id);
create index if not exists exam_attempts_status_idx on exam_attempts (status);

create table if not exists attempt_answers (
  attempt_id text not null references exam_attempts (id) on delete cascade,
  question_id text not null references questions (id) on delete cascade,
  is_correct boolean not null,
  points numeric(6, 2),
  primary key (attempt_id, question_id)
);

create index if not exists attempt_answers_question_id_idx on attempt_answers (question_id);

create table if not exists integrity_flags (
  id text primary key,
  attempt_id text not null references exam_attempts (id) on delete cascade,
  flag_type integrity_flag_type not null,
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists integrity_flags_attempt_id_idx on integrity_flags (attempt_id);
create index if not exists integrity_flags_flag_type_idx on integrity_flags (flag_type);

create table if not exists transcript_entries (
  id text primary key,
  student_id text not null references students (id) on delete cascade,
  course_id text not null references courses (id) on delete restrict,
  academic_year_id text not null references academic_years (id) on delete restrict,
  average numeric(5, 2) not null check (average >= 0 and average <= 100),
  letter_grade text not null,
  credits smallint not null check (credits between 1 and 12),
  unique (student_id, course_id, academic_year_id)
);

create index if not exists transcript_entries_student_id_idx on transcript_entries (student_id);
create index if not exists transcript_entries_academic_year_id_idx
  on transcript_entries (academic_year_id);

-- ---------------------------------------------------------------------------
-- Views (security_invoker so RLS on base tables still applies)
-- ---------------------------------------------------------------------------

create or replace view v_courses_current
  with (security_invoker = true)
as
select
  c.id,
  c.code,
  c.name,
  c.credits,
  c.year_level,
  c.program_id,
  p.name as program,
  p.parent_id as sector_id,
  s.name as sector,
  o.id as offering_id,
  o.instructor_id,
  ins.full_name as instructor,
  o.academic_year_id,
  o.term_id,
  (
    select count(*)::int
    from enrollments e
    where e.offering_id = o.id
  ) as enrolled
from course_offerings o
join courses c on c.id = o.course_id
join org_units p on p.id = c.program_id
join org_units s on s.id = p.parent_id
join people ins on ins.id = o.instructor_id;

create or replace view v_students
  with (security_invoker = true)
as
select
  st.id,
  st.person_id,
  st.student_number,
  pe.full_name as name,
  st.program_id,
  p.name as program,
  p.parent_id as sector_id,
  sec.name as sector,
  st.section,
  st.cohort_year,
  st.status
from students st
join people pe on pe.id = st.person_id
join org_units p on p.id = st.program_id
join org_units sec on sec.id = p.parent_id;

create or replace view v_exam_attempts
  with (security_invoker = true)
as
select
  a.id,
  a.exam_id,
  a.student_id,
  a.enrollment_id,
  a.score,
  a.time_taken_min,
  a.started_at,
  a.ended_at,
  host(a.ip) as ip,
  a.device,
  a.attempt_count,
  a.late_start,
  a.status,
  (a.status <> 'absent') as participated,
  p.name as program,
  sec.name as sector,
  c.id as course_id,
  c.code as course_code,
  x.title as exam_title,
  x.scheduled_at
from exam_attempts a
join students st on st.id = a.student_id
join org_units p on p.id = st.program_id
join org_units sec on sec.id = p.parent_id
join exams x on x.id = a.exam_id
join course_offerings o on o.id = x.offering_id
join courses c on c.id = o.course_id;

create or replace view v_item_stats
  with (security_invoker = true)
as
select
  q.id,
  q.exam_id,
  q.number,
  q.topic,
  q.prompt,
  c.code || ' · ' || split_part(x.title, ' — ', 1) as exam_label,
  round(
    100.0 * avg((ans.is_correct)::int),
    0
  ) as pct_correct,
  round(
    1.0 * avg((ans.is_correct)::int),
    2
  ) as difficulty_index
from questions q
join exams x on x.id = q.exam_id
join course_offerings o on o.id = x.offering_id
join courses c on c.id = o.course_id
left join attempt_answers ans on ans.question_id = q.id
group by q.id, q.exam_id, q.number, q.topic, q.prompt, c.code, x.title;

-- ---------------------------------------------------------------------------
-- Scope helpers (used by RLS; also useful once the API queries Postgres)
-- ---------------------------------------------------------------------------

create or replace function org_descendants(root_id text)
returns setof text
language sql
stable
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

create or replace function current_visible_program_ids()
returns setof text
language plpgsql
stable
as $$
declare
  acct user_accounts;
  node org_units;
begin
  acct := current_app_account();
  if acct is null then
    return;
  end if;
  if acct.role in ('it_academic_integrity') or acct.scope_id is null then
    return query select id from org_units where level = 'program';
    return;
  end if;
  select * into node from org_units where id = acct.scope_id;
  if node.level = 'university' then
    return query select id from org_units where level = 'program';
  elsif node.level = 'sector' then
    return query select id from org_units where parent_id = node.id and level = 'program';
  else
    return query select node.id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- Policies read `app.current_user_id` (user_accounts.id). Table owners bypass
-- RLS, so seeds and migrations still work. Tighten or FORCE RLS when auth is
-- connected; swap the session GUC for auth.uid() if you move onto Supabase.
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
    exists (
      select 1 from user_accounts ua
      where ua.id = (current_app_account()).id
        and (
          ua.role <> 'student'
          or ua.person_id = people.id
        )
    )
  );

drop policy if exists staff_read on staff;
create policy staff_read on staff
  for select using ((current_app_account()).role <> 'student');

drop policy if exists students_read on students;
create policy students_read on students
  for select using (
    case (current_app_account()).role
      when 'student' then id = (current_app_account()).student_id
      when 'professor' then exists (
        select 1
        from enrollments e
        join course_offerings o on o.id = e.offering_id
        join staff_course_assignments sca on sca.course_id = o.course_id
        where e.student_id = students.id
          and sca.staff_person_id = (current_app_account()).person_id
      )
      else program_id in (select current_visible_program_ids())
    end
  );

drop policy if exists user_accounts_read on user_accounts;
create policy user_accounts_read on user_accounts
  for select using (id = (current_app_account()).id);

drop policy if exists courses_read on courses;
create policy courses_read on courses
  for select using (
    case (current_app_account()).role
      when 'professor' then exists (
        select 1 from staff_course_assignments sca
        where sca.course_id = courses.id
          and sca.staff_person_id = (current_app_account()).person_id
      )
      when 'student' then exists (
        select 1
        from enrollments e
        join course_offerings o on o.id = e.offering_id
        where e.student_id = (current_app_account()).student_id
          and o.course_id = courses.id
      )
      else program_id in (select current_visible_program_ids())
    end
  );

drop policy if exists course_offerings_read on course_offerings;
create policy course_offerings_read on course_offerings
  for select using (
    exists (
      select 1 from courses c
      where c.id = course_offerings.course_id
    )
  );

drop policy if exists course_sections_read on course_sections;
create policy course_sections_read on course_sections
  for select using (
    exists (
      select 1 from course_offerings o
      where o.id = course_sections.offering_id
    )
  );

drop policy if exists staff_course_assignments_read on staff_course_assignments;
create policy staff_course_assignments_read on staff_course_assignments
  for select using ((current_app_account()).role <> 'student');

drop policy if exists enrollments_read on enrollments;
create policy enrollments_read on enrollments
  for select using (
    case (current_app_account()).role
      when 'student' then student_id = (current_app_account()).student_id
      else exists (select 1 from students s where s.id = enrollments.student_id)
    end
  );

drop policy if exists exams_read on exams;
create policy exams_read on exams
  for select using (
    exists (
      select 1 from course_offerings o
      where o.id = exams.offering_id
    )
  );

drop policy if exists questions_read on questions;
create policy questions_read on questions
  for select using (
    (current_app_account()).role <> 'student'
    and exists (select 1 from exams x where x.id = questions.exam_id)
  );

drop policy if exists exam_attempts_read on exam_attempts;
create policy exam_attempts_read on exam_attempts
  for select using (
    case (current_app_account()).role
      when 'student' then student_id = (current_app_account()).student_id
      else exists (select 1 from students s where s.id = exam_attempts.student_id)
    end
  );

drop policy if exists attempt_answers_read on attempt_answers;
create policy attempt_answers_read on attempt_answers
  for select using (
    exists (
      select 1 from exam_attempts a
      where a.id = attempt_answers.attempt_id
    )
  );

drop policy if exists integrity_flags_read on integrity_flags;
create policy integrity_flags_read on integrity_flags
  for select using (
    (current_app_account()).role in (
      'it_academic_integrity',
      'senior_management',
      'program_director',
      'academic_affairs',
      'professor'
    )
  );

drop policy if exists transcript_entries_read on transcript_entries;
create policy transcript_entries_read on transcript_entries
  for select using (
    case (current_app_account()).role
      when 'student' then student_id = (current_app_account()).student_id
      else exists (select 1 from students s where s.id = transcript_entries.student_id)
    end
  );

comment on table org_units is 'University → sector → program tree. scope_id on user_accounts points here.';
comment on table enrollments is 'A student may sit an exam only through an enrollment on that offering.';
comment on table exam_attempts is 'Roster row per enrollment × exam; status=absent means no sitting.';
comment on table transcript_entries is 'Closed academic-year grades when live exam rows are not kept.';
comment on function current_app_account() is 'Reads app.current_user_id (user_accounts.id). Set in the API session.';

commit;
