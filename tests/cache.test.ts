import { describe, it, expect } from 'vitest';
import { LruCache } from '../src/pinyin/cache';
describe('LRU', () => {
  it('evicts the least recently used item including empty keys', () => { const cache = new LruCache(2); cache.set('', 1); cache.set('b', 2); cache.get(''); cache.set('c', 3); expect(cache.get('b')).toBeUndefined(); expect(cache.get('')).toBe(1); });
  it('enforces the weight budget', () => { const cache = new LruCache(50, 200); cache.set('a', 1, 150); cache.set('b', 2, 100); expect(cache.get('a')).toBeUndefined(); expect(cache.size).toBe(1); });
  it('updates entry weights and recovers from invalid limits', () => { const cache = new LruCache(2, 200); cache.set('a', 1, 150); cache.set('a', 2, 50); cache.set('b', 3, 100); cache.setMaxSize(NaN); expect(cache.size).toBe(2); cache.clear(); expect(cache.size).toBe(0); expect(cache.hits).toBe(0); });
});
