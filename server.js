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
const chatRoutesFactory = require('./routes/chat');

const app = express();
const server = http.createServer(app);  
const io = new Server(server, {
    cors: {
        origin: [
            "http://localhost:3000",
            "https://websocket-server-o0o0.onrender.com"
        ],
        methods: ["GET", "POST"],
        credentials: true
    }
});

const fs = require('fs');
// 确保 uploads 目录存在
const uploadDirs = ['uploads', 'uploads/videos'];
uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📂 目录 ${dir} 创建成功`);
    }
});

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
    origin: ['http://localhost:3000', 'https://websocket-server-o0o0.onrender.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));

app.use((req, res, next) => {
    if (req.user && req.user.avatarUrl) {
        req.user.avatarUrl = req.user.avatarUrl.replace(/^http:\/\//, "https://");
    }
    next();
});


app.use((req, res, next) => {
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self' https://websocket-server-o0o0.onrender.com; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.socket.io; " +
        "connect-src 'self' http://localhost:3000 ws://localhost:3000 " +
          "https://websocket-server-o0o0.onrender.com wss://websocket-server-o0o0.onrender.com " +
          "https://cdn.socket.io; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' https://websocket-server-o0o0.onrender.com https://websocket-server-o0o0.onrender.com/uploads/ data: blob:; " +
        "media-src 'self' https://websocket-server-o0o0.onrender.com/uploads/ https://websocket-server-o0o0.onrender.com/uploads/videos/ blob: data:;"
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

// 现在利用依赖注入加载聊天路由
const chatRoutes = chatRoutesFactory(io);
app.use('/api/chat', chatRoutes);

// 静态资源
app.use(express.static(path.join(__dirname, 'public'))); // 提供静态资源的目录
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { 
    setHeaders: (res, path, stat) => {
        res.set('Cross-Origin-Resource-Policy', 'cross-origin'); // 允许跨域访问资源
    }
}));
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
        socket.emit("error", { message: "Token 为空" });
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

    if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket);

    console.log(`✅ WebSocket: 用户 ${userId} 连接成功`);
    
    socket.on("refresh_token", async (oldToken, callback) => {
        try {
            const newToken = await refreshToken(oldToken);
            callback({ success: true, newToken });
        } catch (err) {
            callback({ success: false, error: "Token 刷新失败" });
            socket.disconnect();
        }
    });

    socket.on("enter_chat", ({ to }) => {
        console.log(`📩 用户 ${socket.id} 进入聊天 ${to}`);
        socket.join(to);
        socket.emit("entered_chat", { success: true, chatWith: to });
      });
      
      socket.on("newMessage", async (data, callback) => {
        try {
            if (!data || !data.to || !data.message) {
                return callback({ success: false, error: "消息格式错误" });
            }
    
            console.log(`📩 ${userId} 发送消息给 ${data.to}: ${data.message}`);
    
            const chatMessage = new Chat({ from: userId, to: data.to, message: data.message });
            await chatMessage.save();
            console.log(`✅ 消息存储成功: ${data.message}`);
    
            // ✅ 发送消息给在线用户
            const receiverSockets = onlineUsers.get(data.to);
            if (receiverSockets && receiverSockets.size > 0) {
    console.log(`✅ WebSocket 发送 newMessage 事件给用户: ${data.to}`);
    receiverSockets.forEach(socket => {
        socket.emit("newMessage", { senderId: userId, message: data.message, isRead: false });
    });
} else {
    console.log(`📪 用户 ${data.to} 不在线，消息存入 Redis`);
    if (redisClient) {
        await redisClient.lPush(`offline_messages:${data.to}`, JSON.stringify({ senderId: userId, message: data.message, isRead: false }));
    }
}
            return callback({ success: true });
        } catch (err) {
            console.error("🔥 消息存储失败:", err);
            return callback({ success: false, error: err.message });
        }
    });
    socket.on("disconnect", () => {
        const sockets = onlineUsers.get(userId);
        if (sockets) {
            sockets.delete(socket);
            if (sockets.size === 0) {
                onlineUsers.delete(userId);
            }
        }
        console.log(`🔴 用户 ${userId || "未知"} 断开连接`);
    });
})
// ✅ 监听 Render 分配的 `PORT`
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 服务器运行在端口 ${PORT}`);
});

console.log("=== LOADED server.js ===");

module.exports = { io, redisClient, onlineUsers };


