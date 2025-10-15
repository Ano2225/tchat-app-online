const adminLogger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl;
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent');
  
  // Log de l'action admin
  console.log(`[ADMIN] ${timestamp} - ${method} ${url} - IP: ${ip} - User: ${req.adminUser?.username || 'Unknown'}`);
  
  // Log des actions sensibles
  if (method === 'DELETE' || url.includes('/block') || url.includes('/reports')) {
    console.log(`[ADMIN-SENSITIVE] ${timestamp} - ${method} ${url} - Admin: ${req.adminUser?.username} - Body:`, JSON.stringify(req.body));
  }
  
  next();
};

module.exports = adminLogger;