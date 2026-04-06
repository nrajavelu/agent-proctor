/**
 * Database connection management
 */

import { Pool } from 'pg';
import { logger } from '../utils/logger';
import { extendedConfig as config } from '../config';
import { DatabaseSchema } from './schema';

class DatabaseManager {
  private pool: Pool | null = null;
  private schema: DatabaseSchema | null = null;

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing database connection...');

      this.pool = new Pool({
        connectionString: config.databaseUrl,
        ssl: config.isProduction ? { rejectUnauthorized: false } : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000
      });

      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      // Initialize schema
      this.schema = new DatabaseSchema(this.pool);
      await this.schema.runMigrations();

      logger.info('Database connection initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database connection:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.schema = null;
      logger.info('Database connection closed');
    }
  }

  getPool(): Pool {
    if (!this.pool) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.pool;
  }

  getSchema(): DatabaseSchema {
    if (!this.schema) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.schema;
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.pool) return false;
      
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      return true;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const databaseManager = new DatabaseManager();