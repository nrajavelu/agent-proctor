/**
 * Organization management API routes
 */

import { Router } from 'express';
import { Pool } from 'pg';
import multer from 'multer';
import { auth, orgIsolation } from '../middleware/auth.middleware';
import { auditLog } from '../middleware/logging.middleware';
import { rateLimit, endpointRateLimit } from '../middleware/rate-limit.middleware';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../types/express';
import { OrganizationService, CreateOrganizationRequest, UpdateOrganizationRequest } from '../services/organization.service';
import { BrandingService, BrandingAsset, BrandingTheme, BrandingContent } from '../services/branding.service';
import { KeycloakService } from '../services/keycloak.service';
import { StorageService } from '../services/storage.service';
import { extendedConfig as config } from '../config';

const router: Router = Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.maxLogoSizeBytes,
    files: 1
  }
});

// Initialize services
let orgService: OrganizationService;
let brandingService: BrandingService;
let keycloakService: KeycloakService;
let storageService: StorageService;

function initializeServices(pool: Pool) {
  keycloakService = new KeycloakService();
  storageService = new StorageService();
  orgService = new OrganizationService(pool, keycloakService, storageService);
  brandingService = new BrandingService(pool, storageService);
}

// Endpoint-specific rate limits
const endpointLimits = {
  'POST:/organizations': { windowMs: 60000, maxRequests: 5 }, // 5 orgs per minute
  'POST:/organizations/:orgId/branding/assets': { windowMs: 60000, maxRequests: 10 }, // 10 uploads per minute
  'DELETE:/organizations/:orgId': { windowMs: 300000, maxRequests: 2 } // 2 deletions per 5 minutes
};

// Apply endpoint rate limiting
router.use(endpointRateLimit(endpointLimits));

/**
 * @route GET /organizations
 * @desc List organizations with filtering and pagination
 * @access Super Admin, Org Admin (own org only)
 */
