require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const Chat = require('./models/Chat');
const { verifyTokenAndGetUserId } = require('./utils/jwt');

const app = express();
const server = http.createServer(app);  // 统一 HTTP + WebSocket 服务器

// 允许 CORS
app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json());  // 允许解析 JSON 请求体

// 初始化 Socket.io
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
});

// ✅ 连接 MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ WebSocket 服务器连接 MongoDB 成功'))
    .catch(err => {
        console.error('❌ MongoDB 连接失败:', err);
        process.exit(1);
    });

const onlineUsers = new Map();

// ✅ WebSocket 处理
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

    // 监听消息
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

    // 断开连接
    socket.on('disconnect', () => {
        console.log(`🔴 用户 ${userId} 断开连接`);
        onlineUsers.delete(userId);
    });
});

// ✅ HTTP API 处理

// 🌟 `GET /` 让 Render 不返回 404
app.get('/', (req, res) => {
    res.send("✅ WebSocket 服务器运行中！你可以使用 WebSocket 连接");
});

// 🌟 `POST /api/messages` - 允许客户端通过 HTTP 发送消息
app.post('/api/messages', async (req, res) => {
    try {
        const { from, to, message } = req.body;
        if (!from || !to || !message) {
            return res.status(400).json({ error: "缺少必要字段" });
        }

        const chatMessage = new Chat({ from, to, message });
        await chatMessage.save();

        // 如果接收方在线，推送消息
        if (onlineUsers.has(to)) {
            onlineUsers.get(to).emit('message', { from, message });
        }

        res.status(201).json({ message: "消息发送成功", data: chatMessage });
    } catch (error) {
        console.error('❌ 发送消息失败:', error);
        res.status(500).json({ error: "服务器错误" });
    }
});

// ✅ 监听 Render 需要的 `process.env.PORT`
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`🚀 HTTP + WebSocket 服务器运行在端口 ${PORT}`);
});
