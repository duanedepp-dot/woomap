-- Privacy hardening for TerraLive revision history.
-- Apply to the intended Supabase project only after confirming backup/rollback.
begin;
alter table public.building_revisions drop column if exists editor_email;
create or replace function public.audit_building_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare snap jsonb; rev integer; act text; bid uuid;
begin
  if tg_op = 'DELETE' then snap := to_jsonb(old); rev := old.revision + 1; act := 'deleted'; bid := old.id;
  else
    snap := to_jsonb(new); rev := new.revision; bid := new.id;
    if tg_op = 'INSERT' then act := 'created';
    elsif old.status is distinct from new.status and new.status = 'published' then act := 'published';
    else act := 'updated'; end if;
  end if;
  insert into public.building_revisions (building_id, revision, action, editor_id, snapshot)
  values (bid, rev, act, (select auth.uid()), snap);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
drop policy if exists "Read revisions of visible buildings" on public.building_revisions;
drop policy if exists "Read own building revision history" on public.building_revisions;
create policy "Read own building revision history"
on public.building_revisions for select to authenticated
using (editor_id = (select auth.uid()) or snapshot->>'owner_id' = (select auth.uid())::text);
revoke all on public.building_revisions from anon;
revoke select on public.building_revisions from authenticated;
revoke select on public.building_revisions from public;
grant select (id, building_id, revision, action, editor_id, snapshot, created_at)
on public.building_revisions to authenticated;
commit;
