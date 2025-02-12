const fs = require('fs');
const path = require('path');
const Gym = require('./models/Gym');


const seedGyms = async () => {
  try {
    // 清空现有的 Gym 数据
    await Gym.deleteMany();

    // 插入示例数据
    const gymsDataPath = path.join(__dirname, 'gymsData.json');
    const dataStr = fs.readFileSync(gymsDataPath, 'utf-8');
    const gyms = JSON.parse(dataStr); // 变成JS数组
      

    await Gym.insertMany(gyms);
    console.log('岩馆数据已成功插入');
    process.exit();
  } catch (error) {
    console.error('插入数据失败:', error);
    process.exit(1);
  }
};

seedGyms();
