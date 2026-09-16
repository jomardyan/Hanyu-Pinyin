import { resolve } from 'node:path';
import { ensureDirectories, iconDir, storeDir, root, resizeImage } from './shared.mjs';

await ensureDirectories();
const source = resolve(root, 'assets/icon-source.png');

for (const size of [16, 32, 48, 128]) {
  await resizeImage(source, resolve(iconDir, `icon${size}.png`), size);
}
await resizeImage(source, resolve(storeDir, 'store-icon-128.png'), 128);
