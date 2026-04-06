# Phase 5 Tenant Service API Documentation

## Overview

The Agentic AI Proctor Tenant Service provides comprehensive multi-tenant organization management, white-label branding, SSO configuration, and API key management for the enterprise AI proctoring platform.

**Base URL:** `https://tenant-api.your-domain.com` (or `http://localhost:3000` for development)

**Version:** 1.0.0

## Authentication

The API supports two authentication methods:

### 1. JWT Bearer Token
```http
Authorization: Bearer <your-jwt-token>
```

### 2. API Key
```http
X-API-Key: <your-api-key>
```

## Core Concepts

### Organizations
Multi-tenant entities that represent customer organizations. Each organization has isolated data and can be independently configured.

### Branding
White-label customization system allowing organizations to customize the appearance of their proctoring interface with themes, assets, and custom CSS.

### SSO Configuration
Single Sign-On integration supporting OIDC, SAML, and OAuth2 providers for enterprise identity federation.

### API Keys
Server-to-server authentication tokens with configurable scopes, rate limits, and IP restrictions.

---

## API Endpoints

### Health Check

#### `GET /health`
Check service health and status.

**Response:**
```json
{
  "status": "healthy",
  "service": "tenant-service",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "version": "1.0.0"
}
```

---

## Organization Management

### `POST /organizations`
Create a new organization (Super Admin only).

**Request Body:**
```json
{
  "slug": "acme-corp",
  "name": "ACME Corporation",
  "primaryContactName": "John Doe",
  "primaryContactEmail": "john@acme.com",
  "settings": {
    "allowRegistration": true,
    "defaultRole": "user",
    "sessionRetention": 90
  }
}
```

