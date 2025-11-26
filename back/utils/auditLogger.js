const Logs = require('../models/logs.model');

/**
 * Log levels
 */
const LogLevel = {
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  SECURITY: 'security',
  AUDIT: 'audit',
};

/**
 * Action types for audit logging
 */
const ActionType = {
  // Authentication
  LOGIN: 'login',
  LOGOUT: 'logout',
  REGISTER: 'register',
  PASSWORD_CHANGE: 'password_change',
  PASSWORD_RESET: 'password_reset',
  
  // CRUD operations
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  
  // Administrative
  APPROVE: 'approve',
  REJECT: 'reject',
  SUSPEND: 'suspend',
  ACTIVATE: 'activate',
  
  // Financial
  PAYMENT: 'payment',
  REFUND: 'refund',
  
  // Document operations
  UPLOAD: 'upload',
  DOWNLOAD: 'download',
  
  // System
  CONFIG_CHANGE: 'config_change',
  PERMISSION_CHANGE: 'permission_change',
};

/**
 * Create audit log entry
 */
async function createAuditLog(data) {
  try {
    const {
      userId,
      userRole,
      action,
      resource,
      resourceId,
      details = {},
      outcome = 'success',
      ipAddress,
      userAgent,
      metadata = {},
    } = data;
    
    await Logs.create({
      userId,
      userRole,
      action,
      resource,
      resourceId,
      details,
      outcome,
      ipAddress,
      userAgent,
      metadata,
      timestamp: new Date(),
      level: LogLevel.AUDIT,
    });
  } catch (error) {
    console.error('[Audit Log] Error creating log:', error);
    // Don't throw - logging failure shouldn't break the main operation
  }
}

/**
 * Log authentication events
 */
async function logAuthEvent(action, userId, outcome, req, details = {}) {
  await createAuditLog({
    userId,
    userRole: req.user?.role || 'unknown',
    action,
    resource: 'authentication',
    outcome,
    ipAddress: req.ip || req.connection?.remoteAddress,
    userAgent: req.get('user-agent'),
    details,
  });
}

/**
 * Log CRUD operations
 */
async function logCrudOperation(action, resource, resourceId, req, details = {}) {
  await createAuditLog({
    userId: req.user?.id,
    userRole: req.user?.role,
    action,
    resource,
    resourceId,
    outcome: 'success',
    ipAddress: req.ip || req.connection?.remoteAddress,
    userAgent: req.get('user-agent'),
    details,
  });
}

/**
 * Log administrative actions
 */
async function logAdminAction(action, resource, resourceId, req, details = {}) {
  // Only log if user is admin/official
  if (!['admin', 'official'].includes(req.user?.role)) {
    return;
  }
  
  await createAuditLog({
    userId: req.user.id,
    userRole: req.user.role,
    action,
    resource,
    resourceId,
    outcome: 'success',
    ipAddress: req.ip || req.connection?.remoteAddress,
    userAgent: req.get('user-agent'),
    details,
    metadata: { critical: true },
  });
}

/**
 * Log security events
 */
async function logSecurityEvent(event, req, details = {}) {
  await Logs.create({
    userId: req.user?.id || null,
    userRole: req.user?.role || 'anonymous',
    action: event,
    resource: 'security',
    outcome: 'alert',
    ipAddress: req.ip || req.connection?.remoteAddress,
    userAgent: req.get('user-agent'),
    details,
    timestamp: new Date(),
    level: LogLevel.SECURITY,
  });
}

/**
 * Log failed operations
 */
async function logFailure(action, resource, req, error, details = {}) {
  await createAuditLog({
    userId: req.user?.id || null,
    userRole: req.user?.role || 'anonymous',
    action,
    resource,
    outcome: 'failure',
    ipAddress: req.ip || req.connection?.remoteAddress,
    userAgent: req.get('user-agent'),
    details: {
      ...details,
      error: error.message || error,
    },
  });
}

/**
 * Middleware to automatically log requests
 */
function auditMiddleware(options = {}) {
  return async (req, res, next) => {
    const {
      action = ActionType.READ,
      resource,
      extractResourceId = (req) => req.params.id,
    } = options;
    
    // Store original methods
    const originalJson = res.json;
    const originalSend = res.send;
    
    // Override response methods to capture outcome
    res.json = function(data) {
      const outcome = res.statusCode < 400 ? 'success' : 'failure';
      
      if (resource) {
        const resourceId = extractResourceId(req);
        createAuditLog({
          userId: req.user?.id,
          userRole: req.user?.role,
          action,
          resource,
          resourceId,
          outcome,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          details: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
          },
        }).catch(console.error);
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
}

/**
 * Get audit logs with filters
 */
async function getAuditLogs(filters = {}, pagination = {}) {
  const {
    userId,
    userRole,
    action,
    resource,
    outcome,
    startDate,
    endDate,
    level,
  } = filters;
  
  const {
    page = 1,
    limit = 50,
    sort = { timestamp: -1 },
  } = pagination;
  
  const query = {};
  
  if (userId) query.userId = userId;
  if (userRole) query.userRole = userRole;
  if (action) query.action = action;
  if (resource) query.resource = resource;
  if (outcome) query.outcome = outcome;
  if (level) query.level = level;
  
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }
  
  const skip = (page - 1) * limit;
  
  const [logs, total] = await Promise.all([
    Logs.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('userId', 'username fullName')
      .lean(),
    Logs.countDocuments(query),
  ]);
  
  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get audit statistics
 */
async function getAuditStats(filters = {}) {
  const { startDate, endDate, userRole } = filters;
  
  const matchStage = {};
  
  if (startDate || endDate) {
    matchStage.timestamp = {};
    if (startDate) matchStage.timestamp.$gte = new Date(startDate);
    if (endDate) matchStage.timestamp.$lte = new Date(endDate);
  }
  
  if (userRole) matchStage.userRole = userRole;
  
  const stats = await Logs.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalLogs: { $sum: 1 },
        successCount: {
          $sum: { $cond: [{ $eq: ['$outcome', 'success'] }, 1, 0] }
        },
        failureCount: {
          $sum: { $cond: [{ $eq: ['$outcome', 'failure'] }, 1, 0] }
        },
        securityEvents: {
          $sum: { $cond: [{ $eq: ['$level', 'security'] }, 1, 0] }
        },
        actionBreakdown: { $push: '$action' },
      }
    },
  ]);
  
  return stats[0] || {
    totalLogs: 0,
    successCount: 0,
    failureCount: 0,
    securityEvents: 0,
  };
}

module.exports = {
  LogLevel,
  ActionType,
  createAuditLog,
  logAuthEvent,
  logCrudOperation,
  logAdminAction,
  logSecurityEvent,
  logFailure,
  auditMiddleware,
  getAuditLogs,
  getAuditStats,
};
