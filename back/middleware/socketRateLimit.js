/**
 * Socket Rate Limiting - Token Bucket Algorithm
 * Limits the number of events a socket can emit per time window
 */

class TokenBucket {
  constructor(capacity, refillRate) {
    this.capacity = capacity; // Maximum tokens
    this.tokens = capacity; // Current tokens
    this.refillRate = refillRate; // Tokens added per second
    this.lastRefill = Date.now();
  }

  refill() {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000; // seconds
    const tokensToAdd = timePassed * this.refillRate;
    
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  consume(tokens = 1) {
    this.refill();
    
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    
    return false;
  }

  getTokens() {
    this.refill();
    return Math.floor(this.tokens);
  }
}

class SocketRateLimiter {
  constructor(options = {}) {
    this.buckets = new Map(); // socketId -> TokenBucket
    this.config = {
      capacity: options.capacity || 60, // Max 60 events
      refillRate: options.refillRate || 1, // 1 token per second (60/min)
      cleanupInterval: options.cleanupInterval || 5 * 60 * 1000, // 5 minutes
    };
    
    // Periodic cleanup of old buckets
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  getBucket(socketId) {
    if (!this.buckets.has(socketId)) {
      this.buckets.set(
        socketId,
        new TokenBucket(this.config.capacity, this.config.refillRate)
      );
    }
    return this.buckets.get(socketId);
  }

  /**
   * Check if the socket can emit an event
   * @param {string} socketId - Socket ID
   * @param {number} cost - Token cost (default 1)
   * @returns {boolean} - Whether the event is allowed
   */
  allowEvent(socketId, cost = 1) {
    const bucket = this.getBucket(socketId);
    return bucket.consume(cost);
  }

  /**
   * Get remaining tokens for a socket
   */
  getRemainingTokens(socketId) {
    const bucket = this.getBucket(socketId);
    return bucket.getTokens();
  }

  /**
   * Remove a socket's bucket
   */
  removeBucket(socketId) {
    this.buckets.delete(socketId);
  }

  /**
   * Clean up old buckets (for disconnected sockets)
   */
  cleanup() {
    const maxAge = 30 * 60 * 1000; // 30 minutes
    const now = Date.now();
    
    for (const [socketId, bucket] of this.buckets.entries()) {
      if (now - bucket.lastRefill > maxAge) {
        this.buckets.delete(socketId);
      }
    }
  }

  /**
   * Clear all buckets and stop cleanup timer
   */
  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.buckets.clear();
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      activeBuckets: this.buckets.size,
      config: this.config,
    };
  }
}

/**
 * Middleware factory for Socket.IO
 * Usage: socket.use(createSocketRateLimitMiddleware(limiter))
 */
function createSocketRateLimitMiddleware(limiter) {
  return ([event, ...args], next) => {
    const socket = args[args.length - 1]?.socket || this;
    
    // Skip internal events
    if (event.startsWith('internal:') || event === 'disconnect' || event === 'error') {
      return next();
    }

    const allowed = limiter.allowEvent(socket.id);
    
    if (!allowed) {
      const remaining = limiter.getRemainingTokens(socket.id);
      console.warn(`[Socket Rate Limit] Blocked event from ${socket.id} (${socket.userId})`);
      
      // Emit rate limit warning to the client
      socket.emit('rate_limit_exceeded', {
        message: 'Too many events. Please slow down.',
        remaining,
        retryAfter: Math.ceil((1 - remaining) / limiter.config.refillRate),
      });
      
      return; // Block the event
    }

    next();
  };
}

module.exports = {
  SocketRateLimiter,
  createSocketRateLimitMiddleware,
  TokenBucket,
};
