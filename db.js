const mongoose = require('mongoose');

// 读取环境变量
const MONGODB_URI = process.env.MONGO_URI || 'mongodb+srv://a2487612091:tjGqBuj2z42X0Bvz@myvercelcluster.f7zii.mongodb.net/mydatabase?retryWrites=true&w=majority&appName=MyVercelCluster';

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB Connected!');
  } catch (error) {
    console.error('❌ MongoDB Connection Failed:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
