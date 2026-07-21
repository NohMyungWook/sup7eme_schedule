import pg from 'pg';
import crypto from 'node:crypto';

const { Pool, types } = pg;
// PostgreSQL date(OID 1082)는 시간대가 없는 달력 날짜이므로 Date 변환 없이 보존한다.
types.setTypeParser(1082, (value) => value);
const AUTH_COOKIE_NAME = 'sup7eme_auth';
const AUTH_MAX_AGE_SECONDS = 60 * 60 * 12;
const MAX_BODY_BYTES = 1_000_000;
const managerPermissions = {
  dashboard: { view: true, create: true, update: true, delete: true },
  schedule: { view: true, create: true, update: true, delete: true },
  employees: { view: true, create: true, update: true, delete: true },
  notes: { view: true, create: true, update: true, delete: true },
  settings: { view: true, create: true, update: true, delete: true },
  leaveRequests: { view: true, create: true, update: true, delete: false },
  accounts: { view: true, create: true, update: true, delete: true },
};

const employeePermissions = {
  dashboard: { view: false, create: false, update: false, delete: false },
  schedule: { view: true, create: false, update: false, delete: false },
  employees: { view: false, create: false, update: false, delete: false },
  notes: { view: false, create: false, update: false, delete: false },
  settings: { view: false, create: false, update: false, delete: false },
  leaveRequests: { view: true, create: true, update: true, delete: false },
  accounts: { view: false, create: false, update: false, delete: false },
};

let pool;

export function getPool() {
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL 환경변수가 설정되지 않았습니다.');
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.SUPABASE_DB_URL,
      // Transaction Pooler(6543)에서는 한 서버리스 인스턴스가 하나의 연결만 사용한다.
      max: 1,
      idleTimeoutMillis: 5_000,
      connectionTimeoutMillis: 5_000,
      query_timeout: 15_000,
      statement_timeout: 15_000,
      ssl: { rejectUnauthorized: false },
    });
  }

  return pool;
}

export function sendJson(response, statusCode, data) {
  response.statusCode = statusCode;
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'same-origin');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(data));
}

export function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    let settled = false;

    request.on('data', (chunk) => {
      if (settled) return;
      body += chunk;
      if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
        settled = true;
        reject(new Error('요청 본문이 너무 큽니다.'));
        request.destroy();
      }
    });

    request.on('end', () => {
      if (settled) return;
      settled = true;
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('JSON 형식이 올바르지 않습니다.'));
      }
    });

    request.on('error', reject);
  });
}

export function requireMethod(request, response, methods) {
  if (methods.includes(request.method)) return true;

  response.setHeader('Allow', methods.join(', '));
  sendJson(response, 405, { message: '지원하지 않는 요청입니다.' });
  return false;
}

export function requireSameOrigin(request, response) {
  if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') return true;
  const origin = request.headers.origin;
  const host = request.headers['x-forwarded-host'] || request.headers.host;
  if (!origin || !host) return true;

  try {
    if (new URL(origin).host === host) return true;
  } catch {
    // 아래에서 일관된 403을 반환한다.
  }

  sendJson(response, 403, { message: '허용되지 않은 요청 출처입니다.' });
  return false;
}

export function setAuthCookie(response, userId) {
  const expiresAt = Math.floor(Date.now() / 1000) + AUTH_MAX_AGE_SECONDS;
  const payload = base64UrlEncode(JSON.stringify({ userId, expiresAt }));
  const signature = sign(payload);
  response.setHeader('Set-Cookie', serializeCookie(AUTH_COOKIE_NAME, `${payload}.${signature}`, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: AUTH_MAX_AGE_SECONDS,
  }));
}

