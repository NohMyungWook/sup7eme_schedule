alter table public.employees
  add column if not exists sort_order integer not null default 0;

with ranked_employees as (
  select id, row_number() over (order by created_at, id) as position
  from public.employees
)
update public.employees as employee
set sort_order = ranked_employees.position
from ranked_employees
where employee.id = ranked_employees.id
  and employee.sort_order = 0;

create index if not exists employees_sort_order_idx
  on public.employees (sort_order, created_at);
