-- Adds the fields needed to run a "group session": a dated session with an
-- activity type and facilitator, plus one shared note that gets copied onto
-- every attendee's individual case note record. Run this after
-- 0001_init.sql has already been applied.

alter table public.program_sessions
  add column activity_type text,
  add column facilitator_id uuid references public.profiles (id),
  add column group_note text;

-- client_notes gets a link back to the session that generated it (if any)
-- and a flag distinguishing the shared group note from a one-off note added
-- for a single participant afterwards.
alter table public.client_notes
  add column session_id uuid references public.program_sessions (id) on delete set null,
  add column is_group_note boolean not null default false;

create index client_notes_session_idx on public.client_notes (session_id);
