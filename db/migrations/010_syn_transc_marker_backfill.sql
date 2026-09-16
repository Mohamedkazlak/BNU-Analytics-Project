-- Production already recorded 003 in schema_migrations, so the syn-transc%
-- marker added there never ran. Backfill remaining owner-identified rows.
update transcript_entries
set is_synthetic = true
where id like 'syn-transc%'
  and is_synthetic = false;
