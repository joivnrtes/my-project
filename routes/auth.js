// routes/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const User = require('../models/User');
const fs = require('fs');
const jwt = require('jsonwebtoken');

// 引入身份验证中间件（示例）
const authenticate = require('../middlewares/authenticate');


// 配置 multer 中间件
const multer = require('multer');
const path = require('path');

// multer 配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    // 允许的 MIME 类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持上传 JPG、PNG 或 GIF 格式的图片'));
    }
  }
});

// 测试路由
router.get('/test', (req, res) => {
  res.send('Auth route is working!');
});

// 发送邮箱验证码（注册时使用）
router.post('/send-verification-code', authController.sendVerificationCode);

// 注册用户（需要携带验证码）
router.post('/register', authController.register);

// 上传头像路由
router.post('/upload-avatar', authenticate, upload.single('avatar'), async (req, res) => {
  try {
      if (!req.user) {
          return res.status(401).json({ success: false, message: '用户未认证' });
      }

      if (!req.file) {
          console.log("❌ 头像文件未检测到！");
          return res.status(400).json({ success: false, message: '未检测到头像文件' });
      }

      console.log("✅ 上传成功的文件信息:", req.file); // 🔥 调试日志
      console.log("📂 存储路径:", path.join(__dirname, '../uploads', req.file.filename));

      const avatarPath = `/uploads/${req.file.filename}`;
      let fullUrl = `https://${req.hostname}${avatarPath}`; // 强制 HTTPS

      req.user.avatarUrl = fullUrl;
      await req.user.save();

      res.json({ success: true, avatarUrl: fullUrl });
  } catch (error) {
      console.error('上传头像错误:', error);
      res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});




// 用户登录
router.post('/login', authController.login);



// 读取本地 JSON 文件
const filePath = path.join(__dirname, '../data/chinaProvinceCities.json');
let provinceCityData = {};
// 在服务器启动时或首次请求时，读取 JSON 文件
// (也可改成同步读取，或放到其他地方做缓存)
try {
  const rawData = fs.readFileSync(filePath, 'utf-8');
  provinceCityData = JSON.parse(rawData);
} catch (err) {
  console.error('读取省市数据失败:', err);
}

// 定义一个 GET 接口，一次性返回所有省市数据
router.get('/all', (req, res) => {
  if (!provinceCityData || Object.keys(provinceCityData).length === 0) {
    return res.status(500).json({ message: '省市数据为空或读取失败' });
  }
  res.json(provinceCityData);
});



router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(401).json({ message: '缺少 refreshToken' });
  }
  try {
    // 如果需要在数据库/Redis 中校验 refreshToken 是否还有效，可以在此处查找
    // 这里仅做简单演示
    
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    // 解出 userId 等payload
    const userId = decoded.id;

    // 重新签发一个新的 access token
    const newAccessToken = jwt.sign({ id: userId }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '30m' });

    res.json({ accessToken: newAccessToken });
  } catch (err) {
    console.error('刷新令牌错误:', err);
    return res.status(403).json({ message: 'Refresh Token 无效或已过期' });
  }
});


// 忘记密码
router.post('/forgot-password', authController.forgotPassword);

// POST /api/auth/update-profile
router.post('/update-profile', authenticate, async (req, res) => {
  try {
    // 从认证中间件中获取当前用户 id
    const userId = req.user._id || req.user.id; // 假设中间件将当前用户信息放到了 req.user 里

    // 从请求体中接收更新字段
    const {
      username,
      gender,
      height,
      armspan,
      difficultylevel,
      climbingduration,
      climbingpreference,
      avatarUrl  // 如果上传头像后返回了 avatarUrl
    } = req.body;

    // 构建更新对象（只允许更新允许的字段）
    let updateData = {};

    if (username !== undefined) updateData.username = username;
    if (gender !== undefined) updateData.gender = gender;
    if (height !== undefined) updateData.height = height;
    if (armspan !== undefined) updateData.armspan = armspan;
    if (difficultylevel !== undefined) updateData.difficultylevel = difficultylevel;
    if (climbingduration !== undefined) updateData.climbingduration = climbingduration;
    if (climbingpreference !== undefined) updateData.climbingpreference = climbingpreference;
    if (avatarUrl !== undefined) {
      updateData.avatarUrl = avatarUrl.replace(/^http:\/\//, 'https://'); // 强制 HTTPS
  }
    // 更新数据库中对应用户的资料
    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });
    
    if (!updatedUser) {
      return res.status(404).json({ message: '用户不存在' });
    }
    console.log("更新后的用户数据：", updatedUser);
    // 成功更新后返回更新后的资料（或部分资料）
    return res.json({
      success: true,
      user: {
        username: updatedUser.username,
        gender: updatedUser.gender,
        height: updatedUser.height,
        armspan: updatedUser.armspan,
        difficultylevel: updatedUser.difficultylevel,
        climbingduration: updatedUser.climbingduration,
        climbingpreference: updatedUser.climbingpreference,
        avatarUrl: updatedUser.avatarUrl
      }
    });
  } catch (error) {
    console.error('更新资料错误：', error);
    res.status(500).json({ message: '更新资料失败' });
  }
});


// 全局错误处理
router.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: '服务器内部错误', error: err.message });
});

console.log("=== LOADED auth.js ===");


module.exports = router;
