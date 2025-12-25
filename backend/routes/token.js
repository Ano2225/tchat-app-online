const express = require('express');
const router = express.Router();
const TokenManager = require('../utils/tokenManager');
const { authLimiter } = require('../middleware/rateLimiter');
const authMiddleware = require('../middleware/auth');

/**
 * POST /api/token/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', authLimiter, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token required',
        code: 'REFRESH_TOKEN_MISSING'
      });
    }

    // Rotate refresh token and get new token pair
    const tokens = await TokenManager.rotateRefreshToken(refreshToken, req);

    res.json({
      success: true,
      ...tokens
    });

  } catch (error) {
    console.error('[TOKEN_REFRESH] Error:', error.message);

    // Handle specific errors
    if (error.message === 'INVALID_REFRESH_TOKEN') {
      return res.status(401).json({
        error: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    if (error.message === 'REFRESH_TOKEN_EXPIRED') {
      return res.status(401).json({
        error: 'Refresh token expired',
        code: 'REFRESH_TOKEN_EXPIRED'
      });
    }

    if (error.message === 'REFRESH_TOKEN_REUSED') {
      return res.status(401).json({
        error: 'Refresh token reuse detected. All tokens revoked for security.',
        code: 'REFRESH_TOKEN_REUSED'
      });
    }

    if (error.message === 'USER_NOT_FOUND') {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    if (error.message === 'USER_BLOCKED') {
      return res.status(403).json({
        error: 'Account blocked',
        code: 'USER_BLOCKED'
      });
    }

    res.status(500).json({
      error: 'Failed to refresh token',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/token/revoke
 * Revoke a refresh token (logout)
 */
router.post('/revoke', authMiddleware, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token required',
        code: 'REFRESH_TOKEN_MISSING'
      });
    }

    await TokenManager.revokeRefreshToken(refreshToken);

    res.json({
      success: true,
      message: 'Token revoked successfully'
    });

  } catch (error) {
    console.error('[TOKEN_REVOKE] Error:', error.message);
    res.status(500).json({
      error: 'Failed to revoke token',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/token/revoke-all
 * Revoke all refresh tokens for current user (logout from all devices)
 */
router.post('/revoke-all', authMiddleware, async (req, res) => {
  try {
    await TokenManager.revokeAllUserTokens(req.user.id);

    res.json({
      success: true,
      message: 'All tokens revoked successfully'
    });

  } catch (error) {
    console.error('[TOKEN_REVOKE_ALL] Error:', error.message);
    res.status(500).json({
      error: 'Failed to revoke tokens',
      code: 'INTERNAL_ERROR'
    });
  }
});

module.exports = router;

