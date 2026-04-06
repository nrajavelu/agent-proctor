/**
 * Redis connection and utilities
 */

import Redis from 'ioredis';
import { logger } from './logger';
import { extendedConfig as config } from '../config';

class RedisManager {
  private client: Redis | null = null;

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Redis connection...');

      this.client = new Redis(config.redisUrl, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true
      });

      // Event listeners
      this.client.on('connect', () => {
        logger.info('Redis client connected');
      });

      this.client.on('ready', () => {
        logger.info('Redis client ready');
      });

      this.client.on('error', (error) => {
        logger.error('Redis connection error:', error);
      });

      this.client.on('close', () => {
        logger.warn('Redis connection closed');
      });

      this.client.on('reconnecting', () => {
        logger.info('Redis reconnecting...');
      });

      // Connect
      await this.client.connect();

      logger.info('Redis connection initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Redis connection:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      logger.info('Redis connection closed');
    }
  }

  getClient(): Redis {
    if (!this.client) {
      throw new Error('Redis not initialized. Call initialize() first.');
    }
    return this.client;
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.client) return false;
      
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return false;
    }
  }

  // Cache utilities
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    if (!this.client) throw new Error('Redis not initialized');
    
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, serialized);
    } else {
      await this.client.set(key, serialized);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) throw new Error('Redis not initialized');
    
    const value = await this.client.get(key);
    return value ? JSON.parse(value) : null;
  }

  async del(key: string): Promise<void> {
    if (!this.client) throw new Error('Redis not initialized');
    
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client) throw new Error('Redis not initialized');
    
    const result = await this.client.exists(key);
    return result === 1;
  }

  // Session utilities
  async setSession(sessionId: string, data: any, ttlSeconds: number = 86400): Promise<void> {
    await this.set(`session:${sessionId}`, data, ttlSeconds);
  }

  async getSession<T>(sessionId: string): Promise<T | null> {
    return this.get<T>(`session:${sessionId}`);
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.del(`session:${sessionId}`);
  }

  // Rate limiting utilities
  async incrementRateLimit(identifier: string, windowSeconds: number, limit: number): Promise<{ count: number; resetTime: number; blocked: boolean }> {
    if (!this.client) throw new Error('Redis not initialized');
    
    const key = `ratelimit:${identifier}`;
    const now = Date.now();
    const window = windowSeconds * 1000;
    const resetTime = now + window;
    
    const multi = this.client.multi();
    multi.zremrangebyscore(key, 0, now - window);
    multi.zadd(key, now, now);
    multi.zcard(key);
    multi.expire(key, windowSeconds);
    
    const results = await multi.exec();
    const count = results![2][1] as number;
    
    return {
      count,
      resetTime,
      blocked: count > limit
    };
  }
}

// Export singleton instance
export const redisManager = new RedisManager();