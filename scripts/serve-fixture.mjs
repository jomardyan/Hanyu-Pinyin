import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import process from 'node:process';

const root = resolve(process.cwd(), 'fixtures');
const port = Number(process.env.PORT || 8080);
const host = process.env.HOST || '127.0.0.1';
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

const server = createServer((req, res) => {
  const pathname = decodeURIComponent((req.url || '/').split('?')[0]);
  const relative = pathname === '/' ? 'sample.html' : pathname.replace(/^\/+/, '');
  const file = resolve(root, normalize(relative));

  if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  res.writeHead(200, {
    'content-type': types[extname(file)] || 'application/octet-stream',
    'cache-control': 'no-store'
  });
  createReadStream(file).pipe(res);
});

server.listen(port, host, () => {
  console.log(`Fixture server running at http://${host}:${port}`);
  console.log(`Open http://${host}:${port}/sample.html in a browser with the extension loaded.`);
});
