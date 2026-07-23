-- Adds a log of real SMS messages sent to/received from clients and their
-- relationships (parents/guardians etc.) through the send-sms and
-- receive-sms Edge Functions (see supabase/functions/). Mirrors
-- client_emails (0008/0011), but built with client_id nullable and a read
-- flag from the start since both directions ship together here.

create table public.client_sms (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients (id) on delete set null,
  relationship_id uuid references public.client_relationships (id) on delete set null,
  direction text not null default 'outbound',
  from_number text not null,
  to_number text not null,
  body text not null,
  status text not null default 'sent',
  read boolean not null default false,
  provider_message_id text,
  error_message text,
  sent_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index client_sms_client_idx on public.client_sms (client_id);
create index client_sms_created_idx on public.client_sms (created_at);

alter table public.client_sms enable row level security;

-- Visible to any active staff member. Outbound rows are inserted by the
-- send-sms Edge Function acting as the calling user (so can_edit_records()
-- still applies); inbound rows are inserted by the receive-sms Edge
-- Function using the service-role key, which bypasses RLS entirely, so no
-- insert policy change is needed for that path.
create policy client_sms_select on public.client_sms
  for select using (public.is_active_profile());
create policy client_sms_insert_staff on public.client_sms
  for insert with check (public.can_edit_records());
-- Lets staff link an unmatched inbound SMS to a client, or mark one as read.
create policy client_sms_update_staff on public.client_sms
  for update using (public.can_edit_records()) with check (public.can_edit_records());
create policy client_sms_delete_admin_manager on public.client_sms
  for delete using (public.is_admin_or_manager());
