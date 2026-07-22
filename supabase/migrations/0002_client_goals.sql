-- Adds goal/outcome tracking per client. Run this after 0001_init.sql has
-- already been applied - it reuses the role-helper functions and
-- set_updated_at() trigger function defined there.

create table public.client_goals (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  title text not null,
  target_date date,
  status text not null default 'Not Started',
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index client_goals_client_idx on public.client_goals (client_id);

create trigger set_updated_at before update on public.client_goals
  for each row execute function public.set_updated_at();

alter table public.client_goals enable row level security;

-- Same visibility model as programs/attendance: any active staff member can
-- view, staff with an editing role can create/update, permanent deletion is
-- restricted to administrators/managers.
create policy client_goals_select on public.client_goals
  for select using (public.is_active_profile());

create policy client_goals_insert_staff on public.client_goals
  for insert with check (public.can_edit_records());

create policy client_goals_update_staff on public.client_goals
  for update using (public.can_edit_records()) with check (public.can_edit_records());

create policy client_goals_delete_admin_manager on public.client_goals
  for delete using (public.is_admin_or_manager());
