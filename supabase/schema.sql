create extension if not exists postgis with schema extensions;
create table if not exists public.buildings (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete restrict,
 name text not null check(length(trim(name)) between 1 and 200),
 address text not null check(length(trim(address)) between 1 and 500),
 building_type text not null default 'Apartment' check(building_type in ('Apartment','House','Office','Commercial building')),
 height_m double precision not null default 10 check(height_m>0 and height_m<=1000),
 footprint_geojson jsonb not null, footprint extensions.geometry(Polygon,4326) not null,
 status text not null default 'published' check(status in ('draft','published')), revision integer not null default 1,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint valid_polygon_json check(footprint_geojson->>'type'='Polygon'));
create index if not exists buildings_footprint_gix on public.buildings using gist(footprint);
create index if not exists buildings_status_idx on public.buildings(status);
alter table public.buildings enable row level security;
grant select on public.buildings to anon,authenticated;
grant insert,update,delete on public.buildings to authenticated;
drop policy if exists "Read published or owned buildings" on public.buildings;
create policy "Read published or owned buildings" on public.buildings for select to anon,authenticated using(status='published' or owner_id=(select auth.uid()));
drop policy if exists "Create own buildings" on public.buildings;
create policy "Create own buildings" on public.buildings for insert to authenticated with check(owner_id=(select auth.uid()));
drop policy if exists "Update own buildings" on public.buildings;
create policy "Update own buildings" on public.buildings for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
drop policy if exists "Delete own buildings" on public.buildings;
create policy "Delete own buildings" on public.buildings for delete to authenticated using(owner_id=(select auth.uid()));
create or replace function public.sync_building_geometry() returns trigger language plpgsql set search_path='' as $$
begin
 new.footprint:=extensions.st_setsrid(extensions.st_geomfromgeojson(new.footprint_geojson::text),4326);
 if extensions.st_isempty(new.footprint) or not extensions.st_isvalid(new.footprint) then raise exception 'Invalid building footprint'; end if;
 new.updated_at:=now(); if tg_op='UPDATE' then new.revision:=old.revision+1; end if; return new;
end; $$;
drop trigger if exists buildings_geometry_trigger on public.buildings;
create trigger buildings_geometry_trigger before insert or update on public.buildings for each row execute function public.sync_building_geometry();
create table if not exists public.building_revisions(id bigint generated always as identity primary key,building_id uuid not null,revision integer not null,action text not null,editor_id uuid,snapshot jsonb not null,created_at timestamptz not null default now());
create index if not exists building_revisions_building_idx on public.building_revisions(building_id,revision desc);
alter table public.building_revisions enable row level security;
revoke all on public.building_revisions from anon;
revoke select on public.building_revisions from public;
revoke select on public.building_revisions from authenticated;
revoke select on public.building_revisions from public;
grant select (id, building_id, revision, action, editor_id, snapshot, created_at) on public.building_revisions to authenticated;
drop policy if exists "Read revisions of visible buildings" on public.building_revisions;
drop policy if exists "Read own building revision history" on public.building_revisions;
create policy "Read own building revision history" on public.building_revisions for select to authenticated using (editor_id=(select auth.uid()) or snapshot->>'owner_id'=(select auth.uid())::text);
create or replace function public.audit_building_change() returns trigger language plpgsql security definer set search_path='' as $$
declare snap jsonb; rev integer; act text; bid uuid;
begin
 if tg_op='DELETE' then snap:=to_jsonb(old);rev:=old.revision+1;act:='deleted';bid:=old.id;
 else snap:=to_jsonb(new);rev:=new.revision;bid:=new.id;if tg_op='INSERT' then act:='created';elsif old.status is distinct from new.status and new.status='published' then act:='published';else act:='updated';end if;end if;
 insert into public.building_revisions(building_id,revision,action,editor_id,snapshot) values(bid,rev,act,(select auth.uid()),snap);
 if tg_op='DELETE' then return old;end if;return new;
end; $$;
drop trigger if exists buildings_audit_trigger on public.buildings;
create trigger buildings_audit_trigger after insert or update or delete on public.buildings for each row execute function public.audit_building_change();
do $$ begin alter publication supabase_realtime add table public.buildings; exception when duplicate_object then null; when undefined_object then raise notice 'Enable Realtime for public.buildings in the dashboard.'; end $$;