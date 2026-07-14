import { getPool, readJsonBody, requireAuth, requireMethod, sendJson } from './_db.js';

const ID_PATTERN = /^[a-zA-Z0-9:_-]{1,100}$/;

export default async function handler(request, response) {
  if (!requireMethod(request, response, ['PUT'])) return;

  try {
    if (!await requireAuth(request, response, { menu: 'employees', action: 'update' })) return;
    const body = await readJsonBody(request);
    const employeeIds = normalizeEmployeeIds(body.employeeIds);

    const client = await getPool().connect();
    try {
      await client.query('begin');
      const existing = await client.query(
        'select count(*)::int as count from public.employees where is_active = true and id = any($1::text[])',
        [employeeIds],
      );
      if (existing.rows[0].count !== employeeIds.length) {
        throw new ValidationError('존재하지 않는 직원이 정렬 목록에 포함되어 있습니다.');
      }
      await client.query(
        `
          update public.employees as employee
          set sort_order = cast(ordered.position as integer)
          from unnest($1::text[]) with ordinality as ordered(id, position)
          where employee.id = ordered.id
            and employee.is_active = true
        `,
        [employeeIds],
      );
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }

    sendJson(response, 200, { employeeIds });
  } catch (error) {
    if (error instanceof ValidationError) {
      sendJson(response, 400, { message: error.message });
      return;
    }
    console.error(error);
    sendJson(response, 500, { message: '직원 순서를 저장하지 못했습니다.' });
  }
}

function normalizeEmployeeIds(value) {
  if (!Array.isArray(value) || !value.length || value.length > 500) {
    throw new ValidationError('직원 정렬 데이터 형식이 올바르지 않습니다.');
  }
  const employeeIds = value.map((id) => String(id));
  if (employeeIds.some((id) => !ID_PATTERN.test(id)) || new Set(employeeIds).size !== employeeIds.length) {
    throw new ValidationError('직원 정렬 데이터에 잘못된 ID가 포함되어 있습니다.');
  }
  return employeeIds;
}

class ValidationError extends Error {}
