/**
 * SSO Configuration service
 */

import { Pool } from 'pg';
import crypto from 'crypto';
import axios from 'axios';
import { logger } from '../utils/logger';
import { redisManager } from '../utils/redis';
import { extendedConfig as config } from '../config';
import { KeycloakService, SSOProvider } from './keycloak.service';
import { OrganizationService } from './organization.service';

export interface SSOConfig {
  id: string;
  orgId: string;
  providerName: string;
  providerType: 'oidc' | 'saml' | 'oauth2';
  issuerUrl: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  userinfoUrl?: string;
  jwksUrl?: string;
  logoutUrl?: string;
  clientId: string;
  scopes: string[];
  claimsMapping: Record<string, string>;
  requiredClaims: string[];
  autoProvisionUsers: boolean;
  defaultRole: string;
  provisionAdminUsers: boolean;
  publicKeys?: Record<string, any>;
  keyRotationSchedule?: string;
  lastKeyRotation?: Date;
  requireEmailVerification: boolean;
  allowedDomains: string[];
  blockedDomains: string[];
  enabled: boolean;
  lastHealthCheck?: Date;
  healthStatus: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSSOConfigRequest {
  providerName: string;
  providerType: 'oidc' | 'saml' | 'oauth2';
  issuerUrl: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  userinfoUrl?: string;
  jwksUrl?: string;
  logoutUrl?: string;
  clientId: string;
  clientSecret: string;
  scopes?: string[];
  claimsMapping?: Record<string, string>;
  requiredClaims?: string[];
  autoProvisionUsers?: boolean;
  defaultRole?: string;
  provisionAdminUsers?: boolean;
  requireEmailVerification?: boolean;
  allowedDomains?: string[];
  blockedDomains?: string[];
  keyRotationSchedule?: string;
}

export interface UpdateSSOConfigRequest {
  providerName?: string;
  providerType?: 'oidc' | 'saml' | 'oauth2';
  issuerUrl?: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  userinfoUrl?: string;
  jwksUrl?: string;
  logoutUrl?: string;
  clientId?: string;
  clientSecret?: string;
  scopes?: string[];
  claimsMapping?: Record<string, string>;
  requiredClaims?: string[];
  autoProvisionUsers?: boolean;
  defaultRole?: string;
  provisionAdminUsers?: boolean;
  requireEmailVerification?: boolean;
  allowedDomains?: string[];
  blockedDomains?: string[];
  keyRotationSchedule?: string;
  enabled?: boolean;
}

export interface SSOTestResult {
  success: boolean;
  details: {
    wellKnownEndpoint?: boolean;
    authorizationEndpoint?: boolean;
    tokenEndpoint?: boolean;
    userinfoEndpoint?: boolean;
    jwksEndpoint?: boolean;
    keycloakIntegration?: boolean;
  };
  errors: string[];
  warnings: string[];
}

export class SSOConfigService {
  constructor(
    private readonly pool: Pool,
    private readonly keycloakService?: KeycloakService,
    private readonly orgService?: OrganizationService
  ) {}

  async createConfiguration(orgId: string, data: CreateSSOConfigRequest): Promise<SSOConfig> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if provider name already exists for this organization
      const existingConfig = await client.query(
        'SELECT id FROM organization_sso_config WHERE org_id = $1 AND provider_name = $2',
        [orgId, data.providerName]
      );
      
      if (existingConfig.rows.length > 0) {
        throw new Error(`SSO provider '${data.providerName}' already exists for this organization`);
      }
      
      // Encrypt client secret
      const encryptedSecret = await this.encryptSecret(data.clientSecret);
      
      // Auto-discover endpoints for OIDC
      const endpoints = await this.discoverEndpoints(data);
      
