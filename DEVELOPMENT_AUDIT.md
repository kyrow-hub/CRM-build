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
| Login | Supabase Auth | Email/password sign in; unauthenticated users are redirected here by `ProtectedRoute`. |
| Dashboard | `clients`, `leads`, `referrals`, `meetings`, `client_notes`, `case_activities`, `client_outcomes`, `good_news_stories` | Active Clients / Total Leads / Referrals This Week / Meetings This Week / Reviews Overdue stat cards, plus a real recent-activity feed aggregated across several tables. |
| Leads | `leads` | Full CRUD, search, filtering. |
| Clients (list) | `clients` | Full CRUD, search, status filtering, archive. |
| Client Detail | `clients` + tab-specific tables (below) | Header/details editable; each tab is its own panel. |
| Partners / Partner Detail | `partners` | Full CRUD, CSV export. |
| Attendance Register | `programs`, `program_sessions`, `attendance`, `client_notes` | Group session creation (including overnight-camp flag), roster attendance marking, and a Notes tab that writes into `client_notes` with a category. |
| Reports | See "Reports tabs" below | 14 tabs, all reading live data; CSV/XLSX export on every tab. |
| Meetings | `meetings` | Full CRUD. |
| Email | `client_emails` | Sending via the `send-email` Edge Function (Resend); receiving via the `receive-email` Edge Function (Resend inbound webhook, Svix-signature verified). |
| Settings | `profiles` | Own-profile editing; administrators/managers can view and change other users' roles and active status via Team Management. |

## Client Detail tabs

| Tab | Backing | Notes |
|---|---|---|
| Details | `clients` | Editable via the header "Edit" form. Includes a `living_situation` field (e.g. "Living with mother", "Foster care"). |
| Family & Contacts | `client_relationships` | Guardians, parents, siblings, and other emergency contacts, each with relationship type, phone, email, address, and a primary-contact flag. |
| Activities | `case_activities` | Confidentiality-aware (private entries visible only to their author and admins/managers). |
| Case Notes | `client_notes` | Category dropdown backed by `src/data/noteCategories.js` (16 service-delivery categories); confidentiality-aware. |
| Referrals | `referrals` | Full CRUD. |
| Goals & Outcomes | `client_goals` | Full CRUD, including target date, actions, responsible person, and progress status. |
| Outcomes | `client_outcomes` | Confidentiality-aware. |
| Staff Register | `client_staff_assignments` | Role-on-case assignments (Primary Case Worker, Program Worker, etc.), unique per client/worker/role. |
| Programs | derived from `attendance` + `program_sessions` | Read-only summary of program involvement (sessions attended, first/last date); no separate table. |
| Assessments | `client_assessments`, `client_service_plan_items`, `clients.next_review_date` | Intake/Review/Exit assessments covering presenting issues, risk, needs, protective factors, the Bori Muy SEWB scale, and exit outcomes (SRS-style reporting fields), plus a service plan register. Confidentiality-aware. Saving an Intake or Review assessment sets a "Next Review Due" date on the client (default 90 days out, editable); saving an Exit assessment clears it. Overdue reviews surface on the client profile, Reports, and the Dashboard. Goals from Section 6 of the assessment are managed on the Goals & Outcomes tab (now with Actions and Responsible Person). |
| Follow Ups | `client_follow_ups` | Pending/Completed/Cancelled workflow with overdue detection. |
| Documents | `client_documents` + `client-documents` Storage bucket | Upload/download/delete with confidentiality-aware RLS mirrored at the storage layer. |

## Reports tabs

Case Notes, Activities, Referrals, Goals & Outcomes, Outcomes, Service Delivery (Case
Notes grouped by category), Demographics, KPI Report, Program Performance, Overnight Camp
Report, Group Note Report, Good News Stories, Group Attendance, Assessments (assessment
type/risk/progress/presenting issues/protective factors breakdowns, SEWB domain averages,
and a Reviews Due list of clients with an overdue or upcoming review), and Full Service
Report (one combined multi-sheet spreadsheet across all of the above). All are
client-side aggregations over existing tables except Full Service Report, which reuses
the already-fetched data from the other tabs.

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
