// config/redisClient.js
const { createClient } = require('redis');

const redisClient = createClient({
  // 可以配置连接参数，如 host, port, password 等。
  // 默认连接本地 Redis
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error', err);
});

// 建立连接（确保在应用启动时调用）
(async () => {
  await redisClient.connect();
  console.log('Redis connected!');
})();

module.exports = redisClient;
