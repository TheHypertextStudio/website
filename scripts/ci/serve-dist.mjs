#!/usr/bin/env node

import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';

const root = resolve(process.env.DIST_DIR || 'dist');
const host = process.env.ARTIFACT_HOST || '127.0.0.1';
const port = Number(process.env.ARTIFACT_PORT || '4323');

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webmanifest', 'application/manifest+json; charset=utf-8'],
  ['.woff2', 'font/woff2'],
  ['.xml', 'application/xml; charset=utf-8'],
]);

async function resolveRequestPath(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return undefined;
  }

  const relative = decoded.replace(/^\/+/, '');
  const requested = resolve(root, relative || 'index.html');
  if (requested !== root && !requested.startsWith(`${root}${sep}`)) return undefined;

  try {
    const metadata = await stat(requested);
    if (metadata.isDirectory()) return resolve(requested, 'index.html');
    if (metadata.isFile()) return requested;
  } catch {
    if (!extname(requested)) {
      const html = `${requested}.html`;
      try {
        if ((await stat(html)).isFile()) return html;
      } catch {
        // Fall through to the built 404 page.
      }
    }
  }

  return undefined;
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${host}:${port}`);
  const file = await resolveRequestPath(url.pathname);

  if (!file) {
    const notFound = resolve(root, '404.html');
    response.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
    createReadStream(notFound).pipe(response);
    return;
  }

  response.writeHead(200, {
    'content-type': contentTypes.get(extname(file)) || 'application/octet-stream',
  });
  if (request.method === 'HEAD') response.end();
  else createReadStream(file).pipe(response);
});

server.listen(port, host, () => {
  process.stdout.write(`Serving ${root} at http://${host}:${port}\n`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
