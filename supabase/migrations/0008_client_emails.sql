-- Adds a log of real emails sent to clients through the send-email Edge
-- Function (see supabase/functions/send-email). Run this after
-- 0001_init.sql has already been applied.
--
-- This table only records outbound email history for now - inbound email
-- (receiving replies) is a separate, later phase that needs MX/DNS changes
-- on the sending domain and is not part of this migration.

create table public.client_emails (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  direction text not null default 'outbound',
  from_address text not null,
  to_address text not null,
  subject text not null,
  body text not null,
  status text not null default 'sent',
  provider_message_id text,
  error_message text,
  sent_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index client_emails_client_idx on public.client_emails (client_id);
create index client_emails_created_idx on public.client_emails (created_at);

alter table public.client_emails enable row level security;

-- Visible to any active staff member. Rows are only ever inserted by the
-- send-email Edge Function (acting as the calling user, so can_edit_records()
-- still applies) - there is no direct-insert path from the frontend and no
-- update policy, since a sent email is an immutable record of what went out.
create policy client_emails_select on public.client_emails
  for select using (public.is_active_profile());
create policy client_emails_insert_staff on public.client_emails
  for insert with check (public.can_edit_records());
create policy client_emails_delete_admin_manager on public.client_emails
  for delete using (public.is_admin_or_manager());
