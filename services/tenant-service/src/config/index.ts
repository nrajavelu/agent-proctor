/**
 * Configuration management for Tenant Service
 */

import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration schema
const configSchema = z.object({
  // Service configuration
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  port: z.coerce.number().default(3005),
  host: z.string().default('0.0.0.0'),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  
  // Database configuration
  databaseUrl: z.string().min(1, 'Database URL is required'),
  redisUrl: z.string().default('redis://localhost:6379'),
  
  // JWT configuration
  jwtSecret: z.string().min(32, 'JWT secret must be at least 32 characters'),
  jwtExpiresIn: z.string().default('7d'),
  apiKeySecret: z.string().min(32, 'API key secret must be at least 32 characters'),
  
  // Storage configuration
  storageType: z.enum(['minio', 's3']).default('minio'),
  minioEndpoint: z.string().default('localhost:9000'),
  minioAccessKey: z.string().default('minioadmin'),
  minioSecretKey: z.string().default('minioadmin'),
  minioUseSsl: z.coerce.boolean().default(false),
  
  // AWS S3 configuration
  awsRegion: z.string().default('us-east-1'),
  awsAccessKeyId: z.string().optional(),
  awsSecretAccessKey: z.string().optional(),
  
  // Keycloak configuration
  keycloakBaseUrl: z.string().default('http://localhost:8080'),
  keycloakAdminUser: z.string().default('admin'),
  keycloakAdminPassword: z.string().default('admin'),
  keycloakMasterRealm: z.string().default('master'),
  
  // Multi-tenant limits
  maxOrgsPerSuperAdmin: z.coerce.number().default(100),
  defaultOrgStorageLimitGb: z.coerce.number().default(100),
  defaultOrgSessionLimit: z.coerce.number().default(1000),
  orgTrialPeriodDays: z.coerce.number().default(30),
  
  // Branding configuration
  maxLogoSizeMb: z.coerce.number().default(5),
  allowedImageTypes: z.string().default('image/jpeg,image/png,image/webp,image/svg+xml'),
  maxCssSizeKb: z.coerce.number().default(500),
  brandingCdnUrl: z.string().default('https://cdn.ayan.nunmai.local'),
  
  // API configuration
  corsOrigins: z.string().transform(str => str.split(',')).default('http://localhost:3001,http://localhost:3003,http://localhost:3006'),
  rateLimitWindowMs: z.coerce.number().default(60000),
  rateLimitMaxRequests: z.coerce.number().default(100),
  authEnabled: z.coerce.boolean().default(true),
  
  // Webhooks
  webhookTimeoutMs: z.coerce.number().default(30000),
  webhookRetryCount: z.coerce.number().default(3),
  webhookSecretKey: z.string().min(16, 'Webhook secret must be at least 16 characters'),
  
  // Monitoring
  metricsEnabled: z.coerce.boolean().default(true),
  healthCheckInterval: z.coerce.number().default(30),
  performanceMonitoring: z.coerce.boolean().default(true),
  
  // Email configuration
  emailProvider: z.enum(['smtp', 'ses']).default('smtp'),
  smtpHost: z.string().default('localhost'),
  smtpPort: z.coerce.number().default(587),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  fromEmail: z.string().email().default('noreply@ayan.nunmai.local'),
  
  // SDK configuration
  sdkCdnUrl: z.string().default('https://sdk.ayan.nunmai.local'),
  sdkVersion: z.string().default('1.0.0'),
  agentJsVersion: z.string().default('1.0.0')
});

// Parse and validate configuration
const rawConfig = {
  nodeEnv: process.env.NODE_ENV,
  port: process.env.PORT,
  host: process.env.HOST,
  logLevel: process.env.LOG_LEVEL,
  
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL,
  
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN,
  apiKeySecret: process.env.API_KEY_SECRET,
  
  storageType: process.env.STORAGE_TYPE,
  minioEndpoint: process.env.MINIO_ENDPOINT,
  minioAccessKey: process.env.MINIO_ACCESS_KEY,
  minioSecretKey: process.env.MINIO_SECRET_KEY,
  minioUseSsl: process.env.MINIO_USE_SSL,
  
  awsRegion: process.env.AWS_REGION,
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  
  keycloakBaseUrl: process.env.KEYCLOAK_BASE_URL,
  keycloakAdminUser: process.env.KEYCLOAK_ADMIN_USER,
  keycloakAdminPassword: process.env.KEYCLOAK_ADMIN_PASSWORD,
  keycloakMasterRealm: process.env.KEYCLOAK_MASTER_REALM,
  
  maxOrgsPerSuperAdmin: process.env.MAX_ORGS_PER_SUPER_ADMIN,
  defaultOrgStorageLimitGb: process.env.DEFAULT_ORG_STORAGE_LIMIT_GB,
  defaultOrgSessionLimit: process.env.DEFAULT_ORG_SESSION_LIMIT,
  orgTrialPeriodDays: process.env.ORG_TRIAL_PERIOD_DAYS,
  
  maxLogoSizeMb: process.env.MAX_LOGO_SIZE_MB,
  allowedImageTypes: process.env.ALLOWED_IMAGE_TYPES,
  maxCssSizeKb: process.env.MAX_CSS_SIZE_KB,
  brandingCdnUrl: process.env.BRANDING_CDN_URL,
  
  corsOrigins: process.env.CORS_ORIGINS,
  rateLimitWindowMs: process.env.RATE_LIMIT_WINDOW_MS,
  rateLimitMaxRequests: process.env.RATE_LIMIT_MAX_REQUESTS,
  authEnabled: process.env.AUTH_ENABLED,
  
  webhookTimeoutMs: process.env.WEBHOOK_TIMEOUT_MS,
  webhookRetryCount: process.env.WEBHOOK_RETRY_COUNT,
  webhookSecretKey: process.env.WEBHOOK_SECRET_KEY,
  
  metricsEnabled: process.env.METRICS_ENABLED,
  healthCheckInterval: process.env.HEALTH_CHECK_INTERVAL,
  performanceMonitoring: process.env.PERFORMANCE_MONITORING,
  
  emailProvider: process.env.EMAIL_PROVIDER,
  smtpHost: process.env.SMTP_HOST,
  smtpPort: process.env.SMTP_PORT,
  smtpUser: process.env.SMTP_USER,
  smtpPassword: process.env.SMTP_PASSWORD,
  fromEmail: process.env.FROM_EMAIL,
  
  sdkCdnUrl: process.env.SDK_CDN_URL,
  sdkVersion: process.env.SDK_VERSION,
  agentJsVersion: process.env.AGENT_JS_VERSION
};

// Validate configuration
export const config = configSchema.parse(rawConfig);

// Add computed properties
export const extendedConfig = {
  ...config,
  isDevelopment: config.nodeEnv === 'development',
  isProduction: config.nodeEnv === 'production',
  isTest: config.nodeEnv === 'test',
  allowedImageTypesArray: config.allowedImageTypes.split(','),
  maxLogoSizeBytes: config.maxLogoSizeMb * 1024 * 1024,
  maxCssSizeBytes: config.maxCssSizeKb * 1024
};

// Export type
export type Config = typeof extendedConfig;