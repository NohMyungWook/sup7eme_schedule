update public.app_users
set status = 'inactive'
where status = 'invited';

alter table public.app_users
  drop constraint if exists app_users_status_check;

alter table public.app_users
  add constraint app_users_status_check
  check (status in ('active', 'inactive'));

alter table public.app_users
  drop column if exists email,
  drop column if exists invited_at;
