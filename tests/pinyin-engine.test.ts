import { describe, expect, it } from 'vitest';
import { pronounce, HAN_RE } from '../src/pinyin/pinyin-engine';

describe('pinyin engine', () => {
  it('detects Han characters', () => {
    expect(HAN_RE.test('中文')).toBe(true);
    expect(HAN_RE.test('English only')).toBe(false);
  });

  it('renders tone marks', () => {
    expect(pronounce('中文', 'marks', 'character').map(x => x.pinyin)).toEqual(['zhōng', 'wén']);
  });

  it('renders tone numbers', () => {
    expect(pronounce('你好', 'numbers', 'character').map(x => x.pinyin)).toEqual(['ni3', 'hao3']);
  });

  it('uses phrase context for polyphonic text', () => {
    const tokens = pronounce('银行', 'marks', 'character');
    expect(tokens.map(x => x.pinyin).join(' ')).toContain('háng');
  });

  it('supports Traditional Chinese', () => {
    expect(pronounce('學習', 'marks', 'character').map(x => x.pinyin).join(' ')).toContain('xué');
  });
});
