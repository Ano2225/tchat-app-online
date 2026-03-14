const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['user_blocked', 'user_reported', 'new_user', 'system_alert'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  // String ref — better-auth user IDs are 32-char strings, not ObjectId
  relatedUserId: {
    type: String,
    ref: 'User'
  },
  relatedReportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Report'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Alert', AlertSchema);