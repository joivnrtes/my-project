const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const User = require('../models/User');
const authenticate = require('../middlewares/authenticate');
const { redisClient } = require("../server");
const { onlineUsers } = require('../server');   // ✅ 从 server.js 引入 redisClient
const mongoose = require("mongoose"); // ✅ 解决 mongoose 未定义的问题



module.exports = function (io) {
  const sendMessageToUser = async (userId, message) => {
    const receiverSockets = onlineUsers.get(userId);
    if (receiverSockets && receiverSockets.size > 0) {
        console.log(`✅ WebSocket 发送消息给用户 ${userId}`);
        receiverSockets.forEach(socket => {
            socket.emit("newMessage", message);
        });
    } else {
        console.log(`📪 用户 ${userId} 不在线，存入 Redis`);
        if (redisClient) {
          await redisClient.lPush(`offline_messages:${userId}`, JSON.stringify({ ...message, isRead: false }));

        }
    }
};

  router.post("/read-messages/:friendId", authenticate, async (req, res) => {
    try {
      console.log("🛠 进入 /read-messages 处理函数");
  
      if (!req.user || !req.user.id) {
        console.error("❌ 认证失败: req.user 为空");
        return res.status(401).json({ success: false, message: "未授权访问" });
      }
  
      console.log("✅ 认证成功，用户 ID:", req.user.id);
  
      const userId = req.user.id;
      const { friendId } = req.params;
  
      console.log("🔍 标记消息已读, friendId:", friendId, "userId:", userId);
      
      // ✅ 确保 friendId 是 ObjectId
      if (!mongoose.isValidObjectId(friendId)) {
        return res.status(400).json({ success: false, message: "无效的 friendId" });
    }
    
  
      // ✅ 查询未读消息
      const messages = await Chat.find({ from: friendId, to: userId, isRead: false });


      console.log("🔍 查询到未读消息:", messages);
  
      if (messages.length === 0) {
        return res.json({ success: true, message: "没有未读消息需要更新" });
      }
  
      // ✅ 更新未读消息
      const result = await Chat.updateMany(
        { from: friendId.toString(), to: userId.toString(), isRead: false },
        { $set: { isRead: true } }
      );
      
  
      console.log("✅ 数据库更新结果:", result);
  
      return res.json({ success: true, message: "消息标记为已读" });
  
    } catch (error) {
      console.error("❌ 标记消息为已读失败:", error);
      return res.status(500).json({ success: false, message: "服务器错误", error: error.message });
    }
  });
  
      
  

  // ✅ 发送消息
  router.post("/send", authenticate, async (req, res) => {
    try {
        const from = req.user.id;
        const { to, message } = req.body;

        if (!to || !message) {
            return res.status(400).json({ error: "缺少必要参数" });
        }

        console.log(`📩 服务器收到发送消息请求: from=${from}, to=${to}, message="${message}"`);

        // ✅ 先检查目标用户是否存在
        const recipientExists = await User.findById(to);
        if (!recipientExists) {
            return res.status(404).json({ success: false, message: "目标用户不存在" });
        }

        // ✅ 存储消息
        const chatMessage = new Chat({ from, to, message, isRead: false });
        await chatMessage.save();
        console.log(`✅ 消息存储成功: ${message}`);

        // ✅ 发送 WebSocket 消息
        await sendMessageToUser(to, { senderId: from, message, isRead: false });

        return res.json({ success: true, chat: chatMessage });
    } catch (err) {
        console.error("🔥 消息存储失败:", err);
        return res.status(500).json({ success: false, message: "消息发送失败", error: err.message });
    }
});

  
 // ✅ 获取聊天记录
 router.get("/history", authenticate, async (req, res) => {
  try {
    const { friendId } = req.query;
    const userId = req.user.id;
    if (!friendId) {
      return res.status(400).json({ success: false, message: "好友 ID 不能为空" });
    }

    const chats = await Chat.find({
      $or: [
        { from: userId, to: friendId },
        { from: friendId, to: userId }
      ]
    })
    .populate({ path: "from", select: "username avatarUrl", strictPopulate: false })
    .populate({ path: "to", select: "username avatarUrl", strictPopulate: false })
    .sort({ timestamp: 1 });

    return res.json({ success: true, chats });
  } catch (err) {
    return res.status(500).json({ success: false, message: "获取聊天记录失败" });
  }
});

  return router;
};