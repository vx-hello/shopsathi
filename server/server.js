const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const {
  securityHeaders,
  sanitizeInput,
  authRateLimiter,
  apiRateLimiter,
} = require('./middleware/securityMiddleware');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const customerRoutes = require('./routes/customerRoutes');
const billRoutes = require('./routes/billRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

// Load environment variables
dotenv.config();

// Initialize MongoDB connection
connectDB();

const app = express();
const clientOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
const allowedClientOrigins = new Set([new URL(clientOrigin).origin]);

if (process.env.NODE_ENV !== 'production') {
  const parsedClientOrigin = new URL(clientOrigin);
  if (parsedClientOrigin.hostname === 'localhost' || parsedClientOrigin.hostname === '127.0.0.1') {
    parsedClientOrigin.hostname =
      parsedClientOrigin.hostname === 'localhost' ? '127.0.0.1' : 'localhost';
    allowedClientOrigins.add(parsedClientOrigin.origin);
  }
}

// Security Middlewares
app.use(securityHeaders);

app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, !origin || allowedClientOrigins.has(origin));
    },
    credentials: true,
  })
);

// Payload size limit to prevent memory-exhaustion attacks
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Input sanitization against NoSQL injection
app.use(sanitizeInput);

// Lightweight request logger in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  const mongoose = require('mongoose');
  const dbState = mongoose.connection.readyState;
  const states = ['Disconnected', 'Connected', 'Connecting', 'Disconnecting'];

  res.status(200).json({
    status: dbState === 1 ? 'healthy' : 'degraded',
    app: 'ShopSathi API',
    database: states[dbState] || 'Unknown',
    timestamp: new Date().toISOString(),
  });
});

// Guard: Check if MongoDB is connected before running API operations
app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next();

  const mongoose = require('mongoose');
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message:
        'MongoDB is not connected. Please configure your MongoDB Atlas URI in server/.env and restart the server.',
    });
  }
  next();
});

// Rate limiting guards
app.use('/api', apiRateLimiter);
app.use('/api/auth', authRateLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`[ShopSathi] Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    console.error(`[ShopSathi] Unhandled Rejection Error: ${err.message}`);
    // Close server & exit process
    server.close(() => process.exit(1));
  });
}

module.exports = app;
