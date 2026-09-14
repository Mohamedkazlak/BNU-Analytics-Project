-- 1. Add password hash column
ALTER TABLE user_accounts ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 2. Update demo accounts with password hash.
-- The plain text password will be the account ID (e.g. 'u-president', 'u-vp-aa').
-- We'll use a pre-computed bcrypt hash of the ID for simplicity, or we can use pgcrypto.
-- The app uses bcrypt, so I'll generate hashes or we can use python to update them.
-- Actually, let's use python to hash passwords in a script later, or use pgcrypto:
CREATE EXTENSION IF NOT EXISTS pgcrypto;

UPDATE user_accounts SET password_hash = crypt(id, gen_salt('bf')) WHERE password_hash IS NULL;

-- 3. Create app_user role (least privilege)
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'app_user') THEN

      CREATE ROLE app_user LOGIN PASSWORD 'app_user_password_demo_123';
   END IF;
END
$do$;

-- Grant necessary privileges to app_user
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;

-- 4. Force RLS
ALTER TABLE org_units FORCE ROW LEVEL SECURITY;
ALTER TABLE institution_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE academic_years FORCE ROW LEVEL SECURITY;
ALTER TABLE terms FORCE ROW LEVEL SECURITY;
ALTER TABLE people FORCE ROW LEVEL SECURITY;
ALTER TABLE staff FORCE ROW LEVEL SECURITY;
ALTER TABLE students FORCE ROW LEVEL SECURITY;
ALTER TABLE user_accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE courses FORCE ROW LEVEL SECURITY;
ALTER TABLE course_offerings FORCE ROW LEVEL SECURITY;
ALTER TABLE course_sections FORCE ROW LEVEL SECURITY;
ALTER TABLE staff_course_assignments FORCE ROW LEVEL SECURITY;
ALTER TABLE enrollments FORCE ROW LEVEL SECURITY;
ALTER TABLE exams FORCE ROW LEVEL SECURITY;
ALTER TABLE questions FORCE ROW LEVEL SECURITY;
ALTER TABLE exam_attempts FORCE ROW LEVEL SECURITY;
ALTER TABLE attempt_answers FORCE ROW LEVEL SECURITY;
ALTER TABLE integrity_flags FORCE ROW LEVEL SECURITY;
ALTER TABLE transcript_entries FORCE ROW LEVEL SECURITY;
