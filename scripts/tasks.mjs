import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), target = args.shift() || 'help', options = {};
for (let index = 0; index < args.length; index += 2) {
  const option = args[index], value = args[index + 1];
  if (!['--browser', '--dist', '--profile', '--url', '--binary'].includes(option) || value === undefined || value.startsWith('--')) throw new Error('Use --browser chrome|edge|chromium with optional --dist, --profile, --url, or --binary');
  options[option.slice(2)] = value;
}
const browser = options.browser || 'chromium';
const tasks = {
  help: 'Show available tasks', doctor: 'Check Node.js and npm', setup: 'Check tools and install dependencies', install: 'Install dependencies',
  build: 'Build production extension', 'build-validate': 'Validate the production build', dev: 'Watch TypeScript, HTML, CSS, and icons', run: 'Open a dedicated browser test profile',
  'run-chrome': 'Open Chrome for manual unpacked loading', 'run-edge': 'Open Edge for manual unpacked loading', 'run-chromium': 'Automatically load in Chromium',
  test: 'Run unit tests', 'test-watch': 'Run unit tests in watch mode', 'test-browser': 'Run browser regression tests', 'test-ui': 'Test popup and settings UI with mocked APIs', 'test-backend': 'Test compiled worker with mocked APIs',
  typecheck: 'Check TypeScript', assets: 'Generate store graphics', 'store-generate': 'Generate store graphics', 'assets-validate': 'Validate store graphics', 'store-validate': 'Validate store graphics', check: 'Validate code and production build',
  package: 'Build and package without unit tests', release: 'Validated store release and SHA-256 hashes', 'store-release': 'Validated store release and SHA-256 hashes', ci: 'Install and create release',
  fixture: 'Serve compatibility fixtures on localhost', 'release-files': 'List generated packages', clean: 'Remove build and release output', 'clean-all': 'Also remove dependencies and dedicated test profiles'
};
function exec(command, args = []) {
  return new Promise((done, fail) => {
    // Windows npm is a .cmd executable. Only constant, whitelisted script names reach this shell.
    const child = spawn(command, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' && command === 'npm' });
    child.once('error', fail);
    child.once('exit', (code, signal) => code === 0 ? done() : fail(new Error(`${command} failed${signal ? ` with ${signal}` : ` with exit code ${code}`}`)));
  });
}
const npm = script => exec('npm', ['run', script]);
async function doctor() {
  if (Number(process.versions.node.split('.')[0]) < 20) throw new Error('Node.js 20 or newer is required');
  console.log(`Node.js ${process.version}`); await exec('npm', ['--version']);
  console.log('Store graphics need a CJK-capable system font. Browser tests additionally need Python and Playwright.');
}
async function install() { await exec('npm', existsSync(resolve(root, 'package-lock.json')) ? ['ci'] : ['install', '--no-package-lock']); }
async function clean(all = false) {
  // Fixed repository-local paths. Never interpolate Make variables into an rm command.
  for (const dir of ['dist', 'release', '.test-build', 'coverage', ...(all ? ['node_modules', '.browser-profile'] : [])]) await rm(resolve(root, dir), { recursive: true, force: true });
}
async function run() {
  if (!Object.hasOwn(tasks, target)) throw new Error(`Unknown target ${target}. Run help.`);
  if (target === 'help') { console.log('Hanyu Pinyin Reader tasks\n'); for (const [name, text] of Object.entries(tasks)) console.log(`  ${name.padEnd(18)} ${text}`); return; }
  if (target === 'doctor') return doctor();
  if (target === 'setup' || target === 'ci') { await doctor(); await install(); if (target === 'ci') await npm('store:release'); return; }
  if (target === 'install') return install();
  if (target === 'clean' || target === 'clean-all') return clean(target === 'clean-all');
  if (target === 'release-files') {
    const dir = resolve(root, 'release'); if (!existsSync(dir)) { console.log('No release output. Run release first.'); return; }
    for (const file of (await readdir(dir)).sort()) console.log(resolve(dir, file)); return;
  }
  if (target === 'run' || target.startsWith('run-')) {
    const requestedBrowser = target === 'run' ? browser : target.slice(4);
    if (!['chrome', 'edge', 'chromium'].includes(requestedBrowser)) throw new Error('Browser must be chrome, edge, or chromium');
    const runnerArgs = ['scripts/run-extension.mjs', '--browser', requestedBrowser];
    for (const name of ['dist', 'profile', 'url', 'binary']) if (options[name]) runnerArgs.push(`--${name}`, options[name]);
    await npm('build'); await exec(process.execPath, runnerArgs); return;
  }
  const mapping = { 'build-validate': 'build:validate', 'test-watch': 'test:watch', 'test-browser': 'test:browser', 'test-ui': 'test:ui', 'test-backend': 'test:backend', assets: 'store:generate', 'store-generate': 'store:generate', 'assets-validate': 'store:validate', 'store-validate': 'store:validate', release: 'store:release', 'store-release': 'store:release' };
  await npm(mapping[target] || target);
}
try { await run(); } catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }
