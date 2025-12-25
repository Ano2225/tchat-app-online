const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const RefreshToken = require('../models/RefreshToken');

class TokenManager {
  /**
   * Generate access token (short-lived)
   */
  static generateAccessToken(user) {
    const payload = {
      id: user._id || user.id,
      username: user.username,
      role: user.role,
      isAnonymous: user.isAnonymous || false
    };

    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',
      issuer: 'babichat',
      audience: 'babichat-users'
    });
  }

  /**
   * Generate refresh token (long-lived)
   */
  static async generateRefreshToken(user, req) {
    // Generate unique token
    const token = crypto.randomBytes(64).toString('hex');
    
    // Generate family ID for rotation tracking
    const family = crypto.randomBytes(32).toString('hex');
    
    // Calculate expiry (7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Store in database
    await RefreshToken.create({
      token,
      userId: user._id || user.id,
      expiresAt,
      family,
      userAgent: req?.headers['user-agent'],
      ipAddress: req?.ip
    });

    return { token, family };
  }

  /**
   * Generate token pair (access + refresh)
   */
  static async generateTokenPair(user, req) {
    const accessToken = this.generateAccessToken(user);
    const { token: refreshToken, family } = await this.generateRefreshToken(user, req);

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
      tokenType: 'Bearer'
    };
  }

  /**
   * Verify and decode access token
   */
  static verifyAccessToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET, {
        issuer: 'babichat',
        audience: 'babichat-users'
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('ACCESS_TOKEN_EXPIRED');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('INVALID_ACCESS_TOKEN');
      }
      throw error;
    }
  }

  /**
   * Verify refresh token
   */
  static async verifyRefreshToken(token) {
    const refreshToken = await RefreshToken.findOne({ token });

    if (!refreshToken) {
      throw new Error('INVALID_REFRESH_TOKEN');
    }

    if (!refreshToken.isValid()) {
      throw new Error('REFRESH_TOKEN_EXPIRED');
    }

    return refreshToken;
  }

  /**
   * Rotate refresh token (generate new pair, revoke old)
   */
  static async rotateRefreshToken(oldToken, req) {
    const refreshToken = await this.verifyRefreshToken(oldToken);

    // Check for reuse attack (token already used)
    if (refreshToken.isRevoked) {
      console.error(`[SECURITY] Refresh token reuse detected! Revoking family: ${refreshToken.family}`);
      await RefreshToken.revokeFamily(refreshToken.family);
      throw new Error('REFRESH_TOKEN_REUSED');
    }

    // Revoke old token
    refreshToken.isRevoked = true;
    refreshToken.revokedAt = new Date();
    await refreshToken.save();

    // Get user
    const User = require('../models/User');
    const user = await User.findById(refreshToken.userId);

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    if (user.isBlocked) {
      throw new Error('USER_BLOCKED');
    }

    // Generate new token pair with same family
    const accessToken = this.generateAccessToken(user);
    const newRefreshToken = crypto.randomBytes(64).toString('hex');
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await RefreshToken.create({
      token: newRefreshToken,
      userId: user._id,
      expiresAt,
      family: refreshToken.family, // Keep same family
      userAgent: req?.headers['user-agent'],
      ipAddress: req?.ip
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: 900,
      tokenType: 'Bearer',
      user: {
        id: user._id,
        username: user.username,
        role: user.role
      }
    };
  }

  /**
   * Revoke refresh token
   */
  static async revokeRefreshToken(token) {
    const refreshToken = await RefreshToken.findOne({ token });
    
    if (refreshToken && !refreshToken.isRevoked) {
      refreshToken.isRevoked = true;
      refreshToken.revokedAt = new Date();
      await refreshToken.save();
    }
  }

  /**
   * Revoke all refresh tokens for a user
   */
  static async revokeAllUserTokens(userId) {
    return RefreshToken.revokeAllForUser(userId);
  }
}

module.exports = TokenManager;

