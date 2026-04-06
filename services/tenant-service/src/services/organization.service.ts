/**
 * Organization management service
 */

import { Pool } from 'pg';
import { logger } from '../utils/logger';
import { redisManager } from '../utils/redis';
import { extendedConfig as config } from '../config';
import { KeycloakService } from './keycloak.service';
import { StorageService } from './storage.service';

export interface Organization {
  id: string;
  slug: string;
  name: string;
  displayName?: string;
  description?: string;
  website?: string;
  industry?: string;
  subscriptionTier: string;
  subscriptionStatus: string;
  trialEndsAt?: Date;
  billingEmail?: string;
  storageLimitGb: number;
  storageUsedGb: number;
  sessionLimit: number;
  sessionCount: number;
  primaryContactName?: string;
  primaryContactEmail?: string;
  supportEmail?: string;
  supportPhone?: string;
  keycloakRealmId?: string;
  storageBucket?: string;
  customDomain?: string;
  features: Record<string, any>;
  settings: Record<string, any>;
  dataRegion: string;
  complianceRequirements: string[];
  securityLevel: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface CreateOrganizationRequest {
  slug: string;
  name: string;
  displayName?: string;
  description?: string;
  website?: string;
  industry?: string;
  primaryContactName: string;
  primaryContactEmail: string;
  billingEmail?: string;
  subscriptionTier?: string;
  storageLimitGb?: number;
  sessionLimit?: number;
  features?: Record<string, any>;
  settings?: Record<string, any>;
  dataRegion?: string;
  complianceRequirements?: string[];
  securityLevel?: string;
  createdBy?: string;
}

export interface UpdateOrganizationRequest {
  name?: string;
  displayName?: string;
  description?: string;
  website?: string;
  industry?: string;
  primaryContactName?: string;
  primaryContactEmail?: string;
  billingEmail?: string;
  supportEmail?: string;
  supportPhone?: string;
  customDomain?: string;
  features?: Record<string, any>;
  settings?: Record<string, any>;
  complianceRequirements?: string[];
  securityLevel?: string;
}

export interface OrganizationStats {
  totalOrganizations: number;
  activeOrganizations: number;
  trialOrganizations: number;
  deletedOrganizations: number;
  totalStorageUsedGb: number;
  averageSessionsPerOrg: number;
}

export class OrganizationService {
  constructor(
    private readonly pool: Pool,
    private readonly keycloakService: KeycloakService,
    private readonly storageService: StorageService
  ) {}

  async createOrganization(data: CreateOrganizationRequest): Promise<Organization> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Validate slug uniqueness
      const slugCheck = await client.query(
        'SELECT id FROM organizations WHERE slug = $1 AND deleted_at IS NULL',
        [data.slug]
      );
      
      if (slugCheck.rows.length > 0) {
        throw new Error(`Organization slug '${data.slug}' already exists`);
      }
      
      // Create Keycloak realm
      const realmId = await this.keycloakService.createRealm({
        name: data.slug,
        displayName: data.displayName || data.name,
        enabled: true,
        registrationAllowed: false,
        loginTheme: 'ayan-theme',
        accountTheme: 'ayan-theme'
      });
      
      // Create storage bucket
      const bucketName = `org-${data.slug}-${Date.now()}`;
      await this.storageService.createBucket(bucketName);
      
      // Set trial end date
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + config.orgTrialPeriodDays);
      
      // Insert organization
      const result = await client.query(
        `INSERT INTO organizations (
          slug, name, display_name, description, website, industry,
          subscription_tier, subscription_status, trial_ends_at, billing_email,
          storage_limit_gb, session_limit, primary_contact_name, primary_contact_email,
          support_email, support_phone, keycloak_realm_id, storage_bucket,
          features, settings, data_region, compliance_requirements, security_level,
          created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
        ) RETURNING *`,
        [
          data.slug,
          data.name,
          data.displayName,
          data.description,
          data.website,
          data.industry,
          data.subscriptionTier || 'trial',
          'pending',
          trialEndsAt,
          data.billingEmail || data.primaryContactEmail,
          data.storageLimitGb || config.defaultOrgStorageLimitGb,
          data.sessionLimit || config.defaultOrgSessionLimit,
          data.primaryContactName,
          data.primaryContactEmail,
          data.billingEmail || data.primaryContactEmail,
          null,
          realmId,
          bucketName,
          JSON.stringify(data.features || {}),
          JSON.stringify(data.settings || {}),
          data.dataRegion || 'us-east-1',
          data.complianceRequirements || [],
          data.securityLevel || 'standard',
          data.createdBy
        ]
      );
      
