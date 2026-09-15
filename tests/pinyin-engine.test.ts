import { describe, it, expect } from 'vitest';
import { pronounce, transliterate, clearPinyinCache, pinyinCacheStats } from '../src/pinyin/pinyin-engine';
describe('production pinyin-pro adapter', () => {
  it('handles Simplified Chinese with contextual character mode', () => expect(pronounce('重庆银行', 'marks', 'character').map(t => t.pinyin)).toEqual(['chóng', 'qìng', 'yín', 'háng']));
  it('uses Traditional mappings for polyphonic words', () => expect(pronounce('銀行', 'marks', 'character').map(t => t.pinyin)).toEqual(['yín', 'háng']));
  it('preserves the original Traditional characters', () => expect(pronounce('歡迎學習中文', 'marks', 'word').map(t => t.han).join('')).toBe('歡迎學習中文'));
  it('uses surrounding inline context', () => expect(pronounce('行', 'marks', 'character', { before: '银', after: '' })[0]?.pinyin).toBe('háng'));
  it('supports tone numbers and no-tone output', () => { expect(transliterate('你好', 'numbers')).toBe('ni3 hao3'); expect(transliterate('你好', 'none')).toBe('ni hao'); });
  it('preserves non-Chinese content in mixed selections', () => expect(transliterate('API 中文 2026。', 'marks')).toBe('API zhōng wén 2026。'));
  it('never removes supplementary or unmapped ideographs', () => expect(pronounce('𠀀中文𰻞', 'marks', 'word').map(t => t.han).join('')).toBe('𠀀中文𰻞'));
  it('bounds long inputs and keeps all base characters', () => { const text = '学习中文'.repeat(200); expect(pronounce(text, 'marks', 'word').map(t => t.han).join('')).toBe(text); });
  it('caches immutable results', () => { clearPinyinCache(); const a = pronounce('中文', 'marks', 'word'); const b = pronounce('中文', 'marks', 'word'); expect(b).toBe(a); expect(Object.isFrozen(a)).toBe(true); expect(pinyinCacheStats().hits).toBe(1); });
});
