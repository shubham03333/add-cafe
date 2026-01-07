// Simple in-memory LRU cache for performance optimization
// For production, consider using Redis

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

  set<T>(key: string, data: T, ttlSeconds = 300): void { // Default 5 minutes TTL
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Get cache stats for monitoring
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      utilization: (this.cache.size / this.maxSize) * 100
    };
  }
}

// Global cache instance
export const cache = new MemoryCache(200); // Allow up to 200 cached items

// Cache keys constants
export const CACHE_KEYS = {
  MENU_ITEMS: 'menu_items',
  MENU_ITEMS_BY_CATEGORY: (category: string) => `menu_items_category_${category}`,
  INVENTORY_DATA: 'inventory_data',
  DAILY_SALES_SUMMARY: 'daily_sales_summary',
  SYSTEM_SETTINGS: 'system_settings'
};

// Cache TTL constants (in seconds)
export const CACHE_TTL = {
  MENU_ITEMS: 600, // 10 minutes
  INVENTORY: 300,  // 5 minutes
  SALES_DATA: 180, // 3 minutes
  SYSTEM_SETTINGS: 3600 // 1 hour
};
