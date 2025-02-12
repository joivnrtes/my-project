const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat'); // 引入 Chat 模型
const authenticate = require('../middlewares/authenticate'); // 认证中间件
const { sendMessageToUser } = require('../socket');

// ✅ 发送消息并存入数据库
router.post('/send', authenticate, async (req, res) => {
  try {
    const { to, message } = req.body;
    const from = req.user.id;

    if (!to || !message) {
      return res.status(400).json({ success: false, message: '接收者和消息不能为空' });
    }

    // ✅ 存入数据库（不再手动调用 `sendMessageToUser`，让 WebSocket 服务器处理推送）
    const chatMessage = new Chat({ from, to, message });
    await chatMessage.save();

    res.json({ success: true, chat: chatMessage }); // ✅ 仅返回成功响应
  } catch (err) {
    res.status(500).json({ success: false, message: '消息发送失败' });
  }
});


// ✅ 获取聊天记录（按时间排序）
router.get('/history', authenticate, async (req, res) => {
  try {
    const { friendId } = req.query;
    const userId = req.user.id;

    if (!friendId) {
      return res.status(400).json({ success: false, message: '好友 ID 不能为空' });
    }

    // 查找与该好友的聊天记录
    const chats = await Chat.find({
      $or: [
        { from: userId, to: friendId },
        { from: friendId, to: userId }
      ]
    })
    .populate('from', 'username avatarUrl')  // 获取用户名和头像
    .populate('to', 'username avatarUrl')
    .sort({ timestamp: 1 });

    res.json({ success: true, chats });
  } catch (err) {
    res.status(500).json({ success: false, message: '获取聊天记录失败' });
  }
});

// ✅ 删除聊天记录（用户可删除自己和某个好友的所有聊天记录）
router.delete('/history', authenticate, async (req, res) => {
  try {
    const { friendId } = req.query;
    const userId = req.user.id;

    if (!friendId) {
      return res.status(400).json({ success: false, message: '好友 ID 不能为空' });
    }

    await Chat.deleteMany({
      $or: [
        { from: userId, to: friendId },
        { from: friendId, to: userId }
      ]
    });

    sendMessageToUser(friendId, { type: 'delete_chat', from: userId });

    res.json({ success: true, message: '聊天记录已删除' });
  } catch (err) {
    res.status(500).json({ success: false, message: '删除聊天记录失败' });
  }
});


module.exports = router;
