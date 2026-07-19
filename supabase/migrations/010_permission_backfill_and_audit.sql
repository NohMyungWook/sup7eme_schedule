alter table public.day_notes
  add column if not exists created_by_account uuid references public.app_users(id) on delete set null,
  add column if not exists updated_by_account uuid references public.app_users(id) on delete set null;

alter table public.leave_requests
  add column if not exists created_by_account uuid references public.app_users(id) on delete set null;

update public.app_user_permissions permission
set permissions = case
  when user_account.role = 'employee' then
    '{
      "dashboard":{"view":false,"create":false,"update":false,"delete":false},
      "schedule":{"view":true,"create":false,"update":false,"delete":false},
      "employees":{"view":false,"create":false,"update":false,"delete":false},
      "notes":{"view":false,"create":false,"update":false,"delete":false},
      "settings":{"view":false,"create":false,"update":false,"delete":false},
      "leaveRequests":{"view":true,"create":true,"update":true,"delete":false},
      "accounts":{"view":false,"create":false,"update":false,"delete":false}
    }'::jsonb
  else permission.permissions
    || '{"leaveRequests":{"view":true,"create":true,"update":true,"delete":false}}'::jsonb
    || '{"accounts":{"view":true,"create":true,"update":true,"delete":false}}'::jsonb
  end
from public.app_users user_account
where user_account.id = permission.user_id;

insert into public.app_user_permissions (user_id, permissions)
select user_account.id,
  case when user_account.role = 'employee' then
    '{
      "dashboard":{"view":false,"create":false,"update":false,"delete":false},
      "schedule":{"view":true,"create":false,"update":false,"delete":false},
      "employees":{"view":false,"create":false,"update":false,"delete":false},
      "notes":{"view":false,"create":false,"update":false,"delete":false},
      "settings":{"view":false,"create":false,"update":false,"delete":false},
      "leaveRequests":{"view":true,"create":true,"update":true,"delete":false},
      "accounts":{"view":false,"create":false,"update":false,"delete":false}
    }'::jsonb
  else '{
      "dashboard":{"view":true,"create":true,"update":true,"delete":true},
      "schedule":{"view":true,"create":true,"update":true,"delete":true},
      "employees":{"view":true,"create":true,"update":true,"delete":true},
      "notes":{"view":true,"create":true,"update":true,"delete":true},
      "settings":{"view":true,"create":true,"update":true,"delete":true},
      "leaveRequests":{"view":true,"create":true,"update":true,"delete":false},
      "accounts":{"view":true,"create":true,"update":true,"delete":false}
    }'::jsonb
  end
from public.app_users user_account
on conflict (user_id) do nothing;

create index if not exists leave_requests_pending_store_idx
  on public.leave_requests (store_id, target_date, employee_id)
  where status = 'pending';
