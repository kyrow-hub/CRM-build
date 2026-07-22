-- Adds service delivery tracking - a record of a concrete service given
-- to a client (food relief, transport, material aid, counselling, etc.),
-- distinct from case activities (which cover casework like home visits
-- and family meetings) and outcomes (which cover results achieved). Run
-- this after 0001_init.sql has already been applied.

create table public.service_deliveries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  service_type text not null,
  delivery_date date not null default current_date,
  quantity integer not null default 1,
  notes text,
  confidential boolean not null default false,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index service_deliveries_client_idx on public.service_deliveries (client_id);
create index service_deliveries_type_idx on public.service_deliveries (service_type);

create trigger set_updated_at before update on public.service_deliveries
  for each row execute function public.set_updated_at();

alter table public.service_deliveries enable row level security;

-- Same confidentiality model as case_activities/client_outcomes:
-- confidential entries are only visible to their author or an
-- administrator/manager, everything else is visible to all active staff.
create policy service_deliveries_select on public.service_deliveries
  for select using (
    (not confidential and public.is_active_profile())
    or (confidential and (created_by = auth.uid() or public.is_admin_or_manager()))
  );
create policy service_deliveries_insert_staff on public.service_deliveries
  for insert with check (public.can_edit_records());
create policy service_deliveries_update_own_or_admin on public.service_deliveries
  for update
  using (created_by = auth.uid() or public.is_admin_or_manager())
  with check (created_by = auth.uid() or public.is_admin_or_manager());
create policy service_deliveries_delete_admin_manager on public.service_deliveries
  for delete using (public.is_admin_or_manager());
