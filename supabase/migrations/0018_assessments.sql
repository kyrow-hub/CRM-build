-- Adds a structured pre/post assessment (Intake / Review / Exit) covering
-- SRS-style reporting fields plus the Bori Muy SEWB outcomes measure, a
-- service plan register, and extends client_goals with the extra fields
-- an assessment-driven goal needs (actions, responsible person). Run this
-- after 0001_init.sql has already been applied.
--
-- Deliberately NOT duplicated here because they already exist elsewhere:
-- referral source, indigenous status, cultural background, preferred/legal
-- name, gender, date of birth, address/suburb/postcode, living situation
-- (clients table), and parent/guardian + emergency contact details
-- (client_relationships table, migration 0017).

alter table public.client_goals
  add column if not exists actions text,
  add column if not exists responsible_person uuid references public.profiles (id);

-- ---------------------------------------------------------------------------
-- client_service_plan_items
-- Section 8 (Service Plan): one row per service type agreed for a client,
-- each with its own frequency/worker/dates so it can be tracked and
-- reviewed independently of a single assessment event.
-- ---------------------------------------------------------------------------

create table public.client_service_plan_items (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  service_type text not null,
  frequency text,
  responsible_worker uuid references public.profiles (id),
  start_date date not null default current_date,
  review_date date,
  status text not null default 'Active',
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index client_service_plan_items_client_idx on public.client_service_plan_items (client_id);

create trigger set_updated_at before update on public.client_service_plan_items
  for each row execute function public.set_updated_at();

alter table public.client_service_plan_items enable row level security;

create policy client_service_plan_items_select on public.client_service_plan_items
  for select using (public.is_active_profile());
create policy client_service_plan_items_insert_staff on public.client_service_plan_items
  for insert with check (public.can_edit_records());
create policy client_service_plan_items_update_staff on public.client_service_plan_items
  for update using (public.can_edit_records()) with check (public.can_edit_records());
create policy client_service_plan_items_delete_admin_manager on public.client_service_plan_items
  for delete using (public.is_admin_or_manager());

-- ---------------------------------------------------------------------------
-- client_assessments
-- One row per Intake, Review (every ~90 days), or Exit assessment event.
-- Rating fields (risk, needs, SEWB) are stored as jsonb {domain: rating}
-- rather than one column per domain so new domains can be added without a
-- migration. Tick-list fields (presenting issues, protective factors) are
-- text[]. Risk/SEWB content can be sensitive, so this follows the same
-- confidentiality pattern as case_activities/client_outcomes.
-- ---------------------------------------------------------------------------

create table public.client_assessments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  assessment_type text not null check (assessment_type in ('Intake', 'Review', 'Exit')),
  assessment_date date not null default current_date,
  assessor_id uuid references public.profiles (id),

  -- Section 1: Intake & Eligibility
  referral_date date,
  intake_date date,
  consent_obtained boolean,
  eligibility_confirmed boolean,
  primary_program text,
  funding_source text,
  preferred_language text,
  school_or_education_provider text,

  -- Section 2: Presenting Issues
  presenting_issues text[] not null default '{}',
  presenting_issues_other text,

  -- Section 3: Risk Assessment
  risk_ratings jsonb not null default '{}'::jsonb,
  overall_risk_level text check (overall_risk_level in ('Low', 'Medium', 'High')),

  -- Section 4: Needs Assessment
  needs_ratings jsonb not null default '{}'::jsonb,

  -- Section 5: Protective Factors
  protective_factors text[] not null default '{}',

  -- Section 7: Bori Muy SEWB Assessment (1-5 per domain)
  sewb_scores jsonb not null default '{}'::jsonb,

  -- Section 9: Review Assessment
  engagement_rating text,
  attendance_rating text,
  progress_status text check (progress_status in ('Improved', 'No change', 'Declined')),
  review_notes text,

  -- Section 10: Exit Assessment
  exit_reason text,
  goals_achieved text,
  education_outcome text,
  employment_outcome text,
  housing_outcome text,
  cultural_outcome text,
  wellbeing_outcome text,
  referral_to_ongoing_supports text,
  staff_summary text,

  confidential boolean not null default false,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index client_assessments_client_idx on public.client_assessments (client_id);
create index client_assessments_type_idx on public.client_assessments (assessment_type);

create trigger set_updated_at before update on public.client_assessments
  for each row execute function public.set_updated_at();

alter table public.client_assessments enable row level security;

create policy client_assessments_select on public.client_assessments
  for select using (
    (not confidential and public.is_active_profile())
    or (confidential and (created_by = auth.uid() or public.is_admin_or_manager()))
  );
create policy client_assessments_insert_staff on public.client_assessments
  for insert with check (public.can_edit_records());
create policy client_assessments_update_own_or_admin on public.client_assessments
  for update
  using (created_by = auth.uid() or public.is_admin_or_manager())
  with check (created_by = auth.uid() or public.is_admin_or_manager());
create policy client_assessments_delete_admin_manager on public.client_assessments
  for delete using (public.is_admin_or_manager());
