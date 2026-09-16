-- Distinguish generated demo assessment/grade rows from imported university
-- records. People/students/courses are left unmarked: a real roster can sit
-- under synthetic assessments. Default is FALSE (real).

alter table exams
  add column if not exists is_synthetic boolean not null default false;
alter table questions
  add column if not exists is_synthetic boolean not null default false;
alter table exam_attempts
  add column if not exists is_synthetic boolean not null default false;
alter table attempt_answers
  add column if not exists is_synthetic boolean not null default false;
alter table integrity_flags
  add column if not exists is_synthetic boolean not null default false;
alter table transcript_entries
  add column if not exists is_synthetic boolean not null default false;

-- Demo seed uses stable text keys (e1, q-..., att-..., flg-..., tr-...).
-- Production synthetic exams are owner-identified by id LIKE 'syn-exam%'.
-- Related questions, attempts, answers and flags inherit that exam label.
-- Do not infer synthetic status from other ID prefixes.
-- Real imports should use SIS identifiers and remain is_synthetic = false.
update exams set is_synthetic = true
  where id ~ '^e[0-9]+$' or id like 'ex-%' or id like 'syn-exam%';
update questions set is_synthetic = true
  where id like 'q-%' or exam_id in (select id from exams where is_synthetic);
update exam_attempts set is_synthetic = true
  where id like 'att-%' or exam_id in (select id from exams where is_synthetic);
update integrity_flags set is_synthetic = true
  where id like 'flg-%'
     or attempt_id in (select id from exam_attempts where is_synthetic);
update transcript_entries set is_synthetic = true
  where id like 'tr-%';
update attempt_answers set is_synthetic = true
  where attempt_id in (select id from exam_attempts where is_synthetic);

comment on column exams.is_synthetic is
  'True for generated demo assessment rows; false for imported university records.';
