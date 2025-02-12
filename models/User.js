const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const { Schema } = mongoose; // 这里添加了解构 Schema

const UserSchema = new Schema({  // 改成 Schema，而不是 mongoose.Schema
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  gender: { type: String, default: '不想透露' },
  height: { type: Number, default: 0 },
  armspan: { type: Number, default: 0 },
  difficultylevel: { type: String, default: '0' },
  climbingduration: { type: String, default: '0个月' },
  climbingpreference: { type: [String], default: [] },
  avatarUrl: { type: String, default: 'http://localhost:3000/default-avatar.png' },
  beta: { type: Number, default: 0 },    
  friends: [{ type: Schema.Types.ObjectId, ref: 'User' }], // 好友列表
  createdAt: { type: Date, default: Date.now }
});

UserSchema.virtual('daysComputed').get(function () {
  const now = new Date();
  return Math.floor((now - this.createdAt) / (1000 * 60 * 60 * 24));
});

// 设置 toJSON 和 toObject 时包含虚拟字段
UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });


// 密码加密中间件
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// 验证密码方法
UserSchema.methods.comparePassword = async function (inputPassword) {
  return bcrypt.compare(inputPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
