# Agentic AI Proctor - Development Environment Setup

## Phase 5: Multi-Tenant Service Development Environment

This document provides step-by-step instructions for setting up a complete development environment for the Phase 5 multi-tenant service.

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Docker and Docker Compose
- PostgreSQL 14+ (via Docker)
- Redis 6+ (via Docker)
- Git

## Quick Start (5 minutes)

### 1. Clone and Install Dependencies
```bash
git clone <repository-url>
cd agent-proctor
pnpm install
pnpm build
```

### 2. Start Infrastructure Services
```bash
# Start PostgreSQL, Redis, Keycloak, MinIO
pnpm infra:start

# Wait for services to be ready (30-60 seconds)
docker-compose -f infrastructure/docker/infrastructure.yml ps
```

### 3. Configure Tenant Service Environment
```bash
cd services/tenant-service
cp .env.example .env

# Edit .env file with your configuration
# (See Environment Configuration section below)
```

### 4. Initialize Database
```bash
# Auto-create database schema and seed data
npm run db:init
```

### 5. Start Tenant Service
```bash
# Start in development mode
pnpm dev
```

### 6. Verify Installation
```bash
# Test health endpoint
curl http://localhost:3000/health

# Expected response:
# {"status":"healthy","service":"tenant-service","timestamp":"..."}
```

## Environment Configuration

### Required Environment Variables

Create `services/tenant-service/.env` with the following configuration:

```bash
# Server Configuration
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/agent_proctor_tenants

# Redis Configuration  
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_URL=redis://localhost:6379/0

# Authentication & Security
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
API_KEY_SECRET=your-api-key-secret-min-32-characters
WEBHOOK_SECRET_KEY=your-webhook-secret-key-min-32-characters

# Keycloak Integration
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=master
KEYCLOAK_CLIENT_ID=admin-cli
KEYCLOAK_CLIENT_SECRET=
KEYCLOAK_ADMIN_USER=admin
KEYCLOAK_ADMIN_PASSWORD=admin

# Storage Configuration
STORAGE_TYPE=minio
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_USE_SSL=false

# CDN Configuration (for branding assets)
BRANDING_CDN_URL=http://localhost:9000
ASSETS_BASE_URL=http://localhost:9000

# Development Settings
AUTH_ENABLED=true
RATE_LIMITING_ENABLED=true
AUDIT_LOGGING_ENABLED=true
DEBUG_ENABLED=true
LOG_LEVEL=debug
```

### Infrastructure Docker Compose

The infrastructure services are defined in `infrastructure/docker/infrastructure.yml`:

- **PostgreSQL** (port 5432): Multi-tenant database with RLS
- **Redis** (port 6379): Session management and caching
- **Keycloak** (port 8080): SSO and identity management
- **MinIO** (port 9000): S3-compatible storage for branding assets

## Development Workflow

### 1. Daily Development
```bash
# Start infrastructure (if not running)
pnpm infra:start

# Start tenant service in watch mode
cd services/tenant-service
pnpm dev

# The service will restart automatically on file changes
```

### 2. Testing API Endpoints
```bash
# Health check
curl http://localhost:3000/health

# Create organization (requires super admin token)
curl -X POST http://localhost:3000/organizations \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "acme-corp",
    "name": "ACME Corporation", 
    "primaryContactName": "John Doe",
    "primaryContactEmail": "john@acme.com"
  }'

# Get organization
curl http://localhost:3000/organizations/acme-corp \
  -H "Authorization: Bearer <your-jwt-token>"
```

### 3. Database Management
```bash
# Connect to database
psql postgresql://postgres:postgres@localhost:5432/agent_proctor_tenants

# View tables
\dt

# Check RLS policies
\d+ organizations
```

### 4. Testing White-Label Branding
```bash
# Upload logo
curl -X POST http://localhost:3000/organizations/acme-corp/branding/upload \
  -H "Authorization: Bearer <your-token>" \
  -F "asset=@logo.png" \
  -F "type=logo"

# Configure theme
curl -X PUT http://localhost:3000/organizations/acme-corp/branding \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "theme": {
      "name": "corporate",
      "primary": "#2563eb",
      "secondary": "#64748b",
      "accent": "#0ea5e9"
    }
  }'
```

## SDK Integration Testing

### 1. Install SDK in Test Project
```bash
mkdir sdk-test && cd sdk-test
npm init -y
npm install ../packages/sdk
```

### 2. Basic SDK Usage Example
```typescript
import { AgenticProctor } from '@agent-proctor/sdk';

const proctor = new AgenticProctor({
  apiUrl: 'http://localhost:4000', // Main API
  tenantUrl: 'http://localhost:3000', // Tenant service
  apiKey: 'your-api-key',
  debug: true
});

// Test organization management
async function testTenantFeatures() {
  try {
    // Get organization details
    const org = await proctor.getOrganization();
    console.log('Organization:', org.data);

    // Configure branding
    const branding = await proctor.configureBranding({
      theme: {
        name: 'modern',
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
    });
    console.log('Branding configured:', branding);

    // Start proctoring session
    const sessionId = await proctor.startSession({
      candidateId: 'test-candidate',
      examId: 'test-exam'
    });
    console.log('Session started:', sessionId);

  } catch (error) {
    console.error('Error:', error);
  }
}

testTenantFeatures();
```

## Production Deployment Considerations

### Environment Variables for Production
- Use strong, randomly generated secrets for JWT_SECRET, API_KEY_SECRET
- Configure proper database URL with connection pooling
- Set up Redis cluster for scalability
- Use AWS S3 or compatible storage service
- Configure proper Keycloak realm and clients

### Security Checklist
- [ ] Enable HTTPS/TLS for all endpoints
- [ ] Configure proper CORS settings
- [ ] Enable rate limiting and audit logging
- [ ] Set up database backup and monitoring
- [ ] Configure log aggregation and monitoring
- [ ] Review and test RLS policies

### Scaling Considerations
- Stateless design allows horizontal scaling
- Database connection pooling configured
- Redis caching for session management
- CDN for branding asset delivery
- Container-ready architecture

## Next Steps

1. **API Documentation**: Generate OpenAPI specs for tenant service
2. **Integration Tests**: Comprehensive test suite with other services  
3. **SDK Examples**: Sample applications demonstrating integration patterns
4. **Deployment Guides**: Kubernetes and cloud-specific deployment instructions
5. **Monitoring Setup**: Prometheus metrics and alerting configuration

## Support and Troubleshooting

### Common Issues

**Service fails to start with Zod validation error**
- Check that all required environment variables are set in `.env`
- Verify database connection string is correct
- Ensure Redis is running and accessible

**TypeError: fetch is not defined**
- Ensure Node.js >= 18.0.0 (built-in fetch support)
- Or install node-fetch polyfill for older Node versions

**Database connection errors**
- Verify PostgreSQL is running: `docker ps | grep postgres`
- Test connection: `psql postgresql://postgres:postgres@localhost:5432/postgres`
- Check firewall settings and port availability

### Getting Help

1. Check service logs: `docker-compose -f infrastructure/docker/infrastructure.yml logs`
2. Verify environment configuration matches requirements
3. Test individual components in isolation
4. Review Phase 5 implementation documentation

---

**Phase 5 Multi-Tenant Service**: Complete enterprise-ready foundation for white-label AI proctoring platform with organization management, branding, SSO, and API key systems.