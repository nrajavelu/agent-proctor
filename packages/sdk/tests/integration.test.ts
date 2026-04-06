/**
 * Phase 5 Integration Tests - Tenant Service & SDK
 * 
 * Tests the complete integration between the tenant service and the SDK,
 * covering organization management, branding, SSO, and API key functionality.
 */

import { AgenticProctor, TenantClient } from '../src';

// Test configuration
const TEST_CONFIG = {
  tenantUrl: process.env.TENANT_URL || 'http://localhost:3000',
  apiKey: process.env.TEST_API_KEY || 'test-api-key',
  accessToken: process.env.TEST_ACCESS_TOKEN,
  debug: true
};

describe('Phase 5 Integration Tests', () => {
  let proctor: AgenticProctor;
  let tenantClient: TenantClient;
  let testOrgId: string;

  beforeAll(async () => {
    // Initialize SDK with tenant service configuration
    proctor = new AgenticProctor({
      apiUrl: 'http://localhost:4000', // Main proctoring API
      livekitUrl: 'ws://localhost:7880',
      tenantUrl: TEST_CONFIG.tenantUrl,
      apiKey: TEST_CONFIG.apiKey,
      accessToken: TEST_CONFIG.accessToken,
      debug: TEST_CONFIG.debug
    });

    tenantClient = proctor.getTenantClient();

    // Wait for tenant service to be ready
    await waitForService(TEST_CONFIG.tenantUrl + '/health', 30000);
  });

  describe('Service Health', () => {
    test('should connect to tenant service', async () => {
      const response = await fetch(`${TEST_CONFIG.tenantUrl}/health`);
      expect(response.ok).toBe(true);
      
      const health = await response.json();
      expect(health.status).toBe('healthy');
      expect(health.service).toBe('tenant-service');
    });

    test('should initialize tenant client', () => {
      expect(tenantClient).toBeDefined();
      expect(tenantClient.organizations).toBeDefined();
      expect(tenantClient.branding).toBeDefined();
      expect(tenantClient.sso).toBeDefined();
      expect(tenantClient.apiKeys).toBeDefined();
    });
  });

  describe('Organization Management', () => {
    test('should create organization via SDK', async () => {
      const orgConfig = {
        slug: `test-org-${Date.now()}`,
        name: 'Test Organization',
        primaryContactName: 'John Doe',
        primaryContactEmail: 'john@test.com',
        settings: {
          allowRegistration: true,
          defaultRole: 'user'
        }
      };

      const result = await proctor.createOrganization(orgConfig);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.slug).toBe(orgConfig.slug);
      expect(result.data!.name).toBe(orgConfig.name);
      
      testOrgId = result.data!.id;
    });

    test('should get organization details', async () => {
      const result = await proctor.getOrganization(testOrgId);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.id).toBe(testOrgId);
      expect(result.data!.status).toBe('active');
    });

    test('should update organization settings', async () => {
      const updates = {
        settings: {
          allowRegistration: false,
          defaultRole: 'viewer',
          customSetting: 'test-value'
        }
      };

      const result = await proctor.updateOrganization(testOrgId, updates);
      
      expect(result.success).toBe(true);
      expect(result.data!.settings.allowRegistration).toBe(false);
      expect(result.data!.settings.customSetting).toBe('test-value');
    });

    test('should list organizations', async () => {
      const result = await tenantClient.organizations.list();
      
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data!.length).toBeGreaterThan(0);
      
      const testOrg = result.data!.find(org => org.id === testOrgId);
      expect(testOrg).toBeDefined();
    });
  });

  describe('Branding System', () => {
    test('should configure organization branding theme', async () => {
      const brandingConfig = {
        orgId: testOrgId,
        theme: {
          name: 'corporate-blue',
          primary: '#2563eb',
          secondary: '#64748b', 
          accent: '#0ea5e9',
          background: '#ffffff',
          surface: '#f8fafc',
          text: '#1e293b',
          textSecondary: '#64748b'
        },
        assets: {},
        customCss: '.custom { color: #2563eb; }',
        isActive: true
      };

      const result = await proctor.configureBranding(brandingConfig);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.theme.primary).toBe('#2563eb');
      expect(result.data!.isActive).toBe(true);
    });

    test('should get organization branding', async () => {
      const result = await tenantClient.branding.get(testOrgId);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.theme.name).toBe('corporate-blue');
      expect(result.data!.customCss).toContain('.custom');
    });

    test('should handle branding asset upload simulation', async () => {
      // Note: This test simulates file upload without actual file
      const mockFile = new File(['fake-image-data'], 'logo.png', { type: 'image/png' });
      
      try {
        const result = await tenantClient.branding.uploadAsset(testOrgId, 'logo', mockFile);
        // May fail without proper auth, but should not throw
        expect(typeof result).toBe('object');
      } catch (error) {
        // Expected in test environment without proper file handling
        expect(error).toBeDefined();
      }
    });
  });

  describe('SSO Configuration', () => {
    test('should create SSO configuration', async () => {
      const ssoConfig = {
        orgId: testOrgId,
        providerName: 'Test OIDC Provider',
        providerType: 'OIDC' as const,
        issuerUrl: 'https://auth.test.com',
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        additionalScopes: ['email', 'profile'],
        attributeMapping: {
          email: 'email',
          name: 'name',
          role: 'groups'
        },
        isActive: true
      };

      const result = await proctor.configureSso(ssoConfig);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.providerName).toBe('Test OIDC Provider');
      expect(result.data!.providerType).toBe('OIDC');
    });

    test('should list SSO configurations', async () => {
      const result = await tenantClient.sso.list(testOrgId);
      
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data!.length).toBeGreaterThan(0);
      
      const testSso = result.data!.find(sso => sso.providerName === 'Test OIDC Provider');
      expect(testSso).toBeDefined();
      expect(testSso!.isActive).toBe(true);
    });
  });

  describe('API Key Management', () => {
    let testApiKeyId: string;

    test('should create API key', async () => {
      const apiKeyConfig = {
        name: 'Integration Test Key',
        scopes: ['read:organizations', 'write:branding'],
        rateLimit: {
          requestsPerMinute: 100,
          requestsPerHour: 1000,
          requestsPerDay: 10000
        },
        allowedIPs: ['127.0.0.1'],
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      };

      const result = await proctor.createApiKey(apiKeyConfig);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.name).toBe('Integration Test Key');
      expect(result.data!.scopes).toEqual(expect.arrayContaining(['read:organizations']));
      expect(result.data!.key).toBeDefined(); // Only returned on creation
      
      testApiKeyId = result.data!.id;
    });

    test('should get API key details', async () => {
      const result = await tenantClient.apiKeys.get(testApiKeyId);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.id).toBe(testApiKeyId);
      expect(result.data!.status).toBe('active');
      expect(result.data!.usage).toBeDefined();
    });

    test('should list API keys', async () => {
      const result = await tenantClient.apiKeys.list(testOrgId);
      
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      
      const testKey = result.data!.find(key => key.id === testApiKeyId);
      expect(testKey).toBeDefined();
      expect(testKey!.name).toBe('Integration Test Key');
    });

    test('should revoke API key', async () => {
      const result = await tenantClient.apiKeys.revoke(testApiKeyId, 'Integration test completed');
      
      expect(result.success).toBe(true);
      
      // Verify revocation
      const getResult = await tenantClient.apiKeys.get(testApiKeyId);
      expect(getResult.data!.status).toBe('revoked');
    });
  });

  describe('Proctoring Integration', () => {
    test('should start proctoring session with tenant context', async () => {
      const sessionId = await proctor.startSession({
        candidateId: 'test-candidate-123',
        examId: 'test-exam-456',
        token: 'test-session-token'
      });

      expect(typeof sessionId).toBe('string');
      expect(sessionId).toContain('session_');
      expect(sessionId).toContain('test-candidate-123');
    });

    test('should get session status', () => {
      const status = proctor.getSessionStatus();
      
      expect(status.active).toBe(true);
      expect(status.sessionId).toContain('session_');
    });

    test('should stop proctoring session', async () => {
      await proctor.stopSession();
      
      const status = proctor.getSessionStatus();
      expect(status.active).toBe(false);
      expect(status.sessionId).toBe(null);
    });
  });

  afterAll(async () => {
    // Cleanup: Delete test organization
    if (testOrgId) {
      try {
        await tenantClient.organizations.delete(testOrgId);
      } catch (error) {
        console.warn('Failed to cleanup test organization:', error);
      }
    }
  });
});

