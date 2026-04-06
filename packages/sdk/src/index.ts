/**
 * Agentic AI Proctoring SDK
 *
 * Complete enterprise SDK for multi-tenant AI proctoring platform.
 * Includes: Proctoring sessions, Organization management, White-label branding,
 * SSO configuration, and API key management (Phase 5 Enterprise features).
 */

// ── Core SDK Types ────────────────────────────────────────────────

export interface SDKConfiguration {
  apiUrl: string;
  livekitUrl: string;
  tenantUrl?: string; // Phase 5: Tenant service URL
  tenantId?: string;
  apiKey?: string; // Phase 5: API key authentication
  accessToken?: string; // JWT token
  debug?: boolean;
}

// ── Proctoring Types ──────────────────────────────────────────────────

export interface SessionStartOptions {
  candidateId: string;
  examId: string;
  token?: string;
}

export interface ViolationEvent {
  id: string;
  sessionId: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// ── Phase 5: Organization Management Types ──────────────────────────────────────

export interface OrganizationConfig {
  slug: string;
  name: string;
  primaryContactName: string;
  primaryContactEmail: string;
  settings?: Record<string, any>;
}

export interface Organization {
  id: string;
  slug: string;
  name: string;
  primaryContactName: string;
  primaryContactEmail: string;
  settings: Record<string, any>;
  status: 'active' | 'suspended' | 'pending';
  createdAt: Date;
  updatedAt: Date;
  userCount?: number;
  sessionCount?: number;
}

// ── Phase 5: Branding Types ──────────────────────────────────────────────

export interface BrandingTheme {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
}

export interface BrandingAssets {
  logo?: string;
  logoUrl?: string;
  favicon?: string;
  faviconUrl?: string;
  loginBackground?: string;
  loginBackgroundUrl?: string;
}

export interface BrandingConfig {
  orgId?: string;
  theme: BrandingTheme;
  assets: BrandingAssets;
  customCss?: string;
  isActive: boolean;
}

// ── Phase 5: SSO Configuration Types ────────────────────────────────────────

export interface SSOConfig {
  id?: string;
  orgId: string;
  providerName: string;
  providerType: 'OIDC' | 'SAML' | 'OAuth2';
  issuerUrl: string;
  clientId: string;
  clientSecret?: string;
  additionalScopes?: string[];
  attributeMapping?: Record<string, string>;
  isActive: boolean;
  lastHealthCheck?: Date;
  healthStatus?: 'healthy' | 'unhealthy' | 'unknown';
}

// ── Phase 5: API Key Types ────────────────────────────────────────────────

export interface ApiKeyConfig {
  name: string;
  scopes: string[];
  rateLimit?: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
  allowedIPs?: string[];
  expiresAt?: Date;
}

export interface ApiKey {
  id: string;
  orgId: string;
  name: string;
  key?: string; // Only returned on creation
  keyPreview: string;
  scopes: string[];
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
  allowedIPs: string[];
  usage: {
    totalRequests: number;
    lastUsed?: Date;
  };
  status: 'active' | 'revoked' | 'expired';
  createdAt: Date;
  expiresAt?: Date;
}

// ── Response Types ────────────────────────────────────────────────────

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ── Main SDK Class ────────────────────────────────────────────────

export class AgenticProctor {
  private config: SDKConfiguration;
  private sessionId: string | null = null;
  private tenantClient: TenantClient | null = null;

  constructor(config: SDKConfiguration) {
    if (!config.apiUrl) throw new Error('apiUrl is required');
    this.config = config;
    
    // Initialize tenant client if tenant service is configured
    if (config.tenantUrl) {
      this.tenantClient = new TenantClient({
        baseUrl: config.tenantUrl,
        apiKey: config.apiKey,
        accessToken: config.accessToken,
        debug: config.debug
      });
    }
  }

  // ── Proctoring Session Methods ────────────────────────────────────────

