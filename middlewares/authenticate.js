const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        console.error('🚨 缺少 Token');
        return res.status(401).json({ success: false, message: '未授权，缺少 Token' });
    }

    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        console.log('✅ Token 解析成功:', decoded); // 🔍 这里检查 user ID
        if (!decoded._id && decoded.id) {
            decoded._id = decoded.id;
        }
        req.user = decoded;
        next();
    } catch (err) {
        console.error('❌ 令牌验证错误:', err.message);
        return res.status(401).json({ success: false, message: 'Token 无效或已过期' });
    }
};
console.log("当前服务器的 ACCESS_TOKEN_SECRET:", process.env.ACCESS_TOKEN_SECRET);

