-- Adds the case-management and outcomes foundation: a referral intake
-- pipeline, a generalized case-activity log (individual support sessions,
-- home/school visits, family meetings, case conferences, safety plans,
-- referrals made to other services), and a generalized outcomes log
-- covering education, employment, health & wellbeing, justice, family and
-- cultural outcomes. Run this after 0001_init.sql has already been applied.

alter table public.clients
  add column risk_level text,
  add column cultural_background text,
  add column exit_reason text;

-- ---------------------------------------------------------------------------
-- referrals
-- Tracks a referral from first contact through to accepted/declined,
-- independent of whether a client record exists yet. Once accepted and a
-- client record is created, link it via client_id.
-- ---------------------------------------------------------------------------

create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  phone text,
  email text,
  referral_source text,
  referred_by text,
  date_received date not null default current_date,
  status text not null default 'Received',
  decline_reason text,
  accepted_date date,
  client_id uuid references public.clients (id) on delete set null,
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index referrals_status_idx on public.referrals (status);
create index referrals_client_idx on public.referrals (client_id);

-- ---------------------------------------------------------------------------
-- case_activities
-- One flexible log for case-management activity types instead of a
-- separate table per type: individual support sessions, home visits,
-- school visits, family meetings, case conferences, referrals made to
-- other services, safety plans, and anything else staff need to log.
-- ---------------------------------------------------------------------------

create table public.case_activities (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  activity_type text not null,
  activity_date date not null default current_date,
  notes text,
  confidential boolean not null default false,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index case_activities_client_idx on public.case_activities (client_id);
create index case_activities_type_idx on public.case_activities (activity_type);

-- ---------------------------------------------------------------------------
-- client_outcomes
-- One flexible log covering the education, employment, health &
-- wellbeing, justice, family and cultural outcome domains, plus camps.
-- category is the domain; outcome_type is a free-text label within it
-- (e.g. category "Employment", outcome_type "Employment Gained").
-- ---------------------------------------------------------------------------

create table public.client_outcomes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  category text not null,
  outcome_type text not null,
  outcome_date date not null default current_date,
  notes text,
  confidential boolean not null default false,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index client_outcomes_client_idx on public.client_outcomes (client_id);
create index client_outcomes_category_idx on public.client_outcomes (category);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create trigger set_updated_at before update on public.referrals
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.case_activities
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.client_outcomes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.referrals enable row level security;
alter table public.case_activities enable row level security;
alter table public.client_outcomes enable row level security;

-- referrals: visible to any active staff member; editable by staff with an
-- editing role; permanent deletion restricted to administrators/managers.
create policy referrals_select on public.referrals
  for select using (public.is_active_profile());
create policy referrals_insert_staff on public.referrals
  for insert with check (public.can_edit_records());
create policy referrals_update_staff on public.referrals
  for update using (public.can_edit_records()) with check (public.can_edit_records());
create policy referrals_delete_admin_manager on public.referrals
  for delete using (public.is_admin_or_manager());

-- case_activities / client_outcomes: same confidentiality model as
-- client_notes - confidential entries are only visible to their author or
-- an administrator/manager, everything else is visible to all active
-- staff. Editable by their author or an administrator/manager. Permanent
-- deletion is restricted to administrators/managers.
create policy case_activities_select on public.case_activities
  for select using (
    (not confidential and public.is_active_profile())
    or (confidential and (created_by = auth.uid() or public.is_admin_or_manager()))
  );
create policy case_activities_insert_staff on public.case_activities
  for insert with check (public.can_edit_records());
create policy case_activities_update_own_or_admin on public.case_activities
  for update
  using (created_by = auth.uid() or public.is_admin_or_manager())
  with check (created_by = auth.uid() or public.is_admin_or_manager());
create policy case_activities_delete_admin_manager on public.case_activities
  for delete using (public.is_admin_or_manager());

create policy client_outcomes_select on public.client_outcomes
  for select using (
    (not confidential and public.is_active_profile())
    or (confidential and (created_by = auth.uid() or public.is_admin_or_manager()))
  );
create policy client_outcomes_insert_staff on public.client_outcomes
  for insert with check (public.can_edit_records());
create policy client_outcomes_update_own_or_admin on public.client_outcomes
  for update
  using (created_by = auth.uid() or public.is_admin_or_manager())
  with check (created_by = auth.uid() or public.is_admin_or_manager());
create policy client_outcomes_delete_admin_manager on public.client_outcomes
  for delete using (public.is_admin_or_manager());