  /** Start a proctoring session — deploys AI agent for this candidate */
  async startSession(options: SessionStartOptions): Promise<string> {
    // Phase 1: will integrate LiveKit room join, media capture, face detection
    console.log('[AgenticProctor] starting session', options);
    this.sessionId = `session_${Date.now()}_${options.candidateId}`;
    return this.sessionId;
  }

  /** Stop the active proctoring session */
  async stopSession(): Promise<void> {
    console.log('[AgenticProctor] stopping session', this.sessionId);
    this.sessionId = null;
  }

  /** Get the current session ID (null if not started) */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /** Get current session status */
  getSessionStatus(): { active: boolean; sessionId: string | null } {
    return {
      active: this.sessionId !== null,
      sessionId: this.sessionId
    };
  }

  // ── Phase 5: Tenant Management Methods ────────────────────────────────

  /** Get tenant client for organization management */
  getTenantClient(): TenantClient {
    if (!this.tenantClient) {
      throw new Error('Tenant client not configured. Please provide tenantUrl in configuration.');
    }
    return this.tenantClient;
  }

  /** Create a new organization (Super Admin only) */
  async createOrganization(config: OrganizationConfig): Promise<ApiResponse<Organization>> {
    return this.getTenantClient().organizations.create(config);
  }

  /** Get organization details */
  async getOrganization(orgId?: string): Promise<ApiResponse<Organization>> {
    return this.getTenantClient().organizations.get(orgId);
  }

  /** Update organization settings */
  async updateOrganization(orgId: string, updates: Partial<OrganizationConfig>): Promise<ApiResponse<Organization>> {
    return this.getTenantClient().organizations.update(orgId, updates);
  }

  /** Setup white-label branding */
  async configureBranding(config: BrandingConfig): Promise<ApiResponse<BrandingConfig>> {
    return this.getTenantClient().branding.configure(config);
  }

  /** Setup SSO configuration */
  async configureSso(config: SSOConfig): Promise<ApiResponse<SSOConfig>> {
    return this.getTenantClient().sso.configure(config);
  }

  /** Generate API key */
  async createApiKey(config: ApiKeyConfig): Promise<ApiResponse<ApiKey>> {
    return this.getTenantClient().apiKeys.create(config);
  }
}

// ── Phase 5: Tenant Service Client ────────────────────────────────────────

export interface TenantClientConfig {
  baseUrl: string;
  apiKey?: string;
  accessToken?: string;
  debug?: boolean;
}

/** Dedicated client for tenant service operations */
export class TenantClient {
  private config: TenantClientConfig;
  public organizations: OrganizationManager;
  public branding: BrandingManager;
  public sso: SSOManager;
  public apiKeys: ApiKeyManager;

  constructor(config: TenantClientConfig) {
    this.config = config;
    this.organizations = new OrganizationManager(this);
    this.branding = new BrandingManager(this);
    this.sso = new SSOManager(this);
    this.apiKeys = new ApiKeyManager(this);
  }

  /** Make authenticated HTTP request to tenant service */
  async request<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    options: { headers?: Record<string, string> } = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    // Add authentication headers
    if (this.config.accessToken) {
      headers.Authorization = `Bearer ${this.config.accessToken}`;
    } else if (this.config.apiKey) {
      headers['X-API-Key'] = this.config.apiKey;
    }

    if (this.config.debug) {
      console.log(`[TenantClient] ${method} ${url}`, { data, headers });
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || `HTTP ${response.status}`
        };
      }

      return {
        success: true,
        data: result.data || result
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }
}

// ── Organization Management ────────────────────────────────────────────

export class OrganizationManager {
  constructor(private client: TenantClient) {}

  async create(config: OrganizationConfig): Promise<ApiResponse<Organization>> {
    return this.client.request('POST', '/organizations', config);
  }

  async get(orgId?: string): Promise<ApiResponse<Organization>> {
    const endpoint = orgId ? `/organizations/${orgId}` : '/organizations/current';
    return this.client.request('GET', endpoint);
  }

  async update(orgId: string, updates: Partial<OrganizationConfig>): Promise<ApiResponse<Organization>> {
    return this.client.request('PUT', `/organizations/${orgId}`, updates);
  }

