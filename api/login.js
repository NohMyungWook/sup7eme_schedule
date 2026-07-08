import { getPool, readJsonBody, requireMethod, sendJson } from './_db.js';

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
        select username, display_name, role
        from public.app_users
        where username = $1
          and password_hash = crypt($2, password_hash)
          and is_active = true
        limit 1
      `,
      [username, password],
    );

    const user = rows[0];
    if (!user) {
      sendJson(response, 401, { message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
      return;
    }

    sendJson(response, 200, {
      user: {
        username: user.username,
        displayName: user.display_name,
        role: user.role,
      },
    });
  } catch (error) {
    sendJson(response, 500, { message: error instanceof Error ? error.message : '로그인 중 오류가 발생했습니다.' });
  }
}
