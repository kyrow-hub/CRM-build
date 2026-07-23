-- Adds a tamper-resistant audit trail: every insert/update/delete on the
-- tables that hold personally identifying or otherwise sensitive
-- information about clients and families is recorded, independent of the
-- application layer - direct SQL access would be captured too, since this
-- is implemented as database triggers rather than logging in the frontend
-- or a service function.
--
-- Only administrators/managers can read the log (see the select policy
-- below). No insert/update/delete policy exists for any authenticated
-- role - the only way a row ever gets written is through the
-- audit_row_change() trigger function, which is SECURITY DEFINER and so
-- runs as the table owner, bypassing RLS entirely. That means nobody -
-- not even an administrator, and not a compromised session using the
-- normal API - can create, edit, or delete an audit entry directly; the
-- trail can only ever grow via the actual row-level events it records.

create table public.audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id uuid,
  action text not null,
  actor_id uuid references public.profiles (id),
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_table_record_idx on public.audit_log (table_name, record_id);
create index audit_log_actor_idx on public.audit_log (actor_id);
create index audit_log_created_idx on public.audit_log (created_at);

alter table public.audit_log enable row level security;

create policy audit_log_select_admin_manager on public.audit_log
  for select using (public.is_admin_or_manager());

create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_log (table_name, record_id, action, actor_id, old_data, new_data)
  values (
    TG_TABLE_NAME,
    case when TG_OP = 'DELETE' then old.id else new.id end,
    TG_OP,
    auth.uid(),
    case when TG_OP in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when TG_OP in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );
  return coalesce(new, old);
end;
$$;

-- Attached to the tables holding personally identifying or otherwise
-- sensitive information about clients and families. Lower-sensitivity
-- operational tables (meetings, programs, attendance, partners, etc.)
-- aren't audited, to keep the log focused on what actually matters if
-- something needs to be investigated. client_emails/client_sms are
-- already immutable outbound/inbound logs in their own right and aren't
-- duplicated here.
create trigger audit_clients
  after insert or update or delete on public.clients
  for each row execute function public.audit_row_change();
create trigger audit_client_relationships
  after insert or update or delete on public.client_relationships
  for each row execute function public.audit_row_change();
create trigger audit_client_notes
  after insert or update or delete on public.client_notes
  for each row execute function public.audit_row_change();
create trigger audit_case_activities
  after insert or update or delete on public.case_activities
  for each row execute function public.audit_row_change();
create trigger audit_client_outcomes
  after insert or update or delete on public.client_outcomes
  for each row execute function public.audit_row_change();
create trigger audit_client_documents
  after insert or update or delete on public.client_documents
  for each row execute function public.audit_row_change();
create trigger audit_incidents
  after insert or update or delete on public.incidents
  for each row execute function public.audit_row_change();
create trigger audit_client_assessments
  after insert or update or delete on public.client_assessments
  for each row execute function public.audit_row_change();
create trigger audit_referrals
  after insert or update or delete on public.referrals
  for each row execute function public.audit_row_change();
-- Profiles: update/delete only (not insert - account creation is already
-- visible via auth.users, and this keeps the focus on privilege/role
-- changes, which is the sensitive part of this table).
create trigger audit_profiles
  after update or delete on public.profiles
  for each row execute function public.audit_row_change();
