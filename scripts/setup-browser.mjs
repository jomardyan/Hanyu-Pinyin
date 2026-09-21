import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { root, localPython, pythonEnvironment, pythonExecutable } from './python.mjs';
function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed with exit code ${result.status}`);
}
if (!process.env.PYTHON_BIN && !existsSync(localPython)) run(process.platform === 'win32' ? 'python' : 'python3', ['-m', 'venv', pythonEnvironment]);
run(pythonExecutable(), ['-m', 'pip', 'install', '-r', 'requirements-browser.txt']);
if (!process.env.CHROMIUM_BIN) run(pythonExecutable(), ['-m', 'playwright', 'install', 'chromium']);
