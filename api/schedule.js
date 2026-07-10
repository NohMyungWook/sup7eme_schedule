import { getPool, readJsonBody, requireMethod, sendJson } from './_db.js';

const defaultTemplateTimes = {
  open: '08:00-15:00',
  middle: '15:00-22:00',
  evening: '15:00-22:00',
  night: '22:00-08:00',
  sub: '22:00-02:00',
  custom: '08:00-15:00',
};

export default async function handler(request, response) {
  if (!requireMethod(request, response, ['GET', 'PUT'])) return;

  try {
    if (request.method === 'GET') {
      const state = await fetchScheduleState();
      sendJson(response, 200, { state });
      return;
    }

    const body = await readJsonBody(request);
    await saveScheduleState(body.state);
    const state = await fetchScheduleState();
    sendJson(response, 200, { state });
  } catch (error) {
    sendJson(response, 500, { message: error instanceof Error ? error.message : '스케줄 처리 중 오류가 발생했습니다.' });
  }
}

async function fetchScheduleState() {
  const pool = getPool();
  const [
    storesResult,
    employeesResult,
    employeeStoresResult,
    baseShiftsResult,
    templatesResult,
    shiftsResult,
    notesResult,
  ] = await Promise.all([
    pool.query('select id, name, address, phone, tags, memo, is_active, color from public.stores order by sort_order, name'),
    pool.query('select id, name, memo, color from public.employees where is_active = true order by created_at'),
    pool.query('select employee_id, store_id from public.employee_stores'),
    pool.query('select id, employee_id, store_id, weekday, template_id, start_time, end_time from public.employee_base_shifts order by weekday, start_time'),
    pool.query('select id, label, default_start_time, default_end_time, color, requires_time_input from public.shift_templates where is_active = true order by sort_order'),
    pool.query('select id, store_id, work_date, employee_id, template_id, start_time, end_time, note from public.shifts order by work_date, start_time'),
    pool.query('select store_id, note_date, text from public.day_notes order by note_date'),
  ]);

  const employeeStores = employeeStoresResult.rows;
  const baseShifts = baseShiftsResult.rows;

  return {
    stores: storesResult.rows.map((store) => ({
      id: store.id,
      name: store.name,
      address: store.address,
      phone: store.phone,
      tags: store.tags ?? [],
      memo: store.memo,
      isActive: store.is_active,
      color: store.color,
    })),
    employees: employeesResult.rows.map((employee) => ({
      id: employee.id,
      name: employee.name,
      preference: employee.memo,
      color: employee.color,
      storeIds: employeeStores
        .filter((row) => row.employee_id === employee.id)
        .map((row) => row.store_id),
      baseShifts: baseShifts
        .filter((row) => row.employee_id === employee.id)
        .map((row) => ({
          id: row.id,
          storeId: row.store_id,
          weekday: row.weekday,
          templateId: row.template_id,
          startTime: normalizeTime(row.start_time),
          endTime: normalizeTime(row.end_time),
        })),
    })),
    templates: templatesResult.rows.map((template) => {
      const time =
        template.default_start_time && template.default_end_time
          ? `${normalizeTime(template.default_start_time)}-${normalizeTime(template.default_end_time)}`
          : defaultTemplateTimes[template.id] ?? '08:00-15:00';

      return {
        id: template.id,
        label: template.label,
        time,
        color: template.color,
        requiresTimeInput: template.requires_time_input,
      };
    }),
    shifts: shiftsResult.rows.map((shift) => ({
      id: shift.id,
      storeId: shift.store_id,
      date: toDateString(shift.work_date),
      employeeId: shift.employee_id,
      templateId: shift.template_id ?? '',
      time: `${normalizeTime(shift.start_time)}-${normalizeTime(shift.end_time)}`,
      note: shift.note || undefined,
    })),
    notes: notesResult.rows.map((note) => ({
      storeId: note.store_id,
      date: toDateString(note.note_date),
      text: note.text,
    })),
  };
}

