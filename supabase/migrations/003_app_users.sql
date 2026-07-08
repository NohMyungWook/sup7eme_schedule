create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  display_name text not null,
  password_hash text not null,
  role text not null check (role in ('manager', 'viewer')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists app_users_set_updated_at on public.app_users;

create trigger app_users_set_updated_at
before update on public.app_users
for each row execute function public.set_updated_at();

insert into public.app_users (
  username,
  display_name,
  password_hash,
  role,
  is_active
)
values (
  'admin',
  'admin',
  crypt('admin', gen_salt('bf')),
  'manager',
  true
)
on conflict (username) do update
set
  display_name = excluded.display_name,
  password_hash = excluded.password_hash,
  role = excluded.role,
  is_active = true;
