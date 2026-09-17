from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def test_schema_uses_college_university_text_not_invented_enum():
    schema = (ROOT / "db" / "schema.sql").read_text()
    assert "create type requirement_level_type as enum" not in schema
    assert "university_requirement" not in schema
    assert "sector_requirement" not in schema
    assert "program_core" not in schema
    assert "requirement_level_type text not null default 'college'" in schema
    assert "check (requirement_level_type in ('college', 'university'))" in schema


def test_migration_001_does_not_infer_from_year_level_or_demo_ids():
    migration = (ROOT / "db" / "migrations" / "001_curriculum_metadata.sql").read_text()
    assert "when year_level = 1" not in migration
    assert "c-art-110" not in migration
    assert "default 'college'" in migration


def test_seed_does_not_fabricate_requirement_hierarchy():
    seed = (ROOT / "db" / "seed.sql").read_text()
    assert "university_requirement" not in seed
    assert "program_core" not in seed
    assert "requirement_level_type = 'elective'" not in seed
    assert "where id = 'c-art-110'" not in seed


def test_migration_files_do_not_own_transactions():
    for path in sorted((ROOT / "db" / "migrations").glob("*.sql")):
        for line in path.read_text().splitlines():
            assert line.strip().lower() not in {
                "begin;",
                "commit;",
                "rollback;",
            }, path.name


def test_migration_003_marks_owner_syn_exam_and_propagates():
    migration = (
        ROOT / "db" / "migrations" / "003_synthetic-data-markers.sql"
    ).read_text()
    assert "id like 'syn-exam%'" in migration
    assert "id like 'syn-transc%'" in migration
    assert "not null default false" in migration
    assert "exam_id in (select id from exams where is_synthetic)" in migration
    assert (
        "attempt_id in (select id from exam_attempts where is_synthetic)" in migration
    )
    assert "syn-q-" not in migration
    assert "syn-attemp" not in migration
    assert "syn-flag" not in migration


def test_migration_006_only_backfills_synthetic_attempts():
    migration = (
        ROOT / "db" / "migrations" / "006_synthetic_item_answers.sql"
    ).read_text()
    assert "and a.is_synthetic" in migration
    assert "on conflict do nothing" in migration


def test_migration_008_revokes_explicit_anon_execute():
    migration = (
        ROOT / "db" / "migrations" / "008_revoke_anon_execute_on_helpers.sql"
    ).read_text()
    assert "anon" in migration
    assert "authenticated" in migration
    assert "get_user_for_login" in migration
    assert "from pg_roles" in migration


def test_migration_012_hardens_search_path_and_adds_fk_indexes():
    migration = (
        ROOT / "db" / "migrations" / "012_set_updated_at_search_path_and_fk_indexes.sql"
    ).read_text()
    assert "set search_path = public" in migration
    assert "course_offerings_academic_year_id_idx" in migration
    assert "transcript_entries_course_id_idx" in migration
    sql_lines = [
        line
        for line in migration.splitlines()
        if line.strip() and not line.lstrip().startswith("--")
    ]
    sql = "\n".join(sql_lines).lower()
    assert "create index concurrently" not in sql
    assert "drop index" not in sql


def test_migration_013_uses_initplan_visibility_sets():
    migration = (
        ROOT / "db" / "migrations" / "013_rls_initplan_visibility_sets.sql"
    ).read_text()
    sql_lines = [
        line
        for line in migration.splitlines()
        if line.strip() and not line.lstrip().startswith("--")
    ]
    sql = "\n".join(sql_lines).lower()
    assert "id in (select current_visible_student_ids())" in sql
    assert "id in (select current_visible_attempt_ids())" in sql
    assert "disable row level security" not in sql
    assert "force row level security" not in sql
    assert "drop table" not in sql


def test_migration_014_adds_enrollment_student_fk():
    migration = (
        ROOT / "db" / "migrations" / "014_exam_attempts_enrollment_student_fk.sql"
    ).read_text()
    lowered = migration.lower()
    assert "exam_attempts_enrollment_student_fk" in migration
    assert "foreign key (enrollment_id, student_id)" in lowered
    assert "delete from" not in lowered
    assert "update exam_attempts" not in lowered
    assert "update enrollments" not in lowered


def test_migration_010_only_backfills_unmarked_syn_transc_rows():
    migration = (
        ROOT / "db" / "migrations" / "010_syn_transc_marker_backfill.sql"
    ).read_text()
    assert "update transcript_entries" in migration
    assert "set is_synthetic = true" in migration
    assert "id like 'syn-transc%'" in migration
    assert "is_synthetic = false" in migration
    lowered = migration.lower()
    assert "alter table" not in lowered
    assert "create " not in lowered
    assert "insert " not in lowered
    assert "delete " not in lowered
