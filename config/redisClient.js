const { createClient } = require('redis');

const redisClient = createClient({
  url: process.env.REDIS_URL, // 读取环境变量
  socket: {
    tls: true, // Upstash 需要 TLS 加密
  },
});

redisClient.on('error', (err) => {
  console.error('❌ Redis Client Error:', err);
});

(async () => {
  try {
    await redisClient.connect();
    console.log('✅ Connected to Upstash Redis!');
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
  }
})();

module.exports = redisClient;
