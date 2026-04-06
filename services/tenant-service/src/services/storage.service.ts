/**
 * Storage service for multi-tenant assets and data
 */

import { Client as MinioClient } from 'minio';
import { S3 } from '@aws-sdk/client-s3';
import { logger } from '../utils/logger';
import { extendedConfig as config } from '../config';

export interface StorageConfig {
  type: 'minio' | 's3';
  config: any;
}

export interface UploadOptions {
  metadata?: Record<string, string>;
  contentType?: string;
  cacheControl?: string;
  expires?: Date;
}

export interface StorageObject {
  key: string;
  size: number;
  lastModified: Date;
  etag: string;
  contentType?: string;
  metadata?: Record<string, string>;
}

export class StorageService {
  private client: MinioClient | S3;
  private storageType: 'minio' | 's3';

  constructor() {
    this.storageType = config.storageType;
    
    if (this.storageType === 'minio') {
      this.client = new MinioClient({
        endPoint: config.minioEndpoint.split(':')[0],
        port: parseInt(config.minioEndpoint.split(':')[1]) || 9000,
        useSSL: config.minioUseSsl,
        accessKey: config.minioAccessKey,
        secretKey: config.minioSecretKey
      });
    } else {
      this.client = new S3({
        region: config.awsRegion,
        credentials: {
          accessKeyId: config.awsAccessKeyId!,
          secretAccessKey: config.awsSecretAccessKey!
        }
      });
    }
  }

  async initialize(): Promise<void> {
    try {
      logger.info(`Initializing ${this.storageType} storage...`);
      
      if (this.storageType === 'minio') {
        const minioClient = this.client as MinioClient;
        
        // Create default buckets if they don't exist
        const buckets = ['org-branding', 'org-recordings', 'org-reports', 'org-exports'];
        
        for (const bucket of buckets) {
          const exists = await minioClient.bucketExists(bucket);
          if (!exists) {
            await minioClient.makeBucket(bucket);
            logger.info(`Created MinIO bucket: ${bucket}`);
          }
        }
        
        // Set bucket policies for public access to branding assets
        const brandingPolicy = {
          Version: '2012-10-17',
          Statement: [
            {
              Sid: 'PublicReadGetObject',
              Effect: 'Allow',
              Principal: '*',
              Action: 's3:GetObject',
              Resource: 'arn:aws:s3:::org-branding/*'
            }
          ]
        };
        
        try {
          await minioClient.setBucketPolicy('org-branding', JSON.stringify(brandingPolicy));
          logger.info('Set public read policy for branding bucket');
        } catch (error) {
          logger.warn('Failed to set bucket policy (may already exist):', error);
        }
      }
      
      logger.info(`${this.storageType} storage initialized successfully`);
    } catch (error) {
      logger.error('Failed to initialize storage service:', error);
      throw error;
    }
  }

  async createBucket(bucketName: string): Promise<void> {
    try {
      if (this.storageType === 'minio') {
        const minioClient = this.client as MinioClient;
        const exists = await minioClient.bucketExists(bucketName);
        
        if (!exists) {
          await minioClient.makeBucket(bucketName);
          logger.info(`Created bucket: ${bucketName}`);
        }
      } else {
        const s3Client = this.client as S3;
        await s3Client.createBucket({
          Bucket: bucketName
        });
        logger.info(`Created S3 bucket: ${bucketName}`);
      }
    } catch (error) {
      logger.error(`Failed to create bucket ${bucketName}:`, error);
      throw error;
    }
  }

  async uploadObject(
    bucketName: string,
    objectKey: string,
    data: Buffer | Uint8Array | string,
    options: UploadOptions = {}
  ): Promise<void> {
    try {
      if (this.storageType === 'minio') {
        const minioClient = this.client as MinioClient;
        
        const putObjectOptions: any = {};
        
        if (options.contentType) {
          putObjectOptions['Content-Type'] = options.contentType;
        }
        
        if (options.cacheControl) {
          putObjectOptions['Cache-Control'] = options.cacheControl;
        }
        
        if (options.metadata) {
          putObjectOptions.Metadata = options.metadata;
        }
        
        await minioClient.putObject(
          bucketName,
          objectKey,
          data as Buffer,
          data.length,
          putObjectOptions
        );
      } else {
        const s3Client = this.client as S3;
        
        await s3Client.putObject({
          Bucket: bucketName,
          Key: objectKey,
          Body: data,
          ContentType: options.contentType,
          CacheControl: options.cacheControl,
          Expires: options.expires,
          Metadata: options.metadata
        });
      }
      
      logger.debug(`Object uploaded: ${bucketName}/${objectKey}`);
    } catch (error) {
      logger.error(`Failed to upload object ${bucketName}/${objectKey}:`, error);
      throw error;
    }
  }

  async deleteObject(bucketName: string, objectKey: string): Promise<void> {
    try {
      if (this.storageType === 'minio') {
        const minioClient = this.client as MinioClient;
        await minioClient.removeObject(bucketName, objectKey);
      } else {
        const s3Client = this.client as S3;
        await s3Client.deleteObject({
          Bucket: bucketName,
          Key: objectKey
        });
      }
      
      logger.debug(`Object deleted: ${bucketName}/${objectKey}`);
    } catch (error) {
      logger.error(`Failed to delete object ${bucketName}/${objectKey}:`, error);
      throw error;
    }
  }

