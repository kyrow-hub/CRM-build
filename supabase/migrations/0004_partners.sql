-- Adds partner organizations and their contacts (one partner can have
-- multiple contacts). Run this after 0001_init.sql has already been
-- applied - it reuses the role-helper functions and set_updated_at()
-- trigger function defined there.

create table public.partners (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  address text,
  phone text,
  email text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.partner_contacts (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete cascade,
  name text not null,
  phone text,
  email text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index partner_contacts_partner_idx on public.partner_contacts (partner_id);

create trigger set_updated_at before update on public.partners
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.partner_contacts
  for each row execute function public.set_updated_at();

alter table public.partners enable row level security;
alter table public.partner_contacts enable row level security;

-- Same visibility model as leads/client_goals: any active staff member can
-- view, staff with an editing role can create/update, permanent deletion
-- restricted to administrators/managers.
create policy partners_select on public.partners
  for select using (public.is_active_profile());
create policy partners_insert_staff on public.partners
  for insert with check (public.can_edit_records());
create policy partners_update_staff on public.partners
  for update using (public.can_edit_records()) with check (public.can_edit_records());
create policy partners_delete_admin_manager on public.partners
  for delete using (public.is_admin_or_manager());

create policy partner_contacts_select on public.partner_contacts
  for select using (public.is_active_profile());
create policy partner_contacts_insert_staff on public.partner_contacts
  for insert with check (public.can_edit_records());
create policy partner_contacts_update_staff on public.partner_contacts
  for update using (public.can_edit_records()) with check (public.can_edit_records());
create policy partner_contacts_delete_admin_manager on public.partner_contacts
  for delete using (public.is_admin_or_manager());
