-- 휴무 신청을 단일 날짜에서 연속 날짜 범위로 확장한다.

alter table public.leave_requests
  add column if not exists end_date date;

update public.leave_requests
set end_date = target_date
where end_date is null;

alter table public.leave_requests
  alter column end_date set not null;

alter table public.leave_requests
  drop constraint if exists leave_requests_date_range_check;

alter table public.leave_requests
  add constraint leave_requests_date_range_check
  check (end_date >= target_date);

create index if not exists leave_requests_employee_range_status_idx
  on public.leave_requests (employee_id, target_date, end_date, status);
