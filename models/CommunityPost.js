const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CommentSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    text: String,
    video: String,
    createdAt: { type: Date, default: Date.now }
});

const CommunityPostSchema = new Schema({
    title: { type: String, required: true },
    content: { type: String, default: '' },
    video: { type: String, default: '' },
    user: { type: Schema.Types.ObjectId, ref: 'User' }, // 关联用户
    comments: [CommentSchema],
    likeCount: { type: Number, default: 0 }, // 新增点赞计数
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CommunityPost', CommunityPostSchema);
