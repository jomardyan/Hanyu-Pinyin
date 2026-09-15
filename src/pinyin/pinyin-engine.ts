import { addDict, pinyin, segment } from 'pinyin-pro';
import ModernDict from '@pinyin-pro/data/modern';
import { LruCache } from './cache';
import type { Granularity, ToneStyle } from '../shared/settings';

export interface PronouncedToken {
  han: string;
  pinyin: string;
}

const cache = new LruCache<PronouncedToken[]>();
let dictionaryReady = false;

export const HAN_RE = /\p{Script=Han}/u;
export const HAN_RUN_RE = /\p{Script=Han}+/gu;

function ensureDictionary(): void {
  if (dictionaryReady) return;
  addDict(ModernDict);
  dictionaryReady = true;
}

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
  ensureDictionary();
  const parts = segment(text);
  const words = parts.map(part => part.origin).filter(value => HAN_RE.test(value));
  return words.length ? words : [text];
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
    tokens = segmentWords(text).map(han => ({
      han,
      pinyin: phrasePinyin(han, style).join(' ')
    }));
  } else {
    const syllables = phrasePinyin(text, style);
    const chars = Array.from(text);
    tokens = chars.map((han, index) => ({ han, pinyin: syllables[index] ?? '' }));
  }

  cache.set(key, tokens);
  return tokens;
}
