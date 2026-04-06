/**
 * Database schema for multi-tenant organization management
 */

import { Pool, PoolClient } from 'pg';
import { logger } from '../utils/logger';
import { extendedConfig as config } from '../config';

export class DatabaseSchema {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async runMigrations(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      logger.info('Running tenant service database migrations...');

      // Create extensions
      await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
      await client.query('CREATE EXTENSION IF NOT EXISTS "citext"');
      await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

      // Create organizations table
      await client.query(`
        CREATE TABLE IF NOT EXISTS organizations (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          slug CITEXT UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          display_name VARCHAR(255),
          description TEXT,
          website VARCHAR(500),
          industry VARCHAR(100),
          
          -- Subscription & Billing
          subscription_tier VARCHAR(50) DEFAULT 'trial',
          subscription_status VARCHAR(50) DEFAULT 'pending',
          trial_ends_at TIMESTAMP WITH TIME ZONE,
          billing_email CITEXT,
          
          -- Limits & Quotas
          storage_limit_gb INTEGER DEFAULT ${config.defaultOrgStorageLimitGb},
          storage_used_gb DECIMAL(10,2) DEFAULT 0,
          session_limit INTEGER DEFAULT ${config.defaultOrgSessionLimit},
          session_count INTEGER DEFAULT 0,
          
          -- Contact & Support
          primary_contact_name VARCHAR(255),
          primary_contact_email CITEXT,
          support_email CITEXT,
          support_phone VARCHAR(50),
          
          -- Technical Configuration
          keycloak_realm_id VARCHAR(255),
          storage_bucket VARCHAR(255),
          custom_domain VARCHAR(255),
          
          -- Feature Flags
          features JSONB DEFAULT '{}',
          settings JSONB DEFAULT '{}',
          
          -- Compliance & Security
          data_region VARCHAR(50) DEFAULT 'us-east-1',
          compliance_requirements TEXT[],
          security_level VARCHAR(20) DEFAULT 'standard',
          
          -- Audit
          created_by UUID,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          deleted_at TIMESTAMP WITH TIME ZONE,
          
          -- Row Level Security
          tenant_id UUID GENERATED ALWAYS AS (id) STORED
        );
      `);

      // Create organization branding table
      await client.query(`
        CREATE TABLE IF NOT EXISTS organization_branding (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          
          -- Logo & Assets
          logo_url VARCHAR(1000),
          logo_dark_url VARCHAR(1000),
          favicon_url VARCHAR(1000),
          background_image_url VARCHAR(1000),
          
          -- Color Palette
          primary_color VARCHAR(7), -- #FFFFFF format
          secondary_color VARCHAR(7),
          accent_color VARCHAR(7),
          background_color VARCHAR(7),
          text_color VARCHAR(7),
          text_secondary_color VARCHAR(7),
          success_color VARCHAR(7),
          warning_color VARCHAR(7),
          error_color VARCHAR(7),
          
          -- Typography
          font_family VARCHAR(100),
          font_weights INTEGER[],
          font_sizes JSONB,
          
          -- Custom Styling
          custom_css TEXT,
          css_variables JSONB,
          
          -- Messaging & Text
          organization_display_name VARCHAR(255),
          welcome_message TEXT,
          verification_instructions JSONB,
          support_message TEXT,
          terms_url VARCHAR(500),
          privacy_url VARCHAR(500),
          
          -- Contact Information
          support_email CITEXT,
          support_phone VARCHAR(50),
          support_hours VARCHAR(100),
          help_url VARCHAR(500),
          
          -- Localization
          default_locale VARCHAR(10) DEFAULT 'en-US',
          supported_locales VARCHAR(10)[],
          custom_translations JSONB,
          
          -- Browser & SEO
          page_title_template VARCHAR(255),
          meta_description TEXT,
          
          -- Preview & Validation
          accessibility_validated BOOLEAN DEFAULT false,
          last_preview_at TIMESTAMP WITH TIME ZONE,
          validation_errors JSONB,
          
          -- Audit
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Create SSO configuration table
      await client.query(`
        CREATE TABLE IF NOT EXISTS organization_sso_config (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          
          -- SSO Provider Details
          provider_name VARCHAR(100) NOT NULL,
          provider_type VARCHAR(50) NOT NULL, -- 'oidc', 'saml', 'oauth2'
          issuer_url VARCHAR(500) NOT NULL,
          
          -- Endpoint Configuration
          authorization_url VARCHAR(500),
          token_url VARCHAR(500),
          userinfo_url VARCHAR(500),
          jwks_url VARCHAR(500),
          logout_url VARCHAR(500),
          
          -- Client Configuration
          client_id VARCHAR(255) NOT NULL,
          client_secret_encrypted TEXT, -- Encrypted with pgcrypto
          scopes VARCHAR(255)[] DEFAULT '{"openid", "profile", "email"}',
          
          -- Claims Mapping
          claims_mapping JSONB DEFAULT '{}',
          required_claims VARCHAR(100)[],
          
          -- Auto-provisioning
          auto_provision_users BOOLEAN DEFAULT true,
          default_role VARCHAR(50) DEFAULT 'user',
          provision_admin_users BOOLEAN DEFAULT false,
          
          -- Key Management
          public_keys JSONB,
          key_rotation_schedule VARCHAR(50), -- 'daily', 'weekly', 'monthly'
          last_key_rotation TIMESTAMP WITH TIME ZONE,
          
          -- Security Settings
          require_email_verification BOOLEAN DEFAULT true,
          allowed_domains VARCHAR(255)[],
          blocked_domains VARCHAR(255)[],
          
          -- Status & Health
          enabled BOOLEAN DEFAULT true,
          last_health_check TIMESTAMP WITH TIME ZONE,
          health_status VARCHAR(20) DEFAULT 'unknown',
          
          -- Audit
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Create API keys table
      await client.query(`
        CREATE TABLE IF NOT EXISTS organization_api_keys (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          
          -- Key Details
          name VARCHAR(100) NOT NULL,
          description TEXT,
          public_key VARCHAR(100) UNIQUE NOT NULL, -- pk_org_xxx
          secret_key_hash TEXT NOT NULL, -- Hashed sk_org_xxx
          
          -- Permissions & Scopes
          scopes VARCHAR(100)[] DEFAULT '{"read", "write"}',
          permissions JSONB DEFAULT '{}',
          rate_limit INTEGER DEFAULT 1000, -- requests per hour
          
          -- Usage Tracking
          last_used_at TIMESTAMP WITH TIME ZONE,
          usage_count BIGINT DEFAULT 0,
          
          -- Expiration
          expires_at TIMESTAMP WITH TIME ZONE,
          
          -- Status
          enabled BOOLEAN DEFAULT true,
          
          -- Audit
          created_by UUID,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          revoked_at TIMESTAMP WITH TIME ZONE,
          revoked_by UUID,
          revoked_reason TEXT
        );
      `);

      // Create organization users table
      await client.query(`
        CREATE TABLE IF NOT EXISTS organization_users (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          
          -- User Details
          user_id VARCHAR(255) NOT NULL, -- Keycloak user ID
          email CITEXT NOT NULL,
          first_name VARCHAR(100),
          last_name VARCHAR(100),
          display_name VARCHAR(255),
          
          -- Role & Permissions
          role VARCHAR(50) NOT NULL DEFAULT 'user',
          permissions VARCHAR(100)[],
          
          -- Status
          status VARCHAR(20) DEFAULT 'active',
          last_login_at TIMESTAMP WITH TIME ZONE,
          email_verified BOOLEAN DEFAULT false,
          
          -- Invitation
          invited_by UUID,
          invited_at TIMESTAMP WITH TIME ZONE,
          invitation_accepted_at TIMESTAMP WITH TIME ZONE,
          
          -- Audit
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          
          UNIQUE(org_id, user_id)
        );
      `);

      // Create webhook configurations table
      await client.query(`
        CREATE TABLE IF NOT EXISTS organization_webhooks (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          
          -- Webhook Details
          name VARCHAR(100) NOT NULL,
          url VARCHAR(500) NOT NULL,
          secret_key VARCHAR(255), -- For signature validation
          
          -- Event Subscription
          events VARCHAR(100)[] NOT NULL,
          
          -- Configuration
          timeout_ms INTEGER DEFAULT 30000,
          retry_count INTEGER DEFAULT 3,
          retry_backoff VARCHAR(20) DEFAULT 'exponential',
          
          -- Filtering
          filters JSONB DEFAULT '{}',
          
          -- Status
          enabled BOOLEAN DEFAULT true,
          last_triggered_at TIMESTAMP WITH TIME ZONE,
          last_success_at TIMESTAMP WITH TIME ZONE,
          last_failure_at TIMESTAMP WITH TIME ZONE,
          failure_count INTEGER DEFAULT 0,
          
          -- Audit
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Create indexes for performance
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
        CREATE INDEX IF NOT EXISTS idx_organizations_tenant_id ON organizations(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_organizations_subscription_status ON organizations(subscription_status);
        CREATE INDEX IF NOT EXISTS idx_organization_branding_org_id ON organization_branding(org_id);
        CREATE INDEX IF NOT EXISTS idx_organization_sso_config_org_id ON organization_sso_config(org_id);
        CREATE INDEX IF NOT EXISTS idx_organization_api_keys_org_id ON organization_api_keys(org_id);
        CREATE INDEX IF NOT EXISTS idx_organization_api_keys_public_key ON organization_api_keys(public_key);
        CREATE INDEX IF NOT EXISTS idx_organization_users_org_id ON organization_users(org_id);
        CREATE INDEX IF NOT EXISTS idx_organization_users_user_id ON organization_users(user_id);
        CREATE INDEX IF NOT EXISTS idx_organization_webhooks_org_id ON organization_webhooks(org_id);
      `);

      // Enable Row Level Security
      await client.query('ALTER TABLE organizations ENABLE ROW LEVEL SECURITY');
      await client.query('ALTER TABLE organization_branding ENABLE ROW LEVEL SECURITY');
      await client.query('ALTER TABLE organization_sso_config ENABLE ROW LEVEL SECURITY');
      await client.query('ALTER TABLE organization_api_keys ENABLE ROW LEVEL SECURITY');
      await client.query('ALTER TABLE organization_users ENABLE ROW LEVEL SECURITY');
      await client.query('ALTER TABLE organization_webhooks ENABLE ROW LEVEL SECURITY');

      // Create policies for row level security
      await this.createRLSPolicies(client);

      logger.info('Tenant service database migrations completed successfully');
    } catch (error) {
      logger.error('Error running tenant service migrations:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  private async createRLSPolicies(client: PoolClient): Promise<void> {
    // TODO: Implement RLS policies once authentication system is properly configured
    // For now, skip RLS setup to enable testing
    logger.info('Skipping RLS policies setup for development - to be configured with authentication system');
  }
}