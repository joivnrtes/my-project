const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const authenticate = require('../middlewares/authenticate');
const { redisClient } = require("../server"); // ✅ 从 server.js 引入 redisClient


module.exports = function (io) {
  const sendMessageToUser = async (userId, message) => {
    if (io.sockets.adapter.rooms.has(userId)) {
      io.to(userId).emit("message", message);
    } else {
      console.log(`📪 用户 ${userId} 不在线，存入 Redis`);
      if (redisClient) {
        await redisClient.lPush(`offline_messages:${userId}`, JSON.stringify(message));
      }
    }
  };

  // ✅ 发送消息
  router.post("/send", authenticate, async (req, res) => {
    try {
      const from = req.user.id;
      const { to, message } = req.body;

      if (!to || !message) {
        return res.status(400).json({ error: "缺少必要参数" });
      }

      const chatMessage = new Chat({ from, to, message });
      await chatMessage.save();

      sendMessageToUser(to, { from, message, timestamp: new Date().toISOString() });

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

  // ✅ 删除聊天记录
  router.delete("/history", authenticate, async (req, res) => {
    try {
      const { friendId } = req.query;
      const userId = req.user.id;

      if (!friendId) {
        return res.status(400).json({ success: false, message: "好友 ID 不能为空" });
      }

      const deleted = await Chat.deleteMany({ $or: [{ from: userId, to: friendId }, { from: friendId, to: userId }] });

      return res.json({ success: true, message: "聊天记录已删除" });
    } catch (err) {
      return res.status(500).json({ success: false, message: "删除聊天记录失败" });
    }
  });

  return router;
};