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


def _migration_sql(name: str) -> str:
    return (ROOT / "db" / "migrations" / name).read_text()


def _active_sql(text: str) -> str:
    sql_lines = [
        line
        for line in text.splitlines()
        if line.strip() and not line.lstrip().startswith("--")
    ]
    return "\n".join(sql_lines).lower()


def test_optimization_migrations_are_additive_definition_only():
    schema = (ROOT / "db" / "schema.sql").read_text()
    assert "course_offerings_academic_year_id_idx" in schema
    assert "transcript_entries_course_id_idx" in schema
    assert "exam_attempts_enrollment_student_fk" in schema
    assert "enrollments_id_student_id_key" in schema
    assert "select u.id from org_units u where org_unit_is_visible" not in schema.lower()
    for name in (
        "011_set_updated_at_search_path_and_fk_indexes.sql",
        "012_exam_attempts_enrollment_student_fk.sql",
        "013_rls_initplan_visibility_sets.sql",
    ):
        sql = _active_sql(_migration_sql(name))
        assert "delete from" not in sql, name
        assert "truncate " not in sql, name
        assert "drop table" not in sql, name
        assert "drop index" not in sql, name
        assert "drop constraint" not in sql, name
        assert "disable row level security" not in sql, name
        assert "disable trigger" not in sql, name
        assert "update user_accounts" not in sql, name
        assert "update students" not in sql, name
        assert "update exam_attempts" not in sql, name


def test_migration_011_hardens_search_path_and_adds_fk_indexes():
    migration = _migration_sql("011_set_updated_at_search_path_and_fk_indexes.sql")
    assert "set search_path = public" in migration
    assert "course_offerings_academic_year_id_idx" in migration
    assert "transcript_entries_course_id_idx" in migration
    sql = _active_sql(migration)
    assert "create index concurrently" not in sql
    assert "drop index" not in sql


def test_migration_012_adds_enrollment_student_fk_only_when_clean():
    migration = _migration_sql("012_exam_attempts_enrollment_student_fk.sql")
    lowered = migration.lower()
    assert "exam_attempts_enrollment_student_fk" in migration
    assert "foreign key (enrollment_id, student_id)" in lowered
    assert "raise exception" in lowered
    assert "delete from" not in lowered
    assert "update exam_attempts" not in lowered
    assert "update enrollments" not in lowered


def test_migration_013_uses_set_based_initplan_visibility():
    migration = _migration_sql("013_rls_initplan_visibility_sets.sql")
    sql = _active_sql(migration)
    assert "id in (select current_visible_student_ids())" in sql
    assert "id in (select current_visible_attempt_ids())" in sql
    assert "id in (select current_visible_org_unit_ids())" in sql
    assert "from org_units u where org_unit_is_visible" not in sql
    assert "org_unit_is_visible(u.id)" not in sql
    assert "disable row level security" not in sql
    assert "force row level security" not in sql
    assert "drop table" not in sql


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
