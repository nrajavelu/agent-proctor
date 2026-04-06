/**
 * Organization branding service
 */

import { Pool } from 'pg';
import sharp from 'sharp';
import { logger } from '../utils/logger';
import { redisManager } from '../utils/redis';
import { extendedConfig as config } from '../config';
import { StorageService } from './storage.service';

export interface OrganizationBranding {
  id: string;
  orgId: string;
  logoUrl?: string;
  logoDarkUrl?: string;
  faviconUrl?: string;
  backgroundImageUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  textSecondaryColor?: string;
  successColor?: string;
  warningColor?: string;
  errorColor?: string;
  fontFamily?: string;
  fontWeights?: number[];
  fontSize?: Record<string, any>;
  customCss?: string;
  cssVariables?: Record<string, any>;
  organizationDisplayName?: string;
  welcomeMessage?: string;
  verificationInstructions?: Record<string, any>;
  supportMessage?: string;
  termsUrl?: string;
  privacyUrl?: string;
  supportEmail?: string;
  supportPhone?: string;
  supportHours?: string;
  helpUrl?: string;
  defaultLocale: string;
  supportedLocales?: string[];
  customTranslations?: Record<string, any>;
  pageTitleTemplate?: string;
  metaDescription?: string;
  accessibilityValidated: boolean;
  lastPreviewAt?: Date;
  validationErrors?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface BrandingAsset {
  type: 'logo' | 'logo-dark' | 'favicon' | 'background';
  file: Buffer;
  mimeType: string;
  originalName: string;
}

export interface BrandingTheme {
  colors: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    text?: string;
    textSecondary?: string;
    success?: string;
    warning?: string;
    error?: string;
  };
  typography: {
    fontFamily?: string;
    fontWeights?: number[];
    fontSize?: Record<string, string>;
  };
  customCss?: string;
  cssVariables?: Record<string, string>;
}

export interface BrandingContent {
  organizationDisplayName?: string;
  welcomeMessage?: string;
  verificationInstructions?: Record<string, string>;
  supportMessage?: string;
  termsUrl?: string;
  privacyUrl?: string;
  supportEmail?: string;
  supportPhone?: string;
  supportHours?: string;
  helpUrl?: string;
  defaultLocale?: string;
  supportedLocales?: string[];
  customTranslations?: Record<string, Record<string, string>>;
  pageTitleTemplate?: string;
  metaDescription?: string;
}

export class BrandingService {
  constructor(
    private readonly pool: Pool,
    private readonly storageService: StorageService
  ) {}

  async createBranding(orgId: string): Promise<OrganizationBranding> {
    const result = await this.pool.query(
      `INSERT INTO organization_branding (org_id, default_locale, accessibility_validated)
       VALUES ($1, 'en-US', false)
       RETURNING *`,
      [orgId]
    );
    
    const branding = this.mapRowToBranding(result.rows[0]);
    
    // Clear cache
    await this.invalidateCache(orgId);
    
    logger.info(`Branding created for organization: ${orgId}`, {
      brandingId: branding.id,
      orgId
    });
    
    return branding;
  }

