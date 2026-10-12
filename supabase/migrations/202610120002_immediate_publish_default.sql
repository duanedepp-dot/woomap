-- TerraLive default publishing policy.
-- Apply only to the intended Supabase project after backup/rollback review.
begin;
alter table public.buildings alter column status set default 'published';
commit;