      // Insert SSO configuration
      const result = await client.query(
        `INSERT INTO organization_sso_config (
          org_id, provider_name, provider_type, issuer_url,
          authorization_url, token_url, userinfo_url, jwks_url, logout_url,
          client_id, client_secret_encrypted, scopes, claims_mapping, required_claims,
          auto_provision_users, default_role, provision_admin_users,
          require_email_verification, allowed_domains, blocked_domains,
          key_rotation_schedule, health_status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
        ) RETURNING *`,
        [
          orgId,
          data.providerName,
          data.providerType,
          data.issuerUrl,
          endpoints.authorizationUrl || data.authorizationUrl,
          endpoints.tokenUrl || data.tokenUrl,
          endpoints.userinfoUrl || data.userinfoUrl,
          endpoints.jwksUrl || data.jwksUrl,
          endpoints.logoutUrl || data.logoutUrl,
          data.clientId,
          encryptedSecret,
          data.scopes || ['openid', 'profile', 'email'],
          JSON.stringify(data.claimsMapping || {}),
          data.requiredClaims || [],
          data.autoProvisionUsers !== false,
          data.defaultRole || 'user',
          data.provisionAdminUsers || false,
          data.requireEmailVerification !== false,
          data.allowedDomains || [],
          data.blockedDomains || [],
          data.keyRotationSchedule || 'monthly',
          'pending'
        ]
      );
      
      await client.query('COMMIT');
      
      const ssoConfig = this.mapRowToSSOConfig(result.rows[0]);
      
      // Create Keycloak identity provider if Keycloak service is available
      if (this.keycloakService && this.orgService) {
        try {
          const org = await this.orgService.getOrganization(orgId);
          if (org?.keycloakRealmId) {
            await this.createKeycloakProvider(org.keycloakRealmId, ssoConfig, data.clientSecret);
          }
        } catch (error) {
          logger.warn('Failed to create Keycloak identity provider:', error);
        }
      }
      
      // Clear cache
      await this.invalidateCache(orgId);
      
      logger.info(`SSO configuration created: ${ssoConfig.providerName}`, {
        organizationId: orgId,
        configId: ssoConfig.id,
        providerType: ssoConfig.providerType
      });
      
