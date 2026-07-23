-- Adds incident management (compliance spec Section 8): logging an
-- incident report, a manager review step, follow-up completion, and an
-- outcome, all required before an incident can be closed. An incident may
-- optionally be linked to a client and/or a program/camp session, since
-- not every incident involves one specific young person. Run this after
-- 0001_init.sql has already been applied.

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients (id) on delete set null,
  program_id uuid references public.programs (id) on delete set null,
  session_id uuid references public.program_sessions (id) on delete set null,
  incident_date date not null default current_date,
  incident_type text not null,
  severity text not null check (severity in ('Low', 'Medium', 'High', 'Critical')),
  description text not null,
  location text,
  reported_by uuid references public.profiles (id),
  status text not null default 'Open' check (status in ('Open', 'Under Review', 'Closed')),
  manager_reviewed boolean not null default false,
  manager_reviewed_by uuid references public.profiles (id),
  manager_reviewed_at timestamptz,
  review_notes text,
  follow_up_completed boolean not null default false,
  follow_up_notes text,
  outcome text,
  confidential boolean not null default false,
  closed_at timestamptz,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index incidents_client_idx on public.incidents (client_id);
create index incidents_status_idx on public.incidents (status);
create index incidents_severity_idx on public.incidents (severity);

create trigger set_updated_at before update on public.incidents
  for each row execute function public.set_updated_at();

alter table public.incidents enable row level security;

-- Same confidentiality pattern as case_activities/client_outcomes -
-- incidents often involve sensitive matters (child safety, self-harm,
-- family violence), so staff can mark one confidential to restrict it to
-- its author and administrators/managers.
create policy incidents_select on public.incidents
  for select using (
    (not confidential and public.is_active_profile())
    or (confidential and (created_by = auth.uid() or public.is_admin_or_manager()))
  );
create policy incidents_insert_staff on public.incidents
  for insert with check (public.can_edit_records());
create policy incidents_update_staff on public.incidents
  for update using (public.can_edit_records()) with check (public.can_edit_records());
create policy incidents_delete_admin_manager on public.incidents
  for delete using (public.is_admin_or_manager());
