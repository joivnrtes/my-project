// routes/friend.js
const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/authenticate');
const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');

// routes/friend.js
router.post('/', authenticate, async (req, res) => {
    try {
      const fromUserId = req.user._id;    
      const toUserId = req.body.toUserId;
  
      if (!toUserId) {
        return res.status(400).json({ success: false, message: '缺少 toUserId' });
      }
      if (toUserId === fromUserId.toString()) {
        return res.status(400).json({ success: false, message: '不能加自己为好友' });
      }
  
      // 确保目标用户存在
      const toUser = await User.findById(toUserId);
      if (!toUser) {
        return res.status(404).json({ success: false, message: '目标用户不存在' });
      }
  
      // 检查是否已有好友关系
      const fromUser = await User.findById(fromUserId);
      if (fromUser.friends.includes(toUserId)) {
        return res.status(400).json({ success: false, message: '对方已经是你的好友' });
      }
  
      // 允许重新申请好友（如果之前被拒绝）
      const existingReq = await FriendRequest.findOne({
        from: fromUserId,
        to: toUserId,
      });
  
      if (existingReq && existingReq.status === 'pending') {
        return res.status(400).json({ success: false, message: '已发送请求，请等待对方处理' });
      }
  
      // 创建新的好友请求
      const newReq = new FriendRequest({
        from: fromUserId,
        to: toUserId,
        status: 'pending'
      });
      await newReq.save();
  
      res.json({ success: true, message: '好友请求已发送', requestId: newReq._id });
    } catch (err) {
      console.error('发起好友请求出错:', err);
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  });
  

// 2) 查询“我收到的”好友请求
router.get('/received', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    // 仅返回 status='pending' 或者你想看到 accepted/rejected?
    const requests = await FriendRequest.find({ to: userId, status: 'pending' })
      .populate('from', 'username avatarUrl') // 显示发起者信息
      .sort({ createdAt: -1 });

    res.json({ success: true, data: requests });
  } catch(err){
    console.error('查询收到好友请求出错:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// GET /api/friend-request/:requestId
// 获取某个好友请求的详情，并 populate 发起者信息
router.get('/:requestId', authenticate, async (req, res) => {
  try {
    const { requestId } = req.params;
    // 查找好友请求，并 populate 'from' 字段，只返回部分字段
    const friendRequest = await FriendRequest.findById(requestId)
      .populate('from', 'username avatarUrl gender height armspan difficultylevel climbingduration climbingpreference days beta');
    
    if (!friendRequest) {
      return res.status(404).json({ success: false, message: '好友请求不存在' });
    }
    
    res.json({ success: true, data: friendRequest });
  } catch (err) {
    console.error('获取好友请求详情出错:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});



// 3) 同意/拒绝好友请求
router.post('/:requestId/handle', authenticate, async (req, res)=>{
  try {
    const requestId = req.params.requestId;
    const { action } = req.body; // 'accept'或'reject'
    const userId = req.user._id; // 当前登录用户(请求接收者)

    const friendReq = await FriendRequest.findById(requestId);
    if(!friendReq){
      return res.status(404).json({ success: false, message: '请求不存在' });
    }
    if(friendReq.to.toString() !== userId.toString()){
      // 只能处理发给你的请求
      return res.status(403).json({ success: false, message: '无权操作此请求' });
    }
    if(friendReq.status !== 'pending'){
      return res.json({ success: false, message: '该请求已处理过' });
    }

    if(action === 'accept'){
      friendReq.status = 'accepted';
      await friendReq.save();

      // 双方互加好友
      const fromUser = await User.findById(friendReq.from);
      const toUser   = await User.findById(friendReq.to);
      if(!fromUser.friends.includes(toUser._id)){
        fromUser.friends.push(toUser._id);
        await fromUser.save();
      }
      if(!toUser.friends.includes(fromUser._id)){
        toUser.friends.push(fromUser._id);
        await toUser.save();
      }

      res.json({ success: true, message: '已同意请求', status: 'accepted' });
    } else if(action === 'reject'){
      friendReq.status = 'rejected';
      await friendReq.save();
      res.json({ success: true, message: '已拒绝请求', status: 'rejected' });
    } else {
      res.json({ success: false, message: '未知操作' });
    }
  } catch(err){
    console.error('处理好友请求出错:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 删除好友
router.delete('/:friendId', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const { friendId } = req.params;

    // 确保目标用户存在
    const friend = await User.findById(friendId);
    if (!friend) {
      return res.status(404).json({ success: false, message: '该好友不存在' });
    }

    // 更新当前用户的好友列表
    const user = await User.findById(userId);
    user.friends = user.friends.filter(id => id.toString() !== friendId);
    await user.save();

    // 也要从对方的好友列表中删除自己
    friend.friends = friend.friends.filter(id => id.toString() !== userId.toString());
    await friend.save();

    res.json({ success: true, message: '好友删除成功' });
  } catch (err) {
    console.error('删除好友出错:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});


module.exports = router;
