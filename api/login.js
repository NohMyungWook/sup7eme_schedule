import { clearAuthCookie, getPool, normalizePermissions, readJsonBody, requireMethod, sendJson, setAuthCookie } from './_db.js';

const defaultPermissions = normalizePermissions();

export default async function handler(request, response) {
  if (!requireMethod(request, response, ['POST', 'DELETE'])) return;

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
          coalesce(user_permission.permissions, $3::jsonb) as permissions
        from public.app_users user_account
        left join public.app_user_permissions user_permission
          on user_permission.user_id = user_account.id
        where user_account.username = $1
          and user_account.password_hash = crypt($2, user_account.password_hash)
          and user_account.is_active = true
        limit 1
      `,
      [username, password, JSON.stringify(defaultPermissions)],
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
        username: user.username,
        displayName: user.display_name,
        role: user.role,
        permissions: normalizePermissions(user.permissions),
      },
    });
  } catch (error) {
    console.error(error);
    sendJson(response, 500, { message: '로그인 중 오류가 발생했습니다.' });
  }
}
