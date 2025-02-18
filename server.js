require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const connectDB = require('./db');
const Chat = require('./models/Chat');
const { verifyTokenAndGetUserId } = require('./utils/jwt');

const uploadRoutes = require('./routes/upload');
const authRoutes = require('./routes/auth');
const gymRoutes = require('./routes/gym');
const communityRoutes = require('./routes/community');
const studyRoutes = require('./routes/study');
const friendRequestRouter = require('./routes/friend.js');
const userRouter = require('./routes/user');
const chatRoutes = require('./routes/chat');

const app = express();
const server = http.createServer(app);  
const io = new Server(server, { cors: { origin: '*' } });

// 🔌 连接数据库
connectDB();


// 🔥 解决 Redis 连接失败的问题
const redis = require('redis');
const REDIS_URL = process.env.REDIS_URL || null;  // ✅ 避免 undefined

let redisClient;
if (REDIS_URL) {
    redisClient = redis.createClient({ url: REDIS_URL });

    redisClient.on('error', (err) => {
        console.error('❌ Redis Client Error:', err);
    });

    redisClient.connect()
        .then(() => console.log('✅ Redis 连接成功！'))
        .catch(err => console.error('❌ Redis 连接失败:', err));
} else {
    console.log("⚠️ 未设置 REDIS_URL，跳过 Redis 连接");
}

// ✅ 让 Express 处理 API 请求
app.use(express.json());
app.use(cors({
    origin: ['http://localhost:3000', 'https://my-project-flax-alpha.vercel.app'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));

app.use((req, res, next) => {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.socket.io; " +
      "connect-src 'self' http://localhost:3000 ws://localhost:3000 " +
        "https://websocket-server-o0o0.onrender.com wss://websocket-server-o0o0.onrender.com " +
        "https://cdn.socket.io; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' http://localhost:3000 http://127.0.0.1:8080 data:;"
    );
    next();
  });
  
  

// 📌 挂载路由
app.use('/api/auth', authRoutes);
app.use('/api/gym', gymRoutes);
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

// 📌 处理 WebSocket 连接
const onlineUsers = new Map();

io.on('connection', (socket) => {
    const token = socket.handshake.query.token;
    if (!token) {
        console.error('❌ WebSocket 连接失败：Token 为空');
        socket.disconnect();
        return;
    }

    let userId;
    try {
        userId = verifyTokenAndGetUserId(token);
        if (!userId) {
            console.error('❌ WebSocket 连接失败：Token 无效');
            socket.disconnect();
            return;
        }
    } catch (err) {
        console.error('❌ WebSocket 解析 Token 失败:', err.message);
        socket.disconnect();
        return;
    }

    onlineUsers.set(userId, socket);
    console.log(`✅ WebSocket: 用户 ${userId} 连接成功`);

    socket.on('message', async (data) => {
        try {
            const { to, message } = data;
            if (!to || !message) return;

            const chatMessage = new Chat({ from: userId, to, message });
            await chatMessage.save();

            if (onlineUsers.has(to)) {
                onlineUsers.get(to).emit('message', { from: userId, message });
            }
            console.log(`📩 用户 ${userId} 发送消息: ${message} 给用户 ${to}`);
        } catch (err) {
            console.error('❌ WebSocket 消息处理错误:', err);
        }
    });

    socket.on('disconnect', () => {
        console.log(`🔴 用户 ${userId} 断开连接`);
        onlineUsers.delete(userId);
    });
});

// ✅ 监听 Render 分配的 `PORT`
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 服务器运行在端口 ${PORT}`);
});

console.log("=== LOADED server.js ===");

module.exports.io = io;