      return ssoConfig;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating SSO configuration:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getConfiguration(id: string): Promise<SSOConfig | null> {
    const result = await this.pool.query(
      'SELECT * FROM organization_sso_config WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToSSOConfig(result.rows[0]);
  }

  async listConfigurations(orgId: string): Promise<SSOConfig[]> {
    const cacheKey = `sso:configs:${orgId}`;
    const cached = await redisManager.get<SSOConfig[]>(cacheKey);
    if (cached) {
      return cached;
    }
    
    const result = await this.pool.query(
      'SELECT * FROM organization_sso_config WHERE org_id = $1 ORDER BY created_at DESC',
      [orgId]
    );
    
    const configs = result.rows.map(row => this.mapRowToSSOConfig(row));
    
    // Cache for 5 minutes
    await redisManager.set(cacheKey, configs, 300);
    
    return configs;
  }

  async updateConfiguration(id: string, data: UpdateSSOConfigRequest): Promise<SSOConfig> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Build dynamic query
      const fields = [];
      const values = [];
      let paramIndex = 1;
      
      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined && key !== 'clientSecret') {
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
      
      // Handle client secret encryption separately
      if (data.clientSecret) {
        const encryptedSecret = await this.encryptSecret(data.clientSecret);
        fields.push(`client_secret_encrypted = $${paramIndex}`);
        values.push(encryptedSecret);
        paramIndex++;
      }
      
      if (fields.length === 0) {
        throw new Error('No fields to update');
      }
      
      fields.push('updated_at = NOW()');
      values.push(id);
      
      const result = await client.query(
        `UPDATE organization_sso_config SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );
      
      if (result.rows.length === 0) {
        throw new Error('SSO configuration not found');
      }
      
      await client.query('COMMIT');
      
      const ssoConfig = this.mapRowToSSOConfig(result.rows[0]);
      
      // Clear cache
      await this.invalidateCache(ssoConfig.orgId);
      
      logger.info(`SSO configuration updated: ${ssoConfig.providerName}`, {
        configId: ssoConfig.id,
        updatedFields: Object.keys(data)
      });
      
      return ssoConfig;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error updating SSO configuration:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteConfiguration(id: string): Promise<void> {
    const config = await this.getConfiguration(id);
    if (!config) {
      throw new Error('SSO configuration not found');
    }
    
    await this.pool.query(
      'DELETE FROM organization_sso_config WHERE id = $1',
      [id]
    );
    
    // Remove from Keycloak if available
    if (this.keycloakService && this.orgService) {
      try {
        const org = await this.orgService.getOrganization(config.orgId);
        if (org?.keycloakRealmId) {
          await this.keycloakService.deleteSSOProvider(org.keycloakRealmId, config.providerName);
        }
      } catch (error) {
        logger.warn('Failed to delete Keycloak identity provider:', error);
      }
    }
    
    // Clear cache
    await this.invalidateCache(config.orgId);
    
    logger.info(`SSO configuration deleted: ${config.providerName}`, {
      configId: config.id
    });
  }

  async testConfiguration(id: string): Promise<SSOTestResult> {
    const config = await this.getConfiguration(id);
    if (!config) {
      throw new Error('SSO configuration not found');
    }
    
    const result: SSOTestResult = {
      success: false,
      details: {},
      errors: [],
      warnings: []
    };
    
    try {
      // Test well-known endpoint for OIDC
      if (config.providerType === 'oidc') {
        try {
          const wellKnownUrl = config.issuerUrl.endsWith('/')
            ? `${config.issuerUrl}.well-known/openid_configuration`
            : `${config.issuerUrl}/.well-known/openid_configuration`;
          
          const response = await axios.get(wellKnownUrl, { timeout: 10000 });
          result.details.wellKnownEndpoint = true;
          
          // Validate required endpoints
          const wellKnown = response.data;
          result.details.authorizationEndpoint = !!wellKnown.authorization_endpoint;
          result.details.tokenEndpoint = !!wellKnown.token_endpoint;
          result.details.userinfoEndpoint = !!wellKnown.userinfo_endpoint;
          result.details.jwksEndpoint = !!wellKnown.jwks_uri;
          
        } catch (error) {
          result.details.wellKnownEndpoint = false;
          result.errors.push('Failed to fetch OIDC well-known configuration');
        }
      }
      
      // Test individual endpoints
      if (config.authorizationUrl) {
        try {
          await axios.head(config.authorizationUrl, { timeout: 5000 });
          result.details.authorizationEndpoint = true;
        } catch (error) {
          result.details.authorizationEndpoint = false;
          result.errors.push('Authorization endpoint is not accessible');
        }
      }
      
      if (config.tokenUrl) {
        try {
          await axios.head(config.tokenUrl, { timeout: 5000 });
          result.details.tokenEndpoint = true;
        } catch (error) {
          result.details.tokenEndpoint = false;
          result.errors.push('Token endpoint is not accessible');
        }
      }
      
      // Test Keycloak integration
      if (this.keycloakService && this.orgService) {
        try {
          const org = await this.orgService.getOrganization(config.orgId);
          if (org?.keycloakRealmId) {
            const healthCheck = await this.keycloakService.healthCheck(org.keycloakRealmId);
            result.details.keycloakIntegration = healthCheck.healthy;
            
            if (!healthCheck.healthy) {
              result.errors.push('Keycloak integration is not healthy');
            }
          }
        } catch (error) {
          result.details.keycloakIntegration = false;
          result.warnings.push('Unable to verify Keycloak integration');
        }
      }
      
      // Update health status
      const hasErrors = result.errors.length > 0;
      const newStatus = hasErrors ? 'unhealthy' : 'healthy';
      
      await this.pool.query(
        'UPDATE organization_sso_config SET health_status = $1, last_health_check = NOW() WHERE id = $2',
        [newStatus, id]
      );
      
      result.success = !hasErrors;
      
      return result;
    } catch (error) {
      logger.error('Error testing SSO configuration:', error);
      result.errors.push('Test failed with unexpected error');
      return result;
    }
  }

  async enableConfiguration(id: string): Promise<SSOConfig> {
    return this.updateConfiguration(id, { enabled: true });
  }

  async disableConfiguration(id: string): Promise<SSOConfig> {
    return this.updateConfiguration(id, { enabled: false });
  }

  private async discoverEndpoints(data: CreateSSOConfigRequest): Promise<{
    authorizationUrl?: string;
    tokenUrl?: string;
    userinfoUrl?: string;
    jwksUrl?: string;
    logoutUrl?: string;
  }> {
    if (data.providerType !== 'oidc') {
      return {};
    }
    
    try {
      const wellKnownUrl = data.issuerUrl.endsWith('/')
        ? `${data.issuerUrl}.well-known/openid_configuration`
        : `${data.issuerUrl}/.well-known/openid_configuration`;
      
      const response = await axios.get(wellKnownUrl, { timeout: 10000 });
      const wellKnown = response.data;
      
      return {
        authorizationUrl: wellKnown.authorization_endpoint,
        tokenUrl: wellKnown.token_endpoint,
        userinfoUrl: wellKnown.userinfo_endpoint,
        jwksUrl: wellKnown.jwks_uri,
        logoutUrl: wellKnown.end_session_endpoint
      };
    } catch (error) {
      logger.warn('Failed to discover OIDC endpoints:', error);
      return {};
    }
  }

  private async createKeycloakProvider(realmName: string, config: SSOConfig, clientSecret: string): Promise<void> {
    if (!this.keycloakService) return;
    
    const providerConfig: SSOProvider = {
      alias: config.providerName,
      providerId: config.providerType,
      enabled: config.enabled,
      displayName: config.providerName,
      config: {
        clientId: config.clientId,
        clientSecret: clientSecret,
        authorizationUrl: config.authorizationUrl,
        tokenUrl: config.tokenUrl,
        userinfoUrl: config.userinfoUrl,
        issuer: config.issuerUrl,
        defaultScopes: config.scopes.join(' '),
        backchannelSupported: 'false',
        useJwksUri: 'true',
        jwksUrl: config.jwksUrl
      }
    };
    
    await this.keycloakService.createSSOProvider(realmName, providerConfig);
  }

  private async encryptSecret(secret: string): Promise<string> {
    // Use pgcrypto to encrypt - this is a simplified approach
    // In production, you might want a more sophisticated key management
    const result = await this.pool.query(
      "SELECT pgp_sym_encrypt($1, $2) as encrypted",
      [secret, config.apiKeySecret]
    );
    
    return result.rows[0].encrypted;
  }

  private mapRowToSSOConfig(row: any): SSOConfig {
    return {
      id: row.id,
      orgId: row.org_id,
      providerName: row.provider_name,
      providerType: row.provider_type,
      issuerUrl: row.issuer_url,
      authorizationUrl: row.authorization_url,
      tokenUrl: row.token_url,
      userinfoUrl: row.userinfo_url,
      jwksUrl: row.jwks_url,
      logoutUrl: row.logout_url,
      clientId: row.client_id,
      scopes: row.scopes,
      claimsMapping: typeof row.claims_mapping === 'string' ? JSON.parse(row.claims_mapping) : row.claims_mapping,
      requiredClaims: row.required_claims,
      autoProvisionUsers: row.auto_provision_users,
      defaultRole: row.default_role,
      provisionAdminUsers: row.provision_admin_users,
      publicKeys: typeof row.public_keys === 'string' ? JSON.parse(row.public_keys) : row.public_keys,
      keyRotationSchedule: row.key_rotation_schedule,
      lastKeyRotation: row.last_key_rotation ? new Date(row.last_key_rotation) : undefined,
      requireEmailVerification: row.require_email_verification,
      allowedDomains: row.allowed_domains,
      blockedDomains: row.blocked_domains,
      enabled: row.enabled,
      lastHealthCheck: row.last_health_check ? new Date(row.last_health_check) : undefined,
      healthStatus: row.health_status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private async invalidateCache(orgId: string): Promise<void> {
    await redisManager.del(`sso:configs:${orgId}`);
  }
}