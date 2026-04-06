/**
 * API Key management service for organizations
 */

import { Pool } from 'pg';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger';
import { redisManager } from '../utils/redis';
import { extendedConfig as config } from '../config';

export interface ApiKey {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  publicKey: string;
  scopes: string[];
  permissions: Record<string, any>;
  rateLimit: number;
  lastUsedAt?: Date;
  usageCount: number;
  expiresAt?: Date;
  enabled: boolean;
  createdBy?: string;
  createdAt: Date;
  revokedAt?: Date;
  revokedBy?: string;
  revokedReason?: string;
}

export interface CreateApiKeyRequest {
  name: string;
  description?: string;
  scopes?: string[];
  permissions?: Record<string, any>;
  rateLimit?: number;
  expiresAt?: Date;
  createdBy?: string;
}

export interface ApiKeyWithSecret {
  apiKey: ApiKey;
  secretKey: string;
}

export interface ApiKeyUsage {
  keyId: string;
  timestamp: Date;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  userAgent?: string;
  ipAddress?: string;
}

export interface ApiKeyStats {
  totalKeys: number;
  activeKeys: number;
  revokedKeys: number;
  expiredKeys: number;
  totalRequests: number;
  requestsToday: number;
  averageResponseTime: number;
}

export class ApiKeyService {
  constructor(private readonly pool: Pool) {}

  async createApiKey(orgId: string, data: CreateApiKeyRequest): Promise<ApiKeyWithSecret> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Generate key pair
      const keyId = crypto.randomBytes(8).toString('hex');
      const publicKey = `pk_org_${keyId}`;
      const secretKey = `sk_org_${crypto.randomBytes(24).toString('hex')}`;
      
      // Hash the secret key
      const secretKeyHash = await bcrypt.hash(secretKey, 10);
      
      // Insert API key
      const result = await client.query(
        `INSERT INTO organization_api_keys (
          org_id, name, description, public_key, secret_key_hash,
          scopes, permissions, rate_limit, expires_at, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          orgId,
          data.name,
          data.description,
          publicKey,
          secretKeyHash,
          data.scopes || ['read', 'write'],
          JSON.stringify(data.permissions || {}),
          data.rateLimit || 1000,
          data.expiresAt,
          data.createdBy
        ]
      );
      
      await client.query('COMMIT');
      
      const apiKey = this.mapRowToApiKey(result.rows[0]);
      
      // Clear cache
      await this.invalidateCache(orgId);
      
      logger.info(`API key created: ${apiKey.name} (${apiKey.publicKey})`, {
        organizationId: orgId,
        keyId: apiKey.id,
        scopes: apiKey.scopes
      });
      
      return {
        apiKey,
        secretKey
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating API key:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getApiKey(id: string): Promise<ApiKey | null> {
    const result = await this.pool.query(
      'SELECT * FROM organization_api_keys WHERE id = $1 AND revoked_at IS NULL',
      [id]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToApiKey(result.rows[0]);
  }

  async getApiKeyByPublicKey(publicKey: string): Promise<ApiKey | null> {
    const cacheKey = `apikey:${publicKey}`;
    const cached = await redisManager.get<ApiKey>(cacheKey);
    if (cached) {
      return cached;
    }
    
    const result = await this.pool.query(
      'SELECT * FROM organization_api_keys WHERE public_key = $1 AND enabled = true AND revoked_at IS NULL',
      [publicKey]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const apiKey = this.mapRowToApiKey(result.rows[0]);
    
    // Check if key is expired
    if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
      return null;
    }
    
    // Cache for 5 minutes
    await redisManager.set(cacheKey, apiKey, 300);
    
    return apiKey;
  }

  async verifyApiKey(publicKey: string, secretKey: string): Promise<ApiKey | null> {
    const apiKey = await this.getApiKeyByPublicKey(publicKey);
    
    if (!apiKey) {
      return null;
    }
    
    // Get the hashed secret from database
    const result = await this.pool.query(
      'SELECT secret_key_hash FROM organization_api_keys WHERE id = $1',
      [apiKey.id]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const secretKeyHash = result.rows[0].secret_key_hash;
    
    // Verify the secret key
    const isValid = await bcrypt.compare(secretKey, secretKeyHash);
    
    if (!isValid) {
      logger.warn(`Invalid secret key for API key: ${publicKey}`);
      return null;
    }
    
    // Update last used timestamp
    await this.updateLastUsed(apiKey.id);
    
    return apiKey;
  }

  async listApiKeys(
    orgId: string,
    includeRevoked: boolean = false
  ): Promise<ApiKey[]> {
    let query = 'SELECT * FROM organization_api_keys WHERE org_id = $1';
    
    if (!includeRevoked) {
      query += ' AND revoked_at IS NULL';
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await this.pool.query(query, [orgId]);
    
    return result.rows.map(row => this.mapRowToApiKey(row));
  }

  async updateApiKey(
    id: string,
    updates: {
      name?: string;
      description?: string;
      scopes?: string[];
      permissions?: Record<string, any>;
      rateLimit?: number;
      enabled?: boolean;
    }
  ): Promise<ApiKey> {
    const fields = [];
    const values = [];
    let paramIndex = 1;
    
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        fields.push(`${dbField} = $${paramIndex}`);
        
        if (typeof value === 'object') {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
        paramIndex++;
      }
    }
    
    if (fields.length === 0) {
      throw new Error('No fields to update');
    }
    
    fields.push('updated_at = NOW()');
    values.push(id);
    
    const result = await this.pool.query(
      `UPDATE organization_api_keys SET ${fields.join(', ')} WHERE id = $${paramIndex} AND revoked_at IS NULL RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      throw new Error('API key not found');
    }
    
