import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const pythonEnvironment = resolve(root, '.tools/python');
export const localPython = resolve(pythonEnvironment, process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
export function pythonExecutable() {
  return process.env.PYTHON_BIN || (existsSync(localPython) ? localPython : process.platform === 'win32' ? 'python' : 'python3');
}

if (process.argv.includes('--doctor')) {
  const result = spawnSync(pythonExecutable(), ['-c', 'import sys; from importlib.metadata import version; print("Python", sys.version.split()[0], "Playwright", version("playwright"))'], { stdio: 'inherit' });
  if (result.status !== 0) console.log('Optional browser tools are unavailable. Run make setup-browser with Python 3.9+ installed.');
}
