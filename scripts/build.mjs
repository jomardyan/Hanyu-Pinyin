import { build, context } from 'esbuild';
import { cp, mkdir, rm, readFile } from 'node:fs/promises';
import { watch as watchFiles } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const watch = process.argv.includes('--watch'), dist = resolve(root, 'dist');
async function copyStatic() {
  await mkdir(dist, { recursive: true });
  const pkg = JSON.parse(await readFile('package.json', 'utf8'));
  const manifest = JSON.parse(await readFile('public/manifest.json', 'utf8'));
  if (pkg.version !== manifest.version) throw new Error('Package and manifest versions must match');
  for (const [from, to] of [['public/manifest.json', 'manifest.json'], ['src/popup/popup.html', 'popup.html'], ['src/popup/popup.css', 'popup.css'], ['src/options/options.html', 'options.html'], ['src/options/options.css', 'options.css'], ['LICENSE', 'LICENSE'], ['THIRD-PARTY-NOTICES.txt', 'THIRD-PARTY-NOTICES.txt']]) await cp(from, resolve(dist, to));
  await cp('public/_locales', resolve(dist, '_locales'), { recursive: true, force: true });
  await mkdir(resolve(dist, 'assets/icons'), { recursive: true });
  for (const size of [16, 32, 48, 128]) await cp(`assets/icons/icon${size}.png`, resolve(dist, `assets/icons/icon${size}.png`));
}
const config = {
  entryPoints: { content: 'src/content/content-script.ts', background: 'src/background/service-worker.ts', popup: 'src/popup/popup.ts', options: 'src/options/options.ts' },
  bundle: true, outdir: 'dist', format: 'iife', platform: 'browser', target: ['chrome120', 'edge120'],
  sourcemap: watch, minify: !watch, legalComments: 'eof', logLevel: 'info'
};
await rm(dist, { recursive: true, force: true }); await copyStatic();
if (!watch) await build(config);
else {
  const ctx = await context(config); await ctx.watch();
  let timer;
  const watchers = ['src/popup', 'src/options', 'public', 'assets/icons'].map(dir => watchFiles(dir, (_event, file) => {
    if (!file || !/\.(html|css|json|png)$/.test(String(file))) return;
    clearTimeout(timer); timer = setTimeout(() => void copyStatic().catch(error => console.error(error.message)), 100);
  }));
  const close = async () => { clearTimeout(timer); watchers.forEach(w => w.close()); await ctx.dispose(); process.exit(0); };
  process.once('SIGINT', close); process.once('SIGTERM', close);
  console.log('Watching TypeScript, HTML, CSS, and icons. Reload the unpacked extension after changes.');
}
