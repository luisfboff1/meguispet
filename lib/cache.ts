/**
 * Cache Utility for API Routes
 * Provides simple in-memory caching with TTL support
 */

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

class ApiCache {
  private cache: Map<string, CacheEntry> = new Map();
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cached data if available and not expired
   * @param key - Cache key
   * @param ttl - Time to live in milliseconds (optional, uses default if not provided)
   * @returns Cached data or null if not found/expired
   */
  get(key: string, ttl?: number): unknown | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    const expiryTime = ttl || this.defaultTTL;

    if (now - entry.timestamp > expiryTime) {
      // Expired, remove from cache
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cache entry
   * @param key - Cache key
   * @param data - Data to cache
   */
  set(key: string, data: unknown): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Invalidate cache entry
   * @param key - Cache key
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate cache entries matching a pattern
   * @param pattern - RegExp pattern to match keys
   */
  invalidatePattern(pattern: RegExp): void {
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (pattern.test(key)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const count = this.cache.size;
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Export singleton instance
export const apiCache = new ApiCache();

/**
 * Utility function to wrap API handlers with caching
 * @param key - Cache key
 * @param handler - Async function that returns data
 * @param ttl - Time to live in milliseconds (optional)
 */
export async function withCache<T>(
  key: string,
  handler: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // Try to get from cache
  const cached = apiCache.get(key, ttl);
  if (cached !== null) {
    return cached as T;
  }

  // Not in cache, execute handler
  const data = await handler();
  
  // Store in cache
  apiCache.set(key, data);
  
  return data;
}
