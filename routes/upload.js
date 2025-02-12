const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const authenticate = require('../middlewares/authenticate');

// 配置存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 存到 /uploads/videos
    cb(null, path.join(__dirname, '../uploads/videos'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueSuffix);
  }
});

// 仅允许视频
function videoFileFilter(req, file, cb) {
  const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('仅支持 mp4、mov、avi、webm 等视频格式'), false);
  }
}

const uploadVideo = multer({
  storage,
  fileFilter: videoFileFilter,
  limits: { fileSize: 100 * 1024 * 1024 }
});

// POST /api/upload/video
router.post('/video', authenticate, uploadVideo.single('videoFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '未检测到视频文件' });
    }

    // 拼接可访问路径
    // 上传成功后
    const videoPath = `/uploads/videos/${req.file.filename}`;
    const fullUrl = `http://localhost:3000${videoPath}`;


    res.json({
      success: true,
      message: '视频上传成功！',
      videoPath: fullUrl
    });
  } catch (error) {
    console.error('上传视频错误:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

module.exports = router;
