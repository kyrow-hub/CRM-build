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
   directly from Settings → Team Management.

## Email sending and receiving (Resend)

The Email page sends and receives real email through [Resend](https://resend.com) via two
Supabase Edge Functions. Neither the Resend API key nor the Supabase service-role key ever
touch the frontend - both live only in Edge Function secrets.

### Sending (send-email)

1. Create a free account at [resend.com](https://resend.com) and grab an API key from the
   dashboard.
2. Verify a sending domain under **Domains** (add the SPF/DKIM DNS records Resend gives
   you). Until verified, Resend's sandbox only lets you send to your own account email.
3. Install the [Supabase CLI](https://supabase.com/docs/guides/cli) if you don't have it,
   then link your project: `supabase login` and `supabase link --project-ref your-project-ref`.
4. Set secrets and deploy:
   ```bash
   supabase secrets set RESEND_API_KEY=re_your_api_key
   supabase secrets set RESEND_FROM_ADDRESS="Bori Muy CRM <crm@yourverifieddomain.org>"
   supabase functions deploy send-email
   ```

### Receiving (receive-email)

This is a bigger step - it requires DNS changes on a domain you control.

1. In Resend, go to your verified domain and enable **Inbound** (or add an inbound route),
   which gives you an MX record to add at your DNS provider pointing mail for that domain
   (or a subdomain like `mail.yourdomain.org`) at Resend's inbound servers.
2. Create a webhook in Resend for the `email.received` event, pointed at your deployed
   function's URL (`https://your-project-ref.supabase.co/functions/v1/receive-email`).
   Resend will show you a signing secret when you create it - copy it.
3. Get your project's **service-role key** from Supabase dashboard → Project Settings →
   API (this key bypasses all security rules - never put it in the frontend or commit it
   anywhere).
4. Set secrets and deploy with JWT verification disabled (Resend isn't a logged-in CRM
   user, so there's no Supabase auth token for it to send - authenticity instead comes from
   the webhook signature, which the function verifies itself):
   ```bash
   supabase secrets set RESEND_WEBHOOK_SECRET=whsec_your_signing_secret
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   supabase functions deploy receive-email --no-verify-jwt
   ```
5. Run the `0011_inbound_email.sql` migration (see above) if you haven't already.
6. Send a test email to your inbound address and check **Email** in the CRM. The exact
   shape of Resend's inbound webhook payload is worth double-checking against the
   **Webhooks** delivery log in your Resend dashboard the first time - third-party payload
   formats occasionally shift, and that log is the fastest way to spot a mismatch.

Inbound emails from a sender that doesn't match any client's email address are still
logged (with no client attached) rather than dropped - staff can link them to the right
client afterwards from the Email page.

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
```

## What's real vs. mock right now

Every page is wired to real Supabase tables (and, for Documents, Supabase Storage):
Authentication, Dashboard, Clients (including the Programs, Documents, and Staff
Register tabs), Case Notes (now categorised - doubles as service-delivery reporting),
Goals & Outcomes, Case Activities, Outcomes, Referrals, Attendance Register/Group
Sessions, Reports (including the KPI, Program Performance, Overnight Camp, Group Note,
Group Attendance, Good News Stories, and Full Service Report tabs), Leads, Partners,
Meetings, Email (sending via Resend and receiving via an inbound webhook - see above),
and Settings (profile editing and team/role management). The only client-profile tab
still not built is Follow Ups. See `DEVELOPMENT_AUDIT.md` for the original page-by-page
breakdown, though note it was
written early on and hasn't been kept fully in sync with every migration since.
