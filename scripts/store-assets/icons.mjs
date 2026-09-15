import { resolve } from 'node:path';
import { ensureDirectories, iconDir, storeDir, blue, white, font, render } from './shared.mjs';

await ensureDirectories();

function iconSvg(size) {
  const pad = size * 0.125;
  const inner = size - pad * 2;
  const radius = size * 0.18;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="none"/>
  <rect x="${pad}" y="${pad}" width="${inner}" height="${inner}" rx="${radius}" fill="${blue}"/>
  <text x="${size/2}" y="${size*0.55}" text-anchor="middle" font-family="${font}" font-size="${size*0.34}" font-weight="700" fill="${white}">P</text>
  <text x="${size/2}" y="${size*0.73}" text-anchor="middle" font-family="${font}" font-size="${size*0.115}" font-weight="600" fill="${white}">pīn</text>
</svg>`;
}

for (const size of [16, 32, 48, 128]) {
  await render(iconSvg(size), resolve(iconDir, `icon${size}.png`), size, size);
}
await render(iconSvg(128), resolve(storeDir, 'store-icon-128.png'), 128, 128);
