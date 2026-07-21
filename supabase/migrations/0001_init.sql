-- Coral CRM initial schema
-- Run this once against a fresh Supabase project (SQL Editor, or `supabase db push`).
-- See README.md for the full setup walkthrough, including how to create the first
-- administrator account after this migration runs.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

create extension if not exists pgcrypto; -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- Roles
-- ---------------------------------------------------------------------------

create type public.user_role as enum (
  'administrator',
  'manager',
  'case_worker',
  'program_worker',
  'viewer'
);

-- ---------------------------------------------------------------------------
-- profiles
-- One row per Supabase auth user. Created automatically on signup via the
-- handle_new_user trigger below, defaulting to the lowest-privilege role.
-- Promote a user to administrator manually the first time (see README).
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text,
  last_name text,
  email text,
  phone text,
  role public.user_role not null default 'viewer',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------------

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  client_number text unique,
  first_name text not null,
  middle_name text,
  last_name text not null,
  preferred_name text,
  date_of_birth date,
  gender text,
  indigenous_status text,
  phone text,
  email text,
  address text,
  suburb text,
  postcode text,
  emergency_contact_name text,
  emergency_contact_phone text,
  referral_source text,
  assigned_worker_id uuid references public.profiles (id),
  status text not null default 'active',
  date_opened date not null default current_date,
  date_closed date,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint clients_dob_not_future check (date_of_birth is null or date_of_birth <= current_date)
);

create index clients_status_idx on public.clients (status);
create index clients_assigned_worker_idx on public.clients (assigned_worker_id);
create index clients_name_idx on public.clients (last_name, first_name);

-- ---------------------------------------------------------------------------
-- client_notes
-- ---------------------------------------------------------------------------

create table public.client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  note_type text,
  note_date date not null default current_date,
  content text not null,
  confidential boolean not null default false,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index client_notes_client_idx on public.client_notes (client_id);

-- ---------------------------------------------------------------------------
-- programs
-- ---------------------------------------------------------------------------

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  location text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- program_sessions
-- ---------------------------------------------------------------------------

create table public.program_sessions (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete cascade,
  session_date date not null,
  start_time time,
  end_time time,
  location text,
  overnight_camp boolean not null default false,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index program_sessions_program_idx on public.program_sessions (program_id);
create index program_sessions_date_idx on public.program_sessions (session_date);

-- ---------------------------------------------------------------------------
-- attendance
-- ---------------------------------------------------------------------------

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.program_sessions (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  attendance_status text not null default 'present',
  arrival_time time,
  departure_time time,
  transport_provided boolean not null default false,
  notes text,
  recorded_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, client_id)
);

create index attendance_session_idx on public.attendance (session_id);
create index attendance_client_idx on public.attendance (client_id);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.clients
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.client_notes
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.programs
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.program_sessions
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.attendance
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create a profile row whenever a new Supabase auth user signs up.
-- SECURITY DEFINER so it can write to public.profiles despite the signing-up
-- user having no profile (and therefore no RLS grant) yet.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Auto-generate a unique client_number on insert when none is supplied.
-- ---------------------------------------------------------------------------

create sequence public.clients_client_number_seq;

create or replace function public.generate_client_number()
returns trigger
language plpgsql
as $$
begin
  if new.client_number is null then
    new.client_number := 'CL-' || lpad(nextval('public.clients_client_number_seq')::text, 5, '0');
  end if;
  return new;
end;
$$;

create trigger generate_client_number before insert on public.clients
  for each row execute function public.generate_client_number();

-- ---------------------------------------------------------------------------
-- Role helper functions, used throughout the RLS policies below.
-- ---------------------------------------------------------------------------

create or replace function public.is_active_profile()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and active
  );
$$;

create or replace function public.is_admin_or_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and active and role in ('administrator', 'manager')
  );
$$;

create or replace function public.can_edit_records()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and active
      and role in ('administrator', 'manager', 'case_worker', 'program_worker')
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.client_notes enable row level security;
alter table public.programs enable row level security;
alter table public.program_sessions enable row level security;
alter table public.attendance enable row level security;

-- profiles: everyone with an active profile can look profiles up (needed for
-- "assigned worker" pickers); users can update their own row; administrators
-- and managers can manage everyone's.
create policy profiles_select_active_staff on public.profiles
  for select using (id = auth.uid() or public.is_active_profile());

create policy profiles_update_self on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy profiles_admin_manage on public.profiles
  for all using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());

-- clients: active records are visible to any active staff member; archived
-- records are only visible to administrators/managers. Only staff with an
-- editing role can create or update (including archiving, which is just an
-- update). Permanent deletion is restricted to administrators/managers.
create policy clients_select_active on public.clients
  for select using (archived_at is null and public.is_active_profile());

create policy clients_select_archived_admin_manager on public.clients
  for select using (public.is_admin_or_manager());

create policy clients_insert_staff on public.clients
  for insert with check (public.can_edit_records());

create policy clients_update_staff on public.clients
  for update using (public.can_edit_records()) with check (public.can_edit_records());

create policy clients_delete_admin_manager on public.clients
  for delete using (public.is_admin_or_manager());

-- client_notes: confidential notes are only visible to their author or an
-- administrator/manager; non-confidential notes are visible to all active
-- staff. Notes can be edited by their author or an administrator/manager.
-- Permanent deletion is restricted to administrators/managers.
create policy client_notes_select on public.client_notes
  for select using (
    (not confidential and public.is_active_profile())
    or (confidential and (created_by = auth.uid() or public.is_admin_or_manager()))
  );

create policy client_notes_insert_staff on public.client_notes
  for insert with check (public.can_edit_records());

create policy client_notes_update_own_or_admin on public.client_notes
  for update
  using (created_by = auth.uid() or public.is_admin_or_manager())
  with check (created_by = auth.uid() or public.is_admin_or_manager());

create policy client_notes_delete_admin_manager on public.client_notes
  for delete using (public.is_admin_or_manager());

-- programs / program_sessions / attendance: visible to any active staff
-- member; editable by staff with an editing role; permanent deletion
-- restricted to administrators/managers.
create policy programs_select on public.programs
  for select using (public.is_active_profile());
create policy programs_insert_staff on public.programs
  for insert with check (public.can_edit_records());
create policy programs_update_staff on public.programs
  for update using (public.can_edit_records()) with check (public.can_edit_records());
create policy programs_delete_admin_manager on public.programs
  for delete using (public.is_admin_or_manager());

create policy program_sessions_select on public.program_sessions
  for select using (public.is_active_profile());
create policy program_sessions_insert_staff on public.program_sessions
  for insert with check (public.can_edit_records());
create policy program_sessions_update_staff on public.program_sessions
  for update using (public.can_edit_records()) with check (public.can_edit_records());
create policy program_sessions_delete_admin_manager on public.program_sessions
  for delete using (public.is_admin_or_manager());

create policy attendance_select on public.attendance
  for select using (public.is_active_profile());
create policy attendance_insert_staff on public.attendance
  for insert with check (public.can_edit_records());
create policy attendance_update_staff on public.attendance
  for update using (public.can_edit_records()) with check (public.can_edit_records());
create policy attendance_delete_admin_manager on public.attendance
  for delete using (public.is_admin_or_manager());
