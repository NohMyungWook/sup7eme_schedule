import {
  clearAuthCookie,
  getPool,
  normalizePermissions,
  readJsonBody,
  requireMethod,
  requireSameOrigin,
  sendApiError,
  sendJson,
  setAuthCookie,
} from './_db.js';

export default async function handler(request, response) {
  if (!requireMethod(request, response, ['POST', 'DELETE'])) return;
  if (!requireSameOrigin(request, response)) return;

  try {
    if (request.method === 'DELETE') {
      clearAuthCookie(response);
      sendJson(response, 200, { ok: true });
      return;
    }

    const body = await readJsonBody(request);
    const username = String(body.username ?? '').trim();
    const password = String(body.password ?? '');

    if (!username || !password) {
      sendJson(response, 400, { message: '아이디와 비밀번호를 입력해주세요.' });
      return;
    }

    const { rows } = await getPool().query(
      `
        select
          user_account.id,
          user_account.username,
          user_account.display_name,
          user_account.role,
          user_account.employee_id,
          user_account.must_change_password,
          coalesce(user_permission.permissions, '{}'::jsonb) as permissions,
          coalesce(
            (select array_agg(user_store.store_id order by user_store.store_id)
             from public.app_user_stores user_store
             where user_store.user_id = user_account.id),
            '{}'::text[]
          ) as store_ids
        from public.app_users user_account
        left join public.app_user_permissions user_permission
          on user_permission.user_id = user_account.id
        where user_account.username = $1
          and user_account.password_hash = crypt($2, user_account.password_hash)
          and user_account.is_active = true
          and user_account.status = 'active'
        limit 1
      `,
      [username, password],
    );

    const user = rows[0];
    if (!user) {
      sendJson(response, 401, { message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
      return;
    }

    await getPool().query(
      'update public.app_users set last_signed_in_at = now() where id = $1',
      [user.id],
    );
    setAuthCookie(response, user.id);

    sendJson(response, 200, {
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        role: user.role,
        employeeId: user.employee_id,
        storeIds: user.store_ids ?? [],
        mustChangePassword: Boolean(user.must_change_password),
        permissions: normalizePermissions(user.permissions, user.role),
      },
    });
  } catch (error) {
    sendApiError(response, error, '로그인 중 오류가 발생했습니다.');
  }
}
