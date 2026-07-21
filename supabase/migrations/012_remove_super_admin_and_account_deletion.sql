-- 최고 관리자 역할을 제거하고 계정·직원 삭제 상태를 안전하게 보존한다.

alter table public.app_users
  add column if not exists deleted_at timestamptz;

alter table public.employees
  add column if not exists deleted_at timestamptz;

-- 기존 최고 관리자는 담당 매장과 권한을 유지한 일반 관리자 계정으로 이전한다.
insert into public.app_user_stores (user_id, store_id)
select user_account.id, store.id
from public.app_users user_account
cross join public.stores store
where user_account.role = 'super_admin'
on conflict do nothing;

update public.app_users
set role = 'manager'
where role = 'super_admin';

alter table public.app_users
  drop constraint if exists app_users_role_check;

alter table public.app_users
  add constraint app_users_role_check
  check (role in ('manager', 'employee'));

-- 계정 삭제 권한은 권한 매트릭스에서 명시적으로 제어한다.
update public.app_user_permissions permission
set permissions = jsonb_set(
  coalesce(permission.permissions, '{}'::jsonb),
  '{accounts,delete}',
  'true'::jsonb,
  true
)
from public.app_users user_account
where user_account.id = permission.user_id
  and user_account.role = 'manager';

create index if not exists app_users_visible_role_idx
  on public.app_users (role, status, created_at)
  where deleted_at is null;

create index if not exists employees_visible_sort_idx
  on public.employees (is_active, sort_order, created_at)
  where deleted_at is null;
