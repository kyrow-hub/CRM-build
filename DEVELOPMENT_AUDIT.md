# Development Audit

This document is a reference for what's actually built and wired to Supabase in the Bori
Muy CRM, page by page. It is kept up to date as features ship — if you add or change a
page/tab, update the relevant row here in the same change.

## Summary

Every page, and every tab on the Client Detail screen, is backed by real Supabase tables
(and, for Documents, Supabase Storage) with Row Level Security enforced. There is no mock
data and no local-only state left in the app — a page refresh never loses data. Access is
gated by Supabase Auth plus role-based RLS policies (see `supabase/migrations/`).

## Page-by-page

| Page | Backing | Notes |
|---|---|---|
| Login | Supabase Auth | Email/password sign in; unauthenticated users are redirected here by `ProtectedRoute`. Includes a self-service "Forgot password?" flow (`resetPasswordForEmail`) and a `/reset-password` page (public route, outside `ProtectedRoute`) that lets a user set a new password once they follow the emailed link, which Supabase authenticates with a short-lived recovery session. Requires the Supabase project's Auth redirect URL allow-list to include `<app-url>/reset-password`, and for the built-in or configured SMTP email sending to be enabled in the Supabase dashboard - both are project settings, not something this codebase controls. |
| Dashboard | `clients`, `leads`, `referrals`, `meetings`, `client_notes`, `case_activities`, `client_outcomes`, `good_news_stories` | Active Clients / Total Leads / Referrals This Week / Meetings This Week / Reviews Overdue / Compliance Alerts / Open Incidents stat cards, plus a real recent-activity feed aggregated across several tables. |
| Leads | `leads` | Full CRUD, search, filtering. Edit/Delete restricted to admins/managers. |
| Referrals | `referrals`, `client_documents` | Accept/decline, link/re-link to an existing client at any time, and attach documents before a client record even exists - linking a referral automatically moves its documents onto that client's Documents tab. Edit/Delete restricted to admins/managers. |
| Clients (list) | `clients` | Full CRUD, search, status filtering, archive. |
| Client Detail | `clients` + tab-specific tables (below) | Header/details editable; each tab is its own panel. |
| Partners / Partner Detail | `partners` | Full CRUD, CSV export. Edit/Delete on the partner record and on each contact restricted to admins/managers (deleting a partner cascades to its contacts). |
| Attendance Register | `programs`, `program_sessions`, `attendance`, `client_notes`, `client_documents`, `program_participants` | Group sessions draw their participant list from each program's persistent roster (`program_participants`) - add someone once and they're pre-populated (defaulting to Present) on every future session for that program instead of being re-selected each time; a status dropdown per person covers Present/Absent/Late/Left Early/Excused, and an X removes someone from the roster entirely (admin/manager only). Admins/managers also get a "Manage Programs" list to edit or delete a program itself (name, location, active flag) - editing a program is now admin/manager-only, tightened from the original any-editor-role policy. Also includes a Notes tab that writes into `client_notes` with a category, and a Risk Assessments tab: externally-created risk assessments are uploaded as documents against a program (due every 365 days) or a specific camp session (required for every camp), reusing the same document infrastructure as client/referral documents. |
| Incidents | `incidents`, `client_documents` | Organisation-wide incident register (compliance spec Section 8): report an incident (type, severity, description, optionally linked to a client), then work it through Manager Review → Follow-up → Outcome. The Close action is disabled until all three are complete - a genuine hard gate, not a warn-and-override like the client Archive flow, since there's no legitimate reason to close an incident early. Each incident also has a Documents section for uploading scanned hard copies (or any other file), reusing the same document infrastructure as clients/referrals/programs. Confidentiality-aware. |
| Reports | See "Reports tabs" below | 16 tabs, all reading live data; CSV/XLSX export on every tab. |
| Meetings | `meetings` | Full CRUD. Edit/Delete restricted to admins/managers. |
| Email | `client_emails` | Sending via the `send-email` Edge Function (Resend); receiving via the `receive-email` Edge Function (Resend inbound webhook, Svix-signature verified). |
| Settings | `profiles`, Supabase Auth | Own-profile editing and self-service password change (re-authenticates with the current password via Supabase Auth before updating it); administrators/managers can view and change other users' roles and active status via Team Management. |

