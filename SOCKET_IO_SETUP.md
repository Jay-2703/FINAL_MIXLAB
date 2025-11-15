# Socket.IO Integration Guide

## Overview

The MixLab Studio application now uses **Socket.IO** for real-time communication instead of the basic WebSocket library. Socket.IO provides better features like automatic reconnection, rooms, namespaces, and built-in authentication support.

## Backend Setup

### 1. Install Dependencies

Socket.IO is already added to `package.json`. Install it:

```bash
cd backend
npm install
```

### 2. Configuration

Socket.IO is configured in `backend/src/config/socket.js` with the following features:

- **Authentication Middleware**: Verifies JWT tokens on connection
- **User Rooms**: Automatically joins users to personal rooms (`user:userId`)
- **Role Rooms**: Joins users to role-based rooms (`role:student`, `role:admin`, etc.)
- **Payment Updates**: Dedicated room for payment subscriptions
- **Connection Recovery**: Automatic reconnection with state recovery

### 3. Available Functions

The Socket.IO server exports these functions for use in controllers:

```javascript
import { 
  broadcastPaymentUpdate,
  sendUserNotification,
  broadcastToRole,
  getConnectedClientsCount
} from './src/config/socket.js';
```

#### `broadcastPaymentUpdate(data)`
Broadcasts payment updates to all clients subscribed to the 'payments' room.

```javascript
broadcastPaymentUpdate({
  invoiceId: 'inv_123',
  status: 'paid',
  amount: 1000
});
```

#### `sendUserNotification(userId, notification)`
Sends a notification to a specific user.

```javascript
sendUserNotification(123, {
  title: 'Booking Confirmed',
  message: 'Your studio booking has been confirmed',
  type: 'success'
});
```

#### `broadcastToRole(role, event, data)`
Broadcasts to all users with a specific role.

```javascript
broadcastToRole('admin', 'new_booking', {
  bookingId: 456,
  userId: 123
});
```

#### `getConnectedClientsCount()`
Returns the number of currently connected clients.

## Frontend Setup

### 1. Include Socket.IO Client Library

Add the Socket.IO client library to your HTML:

```html
<script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
```

Or use the provided client wrapper:

```html
<script src="/frontend/public/js/socket-client.js"></script>
```

### 2. Basic Usage

```javascript
// Get token from localStorage
const token = localStorage.getItem('token');

// Connect to Socket.IO server
socketClient.connect(token);

// Subscribe to payment updates
socketClient.subscribeToPayments();

// Handle events
socketClient.onPaymentUpdate = (data) => {
  console.log('Payment update:', data);
  // Update UI with payment information
};

socketClient.onNotification = (data) => {
  console.log('Notification:', data);
  // Show notification to user
};
```

### 3. Custom Event Handlers

Override the default handlers in `socket-client.js`:

```javascript
socketClient.onConnect = () => {
  console.log('Connected!');
  // Update UI to show connected status
};

socketClient.onDisconnect = (reason) => {
  console.log('Disconnected:', reason);
  // Show reconnection message
};

socketClient.onAuthenticated = (user) => {
  console.log('Authenticated as:', user.username);
  // Update user info in UI
};
```

### 4. Emit Custom Events

```javascript
// Emit a custom event
socketClient.emit('custom_event', {
  data: 'some data'
});

// Listen to custom events
socketClient.on('custom_response', (data) => {
  console.log('Response:', data);
});
```

## Authentication

Socket.IO connections can be authenticated in two ways:

### Method 1: Token in Connection (Recommended)

```javascript
const socket = io('http://localhost:3000', {
  auth: {
    token: localStorage.getItem('token')
  }
});
```

### Method 2: Authenticate After Connection

```javascript
socket.emit('authenticate', localStorage.getItem('token'));
socket.on('authenticated', (data) => {
  if (data.success) {
    console.log('Authenticated!');
  }
});
```

## Rooms

Users are automatically joined to rooms based on their authentication:

- **Personal Room**: `user:userId` - For user-specific notifications
- **Role Room**: `role:student`, `role:admin`, `role:instructor` - For role-based broadcasts

### Subscribe to Payment Updates

