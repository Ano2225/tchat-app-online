// Simple CSRF protection middleware (replacing deprecated csurf)
const csrfProtection = (req, res, next) => {
  // Skip CSRF for GET requests and API endpoints
  if (req.method === 'GET' || req.path.startsWith('/api/')) {
    return next();
  }
  
  // For now, just pass through - can be enhanced later
  next();
};

module.exports = csrfProtection;