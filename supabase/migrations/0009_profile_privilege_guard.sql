-- Hardens the existing profiles_update_self policy (from 0001_init.sql),
-- which lets a user update their own profile row but - as written - does
-- not stop them from changing their own role or active flag in that same
-- update. This adds a trigger that blocks any change to role/active unless
-- the caller is already an administrator or manager, closing that gap
-- ahead of the Settings page allowing self-service profile edits.

create or replace function public.guard_profile_privilege_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.role is distinct from old.role or new.active is distinct from old.active)
     and not public.is_admin_or_manager() then
    raise exception 'Only administrators or managers can change role or active status.';
  end if;
  return new;
end;
$$;

create trigger guard_profile_privilege_columns
  before update on public.profiles
  for each row execute function public.guard_profile_privilege_columns();
