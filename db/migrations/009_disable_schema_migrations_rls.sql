-- public.schema_migrations is an operator table, not an application relation.
-- Production has an event trigger that enables RLS on new public tables.
-- Disable it so the table matches schema.sql and is not a policy-less RLS trap.

alter table if exists public.schema_migrations disable row level security;
