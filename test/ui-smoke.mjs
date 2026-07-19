import assert from 'node:assert/strict';
import fs from 'node:fs';

const password = process.env.TEST_ADMIN_PASSWORD;
if (!password) throw new Error('TEST_ADMIN_PASSWORD 환경변수가 필요합니다.');
const targets = await fetch('http://127.0.0.1:9222/json/list').then((response) => response.json());
const target = targets.find((item) => item.type === 'page');
if (!target?.webSocketDebuggerUrl) throw new Error('Chrome 디버깅 페이지를 찾을 수 없습니다.');

const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
const consoleErrors = [];
let sequence = 0;
socket.addEventListener('message', (event) => {
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
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

await command('Page.enable');
await command('Runtime.enable');
await setViewport(1440, 900);
await command('Page.navigate', { url: 'http://127.0.0.1:5173/?view=schedule' });
// 이전 스모크 실행에서 같은 디버깅 탭에 남은 콘솔 이벤트는 새 탐색 검증에서 제외합니다.
consoleErrors.length = 0;
await waitFor("document.querySelector('.login-form') || document.querySelector('.workspace')");
if (await evaluate("Boolean(document.querySelector('.login-form'))")) {
  await evaluate(`(() => {
    const [username, password] = document.querySelectorAll('.login-form input');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(username, 'admin'); username.dispatchEvent(new Event('input', { bubbles: true }));
    setter.call(password, ${JSON.stringify(password)}); password.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('.login-form').requestSubmit();
  })()`);
}
await waitFor("document.querySelector('.workspace')");
await waitFor("!document.body.innerText.includes('로그인 정보를 확인하고 있습니다')");
await waitFor("document.querySelector('.schedule-grid')");
await waitFor("!document.querySelector('.skeleton-schedule-grid')");
await assertLayout('desktop-schedule', 1440);
await evaluate("document.querySelector('button[aria-label=\"월별보기\"]')?.click()");
await waitFor("document.querySelector('.month-calendar-grid')");
await assertLayout('desktop-month-schedule', 1440);
await evaluate("document.querySelector('.month-day:not(.is-empty)')?.click()");
await waitFor("document.querySelector('.schedule-grid')");

await clickByText('button', '직원');
await waitFor("document.querySelector('.employee-management-layout')");
await assertLayout('desktop-employees', 1440);
await clickByText('button', '설정');
await waitFor("document.querySelector('.settings-overview-layout')");
await clickByText('button', '관리하기', 0);
await waitFor("document.querySelector('.template-settings-layout')");
await evaluate("document.querySelector('.template-settings-card')?.click()");
await waitFor("[...document.querySelectorAll('button')].some((button) => button.textContent.includes('운영 중지'))");
await assertLayout('desktop-templates', 1440);
await clickByText('button', '설정으로 돌아가기');
await waitFor("document.querySelector('.settings-overview-layout')");
await clickByText('button', '관리하기', 3);
await waitFor("document.querySelector('.account-settings-layout')");
await waitFor("!document.querySelector('.account-table .list-skeleton')");
await assertLayout('desktop-accounts', 1440);

await setViewport(320, 760);
await command('Page.reload', { ignoreCache: true });
await new Promise((resolve) => setTimeout(resolve, 700));
await waitFor("document.readyState === 'complete' && document.querySelector('.workspace') && document.querySelector('.mobile-top-nav')");
await waitFor("document.querySelector('.account-settings-layout') && !document.querySelector('.account-table .list-skeleton')");
await assertLayout('mobile-account', 320);
await clickByText('button', '설정으로 돌아가기');
await waitFor("document.querySelector('.settings-overview-layout')");
await clickByText('button', '관리하기', 1);
await waitFor("document.querySelector('.store-settings-layout')");
await assertLayout('mobile-stores', 320);
await evaluate("document.querySelector('.mobile-top-nav button')?.click()");
await waitFor("document.querySelector('.mobile-nav-menu')");
await assertLayout('mobile-menu', 320);
await clickByText('button', '스케줄');
await waitFor("document.querySelector('.schedule-grid') && !document.querySelector('.skeleton-schedule-grid')");
await assertLayout('mobile-schedule', 320);

assert.deepEqual(consoleErrors, [], `브라우저 콘솔 오류: ${consoleErrors.join(' | ')}`);
process.stdout.write('UI 스모크 테스트 통과: 데스크톱 주간·월간, 직원·계정, 모바일 계정·근무지·스케줄·내비게이션, 가로 넘침, 콘솔 오류\n');
socket.close();

async function command(method, params = {}) {
  sequence += 1;
  const id = sequence;
  const promise = new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
  socket.send(JSON.stringify({ id, method, params }));
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

async function setViewport(width, height) {
  await command('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width <= 700 });
}

async function assertLayout(name, width) {
  const metrics = await evaluate(`({
    viewport: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
    text: document.body.innerText.slice(0, 300)
  })`);
  assert.equal(metrics.viewport, width, `${name} viewport`);
  assert.ok(metrics.documentWidth <= width, `${name} 문서 가로 넘침: ${metrics.documentWidth}/${width}`);
  assert.ok(metrics.bodyWidth <= width, `${name} body 가로 넘침: ${metrics.bodyWidth}/${width}`);
  const screenshot = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(`/tmp/sup7eme-${name}.png`, Buffer.from(screenshot.data, 'base64'));
}

async function clickByText(selector, text, occurrence = 0) {
  const clicked = await evaluate(`(() => {
    const matches = [...document.querySelectorAll(${JSON.stringify(selector)})].filter((node) => node.textContent.includes(${JSON.stringify(text)}));
    const target = matches[${occurrence}] || matches[0];
    if (!target) return false;
    target.click();
    return true;
  })()`);
  assert.equal(clicked, true, `${text} 버튼을 찾을 수 없습니다.`);
}
