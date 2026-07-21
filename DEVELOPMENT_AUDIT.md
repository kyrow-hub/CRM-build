# Development Audit

This audit was performed before the Supabase/authentication/Clients-module work in this
change. It reflects the state of the codebase as a pure React + Vite front-end shell, with
no backend, no persistence, and no authentication. A short "Status after this stage" note
is appended at the end describing what changed as a direct result of this audit.

## Summary

Everything in the app prior to this stage ran on mock data or local component state
(`useState`) only. Nothing persisted across a page reload. There was no backend, no
authentication, and no access control of any kind — anyone with the URL could see and
"edit" everything, and every edit vanished on refresh.

## Page-by-page

| Page | State | Notes |
|---|---|---|
| Dashboard | **Placeholder** | Stat cards (Total Leads, Active Deals, Revenue, Meetings This Week) are hardcoded to `0`/`$0`. "Recent Activity" is a static empty state. Nothing is wired to any data source. |
| Login | **Did not exist** | No authentication existed anywhere in the app. |
| Leads | **Working (mock data)** | Real search/filter across 10 hardcoded lead records (`src/data/mockLeads.js`). No detail page, no add/edit, no persistence. |
| Clients (list) | **Working (mock data)** | Real search/filter across 10 hardcoded client records (`src/data/mockClients.js`). Row click navigates to detail. No add/edit/archive; nothing persists. |
| Client Detail | **Partially working (mock + local state)** | Header reads from the mock record. Tabs: *Details* — local-only demographic intake form (`ClientDetailsPanel`), edits held in component state, lost on navigation/reload. *Case Notes* and *Goals & Outcomes* — real add/list forms, but local state only, reset whenever you navigate to a different client or reload. *Activities, Referrals, Staff Register, Programs, Follow Ups, Documents, Service Delivery* — static empty-state shells with no logic at all. |
| Partners / Partner Detail | **Working (mock data + React Context)** | Add partner / add contact are real, backed by a `PartnersContext` so state survives navigation between the list and detail pages within a session — but resets on reload. CSV export (mail merge) is genuinely functional and file-verified. No backend. |
| Attendance Register | **Working (local state)** | Add attendance / add note forms are real but state is page-local; resets on navigation away or reload. "Service Delivery" sub-tab is a static empty state. |
| Reports | **Placeholder** | All stat cards hardcoded to `0`. Tabs render static empty-state text only — not wired to any of the (already ephemeral) data entered elsewhere in the app. |
| Meetings | **Placeholder** | Static empty state, no logic. |
| Email | **Placeholder** | Static empty state, no logic. |
| Settings | **Placeholder** | Static empty state, no logic. |

## Components, context, data, and utilities

- **`context/PartnersContext.jsx`** — the only piece of cross-page state in the app prior to this stage. Everything else is either module-scoped mock arrays (read-only, imported directly by pages) or page-local `useState`.
- **`data/mock*.js`** (`mockClients`, `mockLeads`, `mockPartners`, `mockPrograms`) — static arrays, no persistence, no relationship to any backend.
- **`components/ui/*`** — a small, consistent design-system kit (Button, Card, EmptyState, Input, PlaceholderPage, StatCard, StatusPill). All presentational, no data logic. Reusable and kept as-is.
- **`components/client/*`** (`CaseNotesPanel`, `GoalsOutcomesPanel`, `ClientDetailsPanel`) — real forms with real local state, but not persisted.
- **`utils/exportCsv.js`, `utils/initials.js`** — pure functions, no data-source dependency, reusable as-is.
- No `lib/`, `services/`, `hooks/`, or auth-related folders existed. No environment variable handling existed. `.gitignore` did not exclude `.env`.
- No form validation beyond "is this field non-empty" in a couple of places; no server-side validation anywhere (there was no server).
- No notification/toast system existed anywhere in the app.

## Security posture (before this stage)

- No authentication. No concept of a logged-in user.
- No row-level or role-based access control — not applicable, since there was no data store.
- No secrets, keys, or environment variables were in use (none were needed).

## Risk callouts

- Because every list page (Clients, Leads, Partners) used **mock, non-persistent data**, none of it should be mistaken for real records — this was purely a visual/interaction prototype.
- The `ClientDetailsPanel` demographic intake form duplicated fields that overlap with the real `clients` table introduced in this stage (DOB, gender, indigenous status, address, emergency contact, etc.) — see "Status after this stage" below for how this was resolved.

---

## Status after this stage

As a direct result of this audit, the following moved from mock/local-state to a real
Supabase-backed implementation in this same change:

- **Authentication**: `AuthContext`, `Login` page, `ProtectedRoute` — all routes now require a signed-in Supabase session.
- **Clients module**: `Clients.jsx` and `ClientDetail.jsx` now read/write real `clients` rows via `services/clientService.js` (list/search/filter/create/update/archive), with loading, error, empty, and validation states, and success/error toasts via a new `ToastContext`.
- **`ClientDetailsPanel` was removed** — its fields are now the real, editable client record (shown in the "Details" tab and the header of `ClientDetail.jsx`), so the old local-only duplicate was deleted rather than left dangling.
- The global header client search and the client-detail page title (in `Layout.jsx`) were also switched from mock data to the real client service, since leaving them on mock data would have silently broken navigation (mock IDs are numbers; Supabase IDs are UUIDs).

**Still mock/local-state, unchanged in this stage** (out of the explicit scope for this
pass): Dashboard stats, Leads, Partners, Attendance Register, Reports, Meetings, Email,
Settings, and the Case Notes / Goals & Outcomes / Activities / Referrals / Staff Register /
Programs / Follow Ups / Documents / Service Delivery tabs on Client Detail. The database
migration provisions tables for programs, program_sessions, attendance, and client_notes
so these can be wired up in a future stage, but no frontend code was connected to them yet.
