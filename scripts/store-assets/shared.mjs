import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

export const root = resolve(process.cwd());
export const iconDir = resolve(root, 'assets/icons');
export const storeDir = resolve(root, 'chrome-store/assets');
export const screenshotDir = resolve(storeDir, 'screenshots');

export const blue = '#2563eb';
export const deepBlue = '#1e3a8a';
export const ink = '#0f172a';
export const muted = '#64748b';
export const border = '#cbd5e1';
export const soft = '#f8fafc';
export const white = '#ffffff';
export const font = 'Inter, Arial, sans-serif';
export const cjk = "'Noto Sans CJK SC', 'Noto Sans SC', 'Microsoft YaHei', sans-serif";

export async function ensureDirectories() {
  await mkdir(iconDir, { recursive: true });
  await mkdir(screenshotDir, { recursive: true });
}

export function esc(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export async function render(svg, output, width, height) {
  await sharp(Buffer.from(svg))
    .resize(width, height, { fit: 'fill' })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(output);
}

export function annotated(tokens, x, y, charSize = 36, pinyinSize = 14, gap = 52) {
  return tokens.map(([han, pinyin], index) => {
    const cx = x + index * gap;
    return `<text x="${cx}" y="${y}" text-anchor="middle" font-family="${font}" font-size="${pinyinSize}" fill="${blue}">${esc(pinyin)}</text>
<text x="${cx}" y="${y + charSize}" text-anchor="middle" font-family="${cjk}" font-size="${charSize}" fill="${ink}">${esc(han)}</text>`;
  }).join('\n');
}

export function browserChrome(address) {
  return `<rect x="26" y="24" width="1228" height="752" rx="20" fill="${white}" stroke="${border}" stroke-width="2"/>
<rect x="27" y="25" width="1226" height="70" fill="${soft}"/>
<circle cx="55" cy="58" r="7" fill="#f87171"/><circle cx="80" cy="58" r="7" fill="#fbbf24"/><circle cx="105" cy="58" r="7" fill="#34d399"/>
<rect x="175" y="43" width="885" height="36" rx="18" fill="#e9eef5"/>
<text x="196" y="67" font-family="${font}" font-size="15" fill="${muted}">${esc(address)}</text>
<rect x="1180" y="42" width="36" height="36" rx="9" fill="${blue}"/>
<text x="1198" y="66" text-anchor="middle" font-family="${font}" font-size="18" font-weight="700" fill="${white}">P</text>`;
}

export function screenshotBase(address) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800">
<rect width="1280" height="800" fill="#f2f6fa"/>
${browserChrome(address)}`;
}
