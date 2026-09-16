-- Backfill deterministic item-level answers for synthetic attempts so item
-- analysis has real data instead of an empty attempt_answers table.
-- Only synthetic attempts are eligible. Do not fabricate answers for
-- unspecified or imported exams.

insert into attempt_answers (attempt_id, question_id, is_correct, points, is_synthetic)
select
  a.id,
  q.id,
  (abs(hashtext(a.id || q.id || 'ans')) % 100)
    >= (12 + ((q.number * 7 + abs(hashtext(a.student_id))) % 55)),
  case
    when (abs(hashtext(a.id || q.id || 'ans')) % 100)
      >= (12 + ((q.number * 7 + abs(hashtext(a.student_id))) % 55))
    then q.max_score
    else 0
  end,
  true
from exam_attempts a
join questions q on q.exam_id = a.exam_id
where a.status <> 'absent'
  and a.is_synthetic
on conflict do nothing;
