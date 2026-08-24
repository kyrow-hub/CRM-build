-- Three independent additions requested together:
--
-- 1. client_goals.willingness_to_change - a readiness-to-change rating
--    alongside each goal (Not Interested / Thinking About It / Making
--    Change / Taking Steps).
--
-- 2. clients.client_type - splits clients into "Activity Only" (drop-in/
--    program participation only) vs "Case Managed" (full case work). The
--    compliance engine (complianceService.js) reduces Activity Only
--    clients down to just the four core documents rather than the full
--    case-management checklist - see that file for the actual logic.
--
-- 3. client_staff_assignments external staff support - a row can now
--    represent either an internal staff profile (profile_id set) or an
--    external worker from another organisation (external_name set
--    instead), never both/neither.

alter table public.client_goals
  add column if not exists willingness_to_change text;

alter table public.clients
  add column if not exists client_type text not null default 'case_managed';

alter table public.clients
  drop constraint if exists clients_client_type_check;
alter table public.clients
  add constraint clients_client_type_check check (client_type in ('case_managed', 'activity_only'));

alter table public.client_staff_assignments
  alter column profile_id drop not null;
alter table public.client_staff_assignments
  add column if not exists external_name text,
  add column if not exists external_organisation text;

alter table public.client_staff_assignments
  drop constraint if exists client_staff_assignments_person_check;
alter table public.client_staff_assignments
  add constraint client_staff_assignments_person_check check (
    (profile_id is not null and external_name is null)
    or (profile_id is null and external_name is not null)
  );
