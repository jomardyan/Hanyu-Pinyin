import { spawn } from 'node:child_process';
import { pythonExecutable, root } from './python.mjs';
const file = process.argv[2];
if (!['browser_regressions.py', 'ui_regressions.py'].includes(file)) throw new Error('Unknown browser test suite');
const child = spawn(pythonExecutable(), [`tests/${file}`], { cwd: root, stdio: 'inherit' });
child.on('error', error => { console.error(`Install Python and Playwright before running browser tests. ${error.message}`); process.exitCode = 1; });
child.on('exit', (code, signal) => { process.exitCode = signal || code === null ? 1 : code; });
