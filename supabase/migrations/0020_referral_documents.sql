-- Allows documents to be uploaded against a referral before a client
-- record exists yet (e.g. school reports, referral forms attached at
-- intake). Once that referral is linked to a client (Referrals page ->
-- Link Client, or during Accept), the app updates these rows' client_id,
-- so the documents automatically appear on the client's Documents tab.
-- Run this after 0014_client_documents.sql has already been applied.

alter table public.client_documents alter column client_id drop not null;
alter table public.client_documents add column if not exists referral_id uuid references public.referrals (id) on delete cascade;
alter table public.client_documents
  add constraint client_documents_client_or_referral_check check (client_id is not null or referral_id is not null);

create index if not exists client_documents_referral_idx on public.client_documents (referral_id);
