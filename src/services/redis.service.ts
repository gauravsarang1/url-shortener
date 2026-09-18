import { createClient, RedisClientType } from 'redis';

const redisUrl = process.env.REDIS_URL;
const cacheTtlSeconds = Number.parseInt(process.env.REDIS_CACHE_TTL_SECONDS || '3600', 10);
const redisRetryIntervalMs = Number.parseInt(process.env.REDIS_RETRY_INTERVAL_MS || '10000', 10);

let redisClient: RedisClientType | null = null;
let connectionAttempt: Promise<void> | null = null;
let redisDisabled = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let nextRetryAt = 0;

function scheduleRedisRetry(): void {
  if (retryTimer) {
    return;
  }

  console.warn(`[CACHE] Redis retry scheduled in ${redisRetryIntervalMs} ms`);

  nextRetryAt = Date.now() + redisRetryIntervalMs;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    nextRetryAt = 0;
    void ensureRedisConnection();
  }, redisRetryIntervalMs);
}

function markRedisUnavailable(message: string): void {
  if (!redisDisabled) {
    redisDisabled = true;
    console.warn(`[CACHE] Redis unavailable; caching is disabled temporarily: ${message}`);
  }

  scheduleRedisRetry();
}

function getRedisClient(): RedisClientType | null {
  if (!redisUrl) {
    return null;
  }

  if (!redisClient) {
    redisClient = createClient({
      url: redisUrl,
      socket: { reconnectStrategy: false },
    });
    redisClient.on('error', (error) => {
      markRedisUnavailable(error.message);
    });
  }

  return redisClient;
}

async function ensureRedisConnection(): Promise<RedisClientType | null> {
  console.log(`[CACHE] Ensuring Redis connection...`);
  const client = getRedisClient();
  if (!client) {
    return null;
  }

  if (redisDisabled && Date.now() < nextRetryAt) {
    return null;
  }

  if (!client.isReady) {
    connectionAttempt ??= client.connect().then(() => undefined).finally(() => {
      connectionAttempt = null;
    });

    try {
      await connectionAttempt;
    } catch (error) {
      markRedisUnavailable((error as Error).message);
      return null;
    }

    redisDisabled = false;
    nextRetryAt = 0;
  }

  return client;
}

export async function connectRedis(): Promise<void> {
  await ensureRedisConnection();
  if (redisUrl && redisClient?.isOpen) {
    console.log(`[CACHE] Redis connected; TTL is ${cacheTtlSeconds} seconds`);
  } else if (!redisUrl) {
    console.warn('[CACHE] REDIS_URL is not configured; caching is disabled');
  }
}

export async function getCachedUrl(shortCode: string): Promise<string | null> {
  const client = await ensureRedisConnection();
  if (!client) {
    return null;
  }

  try {
    const cachedValue = await client.get(`url:${shortCode}`);
    return typeof cachedValue === 'string' ? cachedValue : null;
  } catch (error) {
    console.warn('[CACHE] Redis read failed:', (error as Error).message);
    return null;
  }
}

export async function cacheUrl(shortCode: string, originalUrl: string): Promise<void> {
  const client = await ensureRedisConnection();
  if (!client) {
    return;
  }

  try {
    await client.set(`url:${shortCode}`, originalUrl, { EX: cacheTtlSeconds });
  } catch (error) {
    console.warn('[CACHE] Redis write failed:', (error as Error).message);
  }
}

export async function invalidateUrlCache(shortCode: string): Promise<void> {
  const client = await ensureRedisConnection();
  if (!client) {
    return;
  }

  try {
    await client.del(`url:${shortCode}`);
  } catch (error) {
    console.warn('[CACHE] Redis invalidation failed:', (error as Error).message);
  }
}