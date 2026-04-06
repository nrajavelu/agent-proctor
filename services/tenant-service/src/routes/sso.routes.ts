/**
 * SSO configuration routes
 */

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { auth, orgIsolation } from '../middleware/auth.middleware';
import { auditLog } from '../middleware/logging.middleware';
import { rateLimit } from '../middleware/rate-limit.middleware';
import { logger } from '../utils/logger';
import { SSOConfigService, CreateSSOConfigRequest, UpdateSSOConfigRequest } from '../services/sso.service';
import { AuthenticatedRequest } from '../types/express';

const router: Router = Router({ mergeParams: true }); // mergeParams to access :orgId

let ssoConfigService: SSOConfigService;

function initializeServices(pool: Pool) {
  ssoConfigService = new SSOConfigService(pool);
}

/**
 * @route GET /organizations/:orgId/sso
 * @desc List SSO configurations for an organization
 * @access Org Admin (own org), Super Admin (any org)
 */
router.get('/',
  auth({ requiredRole: 'org_admin', allowApiKey: true }),
  orgIsolation,
  async (req, res) => {
    try {
      const { orgId } = req.params;
      
      const ssoConfigs = await ssoConfigService.listConfigurations(orgId);
      
      res.json({ ssoConfigurations: ssoConfigs });
    } catch (error) {
      logger.error('Error listing SSO configurations:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * @route POST /organizations/:orgId/sso
 * @desc Create a new SSO configuration
 * @access Org Admin (own org), Super Admin (any org)
 */
router.post('/',
  auth({ requiredRole: 'org_admin', allowApiKey: true }),
  orgIsolation,
  rateLimit({ windowMs: 300000, maxRequests: 5 }), // 5 configs per 5 minutes
  auditLog('create_sso_config'),
  async (req, res) => {
    try {
      const { orgId } = req.params;
      const createData: CreateSSOConfigRequest = req.body;
      
      // Validate required fields
      const requiredFields = ['providerName', 'providerType', 'issuerUrl', 'clientId'] as const;
      const missingFields = requiredFields.filter(field => !createData[field]);
      
      if (missingFields.length > 0) {
        return res.status(400).json({
          error: 'Missing required fields',
          missingFields
        });
      }
      
      // Validate provider type
      const validProviderTypes = ['oidc', 'saml', 'oauth2'];
      if (!validProviderTypes.includes(createData.providerType)) {
        return res.status(400).json({
          error: 'Invalid provider type',
          validTypes: validProviderTypes
        });
      }
      
      const ssoConfig = await ssoConfigService.createConfiguration(orgId, createData);
      
      res.status(201).json({ ssoConfiguration: ssoConfig });
    } catch (error) {
      logger.error('Error creating SSO configuration:', error);
      
      if (error instanceof Error && error.message.includes('already exists')) {
        return res.status(409).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * @route GET /organizations/:orgId/sso/:configId
 * @desc Get SSO configuration details
 * @access Org Admin (own org), Super Admin (any org)
 */
router.get('/:configId',
  auth({ requiredRole: 'org_admin', allowApiKey: true }),
  orgIsolation,
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { configId } = req.params;
      
      const ssoConfig = await ssoConfigService.getConfiguration(configId);
      
      if (!ssoConfig) {
        return res.status(404).json({ error: 'SSO configuration not found' });
      }
      
      // Verify organization access
      if (authReq.user.role !== 'super_admin' && ssoConfig.orgId !== req.params.orgId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      res.json({ ssoConfiguration: ssoConfig });
    } catch (error) {
      logger.error('Error getting SSO configuration:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * @route PUT /organizations/:orgId/sso/:configId
 * @desc Update SSO configuration
 * @access Org Admin (own org), Super Admin (any org)
 */
router.put('/:configId',
  auth({ requiredRole: 'org_admin', allowApiKey: true }),
  orgIsolation,
  auditLog('update_sso_config'),
  async (req, res) => {
    try {
      const { configId } = req.params;
      const updateData: UpdateSSOConfigRequest = req.body;
      
      // Validate provider type if being updated
      if (updateData.providerType) {
        const validProviderTypes = ['oidc', 'saml', 'oauth2'];
        if (!validProviderTypes.includes(updateData.providerType)) {
          return res.status(400).json({
            error: 'Invalid provider type',
            validTypes: validProviderTypes
          });
        }
      }
      
      const ssoConfig = await ssoConfigService.updateConfiguration(configId, updateData);
      
      res.json({ ssoConfiguration: ssoConfig });
    } catch (error) {
      logger.error('Error updating SSO configuration:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * @route DELETE /organizations/:orgId/sso/:configId
 * @desc Delete SSO configuration
 * @access Org Admin (own org), Super Admin (any org)
 */
router.delete('/:configId',
  auth({ requiredRole: 'org_admin', allowApiKey: true }),
  orgIsolation,
  rateLimit({ windowMs: 300000, maxRequests: 3 }), // 3 deletions per 5 minutes
  auditLog('delete_sso_config'),
  async (req, res) => {
    try {
      const { configId } = req.params;
      
      await ssoConfigService.deleteConfiguration(configId);
      
      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting SSO configuration:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * @route POST /organizations/:orgId/sso/:configId/test
 * @desc Test SSO configuration
 * @access Org Admin (own org), Super Admin (any org)
 */
router.post('/:configId/test',
  auth({ requiredRole: 'org_admin', allowApiKey: true }),
  orgIsolation,
  rateLimit({ windowMs: 60000, maxRequests: 5 }), // 5 tests per minute
  async (req, res) => {
    try {
      const { configId } = req.params;
      
      const testResult = await ssoConfigService.testConfiguration(configId);
      
      res.json({ testResult });
    } catch (error) {
      logger.error('Error testing SSO configuration:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * @route POST /organizations/:orgId/sso/:configId/enable
 * @desc Enable SSO configuration
 * @access Org Admin (own org), Super Admin (any org)
 */
router.post('/:configId/enable',
  auth({ requiredRole: 'org_admin', allowApiKey: true }),
  orgIsolation,
  auditLog('enable_sso_config'),
  async (req, res) => {
    try {
      const { configId } = req.params;
      
      const ssoConfig = await ssoConfigService.enableConfiguration(configId);
      
      res.json({ ssoConfiguration: ssoConfig });
    } catch (error) {
      logger.error('Error enabling SSO configuration:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * @route POST /organizations/:orgId/sso/:configId/disable
 * @desc Disable SSO configuration
 * @access Org Admin (own org), Super Admin (any org)
 */
router.post('/:configId/disable',
  auth({ requiredRole: 'org_admin', allowApiKey: true }),
  orgIsolation,
  auditLog('disable_sso_config'),
  async (req, res) => {
    try {
      const { configId } = req.params;
      
      const ssoConfig = await ssoConfigService.disableConfiguration(configId);
      
      res.json({ ssoConfiguration: ssoConfig });
    } catch (error) {
      logger.error('Error disabling SSO configuration:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Initialize services when the router is mounted
router.use((req, res, next) => {
  if (!ssoConfigService) {
    const pool = req.app.locals.db as Pool;
    initializeServices(pool);
  }
  next();
});

export default router;