```javascript
socketClient.subscribeToPayments();
```

This joins the client to the 'payments' room and they will receive all payment update events.

## Example: Payment Update Flow

### Backend (Controller)

```javascript
import { broadcastPaymentUpdate } from '../config/socket.js';

// After payment is processed
broadcastPaymentUpdate({
  invoiceId: invoice.id,
  status: 'paid',
  amount: invoice.amount,
  userId: invoice.userId
});
```

### Frontend

```javascript
socketClient.onPaymentUpdate = (data) => {
  if (data.data.invoiceId === currentInvoiceId) {
    // Update payment status in UI
    updatePaymentStatus(data.data.status);
    showSuccessMessage('Payment successful!');
  }
};
```

## Example: User Notification

### Backend

```javascript
import { sendUserNotification } from '../config/socket.js';

// Send notification to user
sendUserNotification(userId, {
  title: 'Booking Reminder',
  message: 'Your studio session starts in 1 hour',
  type: 'info',
  actionUrl: '/bookings/123'
});
```

### Frontend

```javascript
socketClient.onNotification = (data) => {
  // Show toast notification
  showToast({
    title: data.title,
    message: data.message,
    type: data.type
  });
  
  // Or update notification badge
  updateNotificationBadge();
};
```

## Testing

1. **Start the server**:
   ```bash
   cd backend
   npm run dev
   ```

2. **Open the example page**:
   Navigate to `http://localhost:3000/frontend/public/socket-example.html`

3. **Test connection**:
   - Click "Connect" button
   - Check console for connection messages
   - Status should show "Connected"

4. **Test authentication**:
   - Login first to get a token
   - Connect with token
   - Should see "Authenticated" message

5. **Test payment updates**:
   - Click "Subscribe to Payments"
   - From backend, call `broadcastPaymentUpdate()`
   - Should see payment update in messages

## Migration from WebSocket

If you have existing WebSocket code, here's how to migrate:

### Old WebSocket Code:
```javascript
const ws = new WebSocket('ws://localhost:3000');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Handle data
};
ws.send(JSON.stringify({ type: 'subscribe' }));
```

### New Socket.IO Code:
```javascript
const socket = io('http://localhost:3000');
socket.on('payment_update', (data) => {
  // Handle data
});
socket.emit('subscribe:payments');
```

## Security Considerations

1. **Authentication**: Always authenticate Socket.IO connections when dealing with sensitive data
2. **CORS**: Socket.IO CORS is configured in `socket.js` - update for production
3. **Rate Limiting**: Consider adding rate limiting for Socket.IO events
4. **Input Validation**: Validate all data received from clients
5. **HTTPS/WSS**: Use secure connections in production

## Troubleshooting

### Connection Issues

**Problem**: Socket.IO not connecting
- **Solution**: Check CORS configuration in `socket.js`
- **Solution**: Verify server is running and port is correct
- **Solution**: Check browser console for errors

### Authentication Issues

**Problem**: Socket not authenticating
- **Solution**: Verify token is valid and not expired
- **Solution**: Check token is being sent in `auth.token`
- **Solution**: Verify JWT_SECRET matches between auth and socket

### Events Not Received

**Problem**: Not receiving events
- **Solution**: Verify you're subscribed to the correct room
- **Solution**: Check event names match between emit and on
- **Solution**: Verify connection is established (check `socket.connected`)

## Production Deployment

1. **Update CORS** in `socket.js`:
   ```javascript
   cors: {
     origin: process.env.FRONTEND_URL, // Your production frontend URL
     credentials: true
   }
   ```

2. **Enable HTTPS/WSS**:
   - Socket.IO automatically uses WSS when server uses HTTPS
   - Ensure SSL certificate is properly configured

3. **Monitor Connections**:
   ```javascript
   const count = getConnectedClientsCount();
   console.log(`Connected clients: ${count}`);
   ```

4. **Set up Redis Adapter** (for multiple servers):
   ```bash
   npm install @socket.io/redis-adapter redis
   ```
   See Socket.IO documentation for multi-server setup.

---

**Last Updated**: 2024
**Socket.IO Version**: 4.7.5

