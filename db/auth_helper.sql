-- Authentication helper for login bypassing RLS
CREATE OR REPLACE FUNCTION get_user_for_login(p_id text)
RETURNS TABLE (
    id text,
    person_id text,
    role app_role,
    scope_id text,
    student_id text,
    password_hash text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.person_id, u.role, u.scope_id, u.student_id, u.password_hash
    FROM user_accounts u
    WHERE u.id = p_id;
END;
$$;
