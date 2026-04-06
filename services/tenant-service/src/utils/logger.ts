/**
 * Logger utility for tenant service
 */

import winston from 'winston';
import { extendedConfig as config } from '../config';

// Create logger instance
const logger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    config.isProduction
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
  ),
  defaultMeta: {
    service: 'tenant-service',
    environment: config.nodeEnv
  },
  transports: [
    new winston.transports.Console(),
    // File transport for production
    ...(config.isProduction
      ? [
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error'
          }),
          new winston.transports.File({
            filename: 'logs/combined.log'
          })
        ]
      : [])
  ]
});

export { logger };