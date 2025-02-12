const Gym = require('../models/Gym');

// 获取全国岩馆信息
const getAllGyms = async (req, res) => {
  try {
    // 从数据库中查询所有岩馆信息
    const gyms = await Gym.find();
    res.status(200).json(gyms); // 返回JSON格式数据
  } catch (error) {
    console.error('获取岩馆信息失败:', error);
    res.status(500).json({ error: '获取岩馆信息失败，请稍后重试' });
  }
};

module.exports = {
  getAllGyms,
};
