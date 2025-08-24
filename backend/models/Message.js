const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  content: {
    type: String,
    trim: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  room: { // For public chats
    type: String,
    trim: true,
    default: null,
  },
  recipient: { // For private chats
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  media_url: { // URL to the uploaded image or video
    type: String,
  },
  media_type: { // e.g., 'image', 'video'
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  read: {
    type: Boolean,
    default: false,
  }
});
module.exports = mongoose.model('Message', MessageSchema);