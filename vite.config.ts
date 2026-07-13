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
          const handler = await importHandler('api/accounts.js');
          await handler(request, response);
        });

        server.middlewares.use('/api/login', async (request, response) => {
          const handler = await importHandler('api/login.js');
          await handler(request, response);
        });

        server.middlewares.use('/api/schedule', async (request, response) => {
          const handler = await importHandler('api/schedule.js');
          await handler(request, response);
        });
      },
    },
  ],
});
