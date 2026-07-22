-- Adds inbound email support on top of the client_emails table from
-- 0008_client_emails.sql. Inbound emails may not match any known client
-- (an unrecognised sender), so client_id needs to become optional -
-- staff can link it to a client manually afterwards. Also adds a read
-- flag for a basic inbox experience. Run this after 0008 has already
-- been applied.

alter table public.client_emails alter column client_id drop not null;
alter table public.client_emails add column read boolean not null default false;

alter table public.client_emails drop constraint if exists client_emails_client_id_fkey;
alter table public.client_emails
  add constraint client_emails_client_id_fkey
  foreign key (client_id) references public.clients (id) on delete set null;

-- Lets staff link an unmatched inbound email to a client, or mark one as
-- read. Inserts for inbound mail come from the receive-email Edge
-- Function using the service-role key, which bypasses RLS entirely, so
-- no insert policy change is needed here.
create policy client_emails_update_staff on public.client_emails
  for update using (public.can_edit_records()) with check (public.can_edit_records());
