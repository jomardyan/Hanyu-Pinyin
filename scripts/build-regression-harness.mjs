import { build } from 'esbuild';
await build({ entryPoints: ['tests/browser-harness.ts'], bundle: true, outfile: '.test-build/harness.js', format: 'iife', platform: 'browser', target: 'chrome120' });
