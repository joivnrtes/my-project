require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const Chat = require('./models/Chat');
const { verifyTokenAndGetUserId } = require('./utils/jwt');

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));

const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
});

// 连接 MongoDB（确保 WebSocket 服务器也能访问数据库）
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ WebSocket 服务器连接 MongoDB 成功'))
    .catch(err => {
        console.error('❌ MongoDB 连接失败:', err);
        process.exit(1);  // 连接失败时终止进程，防止应用在没有数据库的情况下运行
    });

const onlineUsers = new Map();

// 处理 WebSocket 连接
io.on('connection', async (socket) => {
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
            console.log(`📩 [WebSocket] 用户 ${userId} 发送消息: ${message} 给用户 ${to}`);
        } catch (err) {
            console.error('❌ WebSocket 消息处理错误:', err);
        }
    });

    socket.on('disconnect', () => {
        console.log(`🔴 用户 ${userId} 断开连接`);
        onlineUsers.delete(userId);
    });
});

// 启动 WebSocket 服务器
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`🚀 WebSocket 服务器运行在端口 ${PORT}`);
});

