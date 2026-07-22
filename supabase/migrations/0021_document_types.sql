-- Adds a document_type tag to client_documents (Consent Form, Privacy
-- Consent, Media Consent, Transport Consent, Camp Consent, Medical
-- Information, Referral Document, Other) so the compliance engine can
-- check which mandatory document types are on file for a client. Run
-- this after 0020_referral_documents.sql has already been applied.

alter table public.client_documents add column if not exists document_type text;

create index if not exists client_documents_document_type_idx on public.client_documents (document_type);
