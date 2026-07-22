-- Adds Good News Stories: short, deliberately-written success-story
-- writeups (distinct from routine case notes) suitable for newsletters,
-- board updates, and funding reports. Run this after 0001_init.sql has
-- already been applied.

create table public.good_news_stories (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  story text not null,
  client_id uuid references public.clients (id) on delete set null,
  program_id uuid references public.programs (id) on delete set null,
  story_date date not null default current_date,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index good_news_stories_client_idx on public.good_news_stories (client_id);
create index good_news_stories_program_idx on public.good_news_stories (program_id);

create trigger set_updated_at before update on public.good_news_stories
  for each row execute function public.set_updated_at();

alter table public.good_news_stories enable row level security;

-- Same visibility model as leads/partners/meetings: any active staff
-- member can view, staff with an editing role can create/update,
-- permanent deletion restricted to administrators/managers. No
-- confidentiality flag - these are written specifically to be shared.
create policy good_news_stories_select on public.good_news_stories
  for select using (public.is_active_profile());
create policy good_news_stories_insert_staff on public.good_news_stories
  for insert with check (public.can_edit_records());
create policy good_news_stories_update_staff on public.good_news_stories
  for update using (public.can_edit_records()) with check (public.can_edit_records());
create policy good_news_stories_delete_admin_manager on public.good_news_stories
  for delete using (public.is_admin_or_manager());
