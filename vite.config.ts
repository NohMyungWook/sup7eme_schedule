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

      const key = line.slice(0, index);
      const value = line.slice(index + 1);
      process.env[key] ??= value;
    });
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'local-serverless-api',
      configureServer(server) {
        loadServerEnv();
        const accountsHandlerUrl = pathToFileURL(path.resolve(process.cwd(), 'api/accounts.js')).href;
        const loginHandlerUrl = pathToFileURL(path.resolve(process.cwd(), 'api/login.js')).href;
        const scheduleHandlerUrl = pathToFileURL(path.resolve(process.cwd(), 'api/schedule.js')).href;

        server.middlewares.use('/api/accounts', async (request, response) => {
          const { default: handler } = await import(accountsHandlerUrl);
          await handler(request, response);
        });

        server.middlewares.use('/api/login', async (request, response) => {
          const { default: handler } = await import(loginHandlerUrl);
          await handler(request, response);
        });

        server.middlewares.use('/api/schedule', async (request, response) => {
          const { default: handler } = await import(scheduleHandlerUrl);
          await handler(request, response);
        });
      },
    },
  ],
});