router.get('/', 
  auth({ requiredRole: 'org_admin', allowApiKey: true }),
  async (req, res) => {
    try {
      const { 
        page = '1', 
        limit = '50', 
        search, 
        subscriptionTier,
        subscriptionStatus,
        dataRegion 
      } = req.query;
      
      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
      const offset = (pageNum - 1) * limitNum;
      
      const filters = {
        search: search as string,
        subscriptionTier: subscriptionTier as string,
        subscriptionStatus: subscriptionStatus as string,
        dataRegion: dataRegion as string
      };
      
      const result = await orgService.listOrganizations(limitNum, offset, filters);
      
      res.json({
        organizations: result.organizations,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: result.total,
          pages: Math.ceil(result.total / limitNum)
        }
      });
    } catch (error) {
      logger.error('Error listing organizations:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * @route POST /organizations
 * @desc Create a new organization
 * @access Super Admin only
 */
router.post('/',
  auth({ requiredRole: 'super_admin', allowApiKey: true }),
  auditLog('create_organization'),
  async (req, res) => {
    try {
      const authReq = req as unknown as AuthenticatedRequest;
      const createData: CreateOrganizationRequest = {
        slug: authReq.body.slug,
        name: authReq.body.name,
        primaryContactName: authReq.body.primaryContactName,
        primaryContactEmail: authReq.body.primaryContactEmail,
        settings: authReq.body.settings || {},
        createdBy: authReq.user.id
      };
      
      // Validate required fields
      const requiredFields = ['slug', 'name', 'primaryContactName', 'primaryContactEmail'] as const;
      const missingFields = requiredFields.filter(field => !createData[field]);
      
      if (missingFields.length > 0) {
        return res.status(400).json({
          error: 'Missing required fields',
          missingFields
        });
      }
      
      // Validate slug format
      const slugPattern = /^[a-z0-9-]+$/;
      if (!slugPattern.test(createData.slug)) {
        return res.status(400).json({
          error: 'Invalid slug format. Use lowercase letters, numbers, and hyphens only.'
        });
      }
      
      const organization = await orgService.createOrganization(createData);
      
      // Create default branding
      await brandingService.createBranding(organization.id);
      
      res.status(201).json({ organization });
    } catch (error) {
      logger.error('Error creating organization:', error);
      
      if (error instanceof Error && error.message.includes('already exists')) {
        return res.status(409).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * @route GET /organizations/:orgId
 * @desc Get organization details
 * @access Org Admin (own org), Super Admin (any org)
 */
router.get('/:orgId',
  auth({ requiredRole: 'org_admin', allowApiKey: true }),
  orgIsolation,
  async (req, res) => {
    try {
      const { orgId } = req.params;
      
      const organization = await orgService.getOrganization(orgId);
      
      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }
      
      res.json({ organization });
    } catch (error) {
      logger.error('Error getting organization:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * @route PUT /organizations/:orgId
 * @desc Update organization
 * @access Org Admin (own org), Super Admin (any org)
 */
router.put('/:orgId',
  auth({ requiredRole: 'org_admin', allowApiKey: true }),
  orgIsolation,
  auditLog('update_organization'),
  async (req, res) => {
    try {
      const { orgId } = req.params;
      const updateData: UpdateOrganizationRequest = req.body;
      
      const organization = await orgService.updateOrganization(orgId, updateData);
      
      res.json({ organization });
    } catch (error) {
      logger.error('Error updating organization:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * @route DELETE /organizations/:orgId
 * @desc Delete organization
 * @access Super Admin only
 */
router.delete('/:orgId',
  auth({ requiredRole: 'super_admin', allowApiKey: true }),
  auditLog('delete_organization'),
  async (req, res) => {
    try {
      const authReq = req as unknown as AuthenticatedRequest;
      const { orgId } = authReq.params;
      
      await orgService.deleteOrganization(orgId, authReq.user.id);
      
      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting organization:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * @route GET /organizations/stats
 * @desc Get organization statistics
 * @access Super Admin only
 */
router.get('/stats',
  auth({ requiredRole: 'super_admin', allowApiKey: true }),
  async (req, res) => {
    try {
      const stats = await orgService.getOrganizationStats();
      res.json({ stats });
    } catch (error) {
      logger.error('Error getting organization stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Branding Routes

/**
 * @route GET /organizations/:orgId/branding
 * @desc Get organization branding
 * @access Org Admin (own org), Super Admin (any org)
 */
router.get('/:orgId/branding',
  auth({ requiredRole: 'org_user', allowApiKey: true }),
  orgIsolation,
  async (req, res) => {
    try {
      const { orgId } = req.params;
      
      const branding = await brandingService.getBranding(orgId);
      
      if (!branding) {
        return res.status(404).json({ error: 'Branding configuration not found' });
      }
      
      res.json({ branding });
    } catch (error) {
      logger.error('Error getting branding:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * @route PUT /organizations/:orgId/branding/theme
 * @desc Update organization theme
 * @access Org Admin (own org), Super Admin (any org)
 */
router.put('/:orgId/branding/theme',
  auth({ requiredRole: 'org_admin', allowApiKey: true }),
  orgIsolation,
  auditLog('update_branding_theme'),
  async (req, res) => {
    try {
      const { orgId } = req.params;
      const theme: BrandingTheme = req.body;
      
      const branding = await brandingService.updateTheme(orgId, theme);
      
      res.json({ branding });
    } catch (error) {
      logger.error('Error updating branding theme:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * @route PUT /organizations/:orgId/branding/content
 * @desc Update organization content
 * @access Org Admin (own org), Super Admin (any org)
 */
router.put('/:orgId/branding/content',
  auth({ requiredRole: 'org_admin', allowApiKey: true }),
  orgIsolation,
  auditLog('update_branding_content'),
  async (req, res) => {
    try {
      const { orgId } = req.params;
      const content: BrandingContent = req.body;
      
      const branding = await brandingService.updateContent(orgId, content);
      
      res.json({ branding });
    } catch (error) {
      logger.error('Error updating branding content:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * @route POST /organizations/:orgId/branding/assets
 * @desc Upload branding assets
 * @access Org Admin (own org), Super Admin (any org)
 */
router.post('/:orgId/branding/assets',
  auth({ requiredRole: 'org_admin', allowApiKey: true }),
  orgIsolation,
  upload.single('file'),
  auditLog('upload_branding_asset'),
  async (req, res) => {
    try {
      const { orgId } = req.params;
      const { type } = req.body;
      
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      if (!type || !['logo', 'logo-dark', 'favicon', 'background'].includes(type)) {
        return res.status(400).json({ 
          error: 'Invalid asset type. Must be one of: logo, logo-dark, favicon, background' 
        });
      }
      
      const asset: BrandingAsset = {
        type: type as any,
        file: req.file.buffer,
        mimeType: req.file.mimetype,
        originalName: req.file.originalname
      };
      
      const assetUrl = await brandingService.uploadAsset(orgId, asset);
      
      // Update branding with new asset URL
      const assetUpdate: Record<string, string> = {};
      assetUpdate[`${type}Url`] = assetUrl;
      
      const branding = await brandingService.updateAssets(orgId, assetUpdate);
      
      res.json({ 
        assetUrl,
        branding
      });
    } catch (error) {
      logger.error('Error uploading branding asset:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Invalid file type') || error.message.includes('exceeds limit')) {
          return res.status(400).json({ error: error.message });
        }
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * @route POST /organizations/:orgId/branding/validate
 * @desc Validate branding accessibility
 * @access Org Admin (own org), Super Admin (any org)
 */
router.post('/:orgId/branding/validate',
  auth({ requiredRole: 'org_admin', allowApiKey: true }),
  orgIsolation,
  async (req, res) => {
    try {
      const { orgId } = req.params;
      
      const validation = await brandingService.validateAccessibility(orgId);
      
      res.json({ validation });
    } catch (error) {
      logger.error('Error validating branding:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * @route POST /organizations/:orgId/branding/preview
 * @desc Generate branding preview
 * @access Org Admin (own org), Super Admin (any org)
 */
router.post('/:orgId/branding/preview',
  auth({ requiredRole: 'org_admin', allowApiKey: true }),
  orgIsolation,
  rateLimit({ windowMs: 60000, maxRequests: 5 }), // 5 previews per minute
  async (req, res) => {
    try {
      const { orgId } = req.params;
      
      const previewUrl = await brandingService.generatePreview(orgId);
      
      res.json({ previewUrl });
    } catch (error) {
      logger.error('Error generating branding preview:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Initialize services when the router is mounted
router.use((req, res, next) => {
  if (!orgService) {
    const pool = req.app.locals.db as Pool;
    initializeServices(pool);
  }
  next();
});

export default router;