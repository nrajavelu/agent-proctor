/**
 * Rate limiting middleware
 */

import { Request, Response, NextFunction } from 'express';
import { redisManager } from '../utils/redis';
import { logger } from '../utils/logger';
import { extendedConfig as config } from '../config';
import { AuthenticatedRequest } from './auth.middleware';

export interface RateLimitOptions {
  windowMs?: number;
  maxRequests?: number;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
  headers?: boolean;
}

// Default rate limit middleware
export function rateLimit(options: RateLimitOptions = {}) {
  const {
    windowMs = config.rateLimitWindowMs,
    maxRequests = config.rateLimitMaxRequests,
    keyGenerator = defaultKeyGenerator,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    message = 'Too many requests, please try again later',
    headers = true
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = keyGenerator(req);
      const windowSeconds = Math.floor(windowMs / 1000);
      
      const result = await redisManager.incrementRateLimit(key, windowSeconds, maxRequests);
      
      if (headers) {
        res.set({
          'X-RateLimit-Limit': maxRequests.toString(),
          'X-RateLimit-Remaining': Math.max(0, maxRequests - result.count).toString(),
          'X-RateLimit-Reset': result.resetTime.toString(),
          'X-RateLimit-Window': windowMs.toString()
        });
      }
      
      if (result.blocked) {
        logger.warn(`Rate limit exceeded for key: ${key}`, {
          key,
          count: result.count,
          limit: maxRequests,
          windowMs
        });
        
        return res.status(429).json({ 
          error: message,
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
        });
      }
      
      // Track response for conditional skipping
      const originalSend = res.send;
      res.send = function(body) {
        const statusCode = res.statusCode;
        const isSuccessful = statusCode >= 200 && statusCode < 400;
        
        // If we should skip this request, decrement the counter
        if ((skipSuccessfulRequests && isSuccessful) || 
            (skipFailedRequests && !isSuccessful)) {
          setImmediate(() => {
            redisManager.getClient().zrem(`ratelimit:${key}`, Date.now().toString())
              .catch(error => logger.error('Failed to adjust rate limit count:', error));
          });
        }
        
        return originalSend.call(this, body);
      };
      
      next();
    } catch (error) {
      logger.error('Rate limit middleware error:', error);
      // Continue without rate limiting on Redis errors
      next();
    }
  };
}

// Adaptive rate limiting based on user type
export function adaptiveRateLimit() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthenticatedRequest).user;
    
    let limits = {
      windowMs: config.rateLimitWindowMs,
      maxRequests: config.rateLimitMaxRequests
    };
    
    if (user) {
      // Different limits based on user role and auth method
      switch (user.role) {
        case 'super_admin':
          limits.maxRequests = config.rateLimitMaxRequests * 10;
          break;
        case 'org_admin':
          limits.maxRequests = config.rateLimitMaxRequests * 5;
          break;
        default:
          // Standard user limits
          break;
      }
      
      // API keys get higher limits
      if (user.authType === 'apikey') {
        limits.maxRequests = Math.max(limits.maxRequests, 1000);
      }
    }
    
    return rateLimit({
      ...limits,
      keyGenerator: (req: Request) => {
        const user = (req as AuthenticatedRequest).user;
        if (user) {
          return `user:${user.id}`;
        }
        return `ip:${req.ip}`;
      }
    })(req, res, next);
  };
}

// Endpoint-specific rate limiting
export function endpointRateLimit(endpointLimits: Record<string, { windowMs: number; maxRequests: number }>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const endpoint = `${req.method}:${req.route?.path || req.path}`;
    const limits = endpointLimits[endpoint];
    
    if (!limits) {
      return next();
    }
    
    return rateLimit({
      ...limits,
      keyGenerator: (req: Request) => {
        const user = (req as AuthenticatedRequest).user;
        const identifier = user ? user.id : req.ip;
        return `endpoint:${endpoint}:${identifier}`;
      }
    })(req, res, next);
  };
}

// Brute force protection for authentication endpoints
export function bruteForceProtection(options: {
  maxAttempts?: number;
  windowMs?: number;
  blockDurationMs?: number;
} = {}) {
  const {
    maxAttempts = 5,
    windowMs = 15 * 60 * 1000, // 15 minutes
    blockDurationMs = 60 * 60 * 1000 // 1 hour
  } = options;
  
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const identifier = req.body.email || req.body.username || req.ip;
      const key = `bruteforce:${identifier}`;
      
      // Check if currently blocked
      const blockKey = `bruteforce:block:${identifier}`;
      const isBlocked = await redisManager.exists(blockKey);
      
      if (isBlocked) {
        const blockTime = await redisManager.get(blockKey);
        return res.status(429).json({
          error: 'Account temporarily blocked due to too many failed attempts',
          blockedUntil: blockTime,
          retryAfter: Math.ceil((new Date(blockTime as string).getTime() - Date.now()) / 1000)
        });
      }
      
      // Track this attempt
      const windowSeconds = Math.floor(windowMs / 1000);
      const result = await redisManager.incrementRateLimit(key, windowSeconds, maxAttempts);
      
      if (result.blocked) {
        // Block the user
        const blockUntil = new Date(Date.now() + blockDurationMs);
        await redisManager.set(blockKey, blockUntil.toISOString(), Math.floor(blockDurationMs / 1000));
        
        logger.warn(`Brute force protection activated for: ${identifier}`, {
          attempts: result.count,
          maxAttempts,
          blockUntil
        });
        
        return res.status(429).json({
          error: 'Too many failed attempts. Account blocked temporarily.',
          blockedUntil: blockUntil,
          retryAfter: Math.ceil(blockDurationMs / 1000)
        });
      }
      
      // Store attempt count in request for potential cleanup on success
      req.bruteForceData = {
        key,
        attempts: result.count
      };
      
      next();
    } catch (error) {
      logger.error('Brute force protection error:', error);
      next();
    }
  };
}

// Clear brute force attempts on successful authentication
export function clearBruteForceOnSuccess(req: Request, res: Response, next: NextFunction) {
  const originalSend = res.send;
  
  res.send = function(body) {
    // Clear attempts if request was successful
    if (res.statusCode >= 200 && res.statusCode < 300 && req.bruteForceData) {
      setImmediate(() => {
        redisManager.del(req.bruteForceData!.key).catch(error => {
          logger.error('Failed to clear brute force attempts:', error);
        });
      });
    }
    
    return originalSend.call(this, body);
  };
  
  next();
}

// Default key generator
function defaultKeyGenerator(req: Request): string {
  const user = (req as AuthenticatedRequest).user;
  if (user) {
    return `user:${user.id}`;
  }
  return `ip:${req.ip}`;
}

// Extend Request interface for brute force data
declare global {
  namespace Express {
    interface Request {
      bruteForceData?: {
        key: string;
        attempts: number;
      };
    }
  }
}