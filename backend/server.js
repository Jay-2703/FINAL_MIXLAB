

import express from 'express';
import cors from 'cors';
import http from 'http';
import WebSocket from 'ws';
import dotenv from 'dotenv';

import paymentRoutes from './routes/paymentRoutes.js';


const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from frontend directory
app.use(express.static('../frontend'));

// API Routes
app.use('/api/payments', paymentRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// WebSocket connection handling
const clients = new Set();

wss.on('connection', (ws) => {
  console.log('✅ New WebSocket client connected');
  clients.add(ws);

  ws.on('close', () => {
    console.log('❌ WebSocket client disconnected');
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });

  // Send initial connection confirmation
  ws.send(JSON.stringify({ type: 'connected', message: 'Connected to payment updates' }));
});

// Broadcast payment updates to all connected clients
function broadcastPaymentUpdate(data) {
  const message = JSON.stringify({
    type: 'payment_update',
    data
  });

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });

  console.log(`📢 Broadcasted payment update to ${clients.size} clients`);
}

// Export for use in controllers
module.exports.broadcastPaymentUpdate = broadcastPaymentUpdate;

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
  console.log(`🔧 API: http://localhost:${PORT}/api`);
});