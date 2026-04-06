# Tenant Service

Multi-tenant organization management and white-label branding service for the Agent Proctor platform.

## Features

### 🏢 **Multi-Tenant Management**
- Organization provisioning and lifecycle management
- Automated Keycloak realm creation per organization
- Database isolation with row-level security
- Storage bucket management per tenant
- API key generation for server-to-server integration

### 🎨 **White-Label Branding**
- Complete provider anonymity for candidate interfaces
- Logo upload and management with CDN distribution
- Color palette customization with accessibility validation
- Custom CSS upload with sanitization
- Font family selection from approved sets
- Dynamic text replacement system

### 🔑 **SSO & Federation**
- Multiple trusted issuer support (university SSO, corporate LDAP)
- Dynamic public key rotation handling
- Claims mapping configuration per issuer
- Automatic organization provisioning from JWT claims

### 📊 **Organization Analytics**
- Usage statistics and monitoring
- Health dashboards per organization
- Billing and quota management
- Session analytics and reporting

## API Endpoints

### Organization Management
- `POST /api/orgs` - Create new organization
- `GET /api/orgs` - List organizations (super admin)
- `GET /api/orgs/:id` - Get organization details
- `PUT /api/orgs/:id` - Update organization
- `DELETE /api/orgs/:id` - Delete organization

### Branding Management
- `GET /api/orgs/:id/branding` - Get branding configuration
- `PUT /api/orgs/:id/branding` - Update branding settings
- `POST /api/orgs/:id/branding/logo` - Upload organization logo
- `POST /api/orgs/:id/branding/css` - Upload custom CSS
- `GET /api/orgs/:id/branding/preview` - Preview branding

### API Key Management
- `POST /api/orgs/:id/keys` - Generate API key pair
- `GET /api/orgs/:id/keys` - List API keys
- `DELETE /api/orgs/:id/keys/:keyId` - Revoke API key

### SSO & Federation
- `GET /api/orgs/:id/sso` - Get SSO configuration
- `PUT /api/orgs/:id/sso` - Update SSO settings
- `POST /api/orgs/:id/sso/issuers` - Add trusted issuer
- `DELETE /api/orgs/:id/sso/issuers/:issuerId` - Remove issuer

### User Management
- `GET /api/orgs/:id/users` - List organization users
- `POST /api/orgs/:id/users/invite` - Invite new admin
- `PUT /api/orgs/:id/users/:userId/role` - Update user role
- `DELETE /api/orgs/:id/users/:userId` - Remove user

## Architecture

```
Tenant Service
├── Organization Management
│   ├── Multi-tenant provisioning
│   ├── Keycloak realm management
│   ├── Database isolation
│   └── Storage bucket management
├── Branding Engine
│   ├── Logo & asset management
│   ├── Theme customization
│   ├── CSS sanitization
│   └── Preview system
├── SSO & Federation
│   ├── Multiple issuer support
│   ├── Claims mapping
│   ├── Auto-provisioning
│   └── Key rotation handling
└── API Management
    ├── Key generation
    ├── Webhook management
    ├── Rate limiting
    └── Analytics
```

## Database Schema

The service manages several key tables:

### Organizations
- Core organization metadata
- Subscription and billing information
- Storage quotas and limits
- Feature flags and permissions

### Organization Branding
- Logo and asset URLs
- Color palette configuration
- Custom CSS and fonts
- Messaging templates

### SSO Configuration
- Trusted issuer management
- Claims mapping rules
- Auto-provisioning settings
- Key rotation schedules

### API Keys
- Organization API key pairs
- Permissions and scopes
- Usage tracking
- Expiration management

## Tech Stack

- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js with async/await
- **Database**: PostgreSQL with row-level security
- **Cache**: Redis for session and configuration caching
- **Storage**: MinIO/S3 for logos and assets
- **Image Processing**: Sharp for logo optimization
- **Authentication**: JWT with Keycloak integration

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test

# Lint code
pnpm lint
```

## Configuration

Copy `.env.example` to `.env` and configure:

- Database and Redis connections
- Keycloak admin credentials
- Storage backend settings
- JWT secrets and API keys
- Email provider configuration

## White-Label Branding

The branding system ensures complete provider anonymity:

### Zero Provider References Policy
- Automatic scanning for hardcoded "Ayan" or "Tech Machers" strings
- Dynamic text replacement throughout candidate interfaces
- Tenant-configurable terminology ("proctoring" vs "invigilation")
- Browser tab titles reflect tenant organization

### Accessibility Compliance
- Color contrast validation (WCAG 2.1 AA)
- Font size and spacing guidelines
- Screen reader compatibility
- Keyboard navigation support

## Deployment

The service is containerized and ready for Kubernetes deployment with:

- Health checks and readiness probes
- Resource limits and auto-scaling
- ConfigMaps for environment-specific settings
- Secrets management for sensitive data