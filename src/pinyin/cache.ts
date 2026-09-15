export class LruCache<T> {
  private readonly values = new Map<string, T>();
  constructor(private maxSize = 1500) {}

  setMaxSize(maxSize: number): void {
    this.maxSize = Math.max(50, maxSize);
    this.trim();
  }

  get(key: string): T | undefined {
    const value = this.values.get(key);
    if (value === undefined) return undefined;
    this.values.delete(key);
    this.values.set(key, value);
    return value;
  }

  set(key: string, value: T): void {
    if (this.values.has(key)) this.values.delete(key);
    this.values.set(key, value);
    this.trim();
  }

  clear(): void {
    this.values.clear();
  }

  private trim(): void {
    while (this.values.size > this.maxSize) {
      const key = this.values.keys().next().value as string | undefined;
      if (!key) break;
      this.values.delete(key);
    }
  }
}
