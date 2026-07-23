-- Allows documents to be uploaded against an incident (e.g. a scanned hard
-- copy of the incident report form), reusing the same client_documents
-- table/storage bucket/RLS as every other document in the app instead of
-- a parallel system. Run this after 0024_incidents.sql has already been
-- applied.

alter table public.client_documents add column if not exists incident_id uuid references public.incidents (id) on delete cascade;

alter table public.client_documents drop constraint if exists client_documents_owner_check;
alter table public.client_documents
  add constraint client_documents_owner_check
  check (client_id is not null or referral_id is not null or program_id is not null or incident_id is not null);

create index if not exists client_documents_incident_idx on public.client_documents (incident_id);
