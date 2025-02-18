require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
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
const server = http.createServer(app);  // 🚀 统一 HTTP + WebSocket 服务器
const io = new Server(server, { cors: { origin: '*' } });

// 🔌 连接数据库
connectDB();

// 中间件
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:3000', 'https://my-project-flax-alpha.vercel.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// 📌 让 Express 处理 API
app.use('/api/auth', authRoutes);
app.use('/api/gym', gymRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/study', studyRoutes);
app.use('/api/friend-request', friendRequestRouter);
app.use('/api/user', userRouter);
app.use('/api/chat', chatRoutes);

// 📌 让 WebSocket 处理实时通信
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

module.exports = { app, io };
