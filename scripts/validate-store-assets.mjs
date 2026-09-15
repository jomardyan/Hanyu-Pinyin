import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(process.cwd());

const required = new Map([
  ['assets/icons/icon16.png', [16, 16]],
  ['assets/icons/icon32.png', [32, 32]],
  ['assets/icons/icon48.png', [48, 48]],
  ['assets/icons/icon128.png', [128, 128]],
  ['chrome-store/assets/store-icon-128.png', [128, 128]],
  ['chrome-store/assets/promo-small-440x280.png', [440, 280]],
  ['chrome-store/assets/promo-marquee-1400x560.png', [1400, 560]],
  ['chrome-store/assets/screenshots/01-pinyin-above-text-1280x800.png', [1280, 800]],
  ['chrome-store/assets/screenshots/02-popup-controls-1280x800.png', [1280, 800]],
  ['chrome-store/assets/screenshots/03-tone-display-options-1280x800.png', [1280, 800]],
  ['chrome-store/assets/screenshots/04-advanced-settings-1280x800.png', [1280, 800]],
  ['chrome-store/assets/screenshots/05-traditional-chinese-1280x800.png', [1280, 800]]
]);

function pngDimensions(buffer) {
  const signature = buffer.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') throw new Error('File is not a PNG');
  if (buffer.subarray(12, 16).toString('ascii') !== 'IHDR') throw new Error('PNG IHDR chunk missing');
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
}

for (const [path, expected] of required) {
  const absolute = resolve(root, path);
  await access(absolute);
  const actual = pngDimensions(await readFile(absolute));
  if (actual[0] !== expected[0] || actual[1] !== expected[1]) {
    throw new Error(`${path} has ${actual[0]}x${actual[1]}, expected ${expected[0]}x${expected[1]}`);
  }
}

const manifest = JSON.parse(await readFile(resolve(root, 'public/manifest.json'), 'utf8'));
for (const size of ['16', '32', '48', '128']) {
  const manifestPath = manifest.icons?.[size];
  if (!manifestPath) throw new Error(`Manifest icon ${size} is missing`);
  await access(resolve(root, manifestPath));
}
if (!manifest.action?.default_icon) throw new Error('Manifest action.default_icon is missing');

console.log(`Chrome Web Store assets validated successfully. ${required.size} PNG files checked.`);
