const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.ACCESS_TOKEN_SECRET || 'default_secret';

/**
 */
function generateToken(payload) {
  return jwt.sign(payload, SECRET_KEY, { expiresIn: '7d' }); // 7天有效期
}

/**
 * 验证 JWT 令牌
 * @param {String} token
 * @returns {Object|null} 解码后的用户数据，或者 null (无效 token)
 */
function verifyTokenAndGetUserId(token) {
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    return decoded.id; 
  } catch (error) {
    console.error('JWT 验证失败:', error);
    return null;
  }
}

module.exports = {
  generateToken,
  verifyTokenAndGetUserId
};
