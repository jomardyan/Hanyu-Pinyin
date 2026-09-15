import { existsSync, mkdirSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { resolve, dirname, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), options = {};
for (let i = 0; i < args.length; i += 2) {
  if (!['--browser', '--dist', '--profile', '--url', '--binary'].includes(args[i]) || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error('Use --browser chrome|edge|chromium with optional --dist, --profile, --url, or --binary');
  options[args[i].slice(2)] = args[i + 1];
}
const browser = options.browser || 'chromium';
if (!['chrome', 'edge', 'chromium'].includes(browser)) throw new Error('Browser must be chrome, edge, or chromium');
const dist = resolve(root, options.dist || 'dist');
if (!existsSync(resolve(dist, 'manifest.json'))) throw new Error('Build the extension before running it');
const profileRoot = resolve(root, '.browser-profile'), profile = resolve(root, options.profile || `.browser-profile/${browser}`);
const relation = relative(profileRoot, profile);
if (!relation || relation.startsWith('..') || isAbsolute(relation)) throw new Error('Use a dedicated profile inside .browser-profile');
if (options.url && !/^https?:$/.test(new URL(options.url).protocol)) throw new Error('Test URLs must use HTTP or HTTPS');
let candidates;
if (process.platform === 'win32') {
  const bases = [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA].filter(Boolean);
  const suffix = browser === 'edge' ? 'Microsoft/Edge/Application/msedge.exe' : browser === 'chromium' ? 'Chromium/Application/chrome.exe' : 'Google/Chrome/Application/chrome.exe';
  candidates = [...bases.map(base => resolve(base, suffix)), browser === 'edge' ? 'msedge' : browser === 'chromium' ? 'chromium' : 'chrome'];
} else if (process.platform === 'darwin') {
  const name = browser === 'edge' ? 'Microsoft Edge' : browser === 'chromium' ? 'Chromium' : 'Google Chrome';
  candidates = [`/Applications/${name}.app/Contents/MacOS/${name}`];
} else candidates = browser === 'edge' ? ['microsoft-edge', 'microsoft-edge-stable'] : browser === 'chromium' ? ['chromium', 'chromium-browser'] : ['google-chrome', 'google-chrome-stable'];
const exists = file => file.includes('/') || file.includes('\\') ? existsSync(file) : spawnSync(process.platform === 'win32' ? 'where' : 'which', [file], { stdio: 'ignore' }).status === 0;
const executable = options.binary || candidates.find(exists);
if (!executable || !exists(executable)) throw new Error(`Could not find ${browser}. Supply --binary or load ${dist} manually.`);
mkdirSync(profile, { recursive: true });
const flags = [`--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check'];
if (browser === 'chromium') flags.push(`--disable-extensions-except=${dist}`, `--load-extension=${dist}`, options.url || 'about:blank');
else {
  flags.push(browser === 'edge' ? 'edge://extensions' : 'chrome://extensions');
  console.log(`Enable Developer mode, choose Load unpacked, and select ${dist}.`);
  console.log('Chrome and Edge do not reliably accept command-line extension loading. This launcher does not claim automatic installation.');
  if (options.url) flags.push(options.url);
}
const child = spawn(executable, flags, { detached: true, stdio: 'ignore' });
child.once('error', error => { console.error(`Browser launch failed - ${error.message}`); process.exitCode = 1; });
child.once('spawn', () => { console.log(`Opened ${browser} with dedicated profile ${profile}`); child.unref(); });
