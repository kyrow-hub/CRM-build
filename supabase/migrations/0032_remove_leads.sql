-- Removes the Leads feature entirely (added in 0003_leads.sql). Nothing
-- else references this table (no foreign keys point at it), so a plain
-- drop is safe - RLS policies, indexes, and the updated_at trigger on it
-- are all dropped automatically along with the table.

drop table if exists public.leads;