      await client.query('COMMIT');
      
      const organization = this.mapRowToOrganization(result.rows[0]);
      
      // Clear cache
      await this.invalidateCache(organization.id);
      
      logger.info(`Organization created: ${organization.slug}`, {
        organizationId: organization.id,
        slug: organization.slug,
        name: organization.name
      });
      
      return organization;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating organization:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getOrganization(id: string): Promise<Organization | null> {
    // Try cache first
    const cacheKey = `org:${id}`;
    const cached = await redisManager.get<Organization>(cacheKey);
    if (cached) {
      return cached;
    }
    
    const result = await this.pool.query(
      'SELECT * FROM organizations WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const organization = this.mapRowToOrganization(result.rows[0]);
    
    // Cache for 5 minutes
    await redisManager.set(cacheKey, organization, 300);
    
    return organization;
  }

  async getOrganizationBySlug(slug: string): Promise<Organization | null> {
    const cacheKey = `org:slug:${slug}`;
    const cached = await redisManager.get<Organization>(cacheKey);
    if (cached) {
      return cached;
    }
    
    const result = await this.pool.query(
      'SELECT * FROM organizations WHERE slug = $1 AND deleted_at IS NULL',
      [slug]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const organization = this.mapRowToOrganization(result.rows[0]);
    
    // Cache for 5 minutes
    await redisManager.set(cacheKey, organization, 300);
    
    return organization;
  }

  async updateOrganization(id: string, data: UpdateOrganizationRequest): Promise<Organization> {
    const client = await this.pool.connect();
    
    try {
      // Build dynamic query
      const fields = [];
      const values = [];
      let paramIndex = 1;
      
      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined) {
          const dbField = this.camelToSnake(key);
          if (typeof value === 'object') {
            fields.push(`${dbField} = $${paramIndex}`);
            values.push(JSON.stringify(value));
          } else {
            fields.push(`${dbField} = $${paramIndex}`);
            values.push(value);
          }
          paramIndex++;
        }
      }
      
      if (fields.length === 0) {
        throw new Error('No fields to update');
      }
      
      fields.push(`updated_at = NOW()`);
      values.push(id);
      
      const result = await client.query(
        `UPDATE organizations SET ${fields.join(', ')} WHERE id = $${paramIndex} AND deleted_at IS NULL RETURNING *`,
        values
      );
      
      if (result.rows.length === 0) {
        throw new Error('Organization not found');
      }
      
      const organization = this.mapRowToOrganization(result.rows[0]);
      
      // Clear cache
      await this.invalidateCache(organization.id);
      
      logger.info(`Organization updated: ${organization.slug}`, {
        organizationId: organization.id,
        updatedFields: Object.keys(data)
      });
      
      return organization;
    } finally {
      client.release();
    }
  }

  async listOrganizations(
    limit: number = 50,
    offset: number = 0,
    filters: {
      subscriptionTier?: string;
      subscriptionStatus?: string;
      dataRegion?: string;
      search?: string;
    } = {}
  ): Promise<{ organizations: Organization[]; total: number }> {
    let whereConditions = ['deleted_at IS NULL'];
    const values = [];
    let paramIndex = 1;
    
    if (filters.subscriptionTier) {
      whereConditions.push(`subscription_tier = $${paramIndex}`);
      values.push(filters.subscriptionTier);
      paramIndex++;
    }
    
    if (filters.subscriptionStatus) {
      whereConditions.push(`subscription_status = $${paramIndex}`);
      values.push(filters.subscriptionStatus);
      paramIndex++;
    }
    
    if (filters.dataRegion) {
      whereConditions.push(`data_region = $${paramIndex}`);
      values.push(filters.dataRegion);
      paramIndex++;
    }
    
    if (filters.search) {
      whereConditions.push(`(name ILIKE $${paramIndex} OR slug ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      values.push(`%${filters.search}%`);
      paramIndex++;
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    // Get total count
    const countResult = await this.pool.query(
      `SELECT COUNT(*) FROM organizations WHERE ${whereClause}`,
      values
    );
    
    const total = parseInt(countResult.rows[0].count);
    
    // Get organizations
    const result = await this.pool.query(
      `SELECT * FROM organizations WHERE ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...values, limit, offset]
    );
    
    const organizations = result.rows.map(row => this.mapRowToOrganization(row));
    
    return { organizations, total };
  }

