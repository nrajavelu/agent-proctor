/**
 * Tenant Service - Multi-tenant organization management
 * Main application entry point
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { logger } from './utils/logger';
import { extendedConfig as config } from './config';
import { databaseManager } from './database/connection';
import { redisManager } from './utils/redis';
import { requestLogging, errorLogging, performanceMonitoring } from './middleware/logging.middleware';
import { adaptiveRateLimit } from './middleware/rate-limit.middleware';
import organizationsRoutes from './routes/organizations.routes';
import apiKeysRoutes from './routes/api-keys.routes';
import ssoRoutes from './routes/sso.routes';

class TenantService {
  private app: express.Application;
  private server: any;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Basic middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"]
        }
      },
      crossOriginEmbedderPolicy: false
    }));

    this.app.use(compression());
    
    this.app.use(cors({
      origin: config.corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-ID']
    }));

    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Trust proxy for correct IP detection
    this.app.set('trust proxy', 1);

    // Logging middleware
    this.app.use(requestLogging());
    
    if (config.performanceMonitoring) {
      this.app.use(performanceMonitoring());
    }

    // Rate limiting
    this.app.use(adaptiveRateLimit());

    // Database connection will be stored after initialization
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      try {
        const health = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          service: 'tenant-service',
          version: process.env.npm_package_version || '1.0.0',
          environment: config.nodeEnv,
          checks: {
            database: await databaseManager.healthCheck(),
            redis: await redisManager.healthCheck(),
            memory: process.memoryUsage(),
            uptime: process.uptime()
          }
        };

        const overallHealthy = health.checks.database && health.checks.redis;
        
        if (!overallHealthy) {
          health.status = 'unhealthy';
          return res.status(503).json(health);
        }

        res.json(health);
      } catch (error) {
        logger.error('Health check failed:', error);
        res.status(503).json({
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // API routes
    this.app.use('/api/v1/organizations', organizationsRoutes);
    this.app.use('/api/v1/organizations/:orgId/api-keys', apiKeysRoutes);
    this.app.use('/api/v1/organizations/:orgId/sso', ssoRoutes);

    // API documentation endpoint
    this.app.get('/api/v1', (req, res) => {
      res.json({
        service: 'AYAN.AI Tenant Service',
        version: '1.0.0',
        description: 'Multi-tenant organization management and white-label branding',
        endpoints: {
          general: [
            'GET    /health                                    - Health check',
            'GET    /api/v1                                    - This endpoint'
          ],
          organizations: [
            'GET    /api/v1/organizations                      - List organizations',
            'POST   /api/v1/organizations                      - Create organization',
            'GET    /api/v1/organizations/:orgId              - Get organization',
            'PUT    /api/v1/organizations/:orgId              - Update organization',
            'DELETE /api/v1/organizations/:orgId              - Delete organization',
            'GET    /api/v1/organizations/stats               - Organization statistics'
          ],
          branding: [
            'GET    /api/v1/organizations/:orgId/branding     - Get branding config',
            'PUT    /api/v1/organizations/:orgId/branding/theme   - Update theme',
            'PUT    /api/v1/organizations/:orgId/branding/content - Update content',
            'POST   /api/v1/organizations/:orgId/branding/assets  - Upload assets',
            'POST   /api/v1/organizations/:orgId/branding/validate - Validate accessibility',
            'POST   /api/v1/organizations/:orgId/branding/preview  - Generate preview'
          ],
          apiKeys: [
            'GET    /api/v1/organizations/:orgId/api-keys     - List API keys',
            'POST   /api/v1/organizations/:orgId/api-keys     - Create API key',
            'GET    /api/v1/organizations/:orgId/api-keys/:keyId - Get API key',
            'PUT    /api/v1/organizations/:orgId/api-keys/:keyId - Update API key',
            'DELETE /api/v1/organizations/:orgId/api-keys/:keyId - Revoke API key',
            'GET    /api/v1/organizations/:orgId/api-keys/stats - API key statistics'
          ],
          sso: [
            'GET    /api/v1/organizations/:orgId/sso          - List SSO configs',
            'POST   /api/v1/organizations/:orgId/sso          - Create SSO config',
            'GET    /api/v1/organizations/:orgId/sso/:configId - Get SSO config',
            'PUT    /api/v1/organizations/:orgId/sso/:configId - Update SSO config',
            'DELETE /api/v1/organizations/:orgId/sso/:configId - Delete SSO config',
            'POST   /api/v1/organizations/:orgId/sso/:configId/test - Test SSO config',
            'POST   /api/v1/organizations/:orgId/sso/:configId/enable - Enable SSO config',
            'POST   /api/v1/organizations/:orgId/sso/:configId/disable - Disable SSO config'
          ]
        },
        authentication: {
          methods: ['Bearer JWT', 'API Key (X-API-Key header)'],
          roles: ['super_admin', 'org_admin', 'org_user']
        },
        rateLimit: {
          window: `${config.rateLimitWindowMs}ms`,
          maxRequests: config.rateLimitMaxRequests,
          adaptive: 'Based on user role and auth method'
        }
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({ 
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method
      });
    });
  }

  private setupErrorHandling(): void {
    // Error logging middleware
    this.app.use(errorLogging());

    // Global error handler
    this.app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Unhandled application error:', error);

      // Don't leak error details in production
      const errorResponse = {
        error: 'Internal server error',
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      };

      if (config.isDevelopment) {
        (errorResponse as any).details = error.message;
        (errorResponse as any).stack = error.stack;
      }

      res.status(500).json(errorResponse);
    });
  }

  public async start(): Promise<void> {
    try {
      // Initialize database
      await databaseManager.initialize();
      logger.info('Database initialized');

      // Store database connection for routes
      this.app.locals.db = databaseManager.getPool();

      // Initialize Redis
      await redisManager.initialize();
      logger.info('Redis initialized');

      // Start server
      this.server = this.app.listen(config.port, config.host, () => {
        logger.info(`Tenant service started`, {
          host: config.host,
          port: config.port,
          environment: config.nodeEnv,
          logLevel: config.logLevel,
          authEnabled: config.authEnabled,
          corsOrigins: config.corsOrigins.join(', ')
        });
      });

      // Set up graceful shutdown
      this.setupGracefulShutdown();

    } catch (error) {
      logger.error('Failed to start tenant service:', error);
      process.exit(1);
    }
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, starting graceful shutdown...`);

      try {
        // Stop accepting new connections
        if (this.server) {
          this.server.close(() => {
            logger.info('HTTP server closed');
          });
        }

        // Close database connections
        await databaseManager.close();
        logger.info('Database connections closed');

        // Close Redis connection
        await redisManager.close();
        logger.info('Redis connection closed');

        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', error);
      shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection at:', promise, 'reason:', reason);
      shutdown('unhandledRejection');
    });
  }

  public getApp(): express.Application {
    return this.app;
  }
}

// Start the service if this file is run directly
if (require.main === module) {
  const service = new TenantService();
  service.start().catch(error => {
    logger.error('Failed to start service:', error);
    process.exit(1);
  });
}

export default TenantService;