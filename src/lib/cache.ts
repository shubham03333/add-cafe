interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize: number;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  /** @param ttlSeconds Time to live in seconds */
  set<T>(key: string, data: T, ttlSeconds = 300): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.delete(key);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  deleteByPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      utilization: (this.cache.size / this.maxSize) * 100
    };
  }
}

export const cache = new MemoryCache(200);

export const CACHE_KEYS = {
  MENU_ITEMS: 'menu_items',
  MENU_ITEMS_BY_CATEGORY: (category: string) => `menu_items_category_${category}`,
  INVENTORY_DATA: 'inventory_data',
  DAILY_SALES_SUMMARY: 'daily_sales_summary',
  TODAY_SALES: 'today_sales',
  TOTAL_REVENUE: 'total_revenue',
  SYSTEM_SETTINGS: 'system_settings',
  TIMEZONE: 'timezone_setting',
};

export const CACHE_TTL = {
  MENU_ITEMS: 120,
  INVENTORY: 60,
  SALES_DATA: 8,
  TOTAL_REVENUE: 30,
  SYSTEM_SETTINGS: 300,
  TIMEZONE: 60,
};
