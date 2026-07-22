-- Adds a next-review due date to clients, set whenever an Intake or Review
-- assessment is saved (Section 9: "every 90 days, or as required by the
-- funding agreement, reassess..."). Cleared when an Exit assessment is
-- saved, since an exited client has no further reviews due. Run this after
-- 0018_assessments.sql has already been applied.

alter table public.clients add column if not exists next_review_date date;

create index if not exists clients_next_review_date_idx on public.clients (next_review_date);
