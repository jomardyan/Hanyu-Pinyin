import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';

const root = resolve(process.cwd());
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const releaseDir = join(root, 'release');

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  crcTable[n] = c >>> 0;
}

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function dosDateTime(date) {
  const d = new Date(date);
  const year = Math.max(1980, d.getFullYear());
  const dosTime = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  const dosDate = ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { dosTime, dosDate };
}

async function collect(dir, prefix = '') {
  const files = [];
  for (const name of (await readdir(dir)).sort()) {
    const full = join(dir, name);
    const s = await stat(full);
    const archiveName = join(prefix, name).split(sep).join('/');
    if (s.isDirectory()) files.push(...await collect(full, archiveName));
    else if (s.isFile()) files.push({ full, archiveName, mtime: s.mtime });
  }
  return files;
}

async function createZip(output, inputs) {
  const entries = [];
  const locals = [];
  let offset = 0;

  for (const input of inputs) {
    const data = await readFile(input.full);
    const name = Buffer.from(input.archiveName, 'utf8');
    const crc = crc32(data);
    const { dosTime, dosDate } = dosDateTime(input.mtime);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(dosTime, 10);
    local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, name, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(0x0314, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(dosTime, 12);
    central.writeUInt16LE(dosDate, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    entries.push(central, name);

    offset += local.length + name.length + data.length;
  }

  const centralSize = entries.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(inputs.length, 8);
  end.writeUInt16LE(inputs.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  await writeFile(output, Buffer.concat([...locals, ...entries, end]));
}

await mkdir(releaseDir, { recursive: true });

const extensionFiles = await collect(join(root, 'dist'));
const storeFiles = [
  ...await collect(join(root, 'chrome-store')),
  ...await collect(join(root, 'docs'), 'public-site')
];

const extensionZip = join(releaseDir, `hanyu-pinyin-reader-${pkg.version}-chrome-web-store.zip`);
const storeZip = join(releaseDir, `hanyu-pinyin-reader-${pkg.version}-store-assets.zip`);

await createZip(extensionZip, extensionFiles);
await createZip(storeZip, storeFiles);

console.log(`Created ${relative(root, extensionZip)}`);
console.log(`Created ${relative(root, storeZip)}`);
