-- Adds risk assessments for programs/activities and camps, distinct from
-- the per-client risk assessment already captured on client_assessments.
-- A row with session_id null is an annual Program/Activity risk
-- assessment (renew every 12 months); a row with session_id set is a
-- one-off assessment tied to a specific camp session (required for every
-- overnight camp run). Run this after 0001_init.sql has already been
-- applied.

create table public.program_risk_assessments (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete cascade,
  session_id uuid references public.program_sessions (id) on delete cascade,
  assessment_date date not null default current_date,
  assessor_id uuid references public.profiles (id),
  hazards_identified text,
  control_measures text,
  overall_risk_rating text check (overall_risk_rating in ('Low', 'Medium', 'High')),
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index program_risk_assessments_program_idx on public.program_risk_assessments (program_id);
create index program_risk_assessments_session_idx on public.program_risk_assessments (session_id);

create trigger set_updated_at before update on public.program_risk_assessments
  for each row execute function public.set_updated_at();

alter table public.program_risk_assessments enable row level security;

-- Same visibility model as programs/program_sessions: any active staff
-- member can view, staff with an editing role can create/update,
-- permanent deletion restricted to administrators/managers.
create policy program_risk_assessments_select on public.program_risk_assessments
  for select using (public.is_active_profile());
create policy program_risk_assessments_insert_staff on public.program_risk_assessments
  for insert with check (public.can_edit_records());
create policy program_risk_assessments_update_staff on public.program_risk_assessments
  for update using (public.can_edit_records()) with check (public.can_edit_records());
create policy program_risk_assessments_delete_admin_manager on public.program_risk_assessments
  for delete using (public.is_admin_or_manager());
