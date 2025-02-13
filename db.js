const mongoose = require('mongoose');

// 读取环境变量
const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/myLocalDB';

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