  async getBranding(orgId: string): Promise<OrganizationBranding | null> {
    const cacheKey = `branding:${orgId}`;
    const cached = await redisManager.get<OrganizationBranding>(cacheKey);
    if (cached) {
      return cached;
    }
    
    const result = await this.pool.query(
      'SELECT * FROM organization_branding WHERE org_id = $1',
      [orgId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const branding = this.mapRowToBranding(result.rows[0]);
    
    // Cache for 15 minutes
    await redisManager.set(cacheKey, branding, 900);
    
    return branding;
  }

  async uploadAsset(orgId: string, asset: BrandingAsset): Promise<string> {
    // Validate file type
    if (!config.allowedImageTypesArray.includes(asset.mimeType)) {
      throw new Error(`Invalid file type. Allowed types: ${config.allowedImageTypes}`);
    }
    
    // Validate file size
    if (asset.file.length > config.maxLogoSizeBytes) {
      throw new Error(`File size exceeds limit of ${config.maxLogoSizeMb}MB`);
    }
    
    // Process image based on type
    let processedBuffer: Buffer;
    let filename: string;
    
    switch (asset.type) {
      case 'logo':
      case 'logo-dark':
        processedBuffer = await this.processLogo(asset.file);
        filename = `${asset.type}-${Date.now()}.webp`;
        break;
      case 'favicon':
        processedBuffer = await this.processFavicon(asset.file);
        filename = `favicon-${Date.now()}.ico`;
        break;
      case 'background':
        processedBuffer = await this.processBackground(asset.file);
        filename = `background-${Date.now()}.webp`;
        break;
      default:
        throw new Error('Invalid asset type');
    }
    
    // Upload to storage
    const bucketName = `org-branding`;
    const objectKey = `${orgId}/${filename}`;
    
    await this.storageService.uploadObject(bucketName, objectKey, processedBuffer, {
      contentType: asset.type === 'favicon' ? 'image/x-icon' : 'image/webp'
    });
    
    // Return public URL
    const assetUrl = `${config.brandingCdnUrl}/${objectKey}`;
    
    logger.info(`Asset uploaded for organization: ${orgId}`, {
      assetType: asset.type,
      assetUrl,
      fileSize: processedBuffer.length
    });
    
    return assetUrl;
  }

  async updateAssets(orgId: string, assets: Record<string, string>): Promise<OrganizationBranding> {
    const fields = [];
    const values = [];
    let paramIndex = 1;
    
    for (const [key, url] of Object.entries(assets)) {
      const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      fields.push(`${dbField} = $${paramIndex}`);
      values.push(url);
      paramIndex++;
    }
    
    if (fields.length === 0) {
      throw new Error('No assets to update');
    }
    
    fields.push('updated_at = NOW()');
    values.push(orgId);
    
    const result = await this.pool.query(
      `UPDATE organization_branding SET ${fields.join(', ')} WHERE org_id = $${paramIndex} RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      throw new Error('Branding configuration not found');
    }
    
    const branding = this.mapRowToBranding(result.rows[0]);
    
    await this.invalidateCache(orgId);
    
    return branding;
  }

  async updateTheme(orgId: string, theme: BrandingTheme): Promise<OrganizationBranding> {
    const updates: any = {};
    
    // Map colors
    if (theme.colors) {
      Object.assign(updates, {
        primaryColor: theme.colors.primary,
        secondaryColor: theme.colors.secondary,
        accentColor: theme.colors.accent,
        backgroundColor: theme.colors.background,
        textColor: theme.colors.text,
        textSecondaryColor: theme.colors.textSecondary,
        successColor: theme.colors.success,
        warningColor: theme.colors.warning,
        errorColor: theme.colors.error
      });
    }
    
    // Map typography
    if (theme.typography) {
      Object.assign(updates, {
        fontFamily: theme.typography.fontFamily,
        fontWeights: theme.typography.fontWeights,
        fontSize: theme.typography.fontSize
      });
    }
    
    if (theme.customCss) {
      updates.customCss = theme.customCss;
    }
    
    if (theme.cssVariables) {
      updates.cssVariables = theme.cssVariables;
    }
    
    return this.updateBrandingFields(orgId, updates);
  }

  async updateContent(orgId: string, content: BrandingContent): Promise<OrganizationBranding> {
    return this.updateBrandingFields(orgId, content);
  }

  async validateAccessibility(orgId: string): Promise<{ valid: boolean; errors: string[] }> {
    const branding = await this.getBranding(orgId);
    if (!branding) {
      throw new Error('Branding configuration not found');
    }
    
    const errors: string[] = [];
    
    // Color contrast validation
    if (branding.primaryColor && branding.backgroundColor) {
      const contrast = this.calculateContrastRatio(branding.primaryColor, branding.backgroundColor);
      if (contrast < 4.5) {
        errors.push('Primary color contrast ratio is below WCAG AA standard (4.5:1)');
      }
    }
    
    if (branding.textColor && branding.backgroundColor) {
      const contrast = this.calculateContrastRatio(branding.textColor, branding.backgroundColor);
      if (contrast < 4.5) {
        errors.push('Text color contrast ratio is below WCAG AA standard (4.5:1)');
      }
    }
    
    // Logo alt text validation
    if (branding.logoUrl && !branding.organizationDisplayName) {
      errors.push('Organization display name is required for logo accessibility');
    }
    
    // CSS validation (basic)
    if (branding.customCss) {
      if (branding.customCss.length > config.maxCssSizeBytes) {
        errors.push(`Custom CSS exceeds size limit of ${config.maxCssSizeKb}KB`);
      }
    }
    
    const valid = errors.length === 0;
    
    // Update validation status
    await this.pool.query(
      `UPDATE organization_branding 
       SET accessibility_validated = $1, validation_errors = $2, updated_at = NOW() 
       WHERE org_id = $3`,
      [valid, JSON.stringify({ errors }), orgId]
    );
    
    await this.invalidateCache(orgId);
    
    return { valid, errors };
  }

  async generatePreview(orgId: string): Promise<string> {
    const branding = await this.getBranding(orgId);
    if (!branding) {
      throw new Error('Branding configuration not found');
    }
    
    // Generate preview HTML with inline styles
    const previewHtml = this.generatePreviewHtml(branding);
    
    // Upload preview HTML to storage
    const bucketName = 'org-branding';
    const objectKey = `${orgId}/preview-${Date.now()}.html`;
    
    await this.storageService.uploadObject(bucketName, objectKey, Buffer.from(previewHtml), {
      contentType: 'text/html'
    });
    
    // Update last preview time
    await this.pool.query(
      'UPDATE organization_branding SET last_preview_at = NOW() WHERE org_id = $1',
      [orgId]
    );
    
    await this.invalidateCache(orgId);
    
    const previewUrl = `${config.brandingCdnUrl}/${objectKey}`;
    
    logger.info(`Preview generated for organization: ${orgId}`, {
      previewUrl
    });
    
    return previewUrl;
  }

  private async updateBrandingFields(orgId: string, updates: Record<string, any>): Promise<OrganizationBranding> {
    const fields = [];
    const values = [];
    let paramIndex = 1;
    
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
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
    
    if (fields.length === 0) {
      const branding = await this.getBranding(orgId);
      if (!branding) {
        throw new Error('Branding configuration not found');
      }
      return branding;
    }
    
    fields.push('updated_at = NOW()');
    values.push(orgId);
    
    const result = await this.pool.query(
      `UPDATE organization_branding SET ${fields.join(', ')} WHERE org_id = $${paramIndex} RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      throw new Error('Branding configuration not found');
    }
    
    const branding = this.mapRowToBranding(result.rows[0]);
    
    await this.invalidateCache(orgId);
    
    return branding;
  }

  private async processLogo(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer)
      .resize({ width: 400, height: 200, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 90 })
      .toBuffer();
  }

  private async processFavicon(buffer: Buffer): Promise<Buffer> {
    // For favicon, keep as ICO format if possible, otherwise convert to PNG
    try {
      return sharp(buffer)
        .resize(32, 32)
        .png()
        .toBuffer();
    } catch (error) {
      logger.warn('Failed to process favicon as PNG, using original:', error);
      return buffer;
    }
  }

  private async processBackground(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer)
      .resize({ width: 1920, height: 1080, fit: 'cover' })
      .webp({ quality: 85 })
      .toBuffer();
  }

