const IORedis = require('ioredis');

const RELAY_CONFIG_KEY = 'notifications:relay:config';

const DEFAULT_CONFIG = Object.freeze({
  enabled: String(process.env.NOTIFICATION_RELAY_ENABLED || '').toLowerCase() === 'true',
  personNo: Number.isNaN(parseInt(process.env.NOTIFICATION_RELAY_PERSON_NO || '550', 10))
    ? 550
    : parseInt(process.env.NOTIFICATION_RELAY_PERSON_NO || '550', 10),
  lineId: (process.env.NOTIFICATION_RELAY_LINE_ID || '').trim() || null,
  updatedAt: null,
  updatedBy: null,
});

let redisClient = null;
let memoryFallback = { ...DEFAULT_CONFIG };

function getRedisClient() {
  if (redisClient) return redisClient;
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  redisClient = new IORedis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
  });
  return redisClient;
}

async function readConfig() {
  try {
    const redis = getRedisClient();
    if (redis.status !== 'ready') await redis.connect();
    const raw = await redis.get(RELAY_CONFIG_KEY);
    if (!raw) return { ...memoryFallback };
    const parsed = JSON.parse(raw);
    return {
      enabled: !!parsed.enabled,
      personNo: parseInt(parsed.personNo, 10) || 550,
      lineId: parsed.lineId ? String(parsed.lineId).trim() : null,
      updatedAt: parsed.updatedAt || null,
      updatedBy: parsed.updatedBy || null,
    };
  } catch (error) {
    return { ...memoryFallback };
  }
}

async function writeConfig(nextConfig, updatedBy = null) {
  const normalized = {
    enabled: !!nextConfig.enabled,
    personNo: parseInt(nextConfig.personNo, 10) || 550,
    lineId: nextConfig.lineId ? String(nextConfig.lineId).trim() : null,
    updatedAt: new Date().toISOString(),
    updatedBy: updatedBy || null,
  };

  memoryFallback = { ...normalized };

  try {
    const redis = getRedisClient();
    if (redis.status !== 'ready') await redis.connect();
    await redis.set(RELAY_CONFIG_KEY, JSON.stringify(normalized));
  } catch (error) {
    // Memory fallback is already updated.
  }

  return normalized;
}

module.exports = {
  getConfig: () => readConfig(),
  setConfig: (config, updatedBy) => writeConfig(config, updatedBy),
  DEFAULT_CONFIG,
};
