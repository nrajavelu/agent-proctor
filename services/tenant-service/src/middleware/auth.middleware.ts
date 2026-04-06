/**
 * Authentication middleware for tenant service
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { extendedConfig as config } from '../config';
import { ApiKeyService } from '../services/apikey.service';
import { redisManager } from '../utils/redis';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string;
  role: string;
  orgId?: string;
  scopes: string[];
  authType: 'jwt' | 'apikey';
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

// JWT Authentication middleware
export function jwtAuth(requiredRole?: string, requiredScopes?: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!config.authEnabled) {
        // Skip auth in development if disabled
        (req as AuthenticatedRequest).user = {
          id: 'dev-user',
          email: 'dev@ayan.nunmai.local',
          role: 'super_admin',
          scopes: ['*'],
          authType: 'jwt'
        };
        return next();
      }
      
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No valid authorization header' });
      }
      
      const token = authHeader.substring(7);
      
      // Verify JWT token
      const decoded = jwt.verify(token, config.jwtSecret) as any;
      
      // Check if token is blacklisted
      const isBlacklisted = await redisManager.exists(`blacklist:${token}`);
      if (isBlacklisted) {
        return res.status(401).json({ error: 'Token has been revoked' });
      }
      
      // Extract user info from token
      const user: AuthenticatedUser = {
        id: decoded.sub || decoded.user_id,
        email: decoded.email,
        name: decoded.name || decoded.preferred_username,
        role: decoded.realm_access?.roles?.find((r: string) => 
          ['super_admin', 'org_admin', 'org_user'].includes(r)
        ) || 'org_user',
        orgId: decoded.org_id,
        scopes: decoded.scope?.split(' ') || ['read'],
        authType: 'jwt'
      };
      
      // Check role requirement
      if (requiredRole) {
        const roleHierarchy = ['org_user', 'org_admin', 'super_admin'];
        const userRoleIndex = roleHierarchy.indexOf(user.role);
        const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);
        
        if (userRoleIndex < requiredRoleIndex) {
          return res.status(403).json({ error: 'Insufficient role privileges' });
        }
      }
      
      // Check scope requirements
      if (requiredScopes && requiredScopes.length > 0) {
        const hasRequiredScopes = requiredScopes.every(scope => 
          user.scopes.includes(scope) || user.scopes.includes('*')
        );
        
        if (!hasRequiredScopes) {
          return res.status(403).json({ error: 'Insufficient scope privileges' });
        }
      }
      
      (req as AuthenticatedRequest).user = user;
      next();
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ error: 'Invalid token' });
      }
      
      logger.error('Auth middleware error:', error);
      res.status(500).json({ error: 'Internal authentication error' });
    }
  };
}

// API Key authentication middleware
export function apiKeyAuth(requiredScopes?: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const apiKeyHeader = req.headers['x-api-key'] as string;
      
      if (!apiKeyHeader) {
        return res.status(401).json({ error: 'API key is required' });
      }
      
      // Parse API key (format: pk_org_xxxx:sk_org_yyyy)
      const [publicKey, secretKey] = apiKeyHeader.split(':');
      
      if (!publicKey || !secretKey) {
        return res.status(401).json({ error: 'Invalid API key format' });
      }
      
      // Verify API key
      const apiKeyService = new ApiKeyService(req.app.locals.db);
      const apiKey = await apiKeyService.verifyApiKey(publicKey, secretKey);
      
      if (!apiKey) {
        return res.status(401).json({ error: 'Invalid API key' });
      }
      
      // Check rate limit
      const rateLimitResult = await apiKeyService.checkRateLimit(apiKey.id);
      
      if (!rateLimitResult.allowed) {
        res.set({
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimitResult.resetTime.toString()
        });
        return res.status(429).json({ error: 'Rate limit exceeded' });
      }
      
      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.resetTime.toString()
      });
      
      // Check scope requirements
      if (requiredScopes && requiredScopes.length > 0) {
        const hasRequiredScopes = requiredScopes.every(scope => 
          apiKey.scopes.includes(scope) || apiKey.scopes.includes('*')
        );
        
        if (!hasRequiredScopes) {
          return res.status(403).json({ error: 'Insufficient scope privileges' });
        }
      }
      
      // Create user object from API key
      const user: AuthenticatedUser = {
        id: apiKey.id,
        email: `apikey-${apiKey.id}@system`,
        role: 'org_admin', // API keys have org admin privileges
        orgId: apiKey.orgId,
        scopes: apiKey.scopes,
        authType: 'apikey'
      };
      
      // Log API key usage
      const usage = {
        timestamp: new Date(),
        endpoint: req.originalUrl || req.url,
        method: req.method,
        statusCode: res.statusCode,
        responseTime: 0, // Will be set by response time middleware
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      };
      
      // Log usage asynchronously
      setImmediate(() => {
        apiKeyService.logUsage(apiKey.id, usage).catch(error => {
          logger.error('Failed to log API key usage:', error);
        });
      });
      
      (req as AuthenticatedRequest).user = user;
      next();
    } catch (error) {
      logger.error('API key auth middleware error:', error);
      res.status(500).json({ error: 'Internal authentication error' });
    }
  };
}

// Combined authentication middleware (JWT or API Key)
export function auth(options: {
  requiredRole?: string;
  requiredScopes?: string[];
  allowApiKey?: boolean;
} = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const apiKeyHeader = req.headers['x-api-key'];
    
    // Determine auth method
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Use JWT authentication
      return jwtAuth(options.requiredRole, options.requiredScopes)(req, res, next);
    } else if (apiKeyHeader && options.allowApiKey) {
      // Use API key authentication
      return apiKeyAuth(options.requiredScopes)(req, res, next);
    } else {
      return res.status(401).json({ 
        error: 'Authentication required',
        acceptedMethods: ['Bearer token', ...(options.allowApiKey ? ['API key'] : [])]
      });
    }
  };
}

// Organization isolation middleware
export function orgIsolation(req: Request, res: Response, next: NextFunction) {
  const user = (req as AuthenticatedRequest).user;
  
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Super admins can access any organization
  if (user.role === 'super_admin') {
    return next();
  }
  
  // For other users, ensure they can only access their own organization
  const orgId = req.params.orgId || req.body.orgId;
  
  if (orgId && user.orgId && orgId !== user.orgId) {
    return res.status(403).json({ error: 'Access denied to this organization' });
  }
  
  next();
}

// Token blacklist utility
export async function blacklistToken(token: string, expiresIn: string = config.jwtExpiresIn): Promise<void> {
  try {
    // Calculate TTL based on token expiration
    const decoded = jwt.decode(token) as any;
    const expiresAt = decoded.exp * 1000; // Convert to milliseconds
    const ttl = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
    
    if (ttl > 0) {
      await redisManager.set(`blacklist:${token}`, true, ttl);
      logger.info('Token blacklisted', { tokenId: decoded.jti });
    }
  } catch (error) {
    logger.error('Failed to blacklist token:', error);
  }
}