import { rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.some(arg => !['--all', '--build-only'].includes(arg))) throw new Error('Use --all or --build-only');
const paths = args.includes('--build-only') ? ['dist'] : ['dist', 'release', '.test-build', 'coverage', 'browser-test-results.json', 'ui-test-results.json', 'popup-ui-tested.png', 'options-ui-tested.png'];
if (args.includes('--all')) paths.push('node_modules', '.browser-profile');
for (const path of paths) await rm(resolve(root, path), { recursive: true, force: true });
