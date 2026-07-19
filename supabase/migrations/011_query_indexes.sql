-- 실제 조회 경로에 맞춘 보조 인덱스. 기존 데이터와 제약은 변경하지 않는다.

create index if not exists employee_base_shifts_template_idx
  on public.employee_base_shifts (template_id);

create index if not exists shifts_template_idx
  on public.shifts (template_id);

create index if not exists app_user_stores_store_user_idx
  on public.app_user_stores (store_id, user_id);

create index if not exists app_users_employee_lookup_idx
  on public.app_users (employee_id)
  where employee_id is not null;

create index if not exists shifts_active_store_employee_date_idx
  on public.shifts (store_id, employee_id, work_date)
  where status = 'scheduled';
