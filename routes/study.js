// routes/study.js
const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/authenticate');
const StudyPost = require('../models/StudyPost'); // 你需要新建一个 StudyPost 模型
const User = require('../models/User');

// 1) 创建帖子
router.post('/post', authenticate, async (req, res) => {
  try {
    const { title, content, video } = req.body; 
    const userId = req.user.id;  // authenticate 中间件解出的 user

    const newPost = await StudyPost.create({
      title,
      content,
      video,
      user: userId
    });
    // 增量更新用户 beta：帖子+1
    await User.findByIdAndUpdate(req.user.id, { $inc: { beta: 1 } });

    res.json({ success: true, data: newPost });
  } catch (err) {
    console.error("创建学习帖子出错:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2) 获取所有帖子
router.get('/posts', async (req, res) => {
  try {
    // 如果不需要分页，就直接查
    const posts = await StudyPost.find()
      .populate('user', 'username') // 取出作者用户名
      .sort({ createdAt: -1 });

    res.json({ success: true, data: posts });
  } catch (err) {
    console.error("获取学习帖子列表出错:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3) 获取单个帖子详情
router.get('/post/:id', async (req, res) => {
  try {
    const post = await StudyPost.findById(req.params.id)
      .populate('user', 'username')         // 帖子的作者
      .populate('comments.user', 'username'); // 每条评论的用户信息

    if (!post) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }

    res.json({ success: true, data: post });
  } catch (err) {
    console.error("获取学习帖子详情出错:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4) 点赞帖子
router.post('/post/:id/like', authenticate, async (req, res) => {
  try {
    const post = await StudyPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }

    post.likeCount = (post.likeCount || 0) + 1;
    await post.save();

    return res.json({ success: true, likeCount: post.likeCount });
  } catch (err) {
    console.error("学习帖子点赞出错:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5) 发表评论
router.post('/post/:id/comment', authenticate, async (req, res) => {
  try {
    const post = await StudyPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }

    const { text, video } = req.body;
    // 将评论 push 到数组中
    post.comments.push({
      user: req.user.id,
      text,
      video
    });
    await post.save();

    // 使用 req.user.id 来更新当前用户的 beta 字段（帖子或评论+1）
    await User.findByIdAndUpdate(req.user.id, { $inc: { beta: 1 } });

    res.json({ success: true, data: post.comments });
  } catch (err) {
    console.error("学习帖子评论出错:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/post/:postId', authenticate, async (req, res) => {
  try {
    const post = await StudyPost.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }
    // 检查当前登录用户是否是该帖作者
    if (post.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: '无权删除他人帖子' });
    }

    await post.deleteOne();
    res.json({ success: true, message: '帖子已删除' });
  } catch (err) {
    console.error('删除帖子异常:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 删除评论接口
router.delete('/post/:postId/comment/:commentId', authenticate, async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const post = await StudyPost.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }
    // 找到要删除的那条评论
    const commentIndex = post.comments.findIndex(c => c._id.toString() === commentId);
    if (commentIndex === -1) {
      return res.status(404).json({ success: false, message: '评论不存在' });
    }
    // 判断是不是当前用户写的评论
    const comment = post.comments[commentIndex];
    if (comment.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: '无权删除他人评论' });
    }

    // 删除
    post.comments.splice(commentIndex, 1);
    await post.save();

    res.json({ success: true, message: '评论已删除' });
  } catch (err) {
    console.error('删除评论异常:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
