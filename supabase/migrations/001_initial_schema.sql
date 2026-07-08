create extension if not exists pgcrypto;

create domain public.schedule_time as text
  check (value ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$|^24:00$');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null check (role in ('manager', 'viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.stores (
  id text primary key,
  name text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.employees (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  memo text not null default '',
  color text not null default '#dceeff',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.employee_stores (
  employee_id text not null references public.employees(id) on delete cascade,
  store_id text not null references public.stores(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (employee_id, store_id)
);

create table public.shift_templates (
  id text primary key default gen_random_uuid()::text,
  label text not null,
  default_start_time public.schedule_time,
  default_end_time public.schedule_time,
  color text not null check (color in ('blue', 'green', 'orange', 'purple', 'navy', 'red')),
  requires_time_input boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    requires_time_input
    or (default_start_time is not null and default_end_time is not null)
  )
);

create table public.employee_base_shifts (
  id text primary key default gen_random_uuid()::text,
  employee_id text not null references public.employees(id) on delete cascade,
  store_id text not null references public.stores(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  template_id text not null references public.shift_templates(id),
  start_time public.schedule_time not null,
  end_time public.schedule_time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shifts (
  id text primary key default gen_random_uuid()::text,
  store_id text not null references public.stores(id) on delete cascade,
  employee_id text not null references public.employees(id) on delete restrict,
  template_id text references public.shift_templates(id) on delete set null,
  work_date date not null,
  start_time public.schedule_time not null,
  end_time public.schedule_time not null,
  note text not null default '',
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.day_notes (
  id text primary key default gen_random_uuid()::text,
  store_id text not null references public.stores(id) on delete cascade,
  note_date date not null,
  text text not null default '',
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, note_date)
);

create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create index employee_stores_store_id_idx on public.employee_stores (store_id);
create index employee_base_shifts_employee_id_idx on public.employee_base_shifts (employee_id);
create index employee_base_shifts_store_weekday_idx on public.employee_base_shifts (store_id, weekday);
create index shifts_store_date_idx on public.shifts (store_id, work_date);
create index shifts_employee_date_idx on public.shifts (employee_id, work_date);
create index day_notes_store_date_idx on public.day_notes (store_id, note_date);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger stores_set_updated_at
before update on public.stores
for each row execute function public.set_updated_at();

create trigger employees_set_updated_at
before update on public.employees
for each row execute function public.set_updated_at();

create trigger shift_templates_set_updated_at
before update on public.shift_templates
for each row execute function public.set_updated_at();

create trigger employee_base_shifts_set_updated_at
before update on public.employee_base_shifts
for each row execute function public.set_updated_at();

create trigger shifts_set_updated_at
before update on public.shifts
for each row execute function public.set_updated_at();

create trigger day_notes_set_updated_at
before update on public.day_notes
for each row execute function public.set_updated_at();

create or replace function public.current_profile_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.employees enable row level security;
alter table public.employee_stores enable row level security;
alter table public.shift_templates enable row level security;
alter table public.employee_base_shifts enable row level security;
alter table public.shifts enable row level security;
alter table public.day_notes enable row level security;
alter table public.app_settings enable row level security;

create policy "profiles_select_self_or_manager"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.current_profile_role() = 'manager');

create policy "profiles_update_self_or_manager"
on public.profiles
for update
to authenticated
using (id = auth.uid() or public.current_profile_role() = 'manager')
with check (id = auth.uid() or public.current_profile_role() = 'manager');

create policy "profiles_insert_manager"
on public.profiles
for insert
to authenticated
with check (public.current_profile_role() = 'manager');

create policy "read_stores"
on public.stores
for select
to authenticated
using (true);

create policy "write_stores_manager"
on public.stores
for all
to authenticated
using (public.current_profile_role() = 'manager')
with check (public.current_profile_role() = 'manager');

create policy "read_employees"
on public.employees
for select
to authenticated
using (true);

create policy "write_employees_manager"
on public.employees
for all
to authenticated
using (public.current_profile_role() = 'manager')
with check (public.current_profile_role() = 'manager');

create policy "read_employee_stores"
on public.employee_stores
for select
to authenticated
using (true);

create policy "write_employee_stores_manager"
on public.employee_stores
for all
to authenticated
using (public.current_profile_role() = 'manager')
with check (public.current_profile_role() = 'manager');

create policy "read_shift_templates"
on public.shift_templates
for select
to authenticated
using (true);

create policy "write_shift_templates_manager"
on public.shift_templates
for all
to authenticated
using (public.current_profile_role() = 'manager')
with check (public.current_profile_role() = 'manager');

create policy "read_employee_base_shifts"
on public.employee_base_shifts
for select
to authenticated
using (true);

create policy "write_employee_base_shifts_manager"
on public.employee_base_shifts
for all
to authenticated
using (public.current_profile_role() = 'manager')
with check (public.current_profile_role() = 'manager');

create policy "read_shifts"
on public.shifts
for select
to authenticated
using (true);

create policy "write_shifts_manager"
on public.shifts
for all
to authenticated
using (public.current_profile_role() = 'manager')
with check (public.current_profile_role() = 'manager');

create policy "read_day_notes"
on public.day_notes
for select
to authenticated
using (true);

create policy "write_day_notes_manager"
on public.day_notes
for all
to authenticated
using (public.current_profile_role() = 'manager')
with check (public.current_profile_role() = 'manager');

create policy "read_app_settings"
on public.app_settings
for select
to authenticated
using (true);

create policy "write_app_settings_manager"
on public.app_settings
for all
to authenticated
using (public.current_profile_role() = 'manager')
with check (public.current_profile_role() = 'manager');
