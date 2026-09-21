import { readFileSync } from 'node:fs';
export const targets = Object.fromEntries([...readFileSync(new URL('../Makefile', import.meta.url), 'utf8').matchAll(/^([a-z][a-z-]*):[^\n]*?## (.+)$/gm)].map(match => [match[1], match[2]]));
if (process.argv[1]?.endsWith('make-help.mjs')) {
  for (const [name, description] of Object.entries(targets)) console.log(`  ${name.padEnd(18)} ${description}`);
}