## Client Detail tabs

| Tab | Backing | Notes |
|---|---|---|
| Details | `clients` | Editable via the header "Edit" form. Includes a `living_situation` field (e.g. "Living with mother", "Foster care"). |
| Family & Contacts | `client_relationships` | Guardians, parents, siblings, and other emergency contacts, each with relationship type, phone, email, address, and a primary-contact flag. |
| Activities | `case_activities` | Confidentiality-aware (private entries visible only to their author and admins/managers). Edit/Delete on each entry - Edit for the author or an admin/manager, Delete restricted to admins/managers. |
| Case Notes | `client_notes` | Category dropdown backed by `src/data/noteCategories.js` (16 service-delivery categories); confidentiality-aware. Edit/Delete on each entry - Edit for the author or an admin/manager, Delete restricted to admins/managers. |
| Referrals | `referrals` | Full CRUD. |
| Goals & Outcomes | `client_goals` | Full CRUD, including target date, actions, responsible person, and progress status. Edit/Delete restricted to admins/managers. |
| Outcomes | `client_outcomes` | Confidentiality-aware. Edit for the author or an admin/manager, Delete restricted to admins/managers. |
| Staff Register | `client_staff_assignments` | Role-on-case assignments (Primary Case Worker, Program Worker, etc.), unique per client/worker/role. Admins/managers can edit an assignment's role/date/notes or remove it (changing the assigned worker requires remove + re-add). |
| Programs | derived from `attendance` + `program_sessions` | Read-only summary of program involvement (sessions attended, first/last date); no separate table. |
| Assessments | `client_assessments`, `client_service_plan_items`, `clients.next_review_date` | Intake/Review/Exit assessments covering presenting issues, risk, needs, protective factors, the Bori Muy SEWB scale, and exit outcomes (SRS-style reporting fields), plus a service plan register. Confidentiality-aware. Saving an Intake or Review assessment sets a "Next Review Due" date on the client (default 90 days out, editable); saving an Exit assessment clears it. Overdue reviews surface on the client profile, Reports, and the Dashboard. Goals from Section 6 of the assessment are managed on the Goals & Outcomes tab (now with Actions and Responsible Person). |
| Follow Ups | `client_follow_ups` | Pending/Completed/Cancelled workflow with overdue detection. Edit/Delete restricted to admins/managers. |
| Documents | `client_documents` + `client-documents` Storage bucket | Upload/download/delete with confidentiality-aware RLS mirrored at the storage layer. Each upload is tagged with a `document_type` (Consent Form, Privacy Consent, Media Consent, Transport Consent, Camp Consent, Medical Information, Referral Document, Other), which the Compliance tab checks against. Includes documents uploaded from the Referrals page before this client's record existed. |
| Compliance | derived from most other client tables (see below) | Automated 🟢/🟡/🔴 status, 0-100% score, an alert panel, and a section-by-section checklist, computed client-side (no compliance data is stored). A "Generate Tasks" button turns failing critical checks into `client_follow_ups` tasks assigned to the client's worker (skips anything that already has a matching pending follow-up). See "Compliance engine" below for exactly what's covered. |
| Incidents | `incidents` | Incidents involving this client, same Manager Review → Follow-up → Outcome workflow as the top-level Incidents page (shares the same `IncidentRow` component), scoped to `client_id`. |

## Reports tabs

Case Notes, Activities, Referrals, Goals & Outcomes, Outcomes, Service Delivery (Case
Notes grouped by category), Demographics, KPI Report, Program Performance, Overnight Camp
Report, Group Note Report, Good News Stories, Group Attendance, Assessments (assessment
type/risk/progress/presenting issues/protective factors breakdowns, SEWB domain averages,
and a Reviews Due list of clients with an overdue or upcoming review), Compliance (per-client
score/status table sorted worst-first, and Files Needing Attention counts - Missing Intake,
Missing Consent, Reviews Overdue, No Service in 30 Days, Missing Exit Assessment), Incidents
(total/open/under review/closed counts, type/severity/status breakdowns, and a full list with
each incident's checklist progress), and Full Service Report (one combined multi-sheet
spreadsheet across all of the above). All are client-side aggregations over existing tables
except Full Service Report, which reuses the already-fetched data from the other tabs.
Good News Stories (`good_news_stories`) additionally has Edit/Delete on each story,
restricted to admins/managers.

