import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function loadServerEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;

  fs.readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((line) => !line.trim().startsWith('#'))
    .forEach((line) => {
      const index = line.indexOf('=');
      if (index <= 0) return;

      const key = line.slice(0, index).trim();
      const value = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
      process.env[key] ??= value;
    });
}

async function importHandler(filePath: string) {
  const handlerUrl = pathToFileURL(path.resolve(process.cwd(), filePath));
  handlerUrl.searchParams.set('updatedAt', String(fs.statSync(filePath).mtimeMs));
  const { default: handler } = await import(handlerUrl.href);
  return handler;
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'local-serverless-api',
      configureServer(server) {
        loadServerEnv();

        server.middlewares.use('/api/accounts', async (request, response) => {
          const handler = await importHandler('server/api/accounts.js');
          await handler(request, response);
        });

        server.middlewares.use('/api/employee-order', async (request, response) => {
          const handler = await importHandler('server/api/employee-order.js');
          await handler(request, response);
        });

        server.middlewares.use('/api/employees', async (request, response) => {
          const handler = await importHandler('server/api/employees.js');
          await handler(request, response);
        });

        server.middlewares.use('/api/login', async (request, response) => {
          const handler = await importHandler('server/api/login.js');
          await handler(request, response);
        });

        server.middlewares.use('/api/session', async (request, response) => {
          const handler = await importHandler('server/api/session.js');
          await handler(request, response);
        });

        server.middlewares.use('/api/shifts', async (request, response) => {
          const handler = await importHandler('server/api/shifts.js');
          await handler(request, response);
        });

        server.middlewares.use('/api/schedule-actions', async (request, response) => {
          const handler = await importHandler('server/api/schedule-actions.js');
          await handler(request, response);
        });

        server.middlewares.use('/api/schedule-rules', async (request, response) => {
          const handler = await importHandler('server/api/schedule-rules.js');
          await handler(request, response);
        });

        server.middlewares.use('/api/leave-requests', async (request, response) => {
          const handler = await importHandler('server/api/leave-requests.js');
          await handler(request, response);
        });

        server.middlewares.use('/api/templates', async (request, response) => {
          const handler = await importHandler('server/api/templates.js');
          await handler(request, response);
        });

        server.middlewares.use('/api/notes', async (request, response) => {
          const handler = await importHandler('server/api/notes.js');
          await handler(request, response);
        });

        server.middlewares.use('/api/me', async (request, response) => {
          const handler = await importHandler('server/api/me.js');
          await handler(request, response);
        });

        server.middlewares.use('/api/dashboard', async (request, response) => {
          const handler = await importHandler('server/api/dashboard.js');
          await handler(request, response);
        });

        server.middlewares.use('/api/schedule', async (request, response) => {
          const handler = await importHandler('server/api/schedule.js');
          await handler(request, response);
        });

        server.middlewares.use('/api/stores', async (request, response) => {
          const handler = await importHandler('server/api/stores.js');
          await handler(request, response);
        });
      },
    },
  ],
});
