-- Restricts editing a program/activity's own details (name, location,
-- active flag) to administrators/managers - it was previously any editor
-- role (case worker/program worker) via can_edit_records(), same as
-- creating one, but program setup is an org-level concern rather than
-- day-to-day casework. Deleting a program was already admin/manager-only.
-- Case activities and case notes are left as-is: their existing policies
-- already let administrators/managers edit or delete any record, and let
-- the original author edit their own - this migration doesn't change that.
-- Run this after 0001_init.sql has already been applied.

drop policy if exists programs_update_staff on public.programs;

create policy programs_update_admin_manager on public.programs
  for update using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());
