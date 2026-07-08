import pg from 'pg';

const { Pool } = pg;

let pool;

export function getPool() {
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL 환경변수가 설정되지 않았습니다.');
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.SUPABASE_DB_URL,
      ssl: { rejectUnauthorized: false },
    });
  }

  return pool;
}

export function sendJson(response, statusCode, data) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(data));
}

export function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';

    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
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