## Compliance engine

`src/services/complianceService.js` computes a client's compliance status entirely from
existing tables - there's no separate "compliance" table, so nothing can drift out of sync
with the real records. It's a direct implementation of the compliance spec's Sections 1-9,
with the following deliberate scope boundaries:

- **Section 8 (Incident Management)**: only scored if the client has at least one incident
  (`incidents` table, `client_id` set). All three of "reviewed by a manager", "follow-up
  completed", and "outcome recorded" must be true across every incident linked to the
  client for this section to pass - matching the app-level rule that an individual incident
  can't be closed until the same three things are done (see the Incidents page/tab, which
  enforces that as a hard block, not a soft warning). Having an open incident isn't itself a
  compliance failure; an incident that's stalled on review/follow-up/outcome is.
- **Reviews (Section 4)** only tracks the single 90-day review cycle already built
  (`clients.next_review_date`, set from the Assessments tab). Risk Review, Goal Review, and
  Support Plan Review share that same date rather than being tracked as three independent
  cycles.
- **Transport Consent** is a selectable document type but isn't auto-required by a Smart
  Rule, since nothing in the app records whether transport was actually provided to a
  client.
- **High Risk / Youth Justice Smart Rules** surface as informational alerts only (not
  scored), since "Risk Management Plan", "manager approval", and "Youth Justice
  documentation" aren't trackable records in the current schema - they're reminders to
  check manually, not automated checks.
- **Exit gating (Section 9) is a soft gate, not a hard block.** Archiving a client whose
  exit checklist is incomplete shows what's missing in the confirmation dialog, but staff
  can still proceed - a hard, unoverridable block risked trapping staff in an inconsistent
  state with no way out.
- Compliance results respect the same confidentiality RLS as everywhere else: a
  non-admin/manager viewer's score reflects only what they're allowed to see, so two staff
  members can see different scores for the same client if confidential records are
  involved.
- **Consent Form must be renewed every 12 months**, not just uploaded once - the check
  looks at the most recent Consent Form document's upload date, not just whether one
  exists. The other core mandatory documents (Privacy Consent, Media Consent, Medical
  Information, Referral Document) only require presence, since annual renewal was only
  requested for the Consent Form specifically.

Program/activity and camp risk assessments (Attendance Register → Risk Assessments tab), and
incident attachments (Incidents page/tab - e.g. a scanned hard-copy incident report), are
both uploaded documents, not typed-in records - `client_documents` gained `program_id`,
`program_session_id`, and `incident_id` columns (a row must have at least one of
client_id/referral_id/program_id/incident_id set) so these files reuse the exact same
storage bucket, signed URLs, and RLS as client and referral documents rather than a
parallel system. Program/camp risk assessments are tracked separately from client
compliance (they're about the program/session, not an individual client) and aren't
currently factored into a client's compliance score or the Reports/Dashboard compliance
widgets; incident documents are just attachments and don't affect compliance scoring either
way (only the review/follow-up/outcome fields do - see Section 8 above).

## Security posture

- Row Level Security is enabled on every table; policies are defined per migration in
  `supabase/migrations/` and generally follow one of two shapes:
  - **Confidentiality-aware** (`case_activities`, `client_outcomes`, `client_notes` where
    applicable, `client_documents`): a `confidential` flag restricts visibility to the
    author and administrators/managers.
  - **Standard editable roster** (most other tables): any active profile can read, editors
    (`can_edit_records()`) can insert/update, and only administrators/managers can delete.
- New signups default to the lowest-privilege `viewer` role. Nobody can self-promote — a
  BEFORE UPDATE trigger (`guard_profile_privilege_columns`, migration `0009`) blocks a user
  from changing their own `role` or `active` columns, even via a direct SQL update.
- The Resend service-role key and API key exist only as Supabase Edge Function secrets and
  never reach the frontend. The inbound-email function verifies Resend's Svix webhook
  signature before writing anything.
- Supabase Storage documents use signed URLs (60s expiry) rather than public URLs, and
  bucket RLS policies join back to `client_documents` to enforce the same confidentiality
  rule at the storage layer.

## Project structure

See `README.md` for the up-to-date directory layout and local setup instructions.
