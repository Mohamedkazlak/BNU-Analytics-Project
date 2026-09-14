-- Add a SECURITY DEFINER function to compute class averages for specific exams safely
CREATE OR REPLACE FUNCTION get_exam_averages(exam_ids text[])
RETURNS TABLE(exam_id text, avg_score numeric)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT exam_id, AVG(score) as avg_score
  FROM exam_attempts
  WHERE exam_id = ANY(exam_ids) AND participated = true
  GROUP BY exam_id;
$$;
