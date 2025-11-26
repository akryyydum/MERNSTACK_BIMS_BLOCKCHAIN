const client = require('prom-client');

// Create a Registry
const register = new client.Registry();

// Add default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register });

// Custom metrics

// HTTP request duration histogram
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
});

// HTTP request counter
const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

// Authentication metrics
const authAttempts = new client.Counter({
  name: 'auth_attempts_total',
  help: 'Total authentication attempts',
  labelNames: ['outcome'], // success, failure
});

const activeUsers = new client.Gauge({
  name: 'active_users_current',
  help: 'Current number of active users',
  labelNames: ['role'],
});

// Rate limit metrics
const rateLimitHits = new client.Counter({
  name: 'rate_limit_hits_total',
  help: 'Total number of rate limit hits',
  labelNames: ['endpoint', 'type'], // type: http, socket
});

// Database operation metrics
const dbOperationDuration = new client.Histogram({
  name: 'db_operation_duration_seconds',
  help: 'Duration of database operations',
  labelNames: ['operation', 'collection'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1],
});

const dbOperationErrors = new client.Counter({
  name: 'db_operation_errors_total',
  help: 'Total database operation errors',
  labelNames: ['operation', 'collection'],
});

// Socket.IO metrics
const socketConnections = new client.Gauge({
  name: 'socket_connections_current',
  help: 'Current number of socket connections',
});

const socketEvents = new client.Counter({
  name: 'socket_events_total',
  help: 'Total socket events',
  labelNames: ['event', 'outcome'], // outcome: success, rate_limited, error
});

// File upload metrics
const fileUploads = new client.Counter({
  name: 'file_uploads_total',
  help: 'Total file uploads',
  labelNames: ['type', 'outcome'], // outcome: success, validation_failed, error
});

const fileUploadSize = new client.Histogram({
  name: 'file_upload_size_bytes',
  help: 'File upload size in bytes',
  labelNames: ['type'],
  buckets: [1024, 10240, 102400, 1048576, 10485760], // 1KB to 10MB
});

// Security metrics
const securityEvents = new client.Counter({
  name: 'security_events_total',
  help: 'Total security events',
  labelNames: ['type'], // xss_blocked, injection_blocked, unauthorized_access, etc.
});

const failedLogins = new client.Counter({
  name: 'failed_logins_total',
  help: 'Total failed login attempts',
  labelNames: ['reason'], // invalid_credentials, account_locked, etc.
});

// Business metrics
const documentRequests = new client.Counter({
  name: 'document_requests_total',
  help: 'Total document requests',
  labelNames: ['type', 'status'], // status: pending, approved, rejected
});

const complaints = new client.Counter({
  name: 'complaints_total',
  help: 'Total complaints filed',
  labelNames: ['category', 'status'],
});

const payments = new client.Counter({
  name: 'payments_total',
  help: 'Total payments processed',
  labelNames: ['type', 'status'], // type: garbage, streetlight, etc.
});

const paymentAmount = new client.Counter({
  name: 'payment_amount_total',
  help: 'Total payment amount in currency',
  labelNames: ['type'],
});

// Register all metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(authAttempts);
register.registerMetric(activeUsers);
register.registerMetric(rateLimitHits);
register.registerMetric(dbOperationDuration);
register.registerMetric(dbOperationErrors);
register.registerMetric(socketConnections);
register.registerMetric(socketEvents);
register.registerMetric(fileUploads);
register.registerMetric(fileUploadSize);
register.registerMetric(securityEvents);
register.registerMetric(failedLogins);
register.registerMetric(documentRequests);
register.registerMetric(complaints);
register.registerMetric(payments);
register.registerMetric(paymentAmount);

/**
 * Middleware to collect HTTP metrics
 */
function metricsMiddleware(req, res, next) {
  const start = Date.now();
  
  // Store original end function
  const originalEnd = res.end;
  
  // Override end function
  res.end = function(...args) {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path || 'unknown';
    
    // Record metrics
    httpRequestDuration.observe(
      { method: req.method, route, status_code: res.statusCode },
      duration
    );
    
    httpRequestTotal.inc({
      method: req.method,
      route,
      status_code: res.statusCode,
    });
    
    // Call original end
    originalEnd.apply(this, args);
  };
  
  next();
}

/**
 * Get metrics endpoint handler
 */
async function getMetrics(req, res) {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

/**
 * Record authentication attempt
 */
function recordAuthAttempt(outcome) {
  authAttempts.inc({ outcome });
  if (outcome === 'failure') {
    failedLogins.inc({ reason: 'invalid_credentials' });
  }
}

/**
 * Update active users count
 */
function updateActiveUsers(role, count) {
  activeUsers.set({ role }, count);
}

/**
 * Record rate limit hit
 */
function recordRateLimitHit(endpoint, type = 'http') {
  rateLimitHits.inc({ endpoint, type });
}

/**
 * Record database operation
 */
function recordDbOperation(operation, collection, duration, error = null) {
  dbOperationDuration.observe(
    { operation, collection },
    duration
  );
  
  if (error) {
    dbOperationErrors.inc({ operation, collection });
  }
}

/**
 * Update socket connections
 */
function updateSocketConnections(count) {
  socketConnections.set(count);
}

/**
 * Record socket event
 */
function recordSocketEvent(event, outcome) {
  socketEvents.inc({ event, outcome });
}

/**
 * Record file upload
 */
function recordFileUpload(type, size, outcome) {
  fileUploads.inc({ type, outcome });
  
  if (outcome === 'success') {
    fileUploadSize.observe({ type }, size);
  }
}

/**
 * Record security event
 */
function recordSecurityEvent(type) {
  securityEvents.inc({ type });
}

/**
 * Record business metrics
 */
function recordDocumentRequest(type, status) {
  documentRequests.inc({ type, status });
}

function recordComplaint(category, status) {
  complaints.inc({ category, status });
}

function recordPayment(type, amount, status) {
  payments.inc({ type, status });
  if (status === 'success') {
    paymentAmount.inc({ type }, amount);
  }
}

module.exports = {
  register,
  metricsMiddleware,
  getMetrics,
  recordAuthAttempt,
  updateActiveUsers,
  recordRateLimitHit,
  recordDbOperation,
  updateSocketConnections,
  recordSocketEvent,
  recordFileUpload,
  recordSecurityEvent,
  recordDocumentRequest,
  recordComplaint,
  recordPayment,
};
