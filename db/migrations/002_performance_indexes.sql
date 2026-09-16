-- Indexes justified by analytics filter and pass-rate query shapes.
-- Existing single-column FK indexes on exam_attempts(exam_id/student_id/status)
-- remain; these composites/partials cover the additional predicates.

-- Cascading college lists: WHERE level = 'program' AND parent_id = :sectorId
create index if not exists org_units_level_parent_id_idx
  on org_units (level, parent_id);

-- Pass-rate / class-average: GROUP BY exam_id with status <> 'absent'
create index if not exists exam_attempts_exam_id_status_idx
  on exam_attempts (exam_id, status);

-- Login /auth/me student role lookup
create index if not exists user_accounts_student_id_idx
  on user_accounts (student_id)
  where student_id is not null;
