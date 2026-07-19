import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import pg from 'pg';

const baseUrl = process.env.TEST_BASE_URL || 'http://127.0.0.1:5173';
const adminPassword = process.env.TEST_ADMIN_PASSWORD;
if (!adminPassword) throw new Error('TEST_ADMIN_PASSWORD 환경변수가 필요합니다.');
if (!process.env.SUPABASE_DB_URL) throw new Error('SUPABASE_DB_URL 환경변수가 필요합니다.');

const suffix = `${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
const employeeId = `ui-employee-${suffix}`;
const username = `ui.employee.${suffix}`;
const initialPassword = `Ui-${crypto.randomBytes(8).toString('hex')}!`;
const changedPassword = `Changed-${crypto.randomBytes(8).toString('hex')}!`;
const pool = new pg.Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  max: 1,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 5_000,
  query_timeout: 15_000,
  statement_timeout: 15_000,
});

let socket;
try {
  const adminLogin = await api('/api/login', {
    method: 'POST', body: { username: 'admin', password: adminPassword }, expectedStatus: 200,
  });
  const reference = await api('/api/schedule', { cookie: adminLogin.cookie, expectedStatus: 200 });
  const store = reference.data.state.stores.find((item) => item.isActive);
  assert.ok(store, '활성 근무지가 필요합니다.');
  await api('/api/employees', {
    method: 'POST', cookie: adminLogin.cookie, expectedStatus: 201,
    body: {
      employee: { id: employeeId, name: '모바일 테스트 직원', preference: '', color: '#dceeff', storeIds: [store.id], baseShifts: [] },
      account: { username, password: initialPassword },
    },
  });

  const targets = await fetch('http://127.0.0.1:9222/json/list').then((response) => response.json());
  const target = targets.find((item) => item.type === 'page');
  if (!target?.webSocketDebuggerUrl) throw new Error('Chrome 디버깅 페이지를 찾을 수 없습니다.');
  const cdp = createCdpClient(target.webSocketDebuggerUrl);
  socket = cdp.socket;
  await cdp.ready;
  await cdp.command('Page.enable');
  await cdp.command('Runtime.enable');
  await cdp.command('Network.enable');
  await cdp.command('Network.clearBrowserCookies');
  await cdp.command('Emulation.setDeviceMetricsOverride', { width: 320, height: 760, deviceScaleFactor: 1, mobile: true });
  await cdp.command('Page.navigate', { url: `${baseUrl}/` });
  cdp.consoleErrors.length = 0;
  await cdp.waitFor("document.querySelector('.login-form')");
  await cdp.evaluate(`(() => {
    const [username, password] = document.querySelectorAll('.login-form input');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(username, ${JSON.stringify(username)}); username.dispatchEvent(new Event('input', { bubbles: true }));
    setter.call(password, ${JSON.stringify(initialPassword)}); password.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('.login-form').requestSubmit();
  })()`);
  await cdp.waitFor("document.querySelector('.employee-password-gate')");
  await assertLayout(cdp, 'employee-password-gate');

  await cdp.evaluate(`(() => {
    const inputs = document.querySelectorAll('.employee-profile-page form input');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    [${JSON.stringify(initialPassword)}, ${JSON.stringify(changedPassword)}, ${JSON.stringify(changedPassword)}].forEach((value, index) => {
      setter.call(inputs[index], value); inputs[index].dispatchEvent(new Event('input', { bubbles: true }));
    });
    document.querySelector('.employee-profile-page form').requestSubmit();
  })()`);
  await cdp.waitFor("document.querySelector('.employee-bottom-nav') && document.querySelector('.employee-schedule-page')");
  await assertLayout(cdp, 'employee-schedule');

  await cdp.clickByText('button', '휴무 신청');
  await cdp.waitFor("document.querySelector('.employee-leave-page') && new URLSearchParams(location.search).get('employeeTab') === 'leave'");
  await assertLayout(cdp, 'employee-leave');
  await cdp.clickByText('button', '신청 내역');
  await cdp.waitFor("document.querySelector('.employee-history-list') && new URLSearchParams(location.search).get('employeeTab') === 'history'");
  await cdp.evaluate('history.back()');
  await cdp.waitFor("document.querySelector('.employee-leave-page') && new URLSearchParams(location.search).get('employeeTab') === 'leave'");
  await cdp.evaluate('history.forward()');
  await cdp.waitFor("document.querySelector('.employee-history-list') && new URLSearchParams(location.search).get('employeeTab') === 'history'");
  await cdp.clickByText('button', '근무시간');
  await cdp.waitFor("document.querySelector('.employee-hours-page') && !document.querySelector('.employee-hours-page .list-skeleton')");
  await assertLayout(cdp, 'employee-hours');

  assert.deepEqual(cdp.consoleErrors, [], `직원 화면 브라우저 콘솔 오류: ${cdp.consoleErrors.join(' | ')}`);
  process.stdout.write('직원 UI E2E 통과: 계정 발급, 첫 비밀번호 변경, 스케줄·휴무·내역·근무시간, 브라우저 이력, 320px 반응형\n');
} finally {
  socket?.close();
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query('delete from public.leave_requests where employee_id = $1', [employeeId]);
    await client.query('delete from public.shifts where employee_id = $1', [employeeId]);
    await client.query('delete from public.app_users where employee_id = $1 or username = $2', [employeeId, username]);
    await client.query('delete from public.employee_base_shifts where employee_id = $1', [employeeId]);
    await client.query('delete from public.employee_stores where employee_id = $1', [employeeId]);
    await client.query('delete from public.employees where id = $1', [employeeId]);
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function api(path, { method = 'GET', body, cookie = '', expectedStatus } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(cookie ? { cookie } : {}),
      ...(method === 'GET' ? {} : { origin: baseUrl }),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  assert.equal(response.status, expectedStatus, `${method} ${path}: ${data.message || response.statusText}`);
  return { data, cookie: response.headers.get('set-cookie')?.split(';')[0] || '' };
}

function createCdpClient(url) {
  const cdpSocket = new WebSocket(url);
  const pending = new Map();
  const consoleErrors = [];
  let sequence = 0;
  cdpSocket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') consoleErrors.push(message.params.exceptionDetails.text);
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
      consoleErrors.push(message.params.args.map((item) => item.value ?? item.description).join(' '));
    }
  });
  const ready = new Promise((resolve, reject) => {
    cdpSocket.addEventListener('open', resolve, { once: true });
    cdpSocket.addEventListener('error', reject, { once: true });
  });
  async function command(method, params = {}) {
    const id = ++sequence;
    const promise = new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    cdpSocket.send(JSON.stringify({ id, method, params }));
    return promise;
  }
  async function evaluate(expression) {
    const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  }
  async function waitFor(expression, timeout = 10_000) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeout) {
      if (await evaluate(`Boolean(${expression})`)) return;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`화면 대기 시간 초과: ${expression}`);
  }
  async function clickByText(selector, text) {
    const clicked = await evaluate(`(() => {
      const target = [...document.querySelectorAll(${JSON.stringify(selector)})].find((node) => node.textContent.includes(${JSON.stringify(text)}));
      if (!target) return false;
      target.click(); return true;
    })()`);
    assert.equal(clicked, true, `${text} 버튼을 찾을 수 없습니다.`);
  }
  return { socket: cdpSocket, ready, command, evaluate, waitFor, clickByText, consoleErrors };
}

async function assertLayout(cdp, name) {
  const metrics = await cdp.evaluate(`({
    viewport: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth
  })`);
  assert.equal(metrics.viewport, 320, `${name} viewport`);
  assert.ok(metrics.documentWidth <= 320, `${name} 문서 가로 넘침: ${metrics.documentWidth}/320`);
  assert.ok(metrics.bodyWidth <= 320, `${name} body 가로 넘침: ${metrics.bodyWidth}/320`);
  const screenshot = await cdp.command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(`/tmp/sup7eme-${name}.png`, Buffer.from(screenshot.data, 'base64'));
}
