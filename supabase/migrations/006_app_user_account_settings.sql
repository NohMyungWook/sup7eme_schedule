alter table public.app_users
  add column if not exists status text not null default 'active'
    check (status in ('active', 'inactive')),
  add column if not exists last_signed_in_at timestamptz;

update public.app_users
set
  status = case
    when is_active then 'active'
    else 'inactive'
  end
where status is null;

create table if not exists public.app_user_stores (
  user_id uuid not null references public.app_users(id) on delete cascade,
  store_id text not null references public.stores(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, store_id)
);

create table if not exists public.app_user_permissions (
  user_id uuid primary key references public.app_users(id) on delete cascade,
  permissions jsonb not null default '{
    "dashboard": {"view": true, "create": true, "update": true, "delete": true},
    "schedule": {"view": true, "create": true, "update": true, "delete": true},
    "employees": {"view": true, "create": true, "update": true, "delete": true},
    "notes": {"view": true, "create": true, "update": true, "delete": true},
    "settings": {"view": true, "create": true, "update": true, "delete": true}
  }'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists app_user_permissions_set_updated_at on public.app_user_permissions;

create trigger app_user_permissions_set_updated_at
before update on public.app_user_permissions
for each row execute function public.set_updated_at();

insert into public.app_user_permissions (user_id)
select id from public.app_users
on conflict (user_id) do nothing;
