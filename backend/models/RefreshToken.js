const mongoose = require('mongoose');

const RefreshTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  // Device/session info for security
  userAgent: {
    type: String
  },
  ipAddress: {
    type: String
  },
  // Revocation
  isRevoked: {
    type: Boolean,
    default: false
  },
  revokedAt: {
    type: Date
  },
  // Token family for rotation detection
  family: {
    type: String,
    required: true,
    index: true
  }
});

// Index for cleanup queries
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
RefreshTokenSchema.index({ userId: 1, isRevoked: 1 });

// Method to check if token is valid
RefreshTokenSchema.methods.isValid = function() {
  return !this.isRevoked && this.expiresAt > new Date();
};

// Static method to revoke all tokens for a user
RefreshTokenSchema.statics.revokeAllForUser = async function(userId) {
  return this.updateMany(
    { userId, isRevoked: false },
    { isRevoked: true, revokedAt: new Date() }
  );
};

// Static method to revoke token family (for rotation attack detection)
RefreshTokenSchema.statics.revokeFamily = async function(family) {
  return this.updateMany(
    { family, isRevoked: false },
    { isRevoked: true, revokedAt: new Date() }
  );
};

// Static method to cleanup expired tokens
RefreshTokenSchema.statics.cleanupExpired = async function() {
  const result = await this.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      { isRevoked: true, revokedAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
    ]
  });
  return result.deletedCount;
};

module.exports = mongoose.model('RefreshToken', RefreshTokenSchema);

