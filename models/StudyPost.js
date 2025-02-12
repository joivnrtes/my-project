// models/StudyPost.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const commentSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    text: String,
    video: String
  },
  { timestamps: true }
);

const studyPostSchema = new Schema(
  {
    title: { type: String, required: true },
    content: { type: String },
    video: { type: String }, // 存放视频URL
    likeCount: { type: Number, default: 0 },
    user: { type: Schema.Types.ObjectId, ref: 'User' }, // 发帖人
    comments: [commentSchema]
  },
  { timestamps: true }
);

module.exports = mongoose.model('StudyPost', studyPostSchema);
