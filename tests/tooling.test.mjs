import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, cpSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { targets } from '../scripts/make-help.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const run = (args, options = {}) => spawnSync(process.execPath, [join(root, 'make.mjs'), ...args], { encoding: 'utf8', ...options });

test('help works from another directory without installing dependencies', () => {
  const result = run(['help'], { cwd: tmpdir() });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /setup-browser/);
  assert.match(result.stdout, /release-full/);
});
test('unknown tasks and incomplete options return a failing exit status', () => {
  for (const args of [['not-a-task'], ['run', '--binary'], ['run', '--unknown', 'value']]) {
    const result = run(args);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Unknown target|Use --browser/);
  }
});
test('machine-readable target list matches the shared help registry', () => {
  const definitions = targets;
  assert.deepEqual(run(['--list']).stdout.trim().split(' '), Object.keys(definitions));
});

function sandbox(t) {
  const dir = mkdtempSync(join(tmpdir(), 'hanyu tools '));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(join(dir, 'scripts'));
  for (const file of ['make.mjs', 'scripts/tasks.mjs', 'Makefile', 'scripts/make-help.mjs', 'scripts/python.mjs', 'scripts/clean.mjs', 'scripts/run-extension.mjs']) cpSync(join(root, file), join(dir, file));
  return dir;
}
test('cleanup removes generated output but preserves source and portable tools', t => {
  const dir = sandbox(t);
  for (const folder of ['dist', 'release', 'node_modules', '.browser-profile', '.tools', 'src']) {
    mkdirSync(join(dir, folder)); writeFileSync(join(dir, folder, 'keep.txt'), 'test');
  }
  writeFileSync(join(dir, 'browser-test-results.json'), '{}');
  const result = spawnSync(process.execPath, [join(dir, 'make.mjs'), 'clean-all'], { encoding: 'utf8', cwd: tmpdir() });
  assert.equal(result.status, 0, result.stderr);
  for (const folder of ['dist', 'release', 'node_modules', '.browser-profile', 'browser-test-results.json']) assert.equal(existsSync(join(dir, folder)), false);
  assert.equal(existsSync(join(dir, 'src/keep.txt')), true);
  assert.equal(existsSync(join(dir, '.tools/keep.txt')), true);
});
test('a failed dependency installation stops before building or packaging', { skip: process.platform === 'win32' }, t => {
  const dir = sandbox(t), bin = join(dir, 'bin'), log = join(dir, 'calls.txt');
  mkdirSync(bin);
  writeFileSync(join(dir, 'package.json'), '{}'); writeFileSync(join(dir, 'package-lock.json'), '{}');
  writeFileSync(join(bin, 'npm'), '#!/bin/sh\nprintf "%s\\n" "$*" >> "$HP_TASK_LOG"\nexit 23\n', { mode: 0o755 });
  const result = spawnSync(process.execPath, [join(dir, 'make.mjs'), 'release'], {
    encoding: 'utf8', env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, HP_TASK_LOG: log }
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Error 23/);
  assert.equal(readFileSync(log, 'utf8').trim(), 'ci --no-audit --no-fund');
  assert.equal(existsSync(join(dir, 'release')), false);
});
test('a custom prebuilt dist is launched without invoking npm build', { skip: process.platform === 'win32' }, t => {
  const dir = sandbox(t), binary = join(dir, 'fake browser'), dist = join(dir, 'custom dist');
  mkdirSync(dist); writeFileSync(join(dist, 'manifest.json'), '{}');
  writeFileSync(binary, '#!/bin/sh\nexit 0\n', { mode: 0o755 });
  const result = spawnSync(process.execPath, [join(dir, 'make.mjs'), 'run', '--dist', dist, '--binary', binary], {
    encoding: 'utf8', env: { ...process.env }
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Opened chromium/);
  assert.equal(existsSync(join(dir, 'dist')), false);
});

test('Make skips unchanged builds, rebuilds changed source, and repairs missing output', async t => {
  const dir = sandbox(t);
  const put = (name, text = '') => { mkdirSync(dirname(join(dir, name)), { recursive: true }); writeFileSync(join(dir, name), text); };
  for (const file of ['package.json', 'package-lock.json', 'public/manifest.json', 'LICENSE', 'THIRD-PARTY-NOTICES.txt', 'src/content/main.ts', 'assets/icon-source.png', 'scripts/store-assets/shared.mjs']) put(file, '{}');
  const icons = [16, 32, 48, 128].map(size => `assets/icons/icon${size}.png`).concat('chrome-store/assets/store-icon-128.png');
  const outputs = ['content.js', 'background.js', 'popup.js', 'options.js', 'popup.html', 'popup.css', 'options.html', 'options.css', 'manifest.json', 'LICENSE', 'THIRD-PARTY-NOTICES.txt'].map(name => `dist/${name}`).concat([16, 32, 48, 128].map(size => `dist/assets/icons/icon${size}.png`));
  const writer = files => `import fs from 'node:fs'; import path from 'node:path'; for(const file of ${JSON.stringify(files)}) { fs.mkdirSync(path.dirname(file),{recursive:true}); fs.writeFileSync(file,'generated'); }`;
  put('scripts/store-assets/icons.mjs', writer(icons));
  put('scripts/build.mjs', writer(outputs) + "fs.appendFileSync('build-count.txt','built\\n');");
  put('node_modules/.make-install-stamp', 'installed');
  const build = () => {
    const result = spawnSync(process.env.MAKE_BIN || 'make', ['--no-print-directory', '-j4', 'build'], { cwd: dir, env: { ...process.env, NODE: process.execPath }, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    return readFileSync(join(dir, 'build-count.txt'), 'utf8').trim().split('\n').length;
  };
  assert.equal(build(), 1);
  assert.equal(build(), 1);
  await new Promise(resolve => setTimeout(resolve, 30));
  put('src/content/main.ts', '// changed');
  assert.equal(build(), 2);
  assert.equal(build(), 2);
  rmSync(join(dir, 'dist/options.js'));
  assert.equal(build(), 3);
  assert.equal(existsSync(join(dir, 'dist/options.js')), true);
});
