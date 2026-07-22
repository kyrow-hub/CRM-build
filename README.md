# Bori Muy CRM

A React + Vite CRM for Bori Muy LTD, backed by [Supabase](https://supabase.com) for
authentication, database, and Row Level Security.

See [`DEVELOPMENT_AUDIT.md`](./DEVELOPMENT_AUDIT.md) for a full breakdown of what's real
vs. mock/placeholder in the current build.

## Installation

```bash
npm install
```

## Environment variables

Copy the example file and fill in your own Supabase project's values:

```bash
cp .env.example .env
```

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

Both values are found in your Supabase project under **Project Settings → API**. Use the
**anon / public** key only — never put the service-role key in this file or anywhere in the
frontend. `.env` is gitignored; do not commit it.

If `.env` is missing or incomplete, the app shows a "Supabase is not configured" screen
instead of the CRM (it will not crash or silently fail).

## Supabase setup

1. Create a new project at [supabase.com](https://supabase.com).
2. Grab the Project URL and anon key from **Project Settings → API** and put them in `.env`
   (see above).
3. Run the SQL migration (below) to create the schema, roles, and security policies.
4. Create your first administrator account (below).
5. Enable **Email** auth under **Authentication → Providers** if it isn't already (it is by
   default).

### Running the SQL migrations

The schema lives in [`supabase/migrations/`](./supabase/migrations), as a series of
numbered files (`0001_init.sql`, `0002_client_goals.sql`, ...). Run them **in order, once
each**, against your project, either:

- **SQL Editor**: open your project's SQL Editor in the Supabase dashboard, paste the full
  contents of each file in order, and run it, or
- **Supabase CLI**: `supabase db push` (if you have the project linked via the CLI).

Never edit an already-applied migration file - if the schema needs to change, add a new
numbered migration instead.

`0001_init.sql` creates the foundation:
- `profiles`, `clients`, `client_notes`, `programs`, `program_sessions`, `attendance`
- A `user_role` enum (`administrator`, `manager`, `case_worker`, `program_worker`, `viewer`)
- A trigger that auto-creates a `profiles` row (defaulting to the `viewer` role) whenever
  someone signs up
- A trigger that auto-generates a unique `client_number` (e.g. `CL-00001`) when one isn't
  supplied
- Row Level Security enabled on every table, with starter policies (see
  `DEVELOPMENT_AUDIT.md` and the migration file's comments for exactly what each policy
  allows)

Later migrations add (in order): client goals, leads, partners, group sessions, the
case-management/outcomes/referrals foundation, meetings, and the client email log - each
following the same RLS pattern.

### Creating the first administrator account

New signups default to the lowest-privilege `viewer` role — nobody can grant themselves
`administrator`. To create the first admin:

1. Sign up normally through the app's login flow (or create a user via **Authentication →
   Users → Add user** in the Supabase dashboard), so a `profiles` row is auto-created.
2. In the Supabase SQL Editor, promote that user:

   ```sql
   update public.profiles
   set role = 'administrator'
   where email = 'you@example.com';
   ```

3. Sign in — you now have full administrator access and can promote/manage other users
   from the database directly (a dedicated admin UI for this isn't built yet).

## Email sending (Resend)

The Email page sends real email through [Resend](https://resend.com) via a Supabase Edge
Function (`supabase/functions/send-email`). The Resend API key never touches the frontend
- it lives only in the Edge Function's environment.

1. Create a free account at [resend.com](https://resend.com) and grab an API key from the
   dashboard.
2. Verify a sending domain under **Domains** (add the SPF/DKIM DNS records Resend gives
   you). Until a domain is verified, Resend's sandbox only lets you send to your own
   account email - fine for testing, not for real client emails.
3. Install the [Supabase CLI](https://supabase.com/docs/guides/cli) if you don't have it,
   then link your project:
   ```bash
   supabase login
   supabase link --project-ref your-project-ref
   ```
4. Set the Edge Function secrets (never commit these):
   ```bash
   supabase secrets set RESEND_API_KEY=re_your_api_key
   supabase secrets set RESEND_FROM_ADDRESS="Bori Muy CRM <crm@yourverifieddomain.org>"
   ```
5. Deploy the function:
   ```bash
   supabase functions deploy send-email
   ```
6. Run the `0008_client_emails.sql` migration (see above) if you haven't already.

Every send is logged to `client_emails` regardless of whether it succeeds, so failures are
visible in the Email page rather than silently disappearing. Receiving/replying to inbound
email is a separate, later phase - it needs your domain's MX records pointed at a provider
and an inbound webhook, which isn't built yet.

## Running locally

```bash
npm run dev
```

Open the printed local URL. You'll land on the login screen if you're not signed in.

## Build

```bash
npm run build
```

## Project structure

```
src/
  lib/          Supabase client (src/lib/supabase.js)
  services/     Data-access functions per domain (e.g. clientService.js) — the only
                place that talks to Supabase directly
  hooks/        Data-fetching hooks that wrap services with loading/error state
  context/      AuthContext, ToastContext
  components/
    auth/       ProtectedRoute
    client/     Client-specific form/panel components (Case Notes, Goals, Activities,
                Outcomes, Referrals)
    attendance/ Group session form/list
    layout/     Sidebar, Header, Layout
    ui/         Design-system primitives (Button, Card, StatusPill, ...)
  pages/        One file per route
supabase/
  migrations/   Numbered SQL migrations, run in order against your Supabase project
  functions/    Edge Functions (send-email), deployed via the Supabase CLI
```

## What's real vs. mock right now

Authentication, Clients, Case Notes, Goals & Outcomes, Case Activities, Outcomes,
Referrals, Attendance Register/Group Sessions, Reports, Leads, Partners, Meetings, and
Email (outbound sending) are all wired to real Supabase tables (and, for Email, a Resend
Edge Function). Settings and inbound email (replying/receiving) are still not built. See
`DEVELOPMENT_AUDIT.md` for the full page-by-page breakdown, though note it was written
early on and hasn't been kept fully in sync with every migration since.
