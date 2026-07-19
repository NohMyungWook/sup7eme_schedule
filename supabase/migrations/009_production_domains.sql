-- 출시 기능 확장: 기존 행과 식별자를 보존하는 additive migration

alter table public.app_users
  add column if not exists employee_id text references public.employees(id) on delete set null,
  add column if not exists must_change_password boolean not null default false,
  add column if not exists password_changed_at timestamptz;

alter table public.app_users
  drop constraint if exists app_users_role_check;

alter table public.app_users
  add constraint app_users_role_check
  check (role in ('super_admin', 'manager', 'employee', 'viewer'));

update public.app_users
set role = 'employee'
where role = 'viewer';

update public.app_users
set role = 'super_admin'
where username = 'admin'
  and role = 'manager';

alter table public.app_users
  drop constraint app_users_role_check;

alter table public.app_users
  add constraint app_users_role_check
  check (role in ('super_admin', 'manager', 'employee'));

create unique index if not exists app_users_employee_id_unique_idx
  on public.app_users (employee_id)
  where employee_id is not null;

create index if not exists app_users_role_active_idx
  on public.app_users (role, is_active, status);

-- 기존 관리자에게 현재 매장을 배정해 배포 직후 접근 범위가 사라지지 않게 한다.
insert into public.app_user_stores (user_id, store_id)
select user_account.id, store.id
from public.app_users user_account
cross join public.stores store
where user_account.role in ('super_admin', 'manager')
on conflict do nothing;

alter table public.employees
  add column if not exists employment_status text not null default 'active';

alter table public.employees
  drop constraint if exists employees_employment_status_check;

alter table public.employees
  add constraint employees_employment_status_check
  check (employment_status in ('active', 'inactive', 'terminated'));

update public.employees
set employment_status = case when is_active then 'active' else 'inactive' end;

create index if not exists employees_active_sort_idx
  on public.employees (is_active, sort_order, created_at);

alter table public.shift_templates
  drop constraint if exists shift_templates_color_check;

alter table public.shift_templates
  add constraint shift_templates_color_check
  check (color ~ '^(#[0-9A-Fa-f]{6}|[A-Za-z0-9_-]{1,40})$');

create index if not exists shift_templates_active_sort_idx
  on public.shift_templates (is_active, sort_order);

alter table public.shifts
  add column if not exists status text not null default 'scheduled',
  add column if not exists source text not null default 'manual',
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by_account uuid references public.app_users(id) on delete set null,
  add column if not exists created_by_account uuid references public.app_users(id) on delete set null,
  add column if not exists updated_by_account uuid references public.app_users(id) on delete set null;

alter table public.shifts
  drop constraint if exists shifts_status_check,
  drop constraint if exists shifts_source_check;

alter table public.shifts
  add constraint shifts_status_check
    check (status in ('scheduled', 'cancelled')),
  add constraint shifts_source_check
    check (source in ('manual', 'base_week', 'previous_week'));

create index if not exists shifts_store_date_status_idx
  on public.shifts (store_id, work_date, status);

create index if not exists shifts_employee_range_idx
  on public.shifts (employee_id, work_date, start_time, end_time, status);

alter table public.day_notes
  add column if not exists visible_to_employees boolean not null default true;

create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id text not null references public.employees(id) on delete restrict,
  store_id text not null references public.stores(id) on delete restrict,
  target_date date not null,
  all_day boolean not null default true,
  start_time public.schedule_time,
  end_time public.schedule_time,
  reason text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  processed_by uuid references public.app_users(id) on delete set null,
  processed_at timestamptz,
  decision_reason text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (all_day and start_time is null and end_time is null)
    or (not all_day and start_time is not null and end_time is not null and start_time <> end_time)
  )
);

drop trigger if exists leave_requests_set_updated_at on public.leave_requests;
create trigger leave_requests_set_updated_at
before update on public.leave_requests
for each row execute function public.set_updated_at();

create index if not exists leave_requests_employee_date_idx
  on public.leave_requests (employee_id, target_date desc);

create index if not exists leave_requests_store_status_date_idx
  on public.leave_requests (store_id, status, target_date);

create unique index if not exists leave_requests_pending_unique_idx
  on public.leave_requests (
    employee_id,
    store_id,
    target_date,
    all_day,
    coalesce(start_time, ''),
    coalesce(end_time, '')
  )
  where status = 'pending';

create table if not exists public.schedule_rules (
  id uuid primary key default gen_random_uuid(),
  store_id text not null references public.stores(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  template_id text references public.shift_templates(id) on delete set null,
  start_time public.schedule_time not null,
  end_time public.schedule_time not null,
  minimum_staff smallint not null default 1 check (minimum_staff between 1 and 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, weekday, start_time, end_time)
);

drop trigger if exists schedule_rules_set_updated_at on public.schedule_rules;
create trigger schedule_rules_set_updated_at
before update on public.schedule_rules
for each row execute function public.set_updated_at();

create index if not exists schedule_rules_store_weekday_active_idx
  on public.schedule_rules (store_id, weekday, is_active);

create table if not exists public.notification_settings (
  user_id uuid primary key references public.app_users(id) on delete cascade,
  schedule_changes boolean not null default true,
  leave_results boolean not null default true,
  updated_at timestamptz not null default now()
);

drop trigger if exists notification_settings_set_updated_at on public.notification_settings;
create trigger notification_settings_set_updated_at
before update on public.notification_settings
for each row execute function public.set_updated_at();
