import express from 'express';
import cors from 'cors';
import http from 'http';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import authRoutes from './src/routes/authRoutes.js';
import bookingRoutes from './src/routes/bookingRoutes.js';
import webhookRoutes from './src/routes/webhookRoutes.js';
import lessonRoutes from './src/routes/lessonRoutes.js';
import quizRoutes from './src/routes/quizRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';

// Import Socket.IO configuration
import { initializeSocket } from './src/config/socket.js';

// ES module dirname workaround
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = initializeSocket(server);

// Trust proxy (for rate limiting and IP detection behind reverse proxy)
app.set('trust proxy', 1);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5500',  // ✅ Already there
      'http://localhost:5500',   // ✅ Already there
      process.env.FRONTEND_URL || 'http://localhost:3000'
    ];
   
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser middleware (for JWT tokens in cookies)
app.use(cookieParser());

// ✅ FIXED: Serve static files ONLY from frontend/public
const frontendPublicPath = path.join(__dirname, '../frontend/public');
app.use(express.static(frontendPublicPath, {
  maxAge: '1h',
  etag: false
}));

// ALSO serve view files under /frontend/views for direct links used by frontend
const frontendViewsPath = path.join(__dirname, '../frontend/views');
app.use('/frontend/views', express.static(frontendViewsPath, {
  maxAge: '1h',
  etag: false
}));

// Debug middleware to log static file requests
app.use((req, res, next) => {
  if (process.env.DEBUG_STATIC === 'true') {
    if (req.path.includes('.css') || req.path.includes('.js') || req.path.includes('.woff')) {
      console.log(`📁 Static: ${req.path}`);
    }
  }
  next();
});

// API Routes (MUST be before fallback)
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    socketClients: io.sockets.sockets.size
  });
});

// Export Socket.IO functions for use in controllers
export { 
  broadcastPaymentUpdate,
  sendUserNotification,
  broadcastToRole,
  getConnectedClientsCount
} from './src/config/socket.js';

// ✅ IMPORTANT: Fallback for SPA routing (catch undefined routes and serve index.html)
app.get(/^(?!\/api\/).*/, (req, res) => {
  res.sendFile(path.join(frontendPublicPath, 'index.html'), (err) => {
    if (err) {
      res.status(404).json({ success: false, message: 'Not found' });
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.IO server ready`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
  console.log(`🔧 API: http://localhost:${PORT}/api`);
  console.log(`🔌 Socket.IO: http://localhost:${PORT} (ws://localhost:${PORT})`);
  console.log(`📂 Serving static files from: ${frontendPublicPath}`);
});