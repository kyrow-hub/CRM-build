-- Adds Follow Ups: lightweight scheduled action items/reminders for a
-- client (e.g. "Call parent next Tuesday"), distinct from Meetings which
-- are full scheduled meetings with a location and type. Run this after
-- 0001_init.sql has already been applied.

create table public.client_follow_ups (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  title text not null,
  due_date date not null default current_date,
  status text not null default 'Pending',
  notes text,
  assigned_to uuid references public.profiles (id),
  completed_at timestamptz,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index client_follow_ups_client_idx on public.client_follow_ups (client_id);
create index client_follow_ups_status_idx on public.client_follow_ups (status);
create index client_follow_ups_due_date_idx on public.client_follow_ups (due_date);

create trigger set_updated_at before update on public.client_follow_ups
  for each row execute function public.set_updated_at();

alter table public.client_follow_ups enable row level security;

-- Same visibility model as leads/partners/meetings: any active staff
-- member can view, staff with an editing role can create/update,
-- permanent deletion restricted to administrators/managers.
create policy client_follow_ups_select on public.client_follow_ups
  for select using (public.is_active_profile());
create policy client_follow_ups_insert_staff on public.client_follow_ups
  for insert with check (public.can_edit_records());
create policy client_follow_ups_update_staff on public.client_follow_ups
  for update using (public.can_edit_records()) with check (public.can_edit_records());
create policy client_follow_ups_delete_admin_manager on public.client_follow_ups
  for delete using (public.is_admin_or_manager());
