require('dotenv').config(); // 加载环境变量
console.log("🔑 当前服务器的 ACCESS_TOKEN_SECRET:", process.env.ACCESS_TOKEN_SECRET);
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const connectDB = require('./db'); // 引入数据库连接模块

const uploadRoutes = require('./routes/upload');
const authRoutes = require('./routes/auth'); // 导入用户认证路由
const gymRoutes = require('./routes/gym');
const communityRoutes = require('./routes/community'); // 确保路径正确
const studyRoutes = require('./routes/study');
const friendRequestRouter = require('./routes/friend.js');
const userRouter = require('./routes/user');
const chatRoutes = require('./routes/chat'); // ✅ 新增聊天 API
const app = express(); // 初始化 Express 应用


// 🔌 连接数据库
connectDB();


// 1. 检查和创建 uploads 目录
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true }); // recursive: true 确保创建多级目录
  console.log(`目录 ${uploadDir} 已创建`);
} else {
  console.log(`目录 ${uploadDir} 已存在`);
}


// 中间件
app.use(express.json()); // 解析 JSON 请求体
app.use(cors({
  origin: [ 'http://localhost:3000', 'https://my-project-flax-alpha.vercel.app',], 
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // 允许的 HTTP 方法
  allowedHeaders: ['Content-Type', 'Authorization'], // 允许的请求头
  credentials: true, // 是否允许发送跨域请求时携带 Cookies
}));

app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "connect-src 'self' http://localhost:3000 ws://localhost:3000 https://my-project-flax-alpha.vercel.app wss://my-project-flax-alpha.vercel.app; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data:;" // 如果你还有其他图片来源，继续加
  );
  next();
});




app.use('/api/locations', authRoutes);
app.use('/api/gym', gymRoutes);
app.use('/api/auth', authRoutes); // 挂载用户认证模块路由
app.use('/api/community', communityRoutes); 
app.use('/api/upload', uploadRoutes);
app.use('/api/study', studyRoutes);
app.use('/api/friend-request', friendRequestRouter);
app.use('/api/user', userRouter);
app.use('/api/chat', chatRoutes);

// 静态资源
app.use(express.static(path.join(__dirname, 'public'))); // 提供静态资源的目录
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads/videos', express.static(path.join(__dirname, 'uploads/videos')));

// 处理前端页面的路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// 📌 处理 `/index.html` 或 `/home`，登录后访问
app.get(['/index.html', '/home'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 📌 处理所有其他静态资源（如 CSS、JS）
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', req.path), (err) => {
      if (err) {
          res.status(404).sendFile(path.join(__dirname, 'public', '404.html')); // 可选，处理 404 页面
      }
  });
});


// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API 服务器运行在 http://localhost:${PORT}`);
});
