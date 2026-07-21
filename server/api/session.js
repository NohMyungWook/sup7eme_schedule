import {
  ApiError,
  clearAuthCookie,
  getPool,
  readJsonBody,
  requireAuth,
  requireMethod,
  requireSameOrigin,
  sendApiError,
  sendJson,
} from './_db.js';

export default async function handler(request, response) {
  if (!requireMethod(request, response, ['GET', 'PUT', 'DELETE'])) return;
  if (!requireSameOrigin(request, response)) return;

  try {
    if (request.method === 'DELETE') {
      clearAuthCookie(response);
      sendJson(response, 200, { ok: true });
      return;
    }

    const auth = await requireAuth(request, response, null, { allowPasswordChangeRequired: true });
    if (!auth) return;

    if (request.method === 'GET') {
      sendJson(response, 200, { user: publicUser(auth) });
      return;
    }

    const body = await readJsonBody(request);
    const currentPassword = String(body.currentPassword ?? '');
    const nextPassword = String(body.nextPassword ?? '');
    if (nextPassword.length < 8 || nextPassword.length > 128) {
      throw new ApiError(400, '새 비밀번호는 8자 이상 128자 이하로 입력해주세요.');
    }
    if (!currentPassword) throw new ApiError(400, '현재 비밀번호를 입력해주세요.');
    if (currentPassword === nextPassword) throw new ApiError(400, '기존 비밀번호와 다른 비밀번호를 입력해주세요.');

    const result = await getPool().query(
      `
        update public.app_users
        set
          password_hash = crypt($2, gen_salt('bf', 10)),
          must_change_password = false,
          password_changed_at = now()
        where id = $1
          and password_hash = crypt($3, password_hash)
        returning id
      `,
      [auth.id, nextPassword, currentPassword],
    );
    if (!result.rows[0]) throw new ApiError(400, '현재 비밀번호가 올바르지 않습니다.');

    sendJson(response, 200, { ok: true });
  } catch (error) {
    sendApiError(response, error, '계정 정보를 처리하지 못했습니다.');
  }
}

function publicUser(auth) {
  return {
    id: auth.id,
    username: auth.username,
    displayName: auth.displayName,
    role: auth.role,
    employeeId: auth.employeeId,
    storeIds: auth.storeIds,
    mustChangePassword: auth.mustChangePassword,
    permissions: auth.permissions,
  };
}
