/** Entry and character-budget bounded LRU. Cached page text never leaves memory. */
export class LruCache<T> {
  private values = new Map<string, { value: T; weight: number }>();
  private weight = 0;
  hits = 0;
  misses = 0;
  constructor(private maxSize = 1500, private maxWeight = 2_000_000) {
    this.setMaxSize(maxSize);
  }
  setMaxSize(value: number): void {
    this.maxSize = Number.isFinite(value) ? Math.min(10000, Math.max(1, Math.floor(value))) : 1500;
    this.trim();
  }
  get size(): number { return this.values.size; }
  get(key: string): T | undefined {
    const entry = this.values.get(key);
    if (!entry) { this.misses++; return undefined; }
    this.hits++;
    this.values.delete(key); this.values.set(key, entry);
    return entry.value;
  }
  set(key: string, value: T, weight = key.length * 8 + 100): void {
    const old = this.values.get(key);
    if (old) { this.weight -= old.weight; this.values.delete(key); }
    if (!Number.isFinite(weight) || weight < 0 || weight > this.maxWeight) return;
    this.values.set(key, { value, weight }); this.weight += weight; this.trim();
  }
  clear(): void { this.values.clear(); this.weight = 0; this.hits = this.misses = 0; }
  private trim(): void {
    while (this.values.size > this.maxSize || this.weight > this.maxWeight) {
      const key = this.values.keys().next().value;
      if (key === undefined) break;
      this.weight -= this.values.get(key)!.weight; this.values.delete(key);
    }
  }
}
