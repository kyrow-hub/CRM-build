-- Adds a Staff Register: the formal roster of staff responsible for a
-- client, beyond the single clients.assigned_worker_id primary worker -
-- e.g. a secondary support worker, a cultural support worker, or a
-- supervisor overseeing the case. Run this after 0001_init.sql has
-- already been applied.

create table public.client_staff_assignments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  profile_id uuid not null references public.profiles (id),
  role_on_case text not null default 'Case Worker',
  notes text,
  assigned_date date not null default current_date,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, profile_id, role_on_case)
);

create index client_staff_assignments_client_idx on public.client_staff_assignments (client_id);
create index client_staff_assignments_profile_idx on public.client_staff_assignments (profile_id);

create trigger set_updated_at before update on public.client_staff_assignments
  for each row execute function public.set_updated_at();

alter table public.client_staff_assignments enable row level security;

-- Same visibility model as leads/partners/meetings: any active staff
-- member can view, staff with an editing role can create/update,
-- permanent deletion restricted to administrators/managers. No
-- confidentiality flag - who's on a client's care team isn't sensitive
-- in the way case content is.
create policy client_staff_assignments_select on public.client_staff_assignments
  for select using (public.is_active_profile());
create policy client_staff_assignments_insert_staff on public.client_staff_assignments
  for insert with check (public.can_edit_records());
create policy client_staff_assignments_update_staff on public.client_staff_assignments
  for update using (public.can_edit_records()) with check (public.can_edit_records());
create policy client_staff_assignments_delete_admin_manager on public.client_staff_assignments
  for delete using (public.is_admin_or_manager());
