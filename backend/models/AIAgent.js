const mongoose = require('mongoose');

const AIAgentSchema = new mongoose.Schema({
  agentId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  avatar: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  personality: {
    type: String,
    required: true
  },
  specialties: [{
    type: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  conversationCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AIAgent', AIAgentSchema);