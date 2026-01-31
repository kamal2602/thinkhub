class CacheService {
  private cache = new Map<string, { data: any; expiry: number }>();
  private defaultTTL = 300;

  set<T>(key: string, data: T, ttlSeconds = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + (ttlSeconds * 1000)
    });
  }

  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  has(key: string): boolean {
    const cached = this.cache.get(key);
    if (!cached) return false;

    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  invalidate(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  invalidateByPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  getStats(): { size: number; keys: string[] } {
    const now = Date.now();
    const validKeys: string[] = [];

    for (const [key, value] of this.cache.entries()) {
      if (now <= value.expiry) {
        validKeys.push(key);
      } else {
        this.cache.delete(key);
      }
    }

    return {
      size: validKeys.length,
      keys: validKeys
    };
  }

  async remember<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds = this.defaultTTL
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetcher();
    this.set(key, data, ttlSeconds);
    return data;
  }
}

export const cacheService = new CacheService();
