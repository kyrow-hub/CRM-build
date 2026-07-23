-- Replaces the free-text program_risk_assessments table (0022) with a
-- document-upload model: risk assessments are created externally and
-- uploaded as a file against a program (annual) or a specific camp
-- session, reusing the same client_documents table/storage bucket/RLS as
-- every other document in the app instead of a parallel system. Run this
-- after 0022_program_risk_assessments.sql has already been applied.

drop table if exists public.program_risk_assessments;

alter table public.client_documents add column if not exists program_id uuid references public.programs (id) on delete cascade;
alter table public.client_documents add column if not exists program_session_id uuid references public.program_sessions (id) on delete cascade;

alter table public.client_documents drop constraint if exists client_documents_client_or_referral_check;
alter table public.client_documents
  add constraint client_documents_owner_check
  check (client_id is not null or referral_id is not null or program_id is not null);

create index if not exists client_documents_program_idx on public.client_documents (program_id);
create index if not exists client_documents_program_session_idx on public.client_documents (program_session_id);
