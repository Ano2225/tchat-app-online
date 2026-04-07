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
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 100, 3000),
    lazyConnect: false,
  });

  client.on('connect', () => console.log('✅ Redis connected'));
  client.on('error', (err) => console.error('Redis error:', err.message));
  client.on('close', () => console.warn('⚠️  Redis connection closed'));

  return client;
};

module.exports = { getRedisClient };
