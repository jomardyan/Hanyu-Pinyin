import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import process from 'node:process';

function option(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const browser = option('browser', 'chrome').toLowerCase();
const dist = resolve(option('dist', 'dist'));
const profile = resolve(option('profile', `.browser-profile/${browser}`));
const url = option('url', 'https://zh.wikipedia.org/wiki/%E6%B1%89%E8%AF%AD%E6%8B%BC%E9%9F%B3');

if (!existsSync(resolve(dist, 'manifest.json'))) {
  console.error(`No manifest.json found in ${dist}. Build the extension first.`);
  process.exit(1);
}

mkdirSync(profile, { recursive: true });

function commandExists(command) {
  const probe = process.platform === 'win32' ? 'where' : 'which';
  return spawnSync(probe, [command], { stdio: 'ignore' }).status === 0;
}

function candidatesFor(name) {
  if (process.platform === 'win32') {
    const local = process.env.LOCALAPPDATA ?? '';
    const pf = process.env.PROGRAMFILES ?? '';
    const pfx86 = process.env['PROGRAMFILES(X86)'] ?? '';
    if (name === 'edge') {
      return [
        resolve(pf, 'Microsoft/Edge/Application/msedge.exe'),
        resolve(pfx86, 'Microsoft/Edge/Application/msedge.exe'),
        resolve(local, 'Microsoft/Edge/Application/msedge.exe'),
        'msedge'
      ];
    }
    return [
      resolve(pf, 'Google/Chrome/Application/chrome.exe'),
      resolve(pfx86, 'Google/Chrome/Application/chrome.exe'),
      resolve(local, 'Google/Chrome/Application/chrome.exe'),
      'chrome'
    ];
  }

  if (process.platform === 'darwin') {
    return name === 'edge'
      ? ['/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge']
      : ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
  }

  return name === 'edge'
    ? ['microsoft-edge', 'microsoft-edge-stable']
    : ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'];
}

function resolveExecutable(name) {
  for (const candidate of candidatesFor(name)) {
    if (candidate.includes('/') || candidate.includes('\\')) {
      if (existsSync(candidate)) return candidate;
    } else if (commandExists(candidate)) {
      return candidate;
    }
  }
  return null;
}

if (!['chrome', 'edge'].includes(browser)) {
  console.error('Supported browsers are chrome and edge.');
  process.exit(1);
}

const executable = resolveExecutable(browser);
if (!executable) {
  console.error(`Could not find ${browser}. Install it or run the built extension manually from ${dist}.`);
  process.exit(1);
}

const args = [
  `--user-data-dir=${profile}`,
  `--disable-extensions-except=${dist}`,
  `--load-extension=${dist}`,
  '--no-first-run',
  '--no-default-browser-check',
  url
];

console.log(`Launching ${browser}`);
console.log(`Extension ${dist}`);
console.log(`Profile ${profile}`);

const child = spawn(executable, args, {
  detached: true,
  stdio: 'ignore'
});
child.unref();
