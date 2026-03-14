const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  // String refs — better-auth stores user _id as 32-char hex string, not ObjectId
  reportedBy: {
    type: String,
    ref: 'User',
    required: true
  },
  reportedUser: {
    type: String,
    ref: 'User',
    required: true
  },
  reason: {
    type: String,
    required: true,
    enum: ['spam', 'harassment', 'inappropriate_content', 'fake_profile', 'other']
  },
  description: {
    type: String,
    maxlength: 500
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'resolved'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Report', ReportSchema);
