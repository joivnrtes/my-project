const mongoose = require('mongoose');
const { Schema } = mongoose; 

const CommentSchema = new mongoose.Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  text: { type: String, default: '' },
  video: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

const RouteSchema = new mongoose.Schema({
  routeName: { type: String, required: true },
  difficulty: { type: String, required: true },
  comment: { type: String },
  video: { type: String },
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  likeCount: { type: Number, default: 0 },
  comments: [CommentSchema],
  createdAt: { type: Date, default: Date.now }
});

const GymSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  province: { type: String, required: true },
  city: { type: String, required: true },
  location: { type: String, required: true },
  routes: [RouteSchema]
});

module.exports = mongoose.model('Gym', GymSchema);
