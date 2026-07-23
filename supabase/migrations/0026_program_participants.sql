-- Adds a persistent roster per program/activity, so participants only
-- need to be added once instead of re-selected every time a new group
-- session is logged - marking attendance becomes ticking a status against
-- the existing roster rather than re-entering people. Run this after
-- 0001_init.sql has already been applied.

create table public.program_participants (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  joined_date date not null default current_date,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (program_id, client_id)
);

create index program_participants_program_idx on public.program_participants (program_id);
create index program_participants_client_idx on public.program_participants (client_id);

alter table public.program_participants enable row level security;

-- Same visibility model as the client staff register: any active staff
-- member can view, staff with an editing role can add, permanent removal
-- restricted to administrators/managers.
create policy program_participants_select on public.program_participants
  for select using (public.is_active_profile());
create policy program_participants_insert_staff on public.program_participants
  for insert with check (public.can_edit_records());
create policy program_participants_delete_admin_manager on public.program_participants
  for delete using (public.is_admin_or_manager());
