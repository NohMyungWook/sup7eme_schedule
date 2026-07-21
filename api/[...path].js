import accounts from '../server/api/accounts.js';
import dashboard from '../server/api/dashboard.js';
import employeeOrder from '../server/api/employee-order.js';
import employees from '../server/api/employees.js';
import leaveRequests from '../server/api/leave-requests.js';
import login from '../server/api/login.js';
import me from '../server/api/me.js';
import notes from '../server/api/notes.js';
import scheduleActions from '../server/api/schedule-actions.js';
import scheduleRules from '../server/api/schedule-rules.js';
import schedule from '../server/api/schedule.js';
import session from '../server/api/session.js';
import shifts from '../server/api/shifts.js';
import stores from '../server/api/stores.js';
import templates from '../server/api/templates.js';

const handlers = {
  accounts,
  dashboard,
  'employee-order': employeeOrder,
  employees,
  'leave-requests': leaveRequests,
  login,
  me,
  notes,
  'schedule-actions': scheduleActions,
  'schedule-rules': scheduleRules,
  schedule,
  session,
  shifts,
  stores,
  templates,
};

export default async function handler(request, response) {
  const pathname = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`).pathname;
  const route = pathname.replace(/^\/api\//, '').split('/')[0];
  const routeHandler = handlers[route];

  if (!routeHandler) {
    response.statusCode = 404;
    response.setHeader('content-type', 'application/json; charset=utf-8');
    response.end(JSON.stringify({ message: '요청한 API를 찾을 수 없습니다.' }));
    return;
  }

  await routeHandler(request, response);
}
