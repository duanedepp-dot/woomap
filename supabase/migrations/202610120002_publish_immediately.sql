-- TerraLive's selected publishing behavior is immediate publication.
-- Drafts remain available only when the client explicitly sets status='draft'.
begin;
alter table public.buildings alter column status set default 'published';
commit;
