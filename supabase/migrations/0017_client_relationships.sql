-- Adds family/guardian relationship contacts (Mother, Father, Guardian,
-- Sibling, etc.) with their own contact details, plus a living-situation
-- field on the client record. Run this after 0001_init.sql has already
-- been applied.

alter table public.clients add column if not exists living_situation text;

create table public.client_relationships (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  relationship_type text not null,
  full_name text not null,
  phone text,
  email text,
  address text,
  is_primary_contact boolean not null default false,
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index client_relationships_client_idx on public.client_relationships (client_id);

create trigger set_updated_at before update on public.client_relationships
  for each row execute function public.set_updated_at();

alter table public.client_relationships enable row level security;

-- Same visibility model as leads/partners/follow-ups: any active staff
-- member can view, staff with an editing role can create/update,
-- permanent deletion restricted to administrators/managers.
create policy client_relationships_select on public.client_relationships
  for select using (public.is_active_profile());
create policy client_relationships_insert_staff on public.client_relationships
  for insert with check (public.can_edit_records());
create policy client_relationships_update_staff on public.client_relationships
  for update using (public.can_edit_records()) with check (public.can_edit_records());
create policy client_relationships_delete_admin_manager on public.client_relationships
  for delete using (public.is_admin_or_manager());