**Response:**
```json
{
  "organization": {
    "id": "org_12345",
    "slug": "acme-corp",
    "name": "ACME Corporation",
    "primaryContactName": "John Doe",
    "primaryContactEmail": "john@acme.com",
    "settings": {
      "allowRegistration": true,
      "defaultRole": "user",
      "sessionRetention": 90
    },
    "status": "active",
    "createdAt": "2024-01-01T12:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

### `GET /organizations/:orgId`
Get organization details.

**Parameters:**
- `orgId` (path): Organization ID or "current" for authenticated user's org

**Response:**
```json
{
  "organization": {
    "id": "org_12345",
    "slug": "acme-corp",
    "name": "ACME Corporation",
    "primaryContactName": "John Doe",
    "primaryContactEmail": "john@acme.com",
    "settings": { ... },
    "status": "active",
    "userCount": 150,
    "sessionCount": 3420,
    "createdAt": "2024-01-01T12:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

### `PUT /organizations/:orgId`
Update organization settings.

**Request Body:**
```json
{
  "name": "ACME Corporation Ltd",
  "settings": {
    "allowRegistration": false,
    "sessionRetention": 120
  }
}
```

### `DELETE /organizations/:orgId`
Delete an organization (Super Admin only).

**Response:** `204 No Content`

---

## Branding System

### `GET /organizations/:orgId/branding`
Get organization branding configuration.

**Response:**
```json
{
  "branding": {
    "orgId": "org_12345",
    "theme": {
      "name": "corporate-blue",
      "primary": "#2563eb",
      "secondary": "#64748b",
      "accent": "#0ea5e9",
      "background": "#ffffff",
      "surface": "#f8fafc",
      "text": "#1e293b",
      "textSecondary": "#64748b"
    },
    "assets": {
      "logoUrl": "https://cdn.example.com/org_12345/logo.png",
      "faviconUrl": "https://cdn.example.com/org_12345/favicon.ico",
      "loginBackgroundUrl": "https://cdn.example.com/org_12345/bg.jpg"
    },
    "customCss": ".custom-button { background: #2563eb; }",
    "isActive": true,
    "updatedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

### `PUT /organizations/:orgId/branding`
Configure organization branding.

**Request Body:**
```json
{
  "theme": {
    "name": "modern-dark",
    "primary": "#3b82f6",
    "secondary": "#64748b",
    "accent": "#06b6d4",
    "background": "#0f172a",
    "surface": "#1e293b",
    "text": "#f1f5f9",
    "textSecondary": "#cbd5e1"
  },
  "customCss": ".proctoring-interface { background: var(--surface); }",
  "isActive": true
}
```

### `POST /organizations/:orgId/branding/upload`
Upload branding assets (logo, favicon, backgrounds).

**Request:** Multipart form data
- `asset` (file): Image file
- `type` (string): Asset type ("logo", "favicon", "loginBackground")

**Response:**
```json
{
  "url": "https://cdn.example.com/org_12345/logo.png",
  "assetType": "logo",
  "filename": "logo.png",
  "size": 45678
}
```

### `GET /organizations/:orgId/branding/preview/:themeName`
Generate branding preview HTML.

**Response:** HTML preview of the theme applied to a sample proctoring interface.

---

## SSO Configuration

### `GET /organizations/:orgId/sso`
List SSO configurations for organization.

**Response:**
```json
{
  "configurations": [
    {
      "id": "sso_12345",
      "orgId": "org_12345",
      "providerName": "Corporate AD",
      "providerType": "OIDC",
      "issuerUrl": "https://login.acme.com",
      "clientId": "proctoring-app",
      "isActive": true,
      "healthStatus": "healthy",
      "lastHealthCheck": "2024-01-01T11:55:00.000Z",
      "createdAt": "2024-01-01T10:00:00.000Z"
    }
  ]
}
```

### `POST /organizations/:orgId/sso`
Create SSO configuration.

**Request Body:**
```json
{
  "providerName": "Microsoft Azure AD",
  "providerType": "OIDC",
  "issuerUrl": "https://login.microsoftonline.com/tenant-id/v2.0",
  "clientId": "your-app-id",
  "clientSecret": "your-client-secret",
  "additionalScopes": ["email", "profile", "groups"],
  "attributeMapping": {
    "email": "email",
    "name": "name",
    "role": "groups"
  },
  "isActive": true
}
```

### `GET /organizations/:orgId/sso/:configId`
Get specific SSO configuration.

### `PUT /organizations/:orgId/sso/:configId`
Update SSO configuration.

### `DELETE /organizations/:orgId/sso/:configId`
Delete SSO configuration.

### `POST /organizations/:orgId/sso/:configId/test`
Test SSO configuration connectivity.

**Response:**
```json
{
  "status": "success",
  "details": {
    "discoveryUrl": "https://login.microsoftonline.com/.../v2.0/.well-known/...",
    "endpoints": {
      "authorization": "https://...",
      "token": "https://...",
      "userinfo": "https://..."
    },
    "responseTime": 234,
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

---

## API Key Management

### `GET /organizations/:orgId/api-keys`
List organization API keys.

**Response:**
```json
{
  "apiKeys": [
    {
      "id": "key_12345",
      "orgId": "org_12345",
      "name": "Production Integration",
      "keyPreview": "ak_prod_****9876",
      "scopes": ["read:organizations", "write:sessions", "read:analytics"],
      "rateLimit": {
        "requestsPerMinute": 1000,
        "requestsPerHour": 10000,
        "requestsPerDay": 100000
      },
      "allowedIPs": ["203.0.113.0/24"],
      "usage": {
        "totalRequests": 15420,
        "lastUsed": "2024-01-01T11:30:00.000Z"
      },
      "status": "active",
      "createdAt": "2024-01-01T09:00:00.000Z",
      "expiresAt": "2025-01-01T09:00:00.000Z"
    }
  ]
}
```

### `POST /organizations/:orgId/api-keys`
Create new API key.

**Request Body:**
```json
{
  "name": "Mobile App Integration",
  "scopes": ["read:sessions", "write:violations"],
  "rateLimit": {
    "requestsPerMinute": 500,
    "requestsPerHour": 5000,
    "requestsPerDay": 20000
  },
  "allowedIPs": ["198.51.100.0/24"],
  "expiresAt": "2025-06-01T00:00:00.000Z"
}
```

**Response:**
```json
{
  "apiKey": {
    "id": "key_67890",
    "orgId": "org_12345",
    "name": "Mobile App Integration",
    "key": "ak_prod_1234567890abcdef1234567890abcdef",
    "keyPreview": "ak_prod_****cdef",
    "scopes": ["read:sessions", "write:violations"],
    "rateLimit": { ... },
    "allowedIPs": ["198.51.100.0/24"],
    "status": "active",
    "createdAt": "2024-01-01T12:00:00.000Z",
    "expiresAt": "2025-06-01T00:00:00.000Z"
  }
}
```

**Note:** The full API key is only returned once at creation time.

### `GET /api-keys/:keyId`
Get API key details.

### `DELETE /api-keys/:keyId`
Revoke API key.

**Request Body:**
```json
{
  "reason": "Key compromised - regenerating"
}
```

### `GET /api-keys/:keyId/usage`
Get API key usage analytics.

**Response:**
```json
{
  "usage": {
    "totalRequests": 15420,
    "requestsToday": 1250,
    "requestsThisHour": 145,
    "averageResponseTime": 120,
    "errorRate": 0.02,
    "topEndpoints": [
      { "endpoint": "/sessions", "requests": 8500 },
      { "endpoint": "/violations", "requests": 3200 }
    ],
    "recentActivity": [
      {
        "timestamp": "2024-01-01T11:30:00.000Z",
        "endpoint": "/sessions/start",
        "method": "POST",
        "statusCode": 201,
        "responseTime": 89
      }
    ]
  },
  "limits": {
    "requestsPerMinute": { "limit": 1000, "used": 145, "resetTime": "2024-01-01T12:01:00.000Z" },
    "requestsPerHour": { "limit": 10000, "used": 1250, "resetTime": "2024-01-01T13:00:00.000Z" },
    "requestsPerDay": { "limit": 100000, "used": 15420, "resetTime": "2024-01-02T00:00:00.000Z" }
  }
}
```

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Validation failed",
  "message": "Invalid organization slug format",
  "details": {
    "field": "slug",
    "code": "INVALID_FORMAT",
    "expected": "lowercase letters, numbers, and hyphens only"
  },
  "timestamp": "2024-01-01T12:00:00.000Z",
  "requestId": "req_12345"
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `204` - No Content (successful deletion)
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid auth)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

---

## Rate Limiting

Rate limits are applied per API key or JWT token:

**Primary Limits:**
- 1000 requests per minute
- 10,000 requests per hour
- 100,000 requests per day

**Headers in Response:**
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1640995260
```

When rate limited, the API returns `429 Too Many Requests`:

```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Try again in 23 seconds.",
  "retryAfter": 23
}
```

---

## SDKs and Libraries

### JavaScript/TypeScript SDK

**Install:**
```bash
npm install @agent-proctor/sdk
```

**Basic Usage:**
```typescript
import { AgenticProctor } from '@agent-proctor/sdk';

const proctor = new AgenticProctor({
  apiUrl: 'https://api.your-domain.com',
  tenantUrl: 'https://tenant-api.your-domain.com',
  apiKey: 'your-api-key',
  debug: false
});

// Organization management
const org = await proctor.createOrganization({
  slug: 'my-org',
  name: 'My Organization',
  primaryContactName: 'John Doe',
  primaryContactEmail: 'john@example.com'
});

// Configure branding
await proctor.configureBranding({
  theme: {
    name: 'corporate',
    primary: '#2563eb',
    secondary: '#64748b'
    // ... other theme properties
  },
  isActive: true
});

// Start proctoring session
const sessionId = await proctor.startSession({
  candidateId: 'candidate-123',
  examId: 'exam-456'
});
```

### Direct API Usage

**cURL Example:**
```bash
# Create organization
curl -X POST https://tenant-api.your-domain.com/organizations \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "my-org",
    "name": "My Organization",
    "primaryContactName": "John Doe",
    "primaryContactEmail": "john@example.com"
  }'

# Get branding
curl https://tenant-api.your-domain.com/organizations/my-org/branding \
  -H "X-API-Key: your-api-key"
```

---

## Webhooks

The tenant service can send webhooks for important events:

### Event Types

- `organization.created`
- `organization.updated`
- `organization.deleted`
- `branding.updated`
- `sso.configured`
- `sso.health_check_failed`
- `api_key.created`
- `api_key.revoked`

### Webhook Payload

```json
{
  "id": "evt_12345",
  "type": "organization.created",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "data": {
    "organization": {
      "id": "org_12345",
      "slug": "new-org",
      "name": "New Organization"
    }
  },
  "metadata": {
    "source": "tenant-service",
    "version": "1.0.0",
    "environment": "production"
  }
}
```

### Webhook Verification

Webhooks are signed with HMAC-SHA256:

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return signature === `sha256=${expectedSignature}`;
}
```

---

## Production Deployment

### Environment Variables

**Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - JWT signing secret (min 32 chars)
- `API_KEY_SECRET` - API key encryption secret (min 32 chars)
- `WEBHOOK_SECRET_KEY` - Webhook signing secret (min 32 chars)

**Optional:**
- `PORT` - Server port (default: 3000)
- `LOG_LEVEL` - Logging level (default: info)
- `RATE_LIMITING_ENABLED` - Enable rate limiting (default: true)
- `AUDIT_LOGGING_ENABLED` - Enable audit logs (default: true)

### Health Monitoring

Monitor these endpoints:
- `GET /health` - Overall service health
- `GET /health/deep` - Deep health check (database, Redis, external services)
- `GET /metrics` - Prometheus metrics

### High Availability

- Deploy multiple instances behind a load balancer
- Use Redis cluster for session management
- Configure database connection pooling
- Set up proper backup and disaster recovery

---

**Phase 5 Complete**: Enterprise-ready multi-tenant platform with organization management, white-label branding, SSO federation, and comprehensive API key systems.