  private calculateContrastRatio(color1: string, color2: string): number {
    // Convert hex colors to RGB
    const rgb1 = this.hexToRgb(color1);
    const rgb2 = this.hexToRgb(color2);
    
    if (!rgb1 || !rgb2) return 0;
    
    // Calculate relative luminance
    const l1 = this.getRelativeLuminance(rgb1);
    const l2 = this.getRelativeLuminance(rgb2);
    
    // Calculate contrast ratio
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    
    return (lighter + 0.05) / (darker + 0.05);
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  private getRelativeLuminance(rgb: { r: number; g: number; b: number }): number {
    const { r, g, b } = rgb;
    const rs = r / 255;
    const gs = g / 255;
    const bs = b / 255;
    
    const rLinear = rs <= 0.03928 ? rs / 12.92 : Math.pow((rs + 0.055) / 1.055, 2.4);
    const gLinear = gs <= 0.03928 ? gs / 12.92 : Math.pow((gs + 0.055) / 1.055, 2.4);
    const bLinear = bs <= 0.03928 ? bs / 12.92 : Math.pow((bs + 0.055) / 1.055, 2.4);
    
    return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
  }

  private generatePreviewHtml(branding: OrganizationBranding): string {
    const orgName = branding.organizationDisplayName || 'Your Organization';
    const welcomeMessage = branding.welcomeMessage || 'Welcome to the AYAN.AI Proctoring Platform';
    
    return `
    <!DOCTYPE html>
    <html lang="${branding.defaultLocale}">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Preview - ${orgName}</title>
        <style>
            ${this.generatePreviewCss(branding)}
        </style>
    </head>
    <body>
        <header class="header">
            ${branding.logoUrl ? `<img src="${branding.logoUrl}" alt="${orgName} Logo" class="logo">` : ''}
            <h1>${orgName}</h1>
        </header>
        <main class="main">
            <div class="welcome-section">
                <h2>Welcome</h2>
                <p>${welcomeMessage}</p>
                <button class="primary-button">Start Verification</button>
                <button class="secondary-button">Learn More</button>
            </div>
            <div class="status-section">
                <div class="status-item success">
                    <span class="status-label">System Status</span>
                    <span class="status-value">Online</span>
                </div>
                <div class="status-item warning">
                    <span class="status-label">Camera Check</span>
                    <span class="status-value">Required</span>
                </div>
            </div>
        </main>
        <footer class="footer">
            ${branding.supportEmail ? `<a href="mailto:${branding.supportEmail}">Support</a>` : ''}
            ${branding.termsUrl ? `<a href="${branding.termsUrl}">Terms</a>` : ''}
            ${branding.privacyUrl ? `<a href="${branding.privacyUrl}">Privacy</a>` : ''}
        </footer>
    </body>
    </html>`;
  }

  private generatePreviewCss(branding: OrganizationBranding): string {
    return `
        :root {
            --primary-color: ${branding.primaryColor || '#007bff'};
            --secondary-color: ${branding.secondaryColor || '#6c757d'};
            --accent-color: ${branding.accentColor || '#28a745'};
            --background-color: ${branding.backgroundColor || '#ffffff'};
            --text-color: ${branding.textColor || '#212529'};
            --text-secondary-color: ${branding.textSecondaryColor || '#6c757d'};
            --success-color: ${branding.successColor || '#28a745'};
            --warning-color: ${branding.warningColor || '#ffc107'};
            --error-color: ${branding.errorColor || '#dc3545'};
            --font-family: ${branding.fontFamily || 'system-ui, sans-serif'};
        }
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: var(--font-family);
            color: var(--text-color);
            background-color: var(--background-color);
            ${branding.backgroundImageUrl ? `background-image: url('${branding.backgroundImageUrl}');` : ''}
            background-size: cover;
            background-position: center;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        .header {
            display: flex;
            align-items: center;
            padding: 1rem 2rem;
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(10px);
            border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        }
        
        .logo {
            height: 40px;
            margin-right: 1rem;
        }
        
        .main {
            flex: 1;
            padding: 2rem;
            display: flex;
            flex-direction: column;
            gap: 2rem;
            max-width: 800px;
            margin: 0 auto;
            width: 100%;
        }
        
        .welcome-section {
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(10px);
            padding: 2rem;
            border-radius: 8px;
            text-align: center;
        }
        
        .welcome-section h2 {
            color: var(--primary-color);
            margin-bottom: 1rem;
        }
        
        .welcome-section p {
            color: var(--text-secondary-color);
            margin-bottom: 2rem;
        }
        
        .primary-button {
            background: var(--primary-color);
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 4px;
            margin-right: 1rem;
            cursor: pointer;
        }
        
        .secondary-button {
            background: var(--secondary-color);
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 4px;
            cursor: pointer;
        }
        
        .status-section {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
        }
        
        .status-item {
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(10px);
            padding: 1rem;
            border-radius: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .status-item.success .status-value {
            color: var(--success-color);
        }
        
        .status-item.warning .status-value {
            color: var(--warning-color);
        }
        
        .footer {
            padding: 1rem 2rem;
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(10px);
            border-top: 1px solid rgba(0, 0, 0, 0.1);
            display: flex;
            gap: 1rem;
            justify-content: center;
        }
        
        .footer a {
            color: var(--primary-color);
            text-decoration: none;
        }
        
        .footer a:hover {
            text-decoration: underline;
        }
        
        ${branding.customCss || ''}
    `;
  }

  private mapRowToBranding(row: any): OrganizationBranding {
    return {
      id: row.id,
      orgId: row.org_id,
      logoUrl: row.logo_url,
      logoDarkUrl: row.logo_dark_url,
      faviconUrl: row.favicon_url,
      backgroundImageUrl: row.background_image_url,
      primaryColor: row.primary_color,
      secondaryColor: row.secondary_color,
      accentColor: row.accent_color,
      backgroundColor: row.background_color,
      textColor: row.text_color,
      textSecondaryColor: row.text_secondary_color,
      successColor: row.success_color,
      warningColor: row.warning_color,
      errorColor: row.error_color,
      fontFamily: row.font_family,
      fontWeights: row.font_weights,
      fontSize: typeof row.font_sizes === 'string' ? JSON.parse(row.font_sizes) : row.font_sizes,
      customCss: row.custom_css,
      cssVariables: typeof row.css_variables === 'string' ? JSON.parse(row.css_variables) : row.css_variables,
      organizationDisplayName: row.organization_display_name,
      welcomeMessage: row.welcome_message,
      verificationInstructions: typeof row.verification_instructions === 'string' ? JSON.parse(row.verification_instructions) : row.verification_instructions,
      supportMessage: row.support_message,
      termsUrl: row.terms_url,
      privacyUrl: row.privacy_url,
      supportEmail: row.support_email,
      supportPhone: row.support_phone,
      supportHours: row.support_hours,
      helpUrl: row.help_url,
      defaultLocale: row.default_locale,
      supportedLocales: row.supported_locales,
      customTranslations: typeof row.custom_translations === 'string' ? JSON.parse(row.custom_translations) : row.custom_translations,
      pageTitleTemplate: row.page_title_template,
      metaDescription: row.meta_description,
      accessibilityValidated: row.accessibility_validated,
      lastPreviewAt: row.last_preview_at ? new Date(row.last_preview_at) : undefined,
      validationErrors: typeof row.validation_errors === 'string' ? JSON.parse(row.validation_errors) : row.validation_errors,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private async invalidateCache(orgId: string): Promise<void> {
    await redisManager.del(`branding:${orgId}`);
  }
}