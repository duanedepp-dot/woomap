-- TerraLive security regression checks. Run against a disposable/local Supabase DB
-- after applying migrations. These structural checks do not replace two-account API tests.
do $$
declare rls_buildings boolean; rls_revisions boolean;
begin
  select c.relrowsecurity into rls_buildings from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='buildings';
  if coalesce(rls_buildings,false) is not true then raise exception 'FAIL: RLS must be enabled on public.buildings'; end if;
  select c.relrowsecurity into rls_revisions from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='building_revisions';
  if coalesce(rls_revisions,false) is not true then raise exception 'FAIL: RLS must be enabled on public.building_revisions'; end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='building_revisions' and column_name='editor_email') then
    raise exception 'FAIL: revision table still stores editor_email';
  end if;
  if has_table_privilege('anon','public.building_revisions','SELECT') then raise exception 'FAIL: anon must not have SELECT on building revisions'; end if;
  if exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace cross join lateral aclexplode(coalesce(c.relacl, acldefault('r',c.relowner))) a where n.nspname='public' and c.relname='building_revisions' and a.grantee=0 and a.privilege_type='SELECT') then raise exception 'FAIL: PUBLIC must not have SELECT on building revisions'; end if;
  if not has_column_privilege('authenticated','public.building_revisions','snapshot','SELECT') then raise exception 'FAIL: authenticated history readers need snapshot access'; end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='building_revisions' and policyname='Read own building revision history' and roles @> array['authenticated']::name[]) then
    raise exception 'FAIL: owner/actor-only revision RLS policy is missing';
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='buildings' and policyname='Update own buildings') then raise exception 'FAIL: owner update policy is missing'; end if;
  raise notice 'PASS: TerraLive RLS and revision privacy structural checks';
end;
$$;
