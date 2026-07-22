-- Adds lead tracking. Run this after 0001_init.sql has already been
-- applied - it reuses the role-helper functions and set_updated_at()
-- trigger function defined there.

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  company text,
  email text,
  phone text,
  source text,
  status text not null default 'New',
  assigned_worker_id uuid references public.profiles (id),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_status_idx on public.leads (status);
create index leads_assigned_worker_idx on public.leads (assigned_worker_id);

create trigger set_updated_at before update on public.leads
  for each row execute function public.set_updated_at();

alter table public.leads enable row level security;

-- Same visibility model as client_goals/programs: any active staff member
-- can view, staff with an editing role can create/update, permanent
-- deletion is restricted to administrators/managers.
create policy leads_select on public.leads
  for select using (public.is_active_profile());

create policy leads_insert_staff on public.leads
  for insert with check (public.can_edit_records());

create policy leads_update_staff on public.leads
  for update using (public.can_edit_records()) with check (public.can_edit_records());

create policy leads_delete_admin_manager on public.leads
  for delete using (public.is_admin_or_manager());
