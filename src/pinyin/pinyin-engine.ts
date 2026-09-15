import { pinyin } from 'pinyin-pro';
import { LruCache } from './cache';
import type { Granularity, ToneStyle } from '../shared/settings';

export interface PronouncedToken {
  han: string;
  pinyin: string;
}

const cache = new LruCache<PronouncedToken[]>();

export const HAN_RE = /\p{Script=Han}/u;
export const HAN_RUN_RE = /\p{Script=Han}+/gu;

function toneType(style: ToneStyle): 'symbol' | 'num' | 'none' {
  return style === 'marks' ? 'symbol' : style === 'numbers' ? 'num' : 'none';
}

function phrasePinyin(text: string, style: ToneStyle): string[] {
  return pinyin(text, {
    toneType: toneType(style),
    type: 'array',
    nonZh: 'consecutive'
  }) as string[];
}

function segmentWords(text: string): string[] {
  if (typeof Intl.Segmenter === 'function') {
    const segmenter = new Intl.Segmenter('zh', { granularity: 'word' });
    return Array.from(segmenter.segment(text), part => part.segment);
  }
  return [text];
}

export function configurePinyinCache(maxSize: number): void {
  cache.setMaxSize(maxSize);
}

export function clearPinyinCache(): void {
  cache.clear();
}

export function pronounce(text: string, style: ToneStyle, granularity: Granularity): PronouncedToken[] {
  const key = `${style}|${granularity}|${text}`;
  const cached = cache.get(key);
  if (cached) return cached;

  let tokens: PronouncedToken[];
  if (granularity === 'word') {
    tokens = segmentWords(text)
      .filter(HAN_RE.test.bind(HAN_RE))
      .map(han => ({ han, pinyin: phrasePinyin(han, style).join(' ') }));
  } else {
    const syllables = phrasePinyin(text, style);
    const chars = Array.from(text);
    tokens = chars.map((han, index) => ({ han, pinyin: syllables[index] ?? '' }));
  }

  cache.set(key, tokens);
  return tokens;
}
