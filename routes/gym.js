const express = require('express');
const router = express.Router();
const Gym = require('../models/Gym');           
const { getAllGyms } = require('../controllers/gymController');
const authenticate = require('../middlewares/authenticate');
const User = require('../models/User');

// 1) 获取所有岩馆 /api/gym/all
router.get('/all', getAllGyms);

// 2) 获取单个岩馆 /api/gym/:id
router.get('/:id', async (req, res) => {
  try {
    const customId = req.params.id;  // 这里拿到的是 "1"
    // 改成 findOne({ id: customId })，别再用 findById
    const gym = await Gym.findOne({ id: customId });
    if (!gym) {
      return res.status(404).json({ success: false, message: '岩馆不存在' });
    }
    res.json(gym);
  } catch (error) {
    console.error('获取岩馆详情出错:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

router.post('/:id/addRoute', authenticate, async (req, res) => {
  try {
    const gymId = req.params.id;                 // URL中的岩馆ID
    const { routeName, difficulty, comment, video } = req.body; // 前端发送的字段
    const userId = req.user.id;

    // 找到对应的 Gym 文档
    const gym = await Gym.findOne({ id: gymId }); 
    // 如果你是用 Gym.findById(gymId)，请确保 _id 是一个ObjectId（参考之前的说明）
    // 这里示例用自定义字段 id: "1"

    if (!gym) {
      return res.status(404).json({ success: false, message: '没找到此岩馆' });
    }
    
    // 往 gym.routes 数组里 push 新线路
    const newRoute = {
      routeName,
      difficulty,
      comment,
      video,
      user: userId
    };
    gym.routes.push(newRoute);
    await gym.save();

    // 增量更新用户 beta：帖子+1
    await User.findByIdAndUpdate(req.user.id, { $inc: { beta: 1 } });

    // 返回更新后的 gym
    res.json({
      success: true,
      message: '线路已成功添加',
      gym
    });
  } catch (err) {
    console.error('添加线路出错:', err);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// 例如: POST /api/gym/:gymId/route/:routeId/like
router.post('/:gymId/route/:routeId/like', authenticate, async (req, res) => {
  try {
    const { gymId, routeId } = req.params;
    const gym = await Gym.findOne({ id: gymId })
    .populate('routes.comments.user', 'username avatarUrl'); 
    if(!gym){
      return res.status(404).json({ success: false, message: '岩馆不存在' });
    }
    
    // 找到指定线路
    const routeDoc = gym.routes.id(routeId);
    if(!routeDoc){
      return res.status(404).json({ success: false, message: '线路不存在' });
    }

    // 点赞+1
    routeDoc.likeCount = (routeDoc.likeCount || 0) + 1;

    // 保存
    await gym.save();

    res.json({
      success: true,
      message: '点赞成功',
      likeCount: routeDoc.likeCount
    });
  } catch (err) {
    console.error('点赞出错:', err);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// 例如: POST /api/gym/:gymId/route/:routeId/comment
router.post('/:gymId/route/:routeId/comment', authenticate, async (req, res) => {
  try {
    const { gymId, routeId } = req.params;
    const userID = req.user.id;  
    const { text, video } = req.body;

    const gym = await Gym.findOne({ id: gymId });
    if(!gym){
      return res.status(404).json({ success: false, message: '岩馆不存在' });
    }
    
    const routeDoc = gym.routes.id(routeId);
    if(!routeDoc){
      return res.status(404).json({ success: false, message: '线路不存在' });
    }

    // 往routeDoc.comments里push一条
    const newCmt = {
      user: userID,
      text: text || '',
      video: video || ''
    };
    routeDoc.comments.push(newCmt);

    // 保存
    await gym.save();

     // 使用 req.user.id 来更新当前用户的 beta 字段（帖子或评论+1）
     await User.findByIdAndUpdate(req.user.id, { $inc: { beta: 1 } });

    res.json({
      success: true,
      message: '评论成功',
      data: routeDoc.comments // 或者返回整条routeDoc
    });
  } catch (err) {
    console.error('添加评论出错:', err);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

router.delete('/:gymId/route/:routeId', authenticate, async (req, res) => {
  try {
    const { gymId, routeId } = req.params;
    const gym = await Gym.findOne({ id: gymId });
    if(!gym){
      return res.status(404).json({ success: false, message: '岩馆不存在' });
    }

    const routeDoc = gym.routes.id(routeId);
    if(!routeDoc){
      return res.status(404).json({ success: false, message: '线路不存在' });
    }

    // 验证当前登录用户是否是这条线路的作者
    if (routeDoc.user.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: '没有权限删除此线路' });
    }

    routeDoc.deleteOne();
    await gym.save();

    res.json({ success: true, message: '线路已删除' });
  } catch(err) {
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});


// 例如: DELETE /api/gym/:gymId/route/:routeId/comment/:commentId
router.delete('/:gymId/route/:routeId/comment/:commentId', authenticate, async (req, res) => {
  try {
    const { gymId, routeId, commentId } = req.params;

    const gym = await Gym.findOne({ id: gymId });
    if(!gym){
      return res.status(404).json({ success: false, message: '岩馆不存在' });
    }
    
    const routeDoc = gym.routes.id(routeId);
    if(!routeDoc){
      return res.status(404).json({ success: false, message: '线路不存在' });
    }

    const cmtDoc = routeDoc.comments.id(commentId);
    if(!cmtDoc){
      return res.status(404).json({ success: false, message: '评论不存在' });
    }

    if (cmtDoc.user.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: '没有权限删除此评论' });
    }
    

    // 删除这条评论子文档
    cmtDoc.deleteOne();

    await gym.save();

    res.json({
      success: true,
      message: '评论已删除',
      data: routeDoc.comments
    });
  } catch (err) {
    console.error('删除评论出错:', err);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});


// routes/gym.js
router.get('/:gymId/route/:routeId', async (req, res) => {
  try {
    const { gymId, routeId } = req.params;

    // 先找这个岩馆
    const gym = await Gym.findOne({ id: gymId })
    .populate('routes.user', 'username')
    .populate('routes.comments.user', 'username');

    if(!gym){
      return res.status(404).json({ success: false, message: '没找到此岩馆' });
    }
    const route = gym.routes.id(routeId); 

    if(!route){
      return res.status(404).json({ success: false, message: '没找到此线路' });
    }

    // 返回这条线路数据
    res.json({
      success: true,
      data: route
    });
  } catch (err) {
    console.error('获取单条线路出错:', err);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

module.exports = router;