    const apiKey = this.mapRowToApiKey(result.rows[0]);
    
    // Clear cache
    await this.invalidateCache(apiKey.orgId);
    await redisManager.del(`apikey:${apiKey.publicKey}`);
    
    logger.info(`API key updated: ${apiKey.publicKey}`, {
      keyId: apiKey.id,
      updatedFields: Object.keys(updates)
    });
    
    return apiKey;
  }

  async revokeApiKey(id: string, revokedBy?: string, reason?: string): Promise<void> {
    const result = await this.pool.query(
      `UPDATE organization_api_keys 
       SET revoked_at = NOW(), revoked_by = $2, revoked_reason = $3 
       WHERE id = $1 AND revoked_at IS NULL 
       RETURNING *`,
      [id, revokedBy, reason]
    );
    
    if (result.rows.length === 0) {
      throw new Error('API key not found or already revoked');
    }
    
    const apiKey = this.mapRowToApiKey(result.rows[0]);
    
    // Clear cache
    await this.invalidateCache(apiKey.orgId);
    await redisManager.del(`apikey:${apiKey.publicKey}`);
    
    logger.info(`API key revoked: ${apiKey.publicKey}`, {
      keyId: apiKey.id,
      revokedBy,
      reason
    });
  }

  async logUsage(keyId: string, usage: Omit<ApiKeyUsage, 'keyId'>): Promise<void> {
    try {
      // Log usage to database (you might want to use a separate table or time-series DB)
      await this.pool.query(
        `INSERT INTO api_key_usage_logs 
         (key_id, timestamp, endpoint, method, status_code, response_time, user_agent, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          keyId,
          usage.timestamp,
          usage.endpoint,
          usage.method,
          usage.statusCode,
          usage.responseTime,
          usage.userAgent,
          usage.ipAddress
        ]
      );
      
      // Update usage count
      await this.pool.query(
        'UPDATE organization_api_keys SET usage_count = usage_count + 1 WHERE id = $1',
        [keyId]
      );
    } catch (error) {
      // Don't let logging failures affect the main request
      logger.error('Failed to log API key usage:', error);
    }
  }

  async checkRateLimit(keyId: string, windowSeconds: number = 3600): Promise<{
    allowed: boolean;
    limit: number;
    remaining: number;
    resetTime: number;
  }> {
    const apiKey = await this.getApiKey(keyId);
    if (!apiKey) {
      throw new Error('API key not found');
    }
    
    const rateLimitResult = await redisManager.incrementRateLimit(
      `apikey:${keyId}`,
      windowSeconds,
      apiKey.rateLimit
    );
    
    return {
      allowed: !rateLimitResult.blocked,
      limit: apiKey.rateLimit,
      remaining: Math.max(0, apiKey.rateLimit - rateLimitResult.count),
      resetTime: rateLimitResult.resetTime
    };
  }

  async getApiKeyStats(orgId: string): Promise<ApiKeyStats> {
    const cacheKey = `apikey:stats:${orgId}`;
    const cached = await redisManager.get<ApiKeyStats>(cacheKey);
    if (cached) {
      return cached;
    }
    
    const result = await this.pool.query(`
      SELECT 
        COUNT(*) as total_keys,
        COUNT(CASE WHEN enabled = true AND revoked_at IS NULL THEN 1 END) as active_keys,
        COUNT(CASE WHEN revoked_at IS NOT NULL THEN 1 END) as revoked_keys,
        COUNT(CASE WHEN expires_at < NOW() THEN 1 END) as expired_keys,
        COALESCE(SUM(usage_count), 0) as total_requests
      FROM organization_api_keys 
      WHERE org_id = $1
    `, [orgId]);
    
    const stats: ApiKeyStats = {
      totalKeys: parseInt(result.rows[0].total_keys),
      activeKeys: parseInt(result.rows[0].active_keys),
      revokedKeys: parseInt(result.rows[0].revoked_keys),
      expiredKeys: parseInt(result.rows[0].expired_keys),
      totalRequests: parseInt(result.rows[0].total_requests),
      requestsToday: 0, // Would need usage logs table to calculate
      averageResponseTime: 0 // Would need usage logs table to calculate
    };
    
    // Cache for 15 minutes
    await redisManager.set(cacheKey, stats, 900);
    
    return stats;
  }

  private async updateLastUsed(keyId: string): Promise<void> {
    try {
      await this.pool.query(
        'UPDATE organization_api_keys SET last_used_at = NOW() WHERE id = $1',
        [keyId]
      );
    } catch (error) {
      // Don't let this failure affect the main request
      logger.error('Failed to update last used timestamp:', error);
    }
  }

  private mapRowToApiKey(row: any): ApiKey {
    return {
      id: row.id,
      orgId: row.org_id,
      name: row.name,
      description: row.description,
      publicKey: row.public_key,
      scopes: row.scopes,
      permissions: typeof row.permissions === 'string' ? JSON.parse(row.permissions) : row.permissions,
      rateLimit: row.rate_limit,
      lastUsedAt: row.last_used_at ? new Date(row.last_used_at) : undefined,
      usageCount: row.usage_count,
      expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
      enabled: row.enabled,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      revokedAt: row.revoked_at ? new Date(row.revoked_at) : undefined,
      revokedBy: row.revoked_by,
      revokedReason: row.revoked_reason
    };
  }

  private async invalidateCache(orgId: string): Promise<void> {
    await redisManager.del(`apikey:stats:${orgId}`);
  }
}