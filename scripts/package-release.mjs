import { mkdir, readFile, readdir, lstat, writeFile, rename, rm } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { deflateRawSync } from 'node:zlib';
import { validateBuild } from './validate-build.mjs';
await validateBuild();
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const crcTable = Uint32Array.from({ length: 256 }, (_, n) => { for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ n >>> 1 : n >>> 1; return n >>> 0; });
function crc32(buffer) { let c = 0xffffffff; for (const byte of buffer) c = crcTable[(c ^ byte) & 255] ^ c >>> 8; return (c ^ 0xffffffff) >>> 0; }
async function collect(dir, prefix = '') {
  const files = [];
  for (const name of (await readdir(dir)).sort()) {
    if (name.startsWith('.') || name.endsWith('.map')) continue;
    const full = join(dir, name), s = await lstat(full), path = prefix + name;
    if (s.isSymbolicLink()) throw new Error('Symbolic links are not supported in releases');
    if (s.isDirectory()) files.push(...await collect(full, `${path}/`));
    else if (s.isFile()) files.push({ full, path });
  }
  return files;
}
async function zip(files) {
  if (files.length > 65535) throw new Error('ZIP64 would be required');
  const locals = [], central = []; let offset = 0;
  for (const file of files) {
    const data = await readFile(file.full), compressed = deflateRawSync(data, { level: 9 }), name = Buffer.from(file.path, 'utf8'), crc = crc32(data);
    if (offset + compressed.length >= 0xffffffff || data.length >= 0xffffffff) throw new Error('ZIP64 would be required');
    const header = Buffer.alloc(30); header.writeUInt32LE(0x04034b50); header.writeUInt16LE(20, 4); header.writeUInt16LE(0x0800, 6);
    header.writeUInt16LE(8, 8); header.writeUInt16LE(33, 12); // fixed 1980-01-01 timestamp for reproducible archives
    header.writeUInt32LE(crc, 14); header.writeUInt32LE(compressed.length, 18); header.writeUInt32LE(data.length, 22); header.writeUInt16LE(name.length, 26);
    const index = Buffer.alloc(46); index.writeUInt32LE(0x02014b50); index.writeUInt16LE(20, 4); index.writeUInt16LE(20, 6); index.writeUInt16LE(0x0800, 8);
    index.writeUInt16LE(8, 10); index.writeUInt16LE(33, 14); index.writeUInt32LE(crc, 16); index.writeUInt32LE(compressed.length, 20); index.writeUInt32LE(data.length, 24);
    index.writeUInt16LE(name.length, 28); index.writeUInt32LE(offset, 42);
    locals.push(header, name, compressed); central.push(index, name); offset += 30 + name.length + compressed.length;
  }
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(central.reduce((n, b) => n + b.length, 0), 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...central, end]);
}
// Build both files before writing either final output. A failed build does not publish a new artifact.
const extension = await zip(await collect('dist'));
const assets = await zip([...await collect('chrome-store'), ...await collect('docs', 'public-site/')]);
await mkdir('release', { recursive: true });
const names = [`hanyu-pinyin-reader-${pkg.version}-chrome-web-store.zip`, `hanyu-pinyin-reader-${pkg.version}-store-assets.zip`];
const buffers = [extension, assets];
for (let i = 0; i < names.length; i++) {
  const path = join('release', names[i]); await writeFile(`${path}.tmp`, buffers[i]);
  await rm(path, { force: true }); await rename(`${path}.tmp`, path); console.log(`Created ${relative('.', path)}`);
}
await writeFile('release/SHA256SUMS.txt', buffers.map((data, i) => `${createHash('sha256').update(data).digest('hex')}  ${names[i]}`).join('\n') + '\n');
