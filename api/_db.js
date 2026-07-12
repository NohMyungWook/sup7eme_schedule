import pg from 'pg';
import crypto from 'node:crypto';

const { Pool } = pg;
const AUTH_COOKIE_NAME = 'sup7eme_auth';
const AUTH_MAX_AGE_SECONDS = 60 * 60 * 12;
const MAX_BODY_BYTES = 1_000_000;
const defaultPermissions = {
  dashboard: { view: true, create: true, update: true, delete: true },
  schedule: { view: true, create: true, update: true, delete: true },
  employees: { view: true, create: true, update: true, delete: true },
  notes: { view: true, create: true, update: true, delete: true },
  settings: { view: true, create: true, update: true, delete: true },
};

let pool;

export function getPool() {
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL 환경변수가 설정되지 않았습니다.');
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.SUPABASE_DB_URL,
      max: 2,
      idleTimeoutMillis: 5_000,
      connectionTimeoutMillis: 5_000,
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

    request.on('data', (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
        reject(new Error('요청 본문이 너무 큽니다.'));
        request.destroy();
      }
    });

    request.on('end', () => {
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

export async function requireAuth(request, response, permission) {
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
        coalesce(user_permission.permissions, $2::jsonb) as permissions
      from public.app_users user_account
      left join public.app_user_permissions user_permission
        on user_permission.user_id = user_account.id
      where user_account.id = $1
        and user_account.is_active = true
        and user_account.status = 'active'
      limit 1
    `,
    [session.userId, JSON.stringify(defaultPermissions)],
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
    permissions: normalizePermissions(user.permissions),
  };

  if (permission && !hasPermission(auth.permissions, permission.menu, permission.action)) {
    sendJson(response, 403, { message: '요청 권한이 없습니다.' });
    return null;
  }

  return auth;
}

export function normalizePermissions(permissions) {
  const result = structuredClone(defaultPermissions);
  if (!permissions || typeof permissions !== 'object') return result;

  for (const menu of Object.keys(result)) {
    for (const action of Object.keys(result[menu])) {
      result[menu][action] = Boolean(permissions[menu]?.[action]);
    }
  }

  return result;
}

export function hasPermission(permissions, menu, action) {
  return Boolean(permissions?.[menu]?.[action]);
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
