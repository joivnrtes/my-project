const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/authenticate'); // 认证中间件
const CommunityPost = require('../models/CommunityPost'); // 确保路径正确
const User = require('../models/User');


// 👍 点赞帖子
router.post('/post/:id/like', authenticate, async (req, res) => {
    console.log("请求头中的用户:", req.user);
    try {
        const post = await CommunityPost.findById(req.params.id);
        if (!post) return res.status(404).json({ success: false, message: '帖子不存在' });

        // likeCount 自增
        post.likeCount = (post.likeCount || 0) + 1;
        await post.save();

        return res.json({ success: true, likeCount: post.likeCount });
    } catch (err) {
        console.error("点赞 API 出错:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// 📝 创建帖子
router.post('/post', authenticate, async (req, res) => {
    try {
        const { title, content, video } = req.body;
        const userId = req.user.id;

        const newPost = await CommunityPost.create({
            title,
            content,
            video,
            user: userId
        });

        // 增量更新用户 beta：帖子+1
    await User.findByIdAndUpdate(req.user.id, { $inc: { beta: 1 } });

        res.json({ success: true, data: newPost });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 📌 获取所有帖子
router.get('/posts', async (req, res) => {
    try {
        const posts = await CommunityPost.find()
            .populate('user', 'username') // 关联用户
            .sort({ createdAt: -1 });

        res.json({ success: true, data: posts });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 🔍 获取单个帖子详情
router.get('/post/:id', async (req, res) => {
    try {
        const post = await CommunityPost.findById(req.params.id)
            .populate('user', 'username')
            .populate('comments.user', 'username');

        if (!post) return res.status(404).json({ success: false, message: '帖子不存在' });

        res.json({ success: true, data: post });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 💬 发表评论
router.post('/post/:id/comment', authenticate, async (req, res) => {
  try {
      const post = await CommunityPost.findById(req.params.id);
      if (!post) return res.status(404).json({ success: false, message: '帖子不存在' });

      const { text, video } = req.body;
      post.comments.push({ user: req.user.id, text, video });
      await post.save();

      // 使用 req.user.id 来更新当前用户的 beta 字段（帖子或评论+1）
      await User.findByIdAndUpdate(req.user.id, { $inc: { beta: 1 } });

      res.json({ success: true, data: post.comments });
  } catch (err) {
      res.status(500).json({ success: false, message: err.message });
  }
});


router.delete('/post/:postId', authenticate, async (req, res) => {
    try {
      const post = await CommunityPost.findById(req.params.postId);
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
      const post = await CommunityPost.findById(postId);
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
