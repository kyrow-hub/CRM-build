-- Adds client document uploads: a private Supabase Storage bucket plus a
-- metadata table tracking who uploaded what, when, and whether it's
-- confidential. Run this after 0001_init.sql has already been applied.

create table public.client_documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  file_name text not null,
  file_path text not null unique,
  file_size bigint,
  mime_type text,
  confidential boolean not null default false,
  uploaded_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index client_documents_client_idx on public.client_documents (client_id);

alter table public.client_documents enable row level security;

-- Same confidentiality model as case_activities/client_outcomes.
create policy client_documents_select on public.client_documents
  for select using (
    (not confidential and public.is_active_profile())
    or (confidential and (uploaded_by = auth.uid() or public.is_admin_or_manager()))
  );
create policy client_documents_insert_staff on public.client_documents
  for insert with check (public.can_edit_records());
create policy client_documents_update on public.client_documents
  for update
  using (uploaded_by = auth.uid() or public.is_admin_or_manager())
  with check (uploaded_by = auth.uid() or public.is_admin_or_manager());
create policy client_documents_delete on public.client_documents
  for delete using (uploaded_by = auth.uid() or public.is_admin_or_manager());

-- ---------------------------------------------------------------------------
-- Storage bucket
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'client-documents',
  'client-documents',
  false,
  20971520, -- 20 MB
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ]
)
on conflict (id) do nothing;

-- Storage policies mirror the client_documents table's own RLS, including
-- confidentiality, by joining storage.objects back to the metadata row
-- for the same file path.
create policy client_documents_storage_select on storage.objects
  for select using (
    bucket_id = 'client-documents'
    and exists (
      select 1 from public.client_documents d
      where d.file_path = storage.objects.name
        and (
          (not d.confidential and public.is_active_profile())
          or (d.confidential and (d.uploaded_by = auth.uid() or public.is_admin_or_manager()))
        )
    )
  );

create policy client_documents_storage_insert on storage.objects
  for insert with check (bucket_id = 'client-documents' and public.can_edit_records());

create policy client_documents_storage_delete on storage.objects
  for delete using (
    bucket_id = 'client-documents'
    and exists (
      select 1 from public.client_documents d
      where d.file_path = storage.objects.name
        and (d.uploaded_by = auth.uid() or public.is_admin_or_manager())
    )
  );
