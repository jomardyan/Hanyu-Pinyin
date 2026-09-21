// Compatibility launcher only. All recipes and ordering live in Makefile.
import { spawn } from 'node:child_process';
import { targets } from './make-help.mjs';
import { root } from './python.mjs';
const args = process.argv.slice(2), target = args.shift() || 'help';
try {
  if (target === '--list' && !args.length) console.log(Object.keys(targets).join(' '));
  else {
    if (!Object.hasOwn(targets, target)) throw new Error(`Unknown target ${target}. Run make help.`);
    const env = { ...process.env, NODE: process.execPath.replaceAll('$', '$$') };
    for (let index = 0; index < args.length; index += 2) {
      const option = args[index], value = args[index + 1];
      if (!['--browser', '--dist', '--profile', '--url', '--binary'].includes(option) || !value || value.startsWith('--')) {
        throw new Error('Use --browser chrome|edge|chromium with optional --dist, --profile, --url, or --binary');
      }
      env[option.slice(2).toUpperCase()] = value.replaceAll('$', '$$');
    }
    // Escape Make dollars and pass values as data without a command shell.
    const child = spawn(process.env.MAKE_BIN || 'make', ['--no-print-directory', target], { cwd: root, env, stdio: 'inherit' });
    child.once('error', error => { console.error(`GNU Make 4.3+ is required. ${error.message}`); process.exitCode = 1; });
    child.once('exit', (code, signal) => { process.exitCode = signal || code === null ? 1 : code; });
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
