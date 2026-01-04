/**
 * Local Development Mock for Vercel KV
 * WARNING: This is for development only! Data is stored in memory and will be lost on restart.
 */

// Simple in-memory storage
const store = new Map<string, any>();
const expirations = new Map<string, number>();

// Check and clean expired keys
function cleanExpired() {
  const now = Date.now();
  for (const [key, expireTime] of expirations.entries()) {
    if (expireTime <= now) {
      store.delete(key);
      expirations.delete(key);
    }
  }
}

export const kv = {
  async get<T = any>(key: string): Promise<T | null> {
    cleanExpired();
    const value = store.get(key);
    return value !== undefined ? (value as T) : null;
  },

  async set(
    key: string,
    value: any,
    options?: { ex?: number; px?: number; exat?: number; pxat?: number }
  ): Promise<'OK'> {
    store.set(key, value);
    
    if (options?.ex) {
      // Expire in seconds
      expirations.set(key, Date.now() + options.ex * 1000);
    } else if (options?.px) {
      // Expire in milliseconds
      expirations.set(key, Date.now() + options.px);
    } else if (options?.exat) {
      // Expire at Unix timestamp (seconds)
      expirations.set(key, options.exat * 1000);
    } else if (options?.pxat) {
      // Expire at Unix timestamp (milliseconds)
      expirations.set(key, options.pxat);
    }
    
    return 'OK';
  },

  async del(...keys: string[]): Promise<number> {
    let deleted = 0;
    for (const key of keys) {
      if (store.delete(key)) {
        deleted++;
        expirations.delete(key);
      }
    }
    return deleted;
  },

  async exists(...keys: string[]): Promise<number> {
    cleanExpired();
    let count = 0;
    for (const key of keys) {
      if (store.has(key)) count++;
    }
    return count;
  },

  async keys(pattern: string): Promise<string[]> {
    cleanExpired();
    // Simple pattern matching (only supports * wildcard)
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return Array.from(store.keys()).filter(key => regex.test(key));
  },

  async incr(key: string): Promise<number> {
    const current = (store.get(key) as number) || 0;
    const newValue = current + 1;
    store.set(key, newValue);
    return newValue;
  },

  async decr(key: string): Promise<number> {
    const current = (store.get(key) as number) || 0;
    const newValue = current - 1;
    store.set(key, newValue);
    return newValue;
  },

  async expire(key: string, seconds: number): Promise<number> {
    if (!store.has(key)) return 0;
    expirations.set(key, Date.now() + seconds * 1000);
    return 1;
  },

  async ttl(key: string): Promise<number> {
    cleanExpired();
    if (!store.has(key)) return -2; // Key doesn't exist
    const expireTime = expirations.get(key);
    if (!expireTime) return -1; // No expiration set
    const ttl = Math.ceil((expireTime - Date.now()) / 1000);
    return ttl > 0 ? ttl : -2;
  },
};

console.log('⚠️  Using in-memory KV mock for local development');
console.log('   Data will be lost when server restarts!');
