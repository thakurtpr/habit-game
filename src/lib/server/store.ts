import { Redis } from "@upstash/redis";
import { IS_PROD } from "./env";

export interface Store {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  /** Increment a counter that expires after `windowSeconds`; returns the new count. */
  hit(key: string, windowSeconds: number): Promise<number>;
  /** Current value of a counter without changing it. */
  count(key: string): Promise<number>;
}

interface MemoryEntry {
  readonly value: unknown;
  readonly expiresAt: number | null;
}

function createMemoryStore(): Store {
  const g = globalThis as unknown as { __hgMemory?: Map<string, MemoryEntry> };
  const data = (g.__hgMemory ??= new Map<string, MemoryEntry>());

  const read = (key: string): unknown => {
    const entry = data.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && entry.expiresAt < Date.now()) {
      data.delete(key);
      return null;
    }
    return entry.value;
  };

  return {
    async get<T>(key: string) {
      return read(key) as T | null;
    },
    async set(key, value, ttlSeconds) {
      const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
      data.set(key, { value, expiresAt });
    },
    async count(key) {
      return (read(key) as number | null) ?? 0;
    },
    async hit(key, windowSeconds) {
      const count = ((read(key) as number | null) ?? 0) + 1;
      const existing = data.get(key);
      data.set(key, {
        value: count,
        expiresAt: existing?.expiresAt ?? Date.now() + windowSeconds * 1000,
      });
      return count;
    },
  };
}

function createRedisStore(redis: Redis): Store {
  return {
    async get<T>(key: string) {
      return (await redis.get<T>(key)) ?? null;
    },
    async set(key, value, ttlSeconds) {
      if (ttlSeconds) await redis.set(key, value, { ex: ttlSeconds });
      else await redis.set(key, value);
    },
    async count(key) {
      return (await redis.get<number>(key)) ?? 0;
    },
    async hit(key, windowSeconds) {
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, windowSeconds);
      return count;
    },
  };
}

let cached: Store | null = null;

export function getStore(): Store {
  if (cached) return cached;
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (url && token) {
    cached = createRedisStore(new Redis({ url, token }));
  } else if (IS_PROD) {
    throw new Error("Redis is not configured (set UPSTASH_REDIS_REST_URL and _TOKEN)");
  } else {
    cached = createMemoryStore();
  }
  return cached;
}
