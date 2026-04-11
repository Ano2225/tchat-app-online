const Redis = require('ioredis');

let client = null;

/**
 * Returns a singleton Redis client.
 * If REDIS_URL is not configured, returns null so callers can fall back
 * to the in-memory Map (graceful degradation).
 */
const getRedisClient = () => {
  if (client) return client;

  const url = process.env.REDIS_URL;
  if (!url) {
    console.warn('⚠️  REDIS_URL not set — session cache will use in-memory Map (single-instance only)');
    return null;
  }

  client = new Redis(url, {
    enableReadyCheck: false,
    // null = never throw MaxRetriesPerRequestError (commands wait in offline queue)
    maxRetriesPerRequest: null,
    retryStrategy: (times) => {
      if (times > 5) {
        // Give up after 5 attempts — Redis is likely not available in this env
        return null;
      }
      return Math.min(times * 500, 3000);
    },
    lazyConnect: false,
  });

  client.on('connect', () => console.log('✅ Redis connected'));
  client.on('error', (err) => console.error('Redis error:', err.message ?? err));
  client.on('close', () => console.warn('⚠️  Redis connection closed'));
  client.on('end', () => {
    // retryStrategy returned null — Redis is unavailable, drop to in-memory
    console.warn('⚠️  Redis unavailable — falling back to in-memory (single-instance)');
    client = null;
  });

  return client;
};

module.exports = { getRedisClient };