  async getObject(bucketName: string, objectKey: string): Promise<Buffer> {
    try {
      if (this.storageType === 'minio') {
        const minioClient = this.client as MinioClient;
        const stream = await minioClient.getObject(bucketName, objectKey);
        
        const chunks: Buffer[] = [];
        
        return new Promise((resolve, reject) => {
          stream.on('data', chunk => chunks.push(chunk));
          stream.on('end', () => resolve(Buffer.concat(chunks)));
          stream.on('error', reject);
        });
      } else {
        const s3Client = this.client as S3;
        const result = await s3Client.getObject({
          Bucket: bucketName,
          Key: objectKey
        });
        
        if (result.Body) {
          const chunks: Uint8Array[] = [];
          const reader = result.Body as ReadableStream;
          const response = new Response(reader);
          return Buffer.from(await response.arrayBuffer());
        }
        
        throw new Error('No body in S3 response');
      }
    } catch (error) {
      logger.error(`Failed to get object ${bucketName}/${objectKey}:`, error);
      throw error;
    }
  }

  async listObjects(bucketName: string, prefix?: string, maxKeys?: number): Promise<StorageObject[]> {
    try {
      const objects: StorageObject[] = [];
      
      if (this.storageType === 'minio') {
        const minioClient = this.client as MinioClient;
        const stream = minioClient.listObjects(bucketName, prefix, true);
        
        return new Promise((resolve, reject) => {
          stream.on('data', obj => {
            objects.push({
              key: obj.name || '',
              size: obj.size || 0,
              lastModified: obj.lastModified || new Date(),
              etag: obj.etag || '',
              contentType: undefined
            });
            
            if (maxKeys && objects.length >= maxKeys) {
              stream.destroy();
              resolve(objects);
            }
          });
          
          stream.on('end', () => resolve(objects));
          stream.on('error', reject);
        });
      } else {
        const s3Client = this.client as S3;
        const result = await s3Client.listObjectsV2({
          Bucket: bucketName,
          Prefix: prefix,
          MaxKeys: maxKeys
        });
        
        if (result.Contents) {
          return result.Contents.map(obj => ({
            key: obj.Key || '',
            size: obj.Size || 0,
            lastModified: obj.LastModified || new Date(),
            etag: obj.ETag?.replace(/"/g, '') || '',
            contentType: undefined
          }));
        }
      }
      
      return objects;
    } catch (error) {
      logger.error(`Failed to list objects in bucket ${bucketName}:`, error);
      throw error;
    }
  }

  async getObjectUrl(bucketName: string, objectKey: string, expiresSeconds: number = 3600): Promise<string> {
    try {
      if (this.storageType === 'minio') {
        const minioClient = this.client as MinioClient;
        return await minioClient.presignedGetObject(bucketName, objectKey, expiresSeconds);
      } else {
        const s3Client = this.client as S3;
        
        // For S3, we need to use a different approach
        // This is a simplified version - in production you might want to use AWS SDK's presigned URL
        return `https://${bucketName}.s3.${config.awsRegion}.amazonaws.com/${objectKey}`;
      }
    } catch (error) {
      logger.error(`Failed to generate object URL for ${bucketName}/${objectKey}:`, error);
      throw error;
    }
  }

  async getStorageStats(bucketName?: string): Promise<{
    totalObjects: number;
    totalSize: number;
    buckets: Array<{ name: string; objects: number; size: number }>;
  }> {
    try {
      const stats = {
        totalObjects: 0,
        totalSize: 0,
        buckets: [] as Array<{ name: string; objects: number; size: number }>
      };
      
      if (this.storageType === 'minio') {
        const minioClient = this.client as MinioClient;
        
        // Get list of buckets
        const buckets = bucketName ? [{ name: bucketName }] : await minioClient.listBuckets();
        
        for (const bucket of buckets) {
          const objects = await this.listObjects(bucket.name);
          const bucketStats = {
            name: bucket.name,
            objects: objects.length,
            size: objects.reduce((sum, obj) => sum + obj.size, 0)
          };
          
          stats.buckets.push(bucketStats);
          stats.totalObjects += bucketStats.objects;
          stats.totalSize += bucketStats.size;
        }
      } else {
        // S3 implementation would be similar but using S3 API
        logger.warn('Storage stats not fully implemented for S3');
      }
      
      return stats;
    } catch (error) {
      logger.error('Failed to get storage stats:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; details: Record<string, any> }> {
    try {
      const details: Record<string, any> = {
        storageType: this.storageType
      };
      
      if (this.storageType === 'minio') {
        const minioClient = this.client as MinioClient;
        
        // Try to list buckets
        const buckets = await minioClient.listBuckets();
        details.bucketsAccessible = buckets.length >= 0;
        details.bucketCount = buckets.length;
      } else {
        // S3 health check
        const s3Client = this.client as S3;
        const result = await s3Client.listBuckets({});
        details.bucketsAccessible = !!result.Buckets;
        details.bucketCount = result.Buckets?.length || 0;
      }
      
      return {
        healthy: true,
        details
      };
    } catch (error) {
      logger.error('Storage health check failed:', error);
      return {
        healthy: false,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }
}