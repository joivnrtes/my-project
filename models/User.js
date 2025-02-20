const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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
  avatarUrl: { type: String, default: 'https://websocket-server-o0o0.onrender.com/default-avatar.png' },
  beta: { type: Number, default: 0 },    
  friends: [{ type: Schema.Types.ObjectId, ref: 'User' }], // 好友列表
  createdAt: { type: Date, default: Date.now },
  daysComputed: { type: Number, default: 0 },
});


// ✅ 计算用户注册天数
UserSchema.virtual("computedDays").get(function () {
  return Math.floor((new Date() - this.createdAt) / (1000 * 60 * 60 * 24));
});


// ✅ 确保 `toJSON` 里包含 `daysComputed`
UserSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    ret.computedDays = Math.floor((new Date() - doc.createdAt) / (1000 * 60 * 60 * 24));
    return ret;
  },
});

UserSchema.set("toObject", { virtuals: true });

// ✅ 创建 `createdAt` 索引，提高查询效率
UserSchema.index({ createdAt: 1 });

// ✅ `pre('save')`：在新建用户或更新用户时，同步 `daysComputed`
UserSchema.pre("save", function (next) {
  this.daysComputed = Math.floor((new Date() - this.createdAt) / (1000 * 60 * 60 * 24));
  next();
});

// ✅ `pre('findOneAndUpdate')`：确保 `daysComputed` 被正确计算
UserSchema.pre("findOneAndUpdate", async function (next) {
  if (!this._update.createdAt) {
    const doc = await mongoose.model("User").findOne(this.getQuery()).select("createdAt");
    if (doc) {
      this._update.createdAt = doc.createdAt;
    }
  }
  this._update.daysComputed = Math.floor((new Date() - new Date(this._update.createdAt)) / (1000 * 60 * 60 * 24));
  next();
});

// ✅ `pre('updateMany')`：批量更新时同步 `daysComputed`
UserSchema.pre("updateMany", function (next) {
  if (this._update.createdAt) {
    this._update.daysComputed = Math.floor((new Date() - new Date(this._update.createdAt)) / (1000 * 60 * 60 * 24));
  }
  next();
});



// ✅ 密码加密中间件（合并重复定义）
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// ✅ 验证密码方法
UserSchema.methods.comparePassword = async function (inputPassword) {
  return bcrypt.compare(inputPassword, this.password);
};

module.exports = mongoose.model("User", UserSchema);
