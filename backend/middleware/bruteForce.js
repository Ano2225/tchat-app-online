const rateLimit = require('express-rate-limit');

// In-memory store for development (use Redis in production)
class BruteForceStore {
  constructor() {
    this.attempts = new Map();
    this.blocked = new Map();
    
    // Cleanup every 15 minutes
    setInterval(() => this.cleanup(), 15 * 60 * 1000);
  }

  cleanup() {
    const now = Date.now();
    
    // Clean expired attempts
    for (const [key, data] of this.attempts.entries()) {
      if (now - data.firstAttempt > 15 * 60 * 1000) {
        this.attempts.delete(key);
      }
    }
    
    // Clean expired blocks
    for (const [key, blockUntil] of this.blocked.entries()) {
      if (now > blockUntil) {
        this.blocked.delete(key);
      }
    }
  }

  getKey(req) {
    // Use IP + username for login attempts
    const identifier = req.body.username || req.body.email || 'unknown';
    return `${req.ip}_${identifier}`;
  }

  isBlocked(key) {
    const blockUntil = this.blocked.get(key);
    if (!blockUntil) return false;
    
    if (Date.now() > blockUntil) {
      this.blocked.delete(key);
      return false;
    }
    
    return true;
  }

  recordAttempt(key) {
    const now = Date.now();
    const data = this.attempts.get(key) || { count: 0, firstAttempt: now };
    
    // Reset if window expired
    if (now - data.firstAttempt > 15 * 60 * 1000) {
      data.count = 1;
      data.firstAttempt = now;
    } else {
      data.count++;
    }
    
    this.attempts.set(key, data);
    
    // Block after 5 failed attempts
    if (data.count >= 5) {
      const blockDuration = this.calculateBlockDuration(data.count);
      this.blocked.set(key, now + blockDuration);
      console.log(`[BRUTE_FORCE] Blocked ${key} for ${blockDuration / 1000}s`);
      return true;
    }
    
    return false;
  }

  calculateBlockDuration(attemptCount) {
    // Progressive blocking: 5min, 15min, 30min, 1h, 2h
    const durations = [
      5 * 60 * 1000,   // 5 minutes
      15 * 60 * 1000,  // 15 minutes
      30 * 60 * 1000,  // 30 minutes
      60 * 60 * 1000,  // 1 hour
      120 * 60 * 1000  // 2 hours
    ];
    
    const index = Math.min(Math.floor(attemptCount / 5) - 1, durations.length - 1);
    return durations[index];
  }

  resetAttempts(key) {
    this.attempts.delete(key);
    this.blocked.delete(key);
  }

  getAttempts(key) {
    return this.attempts.get(key)?.count || 0;
  }

  getBlockedUntil(key) {
    return this.blocked.get(key);
  }
}

const store = new BruteForceStore();

/**
 * Brute Force Protection Middleware
 */
const bruteForceProtection = (req, res, next) => {
  const key = store.getKey(req);
  
  // Check if blocked
  if (store.isBlocked(key)) {
    const blockUntil = store.getBlockedUntil(key);
    const remainingTime = Math.ceil((blockUntil - Date.now()) / 1000);
    
    console.log(`[BRUTE_FORCE] Blocked request from ${key}, ${remainingTime}s remaining`);
    
    return res.status(429).json({
      error: 'Too many failed attempts',
      message: `Account temporarily locked. Try again in ${remainingTime} seconds.`,
      retryAfter: remainingTime
    });
  }
  
  // Store original send to intercept response
  const originalSend = res.send;
  res.send = function(data) {
    // Check if login failed (401 or 400 with invalid credentials)
    if (res.statusCode === 401 || res.statusCode === 400) {
      const blocked = store.recordAttempt(key);
      
      if (blocked) {
        const blockUntil = store.getBlockedUntil(key);
        const remainingTime = Math.ceil((blockUntil - Date.now()) / 1000);
        
        return originalSend.call(this, JSON.stringify({
          error: 'Too many failed attempts',
          message: `Account temporarily locked due to multiple failed login attempts. Try again in ${remainingTime} seconds.`,
          retryAfter: remainingTime
        }));
      }
    } else if (res.statusCode === 200) {
      // Successful login - reset attempts
      store.resetAttempts(key);
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

module.exports = {
  bruteForceProtection,
  bruteForceStore: store
};

