// controllers/authController.js
const User = require('../models/User'); // 根据实际路径调整
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');


// 引入 Redis 客户端
const redisClient = require('../config/redisClient');

// 配置 multer 存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null,path.join(__dirname, '../uploads')); // 设置文件存储目录
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`); // 设置文件名
  },
});
// 过滤文件类型（仅允许图片）
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('仅支持上传图片文件'), false);
  }
};
// 初始化 multer
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 限制文件大小为 5MB
  fileFilter,
});

// 暴露 multer 中间件，用于注册路由
exports.uploadAvatar = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '未上传头像文件' });
    }

    const avatarUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.status(201).json({ avatarUrl });
  } catch (error) {
    console.error('头像上传失败：', error);
    res.status(500).json({ message: '头像上传失败', error: error.message });
  }
};


/**
 * 发送邮箱验证码
 * 前端调用该接口以获得验证码
 */
exports.sendVerificationCode = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: '邮箱不能为空' });
  }
  
  try {
    // 生成6位数字验证码
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 将验证码存储到 Redis 中，设置有效期为 600 秒（10 分钟）
    // 键名可以使用 "verificationCode:邮箱" 格式，方便后续查询
    await redisClient.set(`verificationCode:${email}`, verificationCode, { EX: 600 });
    
    // 构造邮件内容
    const subject = '邮箱验证验证码';
    const message = `您的邮箱验证码是：${verificationCode}\n该验证码10分钟内有效。`;
    
    // 使用工具函数发送邮件
    await sendEmail({
      email,
      subject,
      message
    });
    
    res.status(200).json({ message: '验证码已发送至邮箱，请查收' });
  } catch (error) {
    console.error('发送验证码失败：', error);
    res.status(500).json({ message: '发送验证码失败', error: error.message });
  }
};

/**
 * 用户注册（包含验证码验证）
 * 前端在注册时需要提交 { username, email, password, verificationCode }
 */
exports.register = async (req, res) => {
  const { username, email, password, verificationCode, 
    gender = 'unspecified',
    height = null,
    armspan = null,
    difficultylevel = 'unspecified',
    climbingduration = 'unspecified',
    climbingpreference = 'unspecified',
} = req.body; 
const avatar = `${req.protocol}://${req.get('host')}/public/default-avatar.png`;

  
  // 检查必填字段
  if (!username || !email || !password || !verificationCode) {
    return res.status(400).json({ message: '所有字段均必填，包括验证码' });
  }
  
  try {
    // 从 Redis 中获取保存的验证码
    const storedCode = await redisClient.get(`verificationCode:${email}`);
    
    if (!storedCode) {
      return res.status(400).json({ message: '验证码未发送或已失效，请重新获取' });
    }
    
    if (storedCode !== verificationCode) {
      return res.status(400).json({ message: '验证码不正确' });
    }
    
    // 验证通过后删除 Redis 中的验证码，防止重复使用
    await redisClient.del(`verificationCode:${email}`);
    
    // 检查邮箱是否已注册
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: '用户已存在' });
    }
    
    // 这里假设 User 模型中已配置 pre-save 钩子对密码进行加密
    const user = await User.create({ username,
      email,
      password,
      avatar,
      gender,
      height,
      armspan,
      difficultylevel,
      climbingduration,
      climbingpreference, });
    
    res.status(201).json({
      message: '注册成功',
      user: {
        id: user._id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                gender: user.gender,
                height: user.height,
                armspan: user.armspan,
                difficultylevel: user.difficultylevel,
                climbingduration: user.climbingduration,
                climbingpreference: user.climbingpreference,
      },
    });
  } catch (error) {
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ message: '文件上传失败', error: error.message });
    }
    console.error('注册错误：', error);
    res.status(500).json({ message: '注册失败', error: error.message });
  }
}

/**
 * 用户登录
 */
exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res.status(400).json({ message: '邮箱和密码不能为空' });
    }
    
    const user = await User.findOne({ email });
    console.log("登录时查询到的用户数据：", user);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: '密码错误' });
    }
    
    const accessToken = jwt.sign(
      { id: user._id },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: '30m' }
    );
    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: '7d' } // 示例：7 天
    );


    res.status(200).json({
      message: '登录成功',
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        gender: user.gender,
        height: user.height,
        armspan: user.armspan,
        difficultylevel: user.difficultylevel,
        climbingduration: user.climbingduration,
        climbingpreference: user.climbingpreference,
        createdAt: user.createdAt,          // 添加注册时间
        daysComputed: user.daysComputed,
        beta: user.beta       // 添加实时计算的注册天数
      },
    });
  } catch (error) {
    console.error('登录错误：', error);
    res.status(500).json({ message: '登录失败', error: error.message });
  }
};

/**
 * 忘记密码
 */
exports.forgotPassword = async (req, res) => {
  const { email, verificationCode, newPassword } = req.body;
  if (!email || !verificationCode || !newPassword) {
    return res.status(400).json({ message: '邮箱、验证码和新密码均必填' });
  }
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,16}$/;
  if (!passwordRegex.test(newPassword)) {
    return res.status(400).json({
      message: '新密码必须是 8 到 16 位的字母、数字和特殊符号组合',
    });
  }
  try {
    // 从 Redis 中获取保存的验证码
    const storedCode = await redisClient.get(`verificationCode:${email}`);

    // 验证验证码是否正确
    if (!storedCode) {
      return res.status(400).json({ message: '验证码未发送或已失效，请重新获取' });
    }

    if (storedCode !== verificationCode) {
      return res.status(400).json({ message: '验证码不正确' });
    }

    // 删除 Redis 中的验证码，防止重复使用
    await redisClient.del(`verificationCode:${email}`);
// 查找用户是否存在
const user = await User.findOne({ email });
if (!user) {
  return res.status(404).json({ message: '用户不存在' });
}

// 更新用户密码（假设 User 模型配置了 pre-save 钩子处理密码加密）
user.password = newPassword;
await user.save();

res.status(200).json({ message: '密码重置成功，请使用新密码登录' });
} catch (error) {
console.error('忘记密码错误：', error);
res.status(500).json({ message: '忘记密码请求失败', error: error.message });
}
};



