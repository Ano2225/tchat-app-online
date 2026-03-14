const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  content: {
    type: String,
    trim: true,
  },
  // String refs — better-auth stores user _id as 32-char hex string, not ObjectId
  sender: {
    type: String,
    ref: 'User',
    required: true,
  },
  // Denormalized username — preserved even if the account is later deleted
  senderUsername: {
    type: String,
    default: null,
  },
  room: { // For public chats
    type: String,
    trim: true,
    default: null,
  },
  recipient: { // For private chats
    type: String,
    ref: 'User',
  },
  media_url: { // URL to the uploaded image or video
    type: String,
  },
  media_type: { // e.g., 'image', 'video'
    type: String,
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null,
  },
  reactions: [{
    emoji: {
      type: String,
      required: true,
    },
    users: [{
      id: {
        type: String,
        required: true,
      },
      username: {
        type: String,
        required: true,
      }
    }],
    count: {
      type: Number,
      default: 0,
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  read: {
    type: Boolean,
    default: false,
  },
  isAI: {
    type: Boolean,
    default: false,
  },
  aiCharacter: {
    type: String,
    default: null
  },
  aiContext: [{
    role: String,
    content: String
  }]
});

// Indexes for frequently queried fields
MessageSchema.index({ room: 1, createdAt: -1 });                      // public channel queries
MessageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });      // private message history
MessageSchema.index({ recipient: 1, read: 1 });                       // unread count queries

module.exports = mongoose.model('Message', MessageSchema);