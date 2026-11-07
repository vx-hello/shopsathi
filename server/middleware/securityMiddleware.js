/**
 * ShopSathi Production Security Middleware Suite
 * Native implementation for enterprise hardening without external bloat.
 */

// 1. In-memory sliding window rate limiter
const rateLimitMap = new Map();

/**
 * Creates an in-memory rate limiter middleware.
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Max requests per windowMs
 * @param {string} options.message - Error message when limit exceeded
 */
const rateLimiter = ({ windowMs = 15 * 60 * 1000, max = 100, message = 'Too many requests, please try again later.' }) => {
  return (req, res, next) => {
    // Determine client identifier (IP or forwarded IP)
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-client';
    const key = `${req.baseUrl || req.path}:${ip}`;
    const now = Date.now();

    const clientRecord = rateLimitMap.get(key) || { count: 0, resetTime: now + windowMs };

    // Reset window if expired
    if (now > clientRecord.resetTime) {
      clientRecord.count = 0;
      clientRecord.resetTime = now + windowMs;
    }

    clientRecord.count += 1;
    rateLimitMap.set(key, clientRecord);

    // Periodically clean up expired keys to prevent memory leak
    if (rateLimitMap.size > 10000) {
      for (const [k, v] of rateLimitMap.entries()) {
        if (now > v.resetTime) {
          rateLimitMap.delete(k);
        }
      }
    }

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - clientRecord.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(clientRecord.resetTime / 1000));

    if (clientRecord.count > max) {
      return res.status(429).json({
        success: false,
        message,
        retryAfter: Math.ceil((clientRecord.resetTime - now) / 1000),
      });
    }

    next();
  };
};

// Rate limiter for authentication routes (login / register) - 20 attempts per 15 minutes
const authRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many authentication attempts from this IP. Please wait 15 minutes before trying again.',
});

// General API rate limiter - 200 requests per 10 minutes
const apiRateLimiter = rateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 200,
  message: 'Too many API requests. Please slow down.',
});

// 2. HTTP Security Headers Middleware (Helmet Equivalent)
const securityHeaders = (req, res, next) => {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  // Enable XSS filter
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Strict Transport Security (HSTS)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' http://localhost:* ws://localhost:*;"
  );
  // Remove Express fingerprint
  res.removeHeader('X-Powered-By');
  next();
};

// 3. NoSQL Injection Prevention Middleware (Mongo-Sanitize Equivalent)
// Recursively strips any keys starting with $ or containing .
const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete obj[key];
    } else if (typeof obj[key] === 'object') {
      sanitizeObject(obj[key]);
    }
  }
  return obj;
};

const sanitizeInput = (req, res, next) => {
  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  if (req.params) sanitizeObject(req.params);
  next();
};

module.exports = {
  authRateLimiter,
  apiRateLimiter,
  securityHeaders,
  sanitizeInput,
};
