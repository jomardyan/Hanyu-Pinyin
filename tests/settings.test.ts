import { describe, it, expect } from 'vitest';
import { canonicalHost, mergeSettings, isEnabledForHost } from '../src/shared/settings';
describe('settings boundaries', () => {
  it('creates independent defaults', () => { const a = mergeSettings(undefined), b = mergeSettings(undefined); a.excludedSelectors.push('p'); expect(b.excludedSelectors).toEqual([]); });
  it('rejects invalid finite values', () => { const s = mergeSettings({ batchSize: NaN, opacity: Infinity, cacheSize: -1 }); expect(s.batchSize).toBe(80); expect(s.opacity).toBe(.9); expect(s.cacheSize).toBe(50); });
  it('rejects CSS injection', () => expect(mergeSettings({ color: 'red;}body{display:none}' }).color).toBe('#5b6472'));
  it('ignores unsupported modes and malformed arrays', () => { const s = mergeSettings({ annotationMode: 'bad', excludedSelectors: [null, 3, 'p', 'p'] }); expect(s.annotationMode).toBe('above'); expect(s.excludedSelectors).toEqual(['p']); });
  it('canonicalizes only valid exact hostnames', () => { expect(canonicalHost('EXAMPLE.COM.')).toBe('example.com'); expect(canonicalHost('example.com:443')).toBe(''); expect(canonicalHost('https://example.com')).toBe(''); expect(canonicalHost('__proto__')).toBe(''); });
  it('supports exact-host overrides without suffix matching', () => { const s = mergeSettings({ enabled: false, domainRules: { 'example.com': 'always', 'private.example.com': 'never' } }); expect(isEnabledForHost(s, 'example.com')).toBe(true); expect(isEnabledForHost(s, 'notexample.com')).toBe(false); expect(isEnabledForHost(s, 'private.example.com')).toBe(false); });
  it('bounds saved rules and selectors', () => { const s = mergeSettings({ domainRules: Object.fromEntries(Array.from({ length: 800 }, (_, i) => [`h${i}.example`, 'always'])), excludedSelectors: Array.from({ length: 100 }, (_, i) => `.c${i}`) }); expect(Object.keys(s.domainRules)).toHaveLength(500); expect(s.excludedSelectors).toHaveLength(50); });
});
