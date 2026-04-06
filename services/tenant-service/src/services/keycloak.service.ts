/**
 * Keycloak SSO Federation Service
 */

import axios from 'axios';
import { logger } from '../utils/logger';
import { redisManager } from '../utils/redis';
import { extendedConfig as config } from '../config';

export interface KeycloakRealm {
  name: string;
  displayName: string;
  enabled: boolean;
  registrationAllowed: boolean;
  loginTheme?: string;
  accountTheme?: string;
  emailTheme?: string;
  adminTheme?: string;
  internationalizationEnabled?: boolean;
  supportedLocales?: string[];
  defaultLocale?: string;
}

export interface SSOProvider {
  id?: string;
  alias: string;
  providerId: string;
  enabled: boolean;
  displayName: string;
  config: Record<string, any>;
}

export interface KeycloakUser {
  id?: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  enabled: boolean;
  emailVerified: boolean;
  attributes?: Record<string, string[]>;
}

export interface KeycloakRole {
  name: string;
  description?: string;
  clientRole?: boolean;
}

export class KeycloakService {
  private adminToken: string | null = null;
  private tokenExpiresAt: number = 0;

  private async getAdminToken(): Promise<string> {
    const now = Date.now();
    
    // Check if token is still valid (with 5 minute buffer)
    if (this.adminToken && this.tokenExpiresAt > (now + 300000)) {
      return this.adminToken;
    }
    
    try {
      const response = await axios.post(
        `${config.keycloakBaseUrl}/realms/${config.keycloakMasterRealm}/protocol/openid-connect/token`,
        new URLSearchParams({
          grant_type: 'password',
          client_id: 'admin-cli',
          username: config.keycloakAdminUser,
          password: config.keycloakAdminPassword
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      this.adminToken = response.data.access_token;
      this.tokenExpiresAt = now + (response.data.expires_in * 1000);
      
      logger.debug('Keycloak admin token obtained');
      return this.adminToken!;
    } catch (error) {
      logger.error('Failed to obtain Keycloak admin token:', error);
      throw new Error('Failed to authenticate with Keycloak admin');
    }
  }

  private async makeRequest(method: string, path: string, data?: any): Promise<any> {
    const token = await this.getAdminToken();
    
    try {
      const response = await axios({
        method,
        url: `${config.keycloakBaseUrl}/admin/realms${path}`,
        data,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      return response.data;
    } catch (error) {
      logger.error(`Keycloak API request failed: ${method} ${path}`, error);
      throw error;
    }
  }

  async createRealm(realm: KeycloakRealm): Promise<string> {
    try {
      logger.info(`Creating Keycloak realm: ${realm.name}`);
      
      const realmConfig = {
        realm: realm.name,
        displayName: realm.displayName,
        enabled: realm.enabled,
        registrationAllowed: realm.registrationAllowed,
        loginTheme: realm.loginTheme || 'keycloak',
        accountTheme: realm.accountTheme || 'keycloak',
        emailTheme: realm.emailTheme || 'keycloak',
        adminTheme: realm.adminTheme || 'keycloak',
        internationalizationEnabled: realm.internationalizationEnabled || true,
        supportedLocales: realm.supportedLocales || ['en', 'es', 'fr', 'de'],
        defaultLocale: realm.defaultLocale || 'en',
        accessTokenLifespan: 3600,
        accessTokenLifespanForImplicitFlow: 900,
        ssoSessionIdleTimeout: 1800,
        ssoSessionMaxLifespan: 36000,
        offlineSessionIdleTimeout: 2592000,
        accessCodeLifespan: 60,
        accessCodeLifespanUserAction: 300,
        accessCodeLifespanLogin: 1800,
        actionTokenGeneratedByAdminLifespan: 43200,
        actionTokenGeneratedByUserLifespan: 300,
        oauth2DeviceCodeLifespan: 600,
        oauth2DevicePollingInterval: 5,
        bruteForceProtected: true,
        permanentLockout: false,
        maxFailureWaitSeconds: 900,
        minimumQuickLoginWaitSeconds: 60,
        waitIncrementSeconds: 60,
        quickLoginCheckMilliSeconds: 1000,
        maxDeltaTimeSeconds: 43200,
        failureFactor: 30,
        defaultRoles: ['offline_access', 'uma_authorization'],
        requiredCredentials: ['password'],
        passwordPolicy: 'length(8) and digits(1) and lowerCase(1) and upperCase(1) and specialChars(1)',
        otpPolicyType: 'totp',
        otpPolicyAlgorithm: 'HmacSHA1',
        otpPolicyDigits: 6,
        otpPolicyLookAheadWindow: 1,
        otpPolicyPeriod: 30,
        otpSupportedApplications: ['FreeOTP', 'Google Authenticator'],
        webAuthnPolicyRpEntityName: realm.displayName,
        webAuthnPolicySignatureAlgorithms: ['ES256'],
        webAuthnPolicyRpId: '',
        webAuthnPolicyAttestationConveyancePreference: 'not specified',
        webAuthnPolicyAuthenticatorAttachment: 'not specified',
        webAuthnPolicyRequireResidentKey: 'not specified',
        webAuthnPolicyUserVerificationRequirement: 'not specified',
        webAuthnPolicyCreateTimeout: 0,
        webAuthnPolicyAvoidSameAuthenticatorRegister: false
      };
      
      await this.makeRequest('POST', '', realmConfig);
      
      // Create default client for the realm
      await this.createRealmClient(realm.name, {
        clientId: 'ayan-web',
        name: 'AYAN Web Application',
        description: 'Main web application client',
        enabled: true,
        publicClient: true,
        standardFlowEnabled: true,
        implicitFlowEnabled: false,
        directAccessGrantsEnabled: true,
        serviceAccountsEnabled: false,
        authorizationServicesEnabled: false,
        redirectUris: ['*'],
        webOrigins: ['*'],
        attributes: {
          'pkce.code.challenge.method': 'S256'
        }
      });
      
      // Create default roles
      await this.createRealmRole(realm.name, {
        name: 'admin',
        description: 'Administrator role with full access'
      });
      
      await this.createRealmRole(realm.name, {
        name: 'user',
        description: 'Standard user role'
      });
      
      logger.info(`Keycloak realm created successfully: ${realm.name}`);
      return realm.name;
    } catch (error) {
      logger.error('Failed to create Keycloak realm:', error);
      throw error;
    }
  }

  async deleteRealm(realmName: string): Promise<void> {
    try {
      logger.info(`Deleting Keycloak realm: ${realmName}`);
      
      await this.makeRequest('DELETE', `/${realmName}`);
      
      logger.info(`Keycloak realm deleted: ${realmName}`);
    } catch (error) {
      logger.error('Failed to delete Keycloak realm:', error);
      throw error;
    }
  }

  async createSSOProvider(realmName: string, provider: SSOProvider): Promise<string> {
    try {
      logger.info(`Creating SSO provider ${provider.alias} for realm: ${realmName}`);
      
      const providerConfig = {
        alias: provider.alias,
        providerId: provider.providerId,
        enabled: provider.enabled,
        displayName: provider.displayName,
        config: {
          ...provider.config,
          hideOnLoginPage: 'false',
          syncMode: 'IMPORT'
        }
      };
      
      const result = await this.makeRequest('POST', `/${realmName}/identity-provider/instances`, providerConfig);
      
      // If OIDC provider, also create mapper for user attributes
      if (provider.providerId === 'oidc') {
        await this.createProviderMapper(realmName, provider.alias, {
          name: 'email-mapper',
          identityProviderMapper: 'oidc-user-attribute-idp-mapper',
          config: {
            'claim': 'email',
            'user.attribute': 'email',
            'syncMode': 'INHERIT'
          }
        });
        
        await this.createProviderMapper(realmName, provider.alias, {
          name: 'name-mapper',
          identityProviderMapper: 'oidc-user-attribute-idp-mapper',
          config: {
            'claim': 'name',
            'user.attribute': 'name',
            'syncMode': 'INHERIT'
          }
        });
      }
      
      logger.info(`SSO provider created: ${provider.alias}`);
      return provider.alias;
    } catch (error) {
      logger.error('Failed to create SSO provider:', error);
      throw error;
    }
  }

  async updateSSOProvider(realmName: string, providerAlias: string, updates: Partial<SSOProvider>): Promise<void> {
    try {
      logger.info(`Updating SSO provider ${providerAlias} for realm: ${realmName}`);
      
      await this.makeRequest('PUT', `/${realmName}/identity-provider/instances/${providerAlias}`, updates);
      
      logger.info(`SSO provider updated: ${providerAlias}`);
    } catch (error) {
      logger.error('Failed to update SSO provider:', error);
      throw error;
    }
  }

  async deleteSSOProvider(realmName: string, providerAlias: string): Promise<void> {
    try {
      logger.info(`Deleting SSO provider ${providerAlias} from realm: ${realmName}`);
      
      await this.makeRequest('DELETE', `/${realmName}/identity-provider/instances/${providerAlias}`);
      
      logger.info(`SSO provider deleted: ${providerAlias}`);
    } catch (error) {
      logger.error('Failed to delete SSO provider:', error);
      throw error;
    }
  }

  async createUser(realmName: string, user: KeycloakUser): Promise<string> {
    try {
      logger.info(`Creating user ${user.username} in realm: ${realmName}`);
      
      const userConfig = {
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        enabled: user.enabled,
        emailVerified: user.emailVerified,
        attributes: user.attributes || {},
        credentials: user.enabled ? [{
          type: 'password',
          temporary: true,
          value: this.generateTemporaryPassword()
        }] : []
      };
      
      const response = await this.makeRequest('POST', `/${realmName}/users`, userConfig);
      
      // Extract user ID from Location header
      const userId = response.split('/').pop();
      
      logger.info(`User created: ${user.username} (${userId})`);
      return userId;
    } catch (error) {
      logger.error('Failed to create user:', error);
      throw error;
    }
  }

  async assignRole(realmName: string, userId: string, roleName: string): Promise<void> {
    try {
      // Get role details
      const role = await this.makeRequest('GET', `/${realmName}/roles/${roleName}`);
      
      // Assign role to user
      await this.makeRequest('POST', `/${realmName}/users/${userId}/role-mappings/realm`, [role]);
      
      logger.info(`Role ${roleName} assigned to user ${userId}`);
    } catch (error) {
      logger.error('Failed to assign role:', error);
      throw error;
    }
  }

  async healthCheck(realmName?: string): Promise<{ healthy: boolean; details: Record<string, any> }> {
    try {
      const details: Record<string, any> = {};
      
      // Check admin token
      const token = await this.getAdminToken();
      details.adminAuth = !!token;
      
      // Check master realm
      const masterRealm = await this.makeRequest('GET', `/${config.keycloakMasterRealm}`);
      details.masterRealm = !!masterRealm;
      
      // Check specific realm if provided
      if (realmName) {
        try {
          const realm = await this.makeRequest('GET', `/${realmName}`);
          details[`realm_${realmName}`] = !!realm;
        } catch (error) {
          details[`realm_${realmName}`] = false;
        }
      }
      
      const healthy = Object.values(details).every(Boolean);
      
      return { healthy, details };
    } catch (error) {
      logger.error('Keycloak health check failed:', error);
      return {
        healthy: false,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  private async createRealmClient(realmName: string, clientConfig: any): Promise<void> {
    await this.makeRequest('POST', `/${realmName}/clients`, clientConfig);
  }

  private async createRealmRole(realmName: string, role: KeycloakRole): Promise<void> {
    await this.makeRequest('POST', `/${realmName}/roles`, role);
  }

  private async createProviderMapper(realmName: string, providerAlias: string, mapper: any): Promise<void> {
    await this.makeRequest('POST', `/${realmName}/identity-provider/instances/${providerAlias}/mappers`, mapper);
  }

  private generateTemporaryPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    
    // Ensure at least one of each type
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
    password += '0123456789'[Math.floor(Math.random() * 10)];
    password += '!@#$%^&*'[Math.floor(Math.random() * 8)];
    
    // Fill rest randomly
    for (let i = 4; i < 12; i++) {
      password += chars[Math.floor(Math.random() * chars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }
}