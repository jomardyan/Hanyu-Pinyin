import { addDict, addTraditionalDict, pinyin, segment } from 'pinyin-pro';
import ModernDict from '@pinyin-pro/data/modern';
import TraditionalDict from '@pinyin-pro/data/traditional';
import { LruCache } from './cache';
import type { Granularity, ToneStyle } from '../shared/settings';

export interface PronouncedToken { han: string; pinyin: string }
export const HAN_RE = /\p{Script=Han}/u;
export const HAN_RUN_RE = /\p{Script=Han}+/gu;
const cache = new LruCache<readonly PronouncedToken[]>();
let ready = false;
function initialize(): void {
  if (ready) return;
  addDict(ModernDict); addTraditionalDict(TraditionalDict); ready = true;
}
export function configurePinyinCache(size: number): void { cache.setMaxSize(size); }
export function clearPinyinCache(): void { cache.clear(); }
export function pinyinCacheStats() { return { entries: cache.size, hits: cache.hits, misses: cache.misses }; }

export function pronounce(text: string, style: ToneStyle, granularity: Granularity, context: { before: string; after: string } = { before: '', after: '' }): readonly PronouncedToken[] {
  if (!text) return [];
  const before = Array.from(context.before).slice(-24).join(''), after = Array.from(context.after).slice(0, 24).join('');
  const key = `${style}|${granularity}|${before}|${after}|${text}`;
  const hit = cache.get(key); if (hit) return hit;
  initialize();
  const toneType = style === 'numbers' ? 'num' : style === 'none' ? 'none' : 'symbol';
  const out: PronouncedToken[] = [];
  let pos = 0;
  for (const match of text.matchAll(HAN_RUN_RE)) {
    const start = match.index!;
    if (start > pos) out.push({ han: text.slice(pos, start), pinyin: '' });
    const run = match[0];
    // Bound library work even when called directly from a long selection.
    const chars = Array.from(run);
    for (let offset = 0; offset < chars.length; offset += 128) {
      const chunk = chars.slice(offset, offset + 128).join('');
      const cps = Array.from(chunk);
      const left = chars.slice(Math.max(0, offset - 16), offset).join('') || (start === 0 ? before : '');
      const right = chars.slice(offset + 128, offset + 144).join('') || (start + run.length === text.length ? after : '');
      const syllables = pinyin(left + chunk + right, { type: 'array', toneType, nonZh: 'spaced', traditional: true }).slice(Array.from(left).length, Array.from(left).length + cps.length);
      // Without one syllable per character the offsets are meaningless, so nothing may be
      // attributed to a character. Misaligned sounds would be confidently wrong, not merely absent.
      const aligned = syllables.length === cps.length;
      let words = granularity === 'word'
        ? segment(chunk, { traditional: true }).map(token => token.origin) : cps;
      if (!aligned || words.join('') !== chunk) words = cps;
      let i = 0;
      for (const word of words) {
        const n = Array.from(word).length;
        const sounds = aligned ? syllables.slice(i, i + n) : []; i += n;
        // Unmapped characters stay visible, rather than receiving fake pronunciation.
        const known = sounds.length === n && sounds.every(sound => sound && !HAN_RE.test(sound));
        out.push({ han: word, pinyin: known ? sounds.join(' ') : '' });
      }
    }
    pos = start + run.length;
  }
  if (pos < text.length) out.push({ han: text.slice(pos), pinyin: '' });
  const frozen = Object.freeze(out.map(token => Object.freeze(token)));
  if (text.length <= 4096) cache.set(key, frozen, text.length * 2 + out.reduce((n, t) => n + t.han.length * 2 + t.pinyin.length * 2 + 80, 0));
  return frozen;
}
export function transliterate(text: string, style: ToneStyle): string {
  const tokens = pronounce(text, style, 'word');
  return tokens.map((token, index) => token.pinyin
    ? token.pinyin + (tokens[index + 1]?.pinyin ? ' ' : '') : token.han).join('');
}
