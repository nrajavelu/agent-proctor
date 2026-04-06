/**
 * API Key management routes
 */

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { auth, orgIsolation } from '../middleware/auth.middleware';
import { auditLog } from '../middleware/logging.middleware';
import { rateLimit } from '../middleware/rate-limit.middleware';
import { logger } from '../utils/logger';
import { ApiKeyService, CreateApiKeyRequest } from '../services/apikey.service';
import { AuthenticatedRequest } from '../types/express';

const router: Router = Router({ mergeParams: true }); // mergeParams to access :orgId

let apiKeyService: ApiKeyService;

function initializeServices(pool: Pool) {
  apiKeyService = new ApiKeyService(pool);
}

/**
 * @route GET /organizations/:orgId/api-keys
 * @desc List API keys for an organization
 * @access Org Admin (own org), Super Admin (any org)
 */
router.get('/',
  auth({ requiredRole: 'org_admin', allowApiKey: false }), // Don't allow API keys to list themselves
  orgIsolation,
  async (req, res) => {
    try {
      const { orgId } = req.params;
      const { includeRevoked = 'false' } = req.query;
      
      const apiKeys = await apiKeyService.listApiKeys(
        orgId, 
        includeRevoked === 'true'
      );
      
      res.json({ apiKeys });
    } catch (error) {
      logger.error('Error listing API keys:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * @route POST /organizations/:orgId/api-keys
 * @desc Create a new API key
 * @access Org Admin (own org), Super Admin (any org)
 */
router.post('/',
  auth({ requiredRole: 'org_admin', allowApiKey: false }),
  orgIsolation,
  rateLimit({ windowMs: 60000, maxRequests: 5 }), // 5 keys per minute
  auditLog('create_api_key'),
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { orgId } = req.params;
      const createData: CreateApiKeyRequest = {
        ...req.body,
        createdBy: authReq.user.id
      };
      
      // Validate required fields
      if (!createData.name) {
        return res.status(400).json({ error: 'API key name is required' });
      }
      
      // Validate scopes
      const validScopes = ['read', 'write', 'admin', '*'];
      if (createData.scopes) {
        const invalidScopes = createData.scopes.filter(scope => !validScopes.includes(scope));
        if (invalidScopes.length > 0) {
          return res.status(400).json({ 
            error: 'Invalid scopes',
            validScopes,
            invalidScopes
          });
        }
      }
      
      const result = await apiKeyService.createApiKey(orgId, createData);
      
      // Return the secret key only once
      res.status(201).json({
        apiKey: result.apiKey,
        secretKey: result.secretKey,
        warning: 'Store the secret key securely. It will not be shown again.'
      });
    } catch (error) {
      logger.error('Error creating API key:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * @route GET /organizations/:orgId/api-keys/:keyId
 * @desc Get API key details
 * @access Org Admin (own org), Super Admin (any org)
 */
router.get('/:keyId',
  auth({ requiredRole: 'org_admin', allowApiKey: false }),
  orgIsolation,
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { keyId } = req.params;
      
      const apiKey = await apiKeyService.getApiKey(keyId);
      
      if (!apiKey) {
        return res.status(404).json({ error: 'API key not found' });
      }
      
      // Verify organization access
      if (authReq.user.role !== 'super_admin' && apiKey.orgId !== req.params.orgId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      res.json({ apiKey });
    } catch (error) {
      logger.error('Error getting API key:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * @route PUT /organizations/:orgId/api-keys/:keyId
 * @desc Update API key
 * @access Org Admin (own org), Super Admin (any org)
 */
router.put('/:keyId',
  auth({ requiredRole: 'org_admin', allowApiKey: false }),
  orgIsolation,
  auditLog('update_api_key'),
  async (req, res) => {
    try {
      const { keyId } = req.params;
      const { name, description, scopes, permissions, rateLimit, enabled } = req.body;
      
      // Validate scopes if provided
      const validScopes = ['read', 'write', 'admin', '*'];
      if (scopes) {
        const invalidScopes = scopes.filter((scope: string) => !validScopes.includes(scope));
        if (invalidScopes.length > 0) {
          return res.status(400).json({ 
            error: 'Invalid scopes',
            validScopes,
            invalidScopes
          });
        }
      }
      
      const updates = {
        name,
        description,
        scopes,
        permissions,
        rateLimit,
        enabled
      };
      
      const apiKey = await apiKeyService.updateApiKey(keyId, updates);
      
      res.json({ apiKey });
    } catch (error) {
      logger.error('Error updating API key:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * @route DELETE /organizations/:orgId/api-keys/:keyId
 * @desc Revoke API key
 * @access Org Admin (own org), Super Admin (any org)
 */
router.delete('/:keyId',
  auth({ requiredRole: 'org_admin', allowApiKey: false }),
  orgIsolation,
  rateLimit({ windowMs: 60000, maxRequests: 10 }), // 10 revocations per minute
  auditLog('revoke_api_key'),
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { keyId } = req.params;
      const { reason } = req.body;
      
      await apiKeyService.revokeApiKey(keyId, authReq.user.id, reason);
      
      res.status(204).send();
    } catch (error) {
      logger.error('Error revoking API key:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * @route GET /organizations/:orgId/api-keys/stats
 * @desc Get API key usage statistics
 * @access Org Admin (own org), Super Admin (any org)
 */
router.get('/stats',
  auth({ requiredRole: 'org_admin', allowApiKey: true }),
  orgIsolation,
  async (req, res) => {
    try {
      const { orgId } = req.params;
      
      const stats = await apiKeyService.getApiKeyStats(orgId);
      
      res.json({ stats });
    } catch (error) {
      logger.error('Error getting API key stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Initialize services when the router is mounted
router.use((req, res, next) => {
  if (!apiKeyService) {
    const pool = req.app.locals.db as Pool;
    initializeServices(pool);
  }
  next();
});

export default router;