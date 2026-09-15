import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { resolve, dirname, relative, isAbsolute, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = await realpath(resolve(dirname(fileURLToPath(import.meta.url)), '../fixtures'));
const port = Number(process.env.PORT || 8080);
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('PORT must be between 0 and 65535');
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png' };
const server = createServer(async (req, res) => {
  const actual = server.address().port, origin = `http://127.0.0.1:${actual}`;
  if (![`127.0.0.1:${actual}`, `localhost:${actual}`].includes(req.headers.host) || (req.headers.origin && ![origin, `http://localhost:${actual}`].includes(req.headers.origin))) { res.writeHead(403); res.end('Forbidden'); return; }
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, { Allow: 'GET, HEAD' }); res.end(); return; }
  try {
    const path = decodeURIComponent(new URL(req.url || '/', origin).pathname);
    const file = await realpath(resolve(root, '.' + (path === '/' ? '/sample.html' : path)));
    const rel = relative(root, file);
    if (rel.startsWith('..') || isAbsolute(rel) || !mime[extname(file)] || !(await stat(file)).isFile()) throw new Error('Not found');
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': mime[extname(file)], 'Content-Length': data.length, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch { res.writeHead(404); res.end('Not found'); }
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`Fixture server http://127.0.0.1:${server.address().port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close());
