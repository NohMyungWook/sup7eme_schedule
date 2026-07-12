import { getPool, readJsonBody, requireMethod, sendJson } from './_db.js';

const defaultPermissions = {
  dashboard: { view: true, create: true, update: true, delete: true },
  schedule: { view: true, create: true, update: true, delete: true },
  employees: { view: true, create: true, update: true, delete: true },
  notes: { view: true, create: true, update: true, delete: true },
  settings: { view: true, create: true, update: true, delete: true },
};

export default async function handler(request, response) {
  if (!requireMethod(request, response, ['POST'])) return;

  try {
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

    sendJson(response, 200, {
      user: {
        username: user.username,
        displayName: user.display_name,
        role: user.role,
        permissions: normalizePermissions(user.permissions),
      },
    });
  } catch (error) {
    sendJson(response, 500, { message: error instanceof Error ? error.message : '로그인 중 오류가 발생했습니다.' });
  }
}

function normalizePermissions(permissions) {
  const result = structuredClone(defaultPermissions);
  if (!permissions || typeof permissions !== 'object') return result;

  for (const menu of Object.keys(result)) {
    for (const action of Object.keys(result[menu])) {
      result[menu][action] = Boolean(permissions[menu]?.[action]);
    }
  }

  return result;
}
