import { ApiError, assertManager, isSuperAdmin, readJsonBody, requireAuth, requireMethod, requireSameOrigin, sendApiError, sendJson, withTransaction } from './_db.js';

const ID_PATTERN = /^[a-zA-Z0-9:_-]{1,100}$/;

export default async function handler(request, response) {
  if (!requireMethod(request, response, ['PUT'])) return;
  if (!requireSameOrigin(request, response)) return;

  try {
    const auth = await requireAuth(request, response, { menu: 'employees', action: 'update' });
    if (!auth) return;
    assertManager(auth);
    const body = await readJsonBody(request);
    const employeeIds = normalizeEmployeeIds(body.employeeIds);

    await withTransaction(async (client) => {
      const existing = await client.query(
        `select count(distinct employee.id)::int as count
         from public.employees employee
         left join public.employee_stores employee_store on employee_store.employee_id = employee.id
         where employee.is_active = true and employee.id = any($1::text[])
           and ($2::boolean or employee_store.store_id = any($3::text[]))`,
        [employeeIds, isSuperAdmin(auth), auth.storeIds],
      );
      if (existing.rows[0].count !== employeeIds.length) {
        throw new ApiError(400, '존재하지 않거나 접근할 수 없는 직원이 정렬 목록에 포함되어 있습니다.');
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
    });

    sendJson(response, 200, { employeeIds });
  } catch (error) {
    sendApiError(response, error, '직원 순서를 저장하지 못했습니다.');
  }
}

function normalizeEmployeeIds(value) {
  if (!Array.isArray(value) || !value.length || value.length > 500) {
    throw new ApiError(400, '직원 정렬 데이터 형식이 올바르지 않습니다.');
  }
  const employeeIds = value.map((id) => String(id));
  if (employeeIds.some((id) => !ID_PATTERN.test(id)) || new Set(employeeIds).size !== employeeIds.length) {
    throw new ApiError(400, '직원 정렬 데이터에 잘못된 ID가 포함되어 있습니다.');
  }
  return employeeIds;
}