async function saveScheduleState(state) {
  if (!state || !Array.isArray(state.stores) || !Array.isArray(state.employees) || !Array.isArray(state.templates) || !Array.isArray(state.shifts) || !Array.isArray(state.notes)) {
    throw new Error('스케줄 데이터 형식이 올바르지 않습니다.');
  }

  const client = await getPool().connect();
  try {
    await client.query('begin');

    await upsertStores(client, state.stores);
    await upsertTemplates(client, state.templates);
    await upsertEmployees(client, state.employees);
    await replaceEmployeeStores(client, state.employees);
    await replaceBaseShifts(client, state.employees);
    await upsertShifts(client, state.shifts);
    await replaceNotes(client, state.notes);
    await deleteStaleRows(client, state);

    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

async function upsertStores(client, stores) {
  for (const [index, store] of stores.entries()) {
    await client.query(
      `
        insert into public.stores (
          id, name, address, phone, tags, memo, is_active, color, sort_order
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        on conflict (id) do update
        set
          name = excluded.name,
          address = excluded.address,
          phone = excluded.phone,
          tags = excluded.tags,
          memo = excluded.memo,
          is_active = excluded.is_active,
          color = excluded.color,
          sort_order = excluded.sort_order
      `,
      [
        store.id,
        store.name,
        store.address ?? '',
        store.phone ?? '',
        store.tags ?? [],
        store.memo ?? '',
        store.isActive !== false,
        store.color ?? 'purple',
        index + 1,
      ],
    );
  }
}

async function upsertTemplates(client, templates) {
  for (const [index, template] of templates.entries()) {
    const { startTime, endTime } = splitTime(template.time);
    await client.query(
      `
        insert into public.shift_templates (
          id, label, default_start_time, default_end_time, color,
          requires_time_input, is_active, sort_order
        )
        values ($1, $2, $3, $4, $5, $6, true, $7)
        on conflict (id) do update
        set
          label = excluded.label,
          default_start_time = excluded.default_start_time,
          default_end_time = excluded.default_end_time,
          color = excluded.color,
          requires_time_input = excluded.requires_time_input,
          is_active = true,
          sort_order = excluded.sort_order
      `,
      [
        template.id,
        template.label,
        template.requiresTimeInput ? null : startTime,
        template.requiresTimeInput ? null : endTime,
        template.color,
        Boolean(template.requiresTimeInput),
        index + 1,
      ],
    );
  }
}

async function upsertEmployees(client, employees) {
  for (const employee of employees) {
    await client.query(
      `
        insert into public.employees (id, name, memo, color, is_active)
        values ($1, $2, $3, $4, true)
        on conflict (id) do update
        set
          name = excluded.name,
          memo = excluded.memo,
          color = excluded.color,
          is_active = true
      `,
      [employee.id, employee.name, employee.preference, employee.color],
    );
  }
}

async function replaceEmployeeStores(client, employees) {
  await client.query('delete from public.employee_stores');

  for (const employee of employees) {
    for (const storeId of employee.storeIds) {
      await client.query(
        'insert into public.employee_stores (employee_id, store_id) values ($1, $2)',
        [employee.id, storeId],
      );
    }
  }
}

async function replaceBaseShifts(client, employees) {
  await client.query('delete from public.employee_base_shifts');

  for (const employee of employees) {
    for (const rule of employee.baseShifts) {
      await client.query(
        `
          insert into public.employee_base_shifts (
            id, employee_id, store_id, weekday, template_id, start_time, end_time
          )
          values ($1, $2, $3, $4, $5, $6, $7)
        `,
        [rule.id, employee.id, rule.storeId, rule.weekday, rule.templateId, rule.startTime, rule.endTime],
      );
    }
  }
}

async function upsertShifts(client, shifts) {
  for (const shift of shifts) {
    const { startTime, endTime } = splitTime(shift.time);
    await client.query(
      `
        insert into public.shifts (
          id, store_id, employee_id, template_id, work_date, start_time, end_time, note
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8)
        on conflict (id) do update
        set
          store_id = excluded.store_id,
          employee_id = excluded.employee_id,
          template_id = excluded.template_id,
          work_date = excluded.work_date,
          start_time = excluded.start_time,
          end_time = excluded.end_time,
          note = excluded.note
      `,
      [shift.id, shift.storeId, shift.employeeId, shift.templateId || null, shift.date, startTime, endTime, shift.note ?? ''],
    );
  }
}

async function replaceNotes(client, notes) {
  await client.query('delete from public.day_notes');

  for (const note of notes) {
    await client.query(
      `
        insert into public.day_notes (id, store_id, note_date, text)
        values ($1, $2, $3, $4)
        on conflict (store_id, note_date) do update
        set text = excluded.text
      `,
      [`${note.storeId}-${note.date}`, note.storeId, note.date, note.text],
    );
  }
}

async function deleteStaleRows(client, state) {
  await deleteStale(client, 'public.shifts', state.shifts.map((shift) => shift.id));
  await deleteStale(client, 'public.shift_templates', state.templates.map((template) => template.id));
  await deleteStale(client, 'public.employees', state.employees.map((employee) => employee.id));
}

async function deleteStale(client, table, keepIds) {
  if (!keepIds.length) return;
  await client.query(`delete from ${table} where not (id = any($1::text[]))`, [keepIds]);
}

function splitTime(time) {
  const [startTime = '08:00', endTime = '15:00'] = String(time).split('-');
  return { startTime, endTime };
}

function normalizeTime(value) {
  return String(value).slice(0, 5);
}

function toDateString(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}
