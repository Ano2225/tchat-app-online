const mongoose = require('mongoose');

const AIUsageSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      ref: 'User',
      required: true,
      index: true
    },
    dateKey: {
      type: String,
      required: true,
      index: true
    },
    count: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

AIUsageSchema.index({ userId: 1, dateKey: 1 }, { unique: true });

module.exports = mongoose.model('AIUsage', AIUsageSchema);
