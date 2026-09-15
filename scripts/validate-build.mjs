import { readFile, readdir, lstat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import sharp from 'sharp';
export async function validateBuild(dir = resolve('dist')) {
  const manifest = JSON.parse(await readFile(join(dir, 'manifest.json'), 'utf8'));
  const pkg = JSON.parse(await readFile('package.json', 'utf8'));
  if (manifest.manifest_version !== 3 || manifest.version !== pkg.version || !/^\d+\.\d+\.\d+(\.\d+)?$/.test(manifest.version)) throw new Error('Invalid manifest or version mismatch');
  if (/preview|fallback/i.test(manifest.name + (manifest.version_name || ''))) throw new Error('Preview builds cannot be packaged as store releases');
  if (manifest.key || manifest.update_url) throw new Error('Remove local key or update_url before release');
  const files = [manifest.background.service_worker, manifest.action.default_popup, manifest.options_page,
    ...manifest.content_scripts.flatMap(entry => entry.js), 'LICENSE', 'THIRD-PARTY-NOTICES.txt'];
  for (const file of files) {
    if (typeof file !== 'string' || file.includes('..') || file.startsWith('/') || file.includes(':')) throw new Error('Unsafe manifest path');
    if (!(await readFile(join(dir, file))).length) throw new Error(`Empty asset ${file}`);
  }
  for (const [size, file] of Object.entries(manifest.icons)) {
    const image = await sharp(join(dir, file)).metadata();
    if (image.format !== 'png' || image.width !== Number(size) || image.height !== Number(size)) throw new Error(`Invalid PNG icon ${file}`);
  }
  for (const html of [manifest.action.default_popup, manifest.options_page]) {
    const text = await readFile(join(dir, html), 'utf8');
    if (/<script\b[^>]*>\s*[^<\s]/i.test(text) || /\bon\w+\s*=/i.test(text)) throw new Error(`Inline script in ${html}`);
    for (const match of text.matchAll(/(?:src|href)="([^"]+)"/g)) {
      const path = match[1]; if (/^(?:https?:|\/\/|data:)/i.test(path)) throw new Error(`Remote UI asset in ${html}`);
      await readFile(join(dir, path));
    }
  }
  async function walk(base) {
    for (const name of await readdir(base)) {
      const path = join(base, name), stat = await lstat(path);
      if (stat.isSymbolicLink()) throw new Error('Release cannot contain symbolic links');
      if (stat.isDirectory()) await walk(path);
      else if (name.endsWith('.map') || name.startsWith('.') || /BUILD-NOTE|fallback|preview/i.test(name)) throw new Error(`Unexpected release file ${name}`);
      else if (name.endsWith('.js')) {
        const source = await readFile(path, 'utf8');
        if (/\beval\s*\(|\bnew\s+Function\s*\(|\bimport\s*\(\s*['"]https?:/i.test(source)) throw new Error(`Unsafe code in ${name}`);
      }
    }
  }
  await walk(dir); console.log('Validated extension manifest, paths, icons, CSP-safe UI, and package contents.');
}
if (process.argv[1]?.endsWith('validate-build.mjs')) await validateBuild();
