const redisClient = require('../utils/redisClient');
const Message = require('../models/Message');

const MESSAGE_KEY_PREFIX = 'chat:room';
const REDIS_MESSAGE_LIMIT = 90; // Redis에 저장할 메시지 개수
const REDIS_TTL_SECONDS = 3600; // Redis에 저장할 메시지 TTL (초)

const getMessageKey = (roomId) => `${MESSAGE_KEY_PREFIX}:${roomId}:messages`;

const saveMessageToRedis = async (roomId, messageObj) => {
  const key = getMessageKey(roomId);
  await redisClient.connect();

  const pipeline = redisClient.client.multi();
  pipeline.lPush(key, JSON.stringify(messageObj));
  pipeline.lTrim(key, 0, REDIS_MESSAGE_LIMIT - 1);
  pipeline.expire(key, REDIS_TTL_SECONDS);
  await pipeline.exec();
};

const getCachedMessages = async (roomId) => {
  const key = getMessageKey(roomId);

  await redisClient.connect(); // 연결 보장

  const cached = await redisClient.client.lRange(key, 0, -1);
  const messages = cached.map(msg => JSON.parse(msg));

  if (messages.length > 0) {
    await incrementCacheHit(); // ✅ 실제로 가져온 메시지가 있을 때만 hit 증가
  } else {
    await incrementCacheMiss(); // ✅ 없을 경우 miss 증가
  }

  return messages;
};

const incrementCacheHit = async () => {
  await redisClient.client.incr('chat:cache:hit');
};

const incrementCacheMiss = async () => {
  await redisClient.client.incr('chat:cache:miss');
};

const getCacheStats = async () => {
  await redisClient.connect(); // 연결 보장
  
  const [hit, miss] = await redisClient.client.mGet([
    'chat:cache:hit',
    'chat:cache:miss'
  ]);
  const hitCount = parseInt(hit || '0', 10);
  const missCount = parseInt(miss || '0', 10);
  const total = hitCount + missCount;
  const hitRate = total > 0 ? ((hitCount / total) * 100).toFixed(2) : '0.00';

  return {
    hit: hitCount,
    miss: missCount,
    hitRate: `${hitRate}%`
  };
};

const ensureRedisWarmup = async (roomId) => {
  const key = getMessageKey(roomId);

  await redisClient.connect(); // 연결 보장

  const exists = await redisClient.client.exists(key);
  if (!exists) {
    const messages = await Message.find({ room: roomId })
      .sort({ timestamp: -1 })
      .limit(REDIS_MESSAGE_LIMIT)
      .lean();

    for (const msg of messages.reverse()) {
      await redisClient.client.rPush(key, JSON.stringify(msg));
    }
    await redisClient.expire(key, REDIS_TTL_SECONDS);
  }
};

const isCacheFull = (cachedMessages) => {
  return cachedMessages.length === REDIS_MESSAGE_LIMIT;
};

module.exports = {
  saveMessageToRedis,
  getCachedMessages,
  ensureRedisWarmup,
  isCacheFull,
  getCacheStats
};