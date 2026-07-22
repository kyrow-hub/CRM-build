-- Adds meeting scheduling. Run this after 0001_init.sql has already been
-- applied - it reuses the role-helper functions and set_updated_at()
-- trigger function defined there.

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  meeting_date date not null,
  start_time time,
  end_time time,
  location text,
  meeting_type text not null default 'Internal',
  client_id uuid references public.clients (id) on delete set null,
  partner_id uuid references public.partners (id) on delete set null,
  notes text,
  status text not null default 'Scheduled',
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index meetings_date_idx on public.meetings (meeting_date);
create index meetings_status_idx on public.meetings (status);
create index meetings_client_idx on public.meetings (client_id);
create index meetings_partner_idx on public.meetings (partner_id);

create trigger set_updated_at before update on public.meetings
  for each row execute function public.set_updated_at();

alter table public.meetings enable row level security;

-- Same visibility model as leads/partners: any active staff member can
-- view, staff with an editing role can create/update, permanent deletion
-- restricted to administrators/managers.
create policy meetings_select on public.meetings
  for select using (public.is_active_profile());
create policy meetings_insert_staff on public.meetings
  for insert with check (public.can_edit_records());
create policy meetings_update_staff on public.meetings
  for update using (public.can_edit_records()) with check (public.can_edit_records());
create policy meetings_delete_admin_manager on public.meetings
  for delete using (public.is_admin_or_manager());
