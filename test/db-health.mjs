import assert from 'node:assert/strict';
import pg from 'pg';

if (!process.env.SUPABASE_DB_URL) throw new Error('SUPABASE_DB_URL 환경변수가 필요합니다.');

const pool = new pg.Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  max: 1,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 5_000,
  query_timeout: 15_000,
  statement_timeout: 15_000,
});

try {
  const schema = await pool.query(
    `select table_name, column_name
     from information_schema.columns
     where table_schema = 'public'
       and table_name = any($1::text[])`,
    [['app_users', 'employees', 'stores', 'shift_templates', 'shifts', 'leave_requests', 'schedule_rules', 'day_notes']],
  );
  const columns = new Set(schema.rows.map((row) => `${row.table_name}.${row.column_name}`));
  for (const column of [
    'app_users.password_hash', 'app_users.employee_id', 'app_users.must_change_password', 'app_users.deleted_at',
    'employees.employment_status', 'employees.deleted_at', 'stores.is_active', 'shift_templates.requires_time_input',
    'shifts.status', 'shifts.source', 'leave_requests.status', 'leave_requests.end_date', 'schedule_rules.minimum_staff',
    'day_notes.visible_to_employees',
  ]) assert.ok(columns.has(column), `필수 컬럼 누락: ${column}`);
  assert.equal(columns.has('app_users.email'), false, '사용하지 않는 이메일 컬럼이 남아 있습니다.');

  const indexes = await pool.query(
    `select indexname from pg_indexes
     where schemaname = 'public' and indexname = any($1::text[])`,
    [[
      'app_users_employee_id_unique_idx', 'app_users_role_active_idx',
      'employees_active_sort_idx', 'shifts_store_date_status_idx',
      'shifts_employee_range_idx', 'leave_requests_employee_date_idx',
      'leave_requests_store_status_date_idx', 'schedule_rules_store_weekday_active_idx',
      'app_users_visible_role_idx', 'employees_visible_sort_idx',
      'leave_requests_employee_range_status_idx',
    ]],
  );
  assert.equal(indexes.rowCount, 11, '필수 조회 인덱스가 모두 적용되지 않았습니다.');

  const integrity = await pool.query(
    `select
       (select count(*)::int from public.app_users
        where password_hash is null or password_hash not like '$2%') as invalid_password_hashes,
       (select count(*)::int from public.app_users
        where role = 'manager' and is_active = true and status = 'active' and deleted_at is null) as active_managers,
       (select count(*)::int from public.app_users where role not in ('manager', 'employee')) as invalid_roles,
       (select count(*)::int
        from public.employee_stores relation
        left join public.employees employee on employee.id = relation.employee_id
        left join public.stores store on store.id = relation.store_id
        where employee.id is null or store.id is null) as orphan_employee_stores,
       (select count(*)::int
        from public.shifts shift
        left join public.employees employee on employee.id = shift.employee_id
        left join public.stores store on store.id = shift.store_id
        where employee.id is null or store.id is null) as orphan_shifts`,
  );
  const health = integrity.rows[0];
  assert.equal(health.invalid_password_hashes, 0, '해시되지 않은 계정 비밀번호가 있습니다.');
  assert.ok(health.active_managers >= 1, '활성 관리자 계정이 없습니다.');
  assert.equal(health.invalid_roles, 0, '지원하지 않는 계정 역할이 남아 있습니다.');
  assert.equal(health.orphan_employee_stores, 0, '직원-근무지 고아 관계가 있습니다.');
  assert.equal(health.orphan_shifts, 0, '스케줄 고아 관계가 있습니다.');

  const store = await pool.query('select id from public.stores order by sort_order limit 1');
  assert.ok(store.rows[0], '조회 계획을 확인할 근무지가 없습니다.');
  const plan = await pool.query(
    `explain (format json)
     select id, employee_id, work_date, start_time, end_time
     from public.shifts
     where store_id = $1 and status = 'scheduled'
       and work_date between $2 and $3
     order by work_date, start_time`,
    [store.rows[0].id, '2026-01-01', '2026-12-31'],
  );
  assert.ok(plan.rows[0]?.['QUERY PLAN']?.[0]?.Plan, '스케줄 조회 계획을 생성하지 못했습니다.');

  process.stdout.write(`DB 상태 검증 통과: 필수 컬럼·인덱스, 비밀번호 해시, 관리자 연속성, FK 정합성, 조회 계획\n`);
} finally {
  await pool.end();
}
