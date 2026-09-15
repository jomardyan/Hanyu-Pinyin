import { build, context } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const watch = process.argv.includes('--watch');
const root = resolve(process.cwd());
const dist = resolve(root, 'dist');

async function copyStatic() {
  await mkdir(dist, { recursive: true });
  await cp(resolve(root, 'public/manifest.json'), resolve(dist, 'manifest.json'));
  await cp(resolve(root, 'src/popup/popup.html'), resolve(dist, 'popup.html'));
  await cp(resolve(root, 'src/popup/popup.css'), resolve(dist, 'popup.css'));
  await cp(resolve(root, 'src/options/options.html'), resolve(dist, 'options.html'));
  await cp(resolve(root, 'src/options/options.css'), resolve(dist, 'options.css'));
  await mkdir(resolve(dist, 'assets'), { recursive: true });
  await cp(resolve(root, 'assets/icons'), resolve(dist, 'assets/icons'), { recursive: true });
}

const config = {
  entryPoints: {
    content: 'src/content/content-script.ts',
    background: 'src/background/service-worker.ts',
    popup: 'src/popup/popup.ts',
    options: 'src/options/options.ts'
  },
  bundle: true,
  outdir: 'dist',
  format: 'iife',
  platform: 'browser',
  target: ['chrome120', 'edge120'],
  sourcemap: watch,
  minify: !watch,
  logLevel: 'info'
};

await rm(dist, { recursive: true, force: true });
await copyStatic();

if (watch) {
  const ctx = await context(config);
  await ctx.watch();
  console.log('Watching extension sources. Reload the unpacked extension after changes.');
} else {
  await build(config);
}