  async deleteOrganization(id: string, deletedBy?: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get organization details
      const org = await this.getOrganization(id);
      if (!org) {
        throw new Error('Organization not found');
      }
      
      // Soft delete organization
      await client.query(
        'UPDATE organizations SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1',
        [id]
      );
      
      // Clean up Keycloak realm (optional - may keep for audit)
      if (org.keycloakRealmId) {
        await this.keycloakService.deleteRealm(org.keycloakRealmId);
      }
      
      await client.query('COMMIT');
      
      // Clear cache
      await this.invalidateCache(id);
      
      logger.info(`Organization deleted: ${org.slug}`, {
        organizationId: id,
        deletedBy
      });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error deleting organization:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getOrganizationStats(): Promise<OrganizationStats> {
    const cacheKey = 'org:stats';
    const cached = await redisManager.get<OrganizationStats>(cacheKey);
    if (cached) {
      return cached;
    }
    
    const result = await this.pool.query(`
      SELECT 
        COUNT(*) as total_organizations,
        COUNT(CASE WHEN deleted_at IS NULL THEN 1 END) as active_organizations,
        COUNT(CASE WHEN subscription_tier = 'trial' AND deleted_at IS NULL THEN 1 END) as trial_organizations,
        COUNT(CASE WHEN deleted_at IS NOT NULL THEN 1 END) as deleted_organizations,
        COALESCE(SUM(CASE WHEN deleted_at IS NULL THEN storage_used_gb ELSE 0 END), 0) as total_storage_used_gb,
        COALESCE(AVG(CASE WHEN deleted_at IS NULL THEN session_count ELSE NULL END), 0) as average_sessions_per_org
      FROM organizations
    `);
    
    const stats: OrganizationStats = {
      totalOrganizations: parseInt(result.rows[0].total_organizations),
      activeOrganizations: parseInt(result.rows[0].active_organizations),
      trialOrganizations: parseInt(result.rows[0].trial_organizations),
      deletedOrganizations: parseInt(result.rows[0].deleted_organizations),
      totalStorageUsedGb: parseFloat(result.rows[0].total_storage_used_gb),
      averageSessionsPerOrg: parseFloat(result.rows[0].average_sessions_per_org)
    };
    
    // Cache for 1 hour
    await redisManager.set(cacheKey, stats, 3600);
    
    return stats;
  }

  private mapRowToOrganization(row: any): Organization {
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      displayName: row.display_name,
      description: row.description,
      website: row.website,
      industry: row.industry,
      subscriptionTier: row.subscription_tier,
      subscriptionStatus: row.subscription_status,
      trialEndsAt: row.trial_ends_at,
      billingEmail: row.billing_email,
      storageLimitGb: row.storage_limit_gb,
      storageUsedGb: parseFloat(row.storage_used_gb),
      sessionLimit: row.session_limit,
      sessionCount: row.session_count,
      primaryContactName: row.primary_contact_name,
      primaryContactEmail: row.primary_contact_email,
      supportEmail: row.support_email,
      supportPhone: row.support_phone,
      keycloakRealmId: row.keycloak_realm_id,
      storageBucket: row.storage_bucket,
      customDomain: row.custom_domain,
      features: typeof row.features === 'string' ? JSON.parse(row.features) : row.features,
      settings: typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings,
      dataRegion: row.data_region,
      complianceRequirements: row.compliance_requirements,
      securityLevel: row.security_level,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  private async invalidateCache(id: string): Promise<void> {
    const org = await this.getOrganization(id);
    if (org) {
      await redisManager.del(`org:${id}`);
      await redisManager.del(`org:slug:${org.slug}`);
      await redisManager.del('org:stats');
    }
  }
}