export function clearAuthCookie(response) {
  response.setHeader('Set-Cookie', serializeCookie(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'Lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  }));
}

export async function requireAuth(request, response, permission, options = {}) {
  const session = verifyAuthCookie(request.headers.cookie || '');
  if (!session) {
    sendJson(response, 401, { message: '로그인이 필요합니다.' });
    return null;
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
      where user_account.id = $1
        and user_account.is_active = true
        and user_account.status = 'active'
      limit 1
    `,
    [session.userId],
  );
  const user = rows[0];

  if (!user) {
    clearAuthCookie(response);
    sendJson(response, 401, { message: '로그인이 필요합니다.' });
    return null;
  }

  const auth = {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    role: user.role,
    employeeId: user.employee_id,
    mustChangePassword: Boolean(user.must_change_password),
    storeIds: user.store_ids ?? [],
    permissions: normalizePermissions(user.permissions, user.role),
  };

  if (auth.mustChangePassword && !options.allowPasswordChangeRequired) {
    sendJson(response, 403, {
      message: '임시 비밀번호를 먼저 변경해주세요.',
      code: 'PASSWORD_CHANGE_REQUIRED',
    });
    return null;
  }

  if (permission && !hasPermission(auth.permissions, permission.menu, permission.action)) {
    sendJson(response, 403, { message: '요청 권한이 없습니다.' });
    return null;
  }

  return auth;
}

export function normalizePermissions(permissions, role = 'manager') {
  const base = isManagerRole(role) ? managerPermissions : employeePermissions;
  const result = structuredClone(base);
  if (!permissions || typeof permissions !== 'object') return result;

  for (const menu of Object.keys(result)) {
    for (const action of Object.keys(result[menu])) {
      if (permissions[menu] && Object.hasOwn(permissions[menu], action)) {
        result[menu][action] = Boolean(permissions[menu][action]);
      }
    }
  }

  return result;
}

export function permissionsForRole(role) {
  return normalizePermissions({}, role);
}

export function hasPermission(permissions, menu, action) {
  return Boolean(permissions?.[menu]?.[action]);
}

export function isManagerRole(role) {
  return role === 'manager';
}

export function assertManager(auth) {
  if (!isManagerRole(auth?.role)) throw new ApiError(403, '관리자 권한이 필요합니다.');
}

export function assertStoreAccess(auth, storeId) {
  if (!auth?.storeIds?.includes(String(storeId))) {
    throw new ApiError(403, '해당 근무지에 접근할 권한이 없습니다.');
  }
}

export function assertPermission(auth, menu, action) {
  if (!hasPermission(auth?.permissions, menu, action)) {
    throw new ApiError(403, '요청 권한이 없습니다.');
  }
}

export async function withTransaction(callback) {
  const client = await getPool().connect();
  try {
    await client.query('begin');
    const result = await callback(client);
    await client.query('commit');
    return result;
  } catch (error) {
    try {
      await client.query('rollback');
    } catch (rollbackError) {
      console.error('DB rollback failed', rollbackError);
    }
    throw error;
  } finally {
    client.release();
  }
}

export class ApiError extends Error {
  constructor(statusCode, message, code) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function sendApiError(response, error, fallbackMessage = '요청 처리 중 오류가 발생했습니다.') {
  if (error instanceof ApiError) {
    sendJson(response, error.statusCode, { message: error.message, ...(error.code ? { code: error.code } : {}) });
    return;
  }

  if (error?.code === '23505') {
    sendJson(response, 409, { message: '이미 등록된 정보와 중복됩니다.' });
    return;
  }
  if (error?.code === '23503') {
    sendJson(response, 409, { message: '연결된 데이터가 있어 처리할 수 없습니다.' });
    return;
  }
  if (error?.code === '22P02' || error?.code === '23514') {
    sendJson(response, 400, { message: '입력값 형식이 올바르지 않습니다.' });
    return;
  }

  console.error(error);
  sendJson(response, 500, { message: fallbackMessage });
}

function verifyAuthCookie(cookieHeader) {
  const token = parseCookies(cookieHeader)[AUTH_COOKIE_NAME];
  if (!token) return null;

  const [payload, signature] = token.split('.');
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!session.userId || Number(session.expiresAt) < Math.floor(Date.now() / 1000)) return null;
    return { userId: String(session.userId) };
  } catch {
    return null;
  }
}

function sign(payload) {
  return crypto
    .createHmac('sha256', getSessionSecret())
    .update(payload)
    .digest('base64url');
}

function getSessionSecret() {
  if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
    throw new Error('운영 환경에는 SESSION_SECRET 환경변수가 필요합니다.');
  }
  const secret = process.env.SESSION_SECRET || process.env.SUPABASE_DB_URL;
  if (!secret) throw new Error('SESSION_SECRET 또는 SUPABASE_DB_URL 환경변수가 필요합니다.');
  return secret;
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function base64UrlEncode(value) {
  return Buffer.from(value).toString('base64url');
}

function parseCookies(cookieHeader) {
  return cookieHeader.split(';').reduce((cookies, pair) => {
    const [rawName, ...rawValue] = pair.trim().split('=');
    if (!rawName) return cookies;
    cookies[rawName] = decodeURIComponent(rawValue.join('=') || '');
    return cookies;
  }, {});
}

function serializeCookie(name, value, options) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  return parts.join('; ');
}
