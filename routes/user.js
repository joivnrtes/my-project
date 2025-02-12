// routes/user.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.get('/search', async (req, res) => {
  try {
    const keyword = (req.query.keyword || '').trim();
    if(!keyword){
      return res.json({ success: true, data: [] });
    }

    // 只搜 username，做模糊查询
    const users = await User.find({
      username: { $regex: new RegExp(keyword, 'i') }
    }).select('username avatarUrl');// 不返回敏感字段

    res.json({ success: true, data: users });
  } catch(err) {
    console.error('搜索用户出错:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});


router.get('/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.json({ success: false, message: '用户不存在' });
    }
    // 直接转换为对象，虚拟字段（如果设置了 toJSON({ virtuals: true })）也会包含进去
    const userData = user.toObject();
    res.json({ success: true, data: userData });
  } catch (err) {
    console.error('获取用户信息出错:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});


  // GET /api/user/:userId/friends
router.get('/:userId/friends', async (req, res) => {
  try {
    const userId = req.params.userId;
    // 查找用户并 populate 好友列表
    const user = await User.findById(userId).populate('friends', 'username avatarUrl');
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    res.json({ success: true, data: user.friends });
  } catch (err) {
    console.error('获取好友列表出错:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

  

module.exports = router;

