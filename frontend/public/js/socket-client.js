/**
 * Socket.IO Client for MixLab Studio
 * Handles real-time communication with the server
 */

class SocketClient {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.apiBaseUrl = window.API_BASE_URL || 'http://localhost:3000';
  }

  /**
   * Initialize Socket.IO connection
   * @param {string} token - JWT token for authentication (optional)
   */
  connect(token = null) {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    // Get token from localStorage if not provided
    if (!token) {
      token = localStorage.getItem('token');
    }

    // Initialize Socket.IO connection
    this.socket = io(this.apiBaseUrl, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts
    });

    // Connection event handlers
    this.socket.on('connect', () => {
      console.log('✅ Socket.IO connected:', this.socket.id);
      this.connected = true;
      this.reconnectAttempts = 0;
      this.onConnect();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket.IO disconnected:', reason);
      this.connected = false;
      this.onDisconnect(reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
      this.reconnectAttempts++;
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
      }
    });

    // Authentication response
    this.socket.on('authenticated', (data) => {
      if (data.success) {
        console.log('✅ Socket authenticated as:', data.user?.username);
        this.onAuthenticated(data.user);
      } else {
        console.warn('⚠️ Socket authentication failed:', data.message);
      }
    });

    // Initial connection confirmation
    this.socket.on('connected', (data) => {
      console.log('📡 Socket connection confirmed:', data);
      if (!data.authenticated && token) {
        // Try to authenticate if we have a token
        this.authenticate(token);
      }
    });

    // Payment update events
    this.socket.on('payment_update', (data) => {
      console.log('💳 Payment update received:', data);
      this.onPaymentUpdate(data);
    });

    // Notification events
    this.socket.on('notification', (data) => {
      console.log('📨 Notification received:', data);
      this.onNotification(data);
    });

    // Error handling
    this.socket.on('error', (error) => {
      console.error('Socket.IO error:', error);
      this.onError(error);
    });
  }

  /**
   * Authenticate socket connection with token
   * @param {string} token - JWT token
   */
  authenticate(token) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('authenticate', token);
    }
  }

  /**
   * Subscribe to payment updates
   */
  subscribeToPayments() {
    if (this.socket && this.socket.connected) {
      this.socket.emit('subscribe:payments');
    }
  }

  /**
   * Unsubscribe from payment updates
   */
  unsubscribeFromPayments() {
    if (this.socket && this.socket.connected) {
      this.socket.emit('unsubscribe:payments');
    }
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      console.log('Socket disconnected');
    }
  }

  /**
   * Emit custom event
   * @param {string} event - Event name
   * @param {object} data - Data to send
   */
  emit(event, data) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Cannot emit event: Socket not connected');
    }
  }

  /**
   * Listen to custom event
   * @param {string} event - Event name
   * @param {function} callback - Callback function
   */
  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {function} callback - Callback function
   */
  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Event handlers (can be overridden)
  onConnect() {
    // Override this in your implementation
    console.log('Socket connected');
  }

  onDisconnect(reason) {
    // Override this in your implementation
    console.log('Socket disconnected:', reason);
  }

  onAuthenticated(user) {
    // Override this in your implementation
    console.log('Socket authenticated:', user);
  }

  onPaymentUpdate(data) {
    // Override this in your implementation
    console.log('Payment update:', data);
  }

  onNotification(data) {
    // Override this in your implementation
    // Show notification to user
    if (data.title && data.message) {
      // You can integrate with your notification system here
      console.log('Notification:', data.title, data.message);
    }
  }

  onError(error) {
    // Override this in your implementation
    console.error('Socket error:', error);
  }
}

// Create global instance
const socketClient = new SocketClient();

// Auto-connect on page load if token exists
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (token) {
      socketClient.connect(token);
    }
  });
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.SocketClient = SocketClient;
  window.socketClient = socketClient;
}

export default socketClient;
export { SocketClient };