  async delete(orgId: string): Promise<ApiResponse<void>> {
    return this.client.request('DELETE', `/organizations/${orgId}`);
  }

  async list(): Promise<ApiResponse<Organization[]>> {
    return this.client.request('GET', '/organizations');
  }
}

// ── Branding Management ────────────────────────────────────────────────

export class BrandingManager {
  constructor(private client: TenantClient) {}

  async configure(config: BrandingConfig): Promise<ApiResponse<BrandingConfig>> {
    const orgId = config.orgId || 'current';
    return this.client.request('PUT', `/organizations/${orgId}/branding`, config);
  }

  async get(orgId?: string): Promise<ApiResponse<BrandingConfig>> {
    const org = orgId || 'current';
    return this.client.request('GET', `/organizations/${org}/branding`);
  }

  async uploadAsset(
    orgId: string,
    assetType: 'logo' | 'favicon' | 'loginBackground',
    file: File
  ): Promise<ApiResponse<{ url: string }>> {
    const formData = new FormData();
    formData.append('asset', file);
    formData.append('type', assetType);

    const url = `${this.client['config'].baseUrl}/organizations/${orgId}/branding/upload`;
    
    const headers: Record<string, string> = {};
    if (this.client['config'].accessToken) {
      headers.Authorization = `Bearer ${this.client['config'].accessToken}`;
    } else if (this.client['config'].apiKey) {
      headers['X-API-Key'] = this.client['config'].apiKey;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData
      });

      const result = await response.json();
      return response.ok ? { success: true, data: result } : { success: false, error: result.error };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Upload failed' };
    }
  }
}

// ── SSO Management ──────────────────────────────────────────────────────

export class SSOManager {
  constructor(private client: TenantClient) {}

  async configure(config: SSOConfig): Promise<ApiResponse<SSOConfig>> {
    const orgId = config.orgId || 'current';
    return this.client.request('POST', `/organizations/${orgId}/sso`, config);
  }

  async get(orgId: string, configId: string): Promise<ApiResponse<SSOConfig>> {
    return this.client.request('GET', `/organizations/${orgId}/sso/${configId}`);
  }

  async list(orgId?: string): Promise<ApiResponse<SSOConfig[]>> {
    const org = orgId || 'current';
    return this.client.request('GET', `/organizations/${org}/sso`);
  }

  async update(orgId: string, configId: string, updates: Partial<SSOConfig>): Promise<ApiResponse<SSOConfig>> {
    return this.client.request('PUT', `/organizations/${orgId}/sso/${configId}`, updates);
  }

  async delete(orgId: string, configId: string): Promise<ApiResponse<void>> {
    return this.client.request('DELETE', `/organizations/${orgId}/sso/${configId}`);
  }

  async testConnection(orgId: string, configId: string): Promise<ApiResponse<{ status: string; details: any }>> {
    return this.client.request('POST', `/organizations/${orgId}/sso/${configId}/test`);
  }
}

// ── API Key Management ──────────────────────────────────────────────────

export class ApiKeyManager {
  constructor(private client: TenantClient) {}

  async create(config: ApiKeyConfig): Promise<ApiResponse<ApiKey>> {
    return this.client.request('POST', '/api-keys', config);
  }

  async get(keyId: string): Promise<ApiResponse<ApiKey>> {
    return this.client.request('GET', `/api-keys/${keyId}`);
  }

  async list(orgId?: string): Promise<ApiResponse<ApiKey[]>> {
    const endpoint = orgId ? `/organizations/${orgId}/api-keys` : '/api-keys';
    return this.client.request('GET', endpoint);
  }

  async revoke(keyId: string, reason?: string): Promise<ApiResponse<void>> {
    return this.client.request('DELETE', `/api-keys/${keyId}`, { reason });
  }

  async getUsage(keyId: string): Promise<ApiResponse<{ usage: any; limits: any }>> {
    return this.client.request('GET', `/api-keys/${keyId}/usage`);
  }
}

export default AgenticProctor;