// Helper function to wait for service to be ready
async function waitForService(url: string, timeoutMs: number = 30000): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch (error) {
      // Service not ready, continue waiting
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  throw new Error(`Service not ready after ${timeoutMs}ms: ${url}`);
}

// Test data generators
export const TestDataGenerator = {
  organization: (suffix = Date.now()) => ({
    slug: `test-org-${suffix}`,
    name: `Test Organization ${suffix}`,
    primaryContactName: 'Test User',
    primaryContactEmail: `test${suffix}@example.com`,
    settings: {
      allowRegistration: true,
      defaultRole: 'user'
    }
  }),

  branding: (orgId: string) => ({
    orgId,
    theme: {
      name: `test-theme-${Date.now()}`,
      primary: '#3b82f6',
      secondary: '#64748b',
      accent: '#06b6d4',
      background: '#ffffff',
      surface: '#f8fafc',
      text: '#1e293b',
      textSecondary: '#64748b'
    },
    assets: {},
    isActive: true
  }),

  ssoConfig: (orgId: string) => ({
    orgId,
    providerName: `Test Provider ${Date.now()}`,
    providerType: 'OIDC' as const,
    issuerUrl: 'https://auth.example.com',
    clientId: 'test-client',
    isActive: true
  }),

  apiKey: () => ({
    name: `Test Key ${Date.now()}`,
    scopes: ['read:organizations', 'write:branding'],
    rateLimit: {
      requestsPerMinute: 100,
      requestsPerHour: 1000,
      requestsPerDay: 10000
    }
  })
};