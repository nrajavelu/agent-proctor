/**
 * Logging middleware for request/response tracking
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from './auth.middleware';
import { v4 as uuidv4 } from 'uuid';

export interface RequestLog {
  requestId: string;
  method: string;
  url: string;
  userAgent?: string;
  ip: string;
  userId?: string;
  userRole?: string;
  orgId?: string;
  timestamp: Date;
  duration?: number;
  statusCode?: number;
  contentLength?: number;
  error?: string;
}

// Request logging middleware
export function requestLogging() {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const requestId = uuidv4();
    
    // Add request ID to headers for tracking
    req.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);
    
    const requestLog: RequestLog = {
      requestId,
      method: req.method,
      url: req.originalUrl || req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip || 'unknown',
      timestamp: new Date()
    };
    
    // Add user info if authenticated
    const user = (req as AuthenticatedRequest).user;
    if (user) {
      requestLog.userId = user.id;
      requestLog.userRole = user.role;
      requestLog.orgId = user.orgId;
    }
    
    // Log request start
    logger.info('Request started', {
      requestId,
      method: req.method,
      url: req.originalUrl || req.url,
      ip: req.ip || 'unknown',
      userAgent: req.get('User-Agent'),
      userId: user?.id,
      userRole: user?.role,
      orgId: user?.orgId
    });
    
    // Override res.send to capture response info
    const originalSend = res.send;
    res.send = function(body) {
      requestLog.duration = Date.now() - startTime;
      requestLog.statusCode = res.statusCode;
      requestLog.contentLength = Buffer.byteLength(body || '', 'utf8');
      
      // Log request completion
      const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
      const logMessage = res.statusCode >= 400 ? 'Request failed' : 'Request completed';
      
      logger.log(logLevel, logMessage, {
        requestId,
        method: req.method,
        url: req.originalUrl || req.url,
        statusCode: res.statusCode,
        duration: requestLog.duration,
        contentLength: requestLog.contentLength,
        userId: user?.id,
        userRole: user?.role,
        orgId: user?.orgId
      });
      
      return originalSend.call(this, body);
    };
    
    // Capture uncaught errors
    res.on('error', (error: Error) => {
      requestLog.error = error.message;
      requestLog.duration = Date.now() - startTime;
      requestLog.statusCode = res.statusCode;
      
      logger.error('Request error', {
        requestId,
        method: req.method,
        url: req.originalUrl || req.url,
        error: error.message,
        stack: error.stack,
        duration: requestLog.duration,
        userId: user?.id,
        userRole: user?.role,
        orgId: user?.orgId
      });
    });
    
    next();
  };
}

// Error logging middleware
export function errorLogging() {
  return (error: Error, req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthenticatedRequest).user;
    
    logger.error('Unhandled error in request', {
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl || req.url,
      error: error.message,
      stack: error.stack,
      userId: user?.id,
      userRole: user?.role,
      orgId: user?.orgId,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    next(error);
  };
}

// Audit logging for sensitive operations
export function auditLog(operation: string, details?: Record<string, any>) {
  return (req: Request & { user?: any }, res: Response, next: NextFunction) => {
    const user = req.user;
    
    // Log the operation attempt
    logger.info('Audit: Operation attempted', {
      operation,
      requestId: req.requestId,
      userId: user?.id,
      userRole: user?.role,
      orgId: user?.orgId,
      ip: req.ip || 'unknown',
      timestamp: new Date(),
      details: {
        ...details,
        params: req.params,
        query: req.query
      }
    });
    
    // Override res.send to log completion
    const originalSend = res.send;
    res.send = function(body) {
      const success = res.statusCode >= 200 && res.statusCode < 400;
      
      logger.info(`Audit: Operation ${success ? 'completed' : 'failed'}`, {
        operation,
        requestId: req.requestId,
        userId: user?.id,
        userRole: user?.role,
        orgId: user?.orgId,
        ip: req.ip || 'unknown',
        statusCode: res.statusCode,
        success,
        timestamp: new Date()
      });
      
      return originalSend.call(this, body);
    };
    
    next();
  };
}

// Performance monitoring middleware
export function performanceMonitoring() {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage();
    
    res.on('finish', () => {
      const endTime = process.hrtime.bigint();
      const endMemory = process.memoryUsage();
      
      const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
      const memoryDelta = {
        rss: endMemory.rss - startMemory.rss,
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - startMemory.heapTotal,
        external: endMemory.external - startMemory.external
      };
      
      // Log performance metrics for slow requests
      if (duration > 1000) { // Log requests slower than 1 second
        const user = (req as AuthenticatedRequest).user;
        
        logger.warn('Slow request detected', {
          requestId: req.requestId,
          method: req.method,
          url: req.originalUrl || req.url,
          duration,
          statusCode: res.statusCode,
          memoryDelta,
          userId: user?.id,
          orgId: user?.orgId
        });
      }
    });
    
    next();
  };
}

// Sensitive data filtering for logs
export function sanitizeLogData(data: any): any {
  const sensitiveFields = [
    'password',
    'secret',
    'token',
    'key',
    'authorization',
    'credit_card',
    'ssn',
    'social_security'
  ];
  
  if (typeof data !== 'object' || data === null) {
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeLogData(item));
  }
  
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(data)) {
    const keyLower = key.toLowerCase();
    
    if (sensitiveFields.some(field => keyLower.includes(field))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeLogData(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

// Extend Request interface for request ID
declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}