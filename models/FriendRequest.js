// models/FriendRequest.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const friendRequestSchema = new Schema({
  from: { type: Schema.Types.ObjectId, ref: 'User' },  // 发起者
  to: { type: Schema.Types.ObjectId, ref: 'User' },    // 接收者
  status: { type: String, default: 'pending' },        // 'pending', 'accepted', 'rejected'
  createdAt: { type: Date, default: Date.now },
});

// 你也可以加字段 message、replyMessage等
module.exports = mongoose.model('FriendRequest', friendRequestSchema);
