# 🚀 AYAN.AI — AGENTIC AI PROCTORING PLATFORM

> **Last revised**: 2026-04-05 (Phase 4 Complete ✅)
> **Product**: **Ayan.ai** — Agentic AI Proctoring by [Tech Machers](https://machers.tech)
> **Auth strategy**: Self-hosted Keycloak SSO — no cloud vendor lock-in
> **Infra strategy**: 100% self-hosted, Docker Compose → Kubernetes
> **UX strategy**: Wireframe-first — every phase starts with approved mockups
> **Design inspiration**: [VoltStack.ai](https://voltstack.ai) — dark, premium, product-led

---

## 🏷️ BRANDING & DNS

### Product Identity
| Item | Value |
|------|-------|
| **Product name** | Ayan.ai |
| **Tagline** | The Era of Passive Proctoring is Over |
| **Parent company** | Tech Machers |
| **Parent logo** | `https://machers.tech/images/logo1.png` (transparent, render on dark bg) |
| **Product logo** | `/public/ayan-logo.png` (robot guardian with gold crown + cyan wings) |
| **Site inspiration** | [VoltStack.ai](https://voltstack.ai) — dark, rich, animated, product-led |

### DNS Scheme (local dev → production)
| Service | Local DNS | Purpose |
|---------|-----------|----------|
| **Product site** | `ayan.nunmai.local` | One-pager marketing site |
| **Admin platform** | `ayan.nunmai.local/admin` | Admin dashboard, sessions, analytics |
| **Verification** | `ayan.nunmai.local/session/:token` | Proctor-hosted verification wizard |
| **Exam room** | `ayan.nunmai.local/exam/:token` | Tier 3 iframe exam room |
| **API** | `api.ayan.nunmai.local` | API Gateway (REST + WebSocket) |
| **Auth** | `auth.ayan.nunmai.local` | Keycloak SSO |
| **Media** | `media.ayan.nunmai.local` | LiveKit WebRTC |
| **Storage** | `storage.ayan.nunmai.local` | MinIO (recordings, face photos) |
| **Docs (Phase 5)** | `docs.ayan.nunmai.local` | Developer portal + SDK docs |

### Colour Palette (derived from Ayan.ai logo)
```
-- Primary (dark base — like VoltStack)
navy-950:   #0A0E1A   (page background — deep navy/black)
navy-900:   #0F1629   (card backgrounds, sections)
navy-800:   #162039   (elevated surfaces)

-- Accent: Cyan/Teal (from logo wings + text)
cyan-400:   #22D3EE   (primary accent — links, buttons, highlights)
cyan-500:   #06B6D4   (hover states)
cyan-300:   #67E8F9   (subtle glow effects)

-- Accent: Gold (from logo crown/halo)
gold-400:   #FACC15   (secondary accent — badges, premium features)
gold-500:   #EAB308   (hover)

-- Text
white:      #FFFFFF   (headings)
gray-300:   #D1D5DB   (body text)
gray-500:   #6B7280   (muted/secondary text)

-- Status (risk levels)
green-400:  #4ADE80   (low risk / pass)
yellow-400: #FACC15   (medium risk / warning)
orange-400: #FB923C   (high risk)
red-400:    #F87171   (critical / fail)
```

### Design System Principles (VoltStack-inspired)
- **Dark-first**: Navy/black backgrounds, never white pages
- **Glow effects**: Cyan and gold glows on key elements
- **Typography**: Large, bold hero text with gradient fills (cyan → gold)
- **Animations**: Smooth scroll-triggered reveals (Framer Motion)
- **Cards**: Frosted glass / translucent cards with subtle borders
- **Grid accents**: Dot grids or line grids as background texture
- **Sections**: Full-viewport sections with clear visual hierarchy
- **Interactive demos**: Animated product screenshots/mockups in sections

---

## 📸 EXISTING PRODUCT ANALYSIS

### What exists today (current e-proctoring)
From the existing Tech Machers platform, these features are already proven:

| Feature | Current State | Next-Gen Target |
|---------|--------------|-----------------|
| Login | Simple username/passcode | Keycloak SSO, org-scoped, role-based |
| Session list | Basic table with credibility % | Rich data grid, filters, batch actions, real-time status |
| Session card | Parameters / Addons / Metrics / Observers tabs | Unified session detail with side panels, live view |
| Violation metrics | b1-b3, c1-c4, k1, m1-m3, n1-n2, s1 with weights | Same codes + AI-powered violations, configurable per org |
| Playback | Video + timeline with coloured markers | Dual-view (webcam + screen), violation jump, speed control |
| Violation chart | Basic bar chart per metric code | Interactive analytics, drill-down, trend analysis |
| Addons | Checkboxes (equipment check, screen capture, etc.) | Toggle-based session configuration with previews |

### What's missing / needs massive upgrade
- **Organisation → Batch → Schedule → Session hierarchy**
- **Candidate self-service portal** (system check, exam entry)
- **Live proctor view** (multi-session monitoring wall)
- **Rich analytics dashboard** (not just per-session bar charts)
- **Real-time credibility** (updating live, not post-session)
- **Modern UX** (current UI is functional but dated)

---

## 🧩 ENTITY MODEL

### Core Domain Entities

```
Organisation (tenant)
 └── Department / Group
      └── Exam (e.g. "Financial Literacy Challenge")
           └── Batch (e.g. "Batch1-UG-D1")
                └── Delivery (when + who)
                     └── Session (1 candidate × 1 exam attempt)
                          └── Room (LiveKit media room)
                               └── Agent (AI proctor instance)
                                    ├── Violations[]
                                    ├── Score (credibility)
                                    └── Recording[]
```

### Entity Relationships — Detailed

```
┌─────────────────────────────────────────────────────────────────────┐
│ ORGANISATION                                                        │
│ id, external_id, name, slug, logo, theme, default_rules, kc_realm  │
│                                                                     │
│  ┌──────────────────────┐   ┌─────────────────────┐         │
│  │ USERS                │   │ EXAMS               │         │
│  │ id, name, email,     │   │ id, external_id,    │         │
│  │ role, avatar,        │   │ title, description, │         │
│  │ org_id, kc_id        │   │ duration, org_id,   │         │
│  │                      │   │ rules_config,       │         │
│  │ Roles:               │   │ addons              │         │
│  │ • super_admin        │   └──────┬───────────────┘         │
│  │ • org_admin          │          │                           │
│  │ • proctor            │          ▼                           │
│  │ • candidate          │   ┌─────────────────────┐         │
│  │ • observer           │   │ BATCHES             │         │
│  └──────────────────────┘   │ id, external_id,    │         │
│                              │ name, exam_id,      │         │
│                              │ description         │         │
│                              └──────┬───────────────┘         │
│                                     │                           │
│                                     ▼                           │
│                              ┌─────────────────────┐         │
│                              │ DELIVERIES          │         │
│                              │ id, external_id,    │         │
│                              │ batch_id,           │         │
│                              │ candidates[],       │         │
│                              │ start_at, end_at,   │         │
│                              │ status              │         │
│                              └──────┬───────────────┘         │
│                                     │                           │
│                                     ▼                           │
│                              ┌──────────────────────────────────┐     │
│                              │ SESSIONS                       │     │
│                              │ id, external_id, delivery_id,  │     │
│                              │ candidate_id, room_id,         │     │
│                              │ agent_id, status, started_at,  │     │
│                              │ ended_at, credibility_score,   │     │
│                              │ risk_level                     │     │
│                              └──────┬───────────────────────────┘     │
│                                     │                               │
│                         ┌───────────┼───────────┐                  │
│                         ▼           ▼           ▼                  │
│                  ┌───────────┐ ┌─────────┐ ┌──────────┐           │
│                  │VIOLATIONS │ │RECORDING│ │SCORE     │           │
│                  │id, type,  │ │id, type,│ │history[] │           │
│                  │severity,  │ │url,     │ │current,  │           │
│                  │confidence,│ │duration │ │breakdown │           │
│                  │metadata,  │ │         │ │          │           │
│                  │timestamp  │ │         │ │          │           │
│                  └───────────┘ └─────────┘ └──────────┘           │
└─────────────────────────────────────────────────────────────────────┘
```

### External System Integration

**TAO CE 2025 & Assessment Platform Compatibility:**
```sql
-- External IDs enable sync with TAO CE, Moodle, Canvas, etc.
CREATE TABLE organisations (
  id UUID PRIMARY KEY,
  external_id VARCHAR(255) UNIQUE, -- TAO tenant/org ID
  -- ... other fields
);

CREATE TABLE exams (
  id UUID PRIMARY KEY, 
  external_id VARCHAR(255) UNIQUE, -- TAO test/assessment ID
  -- ... other fields
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  external_id VARCHAR(255) UNIQUE, -- TAO delivery execution ID
  -- ... other fields
);
```

**Integration Workflow:**
1. **TAO → Ayan**: Sync exam definitions, candidate lists, delivery schedules
2. **Ayan → TAO**: Return credibility scores, violation flags, recording metadata
3. **Bi-directional**: Session status updates, completion confirmations

**API Sync Endpoints:**
```typescript
// Inbound sync from TAO
POST /api/v1/sync/external/exams
POST /api/v1/sync/external/deliveries  
POST /api/v1/sync/external/sessions

// Outbound sync to TAO
POST /api/v1/sync/export/scores
POST /api/v1/sync/export/violations
```

### Violation Metric Codes (from existing system + new AI codes)

| Code | Category | Violation | Default Weight | Source |
|------|----------|-----------|---------------|--------|
| **b1** | Browser | Browser not supported | 0.5 | SDK |
| **b2** | Browser | Focus changed to different window | 0.5 | SDK |
| **b3** | Browser | Full-screen mode disabled/exited | 0.25 | SDK |
| **c1** | Camera | Webcam disabled | 1.0 | SDK |
| **c2** | Camera | Face invisible or not looking into camera | 1.0 | MediaPipe |
| **c3** | Camera | Several faces in front of camera | 1.0 | MediaPipe/YOLO |
| **c4** | Camera | Face does not match profile | 1.0 | Vision AI |
| **c5** | Camera | Looking away consistently | 0.5 | MediaPipe |
| **k1** | Keyboard | Atypical keyboard / handwriting | 1.0 | Behavior AI |
| **m1** | Mic | Microphone muted or volume low | 0.5 | Audio AI |
| **m2** | Mic | Conversation or noise in background | 0.25 | Whisper |
| **m3** | Mic | Mobile use detected | 1.0 | YOLO |
| **n1** | Network | No network connection | 1.0 | SDK |
| **n2** | Network | No connection to mobile camera | 1.0 | SDK |
| **s1** | Screen | Screen activities not shared | 0.25 | SDK |
| **s2** | Screen | Suspicious screen content | 0.5 | Screen AI |
| **h1** | Hardware | Headphones/earbuds detected | 0.5 | YOLO |
| **a1** | AI | Multiple speakers detected | 1.0 | pyannote |
| **a2** | AI | Suspicious object in frame | 1.0 | YOLO |
| **a3** | AI | Behaviour anomaly detected | 0.5 | Behavior AI |

---

## � AUTHENTICATION & AUTHORIZATION ARCHITECTURE

### Federated SSO Model
> **Ayan.ai as SaaS**: Trusts external authentication, parses JWT claims for tenant/role-based access

**User Types & Authentication Flow:**
```
┌─────────────────────────────────────────────────────────────────────┐
│                        AUTHENTICATION FLOW                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ 🔴 SUPER ADMIN (Direct Ayan User)                                  │
│ ┌─────────────────────────┐                                         │
│ │ Direct Keycloak Login   │ → Full system access                    │
│ │ admin@ayan.nunmai.local │                                         │
│ └─────────────────────────┘                                         │
│                                                                     │
│ 🟦 TENANT USERS (SSO Federated)                                    │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ External System (TAO/Moodle/Canvas/Nunmai) Authentication      │ │
│ │                           ↓                                     │ │
│ │ Signed JWT Token with Claims:                                   │ │
│ │ {                                                               │ │
│ │   "sub": "user123",                                            │ │
│ │   "email": "john@university.edu",                              │ │
│ │   "org_id": "uni_cs_dept",                                     │ │
│ │   "role": "org_admin | proctor | candidate",                   │ │
│ │   "tenant": "university_cs",                                   │ │
│ │   "exam_id": "fin_lit_2026",     // for candidates            │ │
│ │   "batch_id": "batch_1_ug_d1",   // for candidates            │ │
│ │   "delivery_id": "del_001",       // for candidates            │ │
│ │   "iss": "auth.university.edu",                                │ │
│ │   "aud": "ayan.nunmai.local"                                   │ │
│ │ }                                                               │ │
│ │                           ↓                                     │ │
│ │ Ayan.ai validates JWT signature & extracts tenant scope        │ │
│ └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

**Access Control Matrix:**
| Role | Scope | Data Access | Session Creation |
|------|-------|-------------|------------------|
| **super_admin** | All tenants | Global view | All orgs |
| **org_admin** | org_id from JWT | Only tenant data | Own org exams |
| **proctor** | org_id from JWT | Own org + assigned sessions | Read-only |
| **candidate** | exam_id + batch_id from JWT | Own session only | Auto-created from JWT |

### JWT Validation & Tenant Isolation

**Middleware Flow (Every API Request):**
```typescript
// 1. Extract JWT from Authorization header
const token = req.headers.authorization?.replace('Bearer ', '');

// 2. Validate signature against trusted issuer
const claims = jwt.verify(token, getPublicKey(issuer));

// 3. Extract tenant context
const userContext = {
  userId: claims.sub,
  email: claims.email,
  role: claims.role,
  orgId: claims.org_id,
  tenant: claims.tenant,
  // For candidates:
  examId: claims.exam_id,
  batchId: claims.batch_id,
  deliveryId: claims.delivery_id
};

// 4. Attach to request for downstream handlers
req.user = userContext;

// 5. All subsequent DB queries auto-filter by orgId
// WHERE org_id = userContext.orgId (row-level security)
```

**Trusted Issuers Configuration:**
```json
{
  "trusted_issuers": {
    "auth.university.edu": {
      "public_key_url": "https://auth.university.edu/.well-known/jwks.json",
      "org_mapping": "university_cs",
      "auto_provision": true
    },
    "sso.nunmai.com": {
      "public_key_url": "https://sso.nunmai.com/.well-known/jwks.json", 
      "org_mapping": "extract_from_claims",
      "auto_provision": true
    }
  }
}
```

### Design Principle
> **Agentic Proctoring is a service.** Any assessment application — legacy PHP, MERN, Next.js, or custom — integrates with the proctor via one of three tiers. All tiers hit the same backend, same AI, same rules, same scoring.

### Three Integration Tiers

```
┌──────────────────────────────────────────────────────────────────────┐
│                    INTEGRATION TIERS                                  │
│                                                                      │
│  Tier 3: iframe Embed ── Proctor wraps exam URL (Phase 1 — MVP)     │
│  Tier 1: Script Tag ──── Any app (PHP, WordPress, Django, etc.)     │
│  Tier 2: NPM SDK ─────── React, Next.js, Vue, Angular, MERN        │
│                                                                      │
│  All tiers → same backend → same AI → same rules → same scoring     │
└──────────────────────────────────────────────────────────────────────┘
```

### Tier 3: iframe Embed (Phase 1 — MVP)
> **Zero integration required from exam app. Proctor owns the entire experience.**
> **Full white-labeling**: All candidate-facing interfaces branded per tenant

```
Candidate URL: https://ayan.nunmai.local/session/{session_token}

Flow:
1. Candidate clicks session link (from email / assessment portal)
2. Tenant SSO authenticates candidate (JWT with org_id + exam context)
3. **WHITE-LABELED verification page** (tenant branding throughout):
   → **Hardware Check**: Webcam + mic test (tenant logo, colors, messaging)
   → **Photo Capture**: ID verification + face capture (tenant instructions)
   → **Environment Scan**: 360° room scan (tenant guidelines, no Ayan references)
   → **Screen Share Setup**: Permission prompts with tenant messaging
   → **Rules Acknowledgment**: Tenant-specific exam rules and policies
4. All checks pass → proctor page embeds exam app URL in sandboxed iframe
5. **WHITE-LABELED monitoring shell**: Recording indicator, status, help (tenant branding)
6. Exam app runs untouched inside the iframe
7. On exam completion → tenant-branded completion page → recording finalized
```

**White-Label Customization (per tenant):**
```json
{
  "tenant_branding": {
    "logo_url": "https://university.edu/logo.png",
    "primary_color": "#1e40af",
    "secondary_color": "#f59e0b", 
    "background_color": "#f8fafc",
    "text_color": "#1f2937",
    "font_family": "Inter, sans-serif",
    "organization_name": "University Computer Science Department",
    "support_email": "exams@university.edu",
    "support_phone": "+1-555-123-4567",
    "verification_messages": {
      "welcome": "Welcome to your Computer Science exam verification",
      "camera_check": "Please verify your camera is working properly",
      "id_capture": "Upload a clear photo of your student ID",
      "room_scan": "Show your exam environment (360° scan)",
      "rules_title": "CS Department Exam Policies",
      "completion": "Thank you. Your exam has been submitted successfully."
    },
    "custom_css_url": "https://university.edu/proctoring-theme.css",
    "zero_references_to_provider": true
  }
}
```

**Exam app configuration (admin sets per exam):**
```json
{
  "exam_app_url": "https://assessment.client.com/exam/123?token={candidate_token}",
  "iframe_sandbox": "allow-scripts allow-same-origin allow-forms",
  "completion_signal": "postMessage"  // or "url_redirect" or "timeout"
}
```

**Communication (exam app ↔ proctor shell):**
```javascript
// Exam app tells proctor about lifecycle (optional, via postMessage)
parent.postMessage({ type: 'exam:started' }, 'https://ayan.nunmai.local');
parent.postMessage({ type: 'exam:submitted' }, 'https://ayan.nunmai.local');

// Proctor listens and updates session status accordingly
// If no postMessage → proctor uses timeout-based completion
```

### Tier 1: Script Tag (Phase 5 — Legacy App Integration)
> **Minimal integration: 5 lines of HTML + server-side session creation.**
> **Verification happens on proctor-hosted page, then redirects back to exam app.**

**Server-side: Create session (any language)**
```php
// PHP example — before rendering exam page
$session = http_post('https://api.ayan.nunmai.local/api/v1/sessions', [
  'headers' => ['Authorization: Bearer sk_org_xxxxxxxx'],
  'body' => json_encode([
    'exam_id'        => $exam_id,
    'candidate_id'   => $candidate_id,
    'candidate'      => ['name' => $name, 'email' => $email],
    'addons'         => ['webcam' => true, 'screen' => true, 'face_verify' => true],
    'callback_url'   => 'https://assessment.client.com/exam/123/start',
  ])
]);
// $session->verification_url = proctor-hosted verification page
// Redirect candidate to $session->verification_url
```

**Verification flow (proctor-hosted, branded per tenant):**
```
1. Candidate is redirected to: https://ayan.nunmai.local/session/{session_token}
2. Proctor page loads with tenant branding (logo, colours, org name)
3. Keycloak SSO validates candidate identity
4. Verification wizard runs:
   → Browser check → Camera → Mic → Screen share
   → Face capture → ID proof → 360° scan (per exam addons config)
5. All checks pass → proctor redirects to callback_url with signed token:
   https://assessment.client.com/exam/123/start?proctor_token=eyJhbGc...
6. Assessment app validates proctor_token (JWT, signed by sk_org)
7. Assessment app renders exam page with proctor script tag:
```

**Client-side: Script tag on exam page**
```html
<script
  src="https://ayan.nunmai.local/agent.js"
  data-session="{session_token}"
  async>
</script>
```

**What agent.js does after verification is already complete:**
```
1. Validate session token (already verified, just reconnect)
2. Resume camera/mic/screen streams via LiveKit
3. Resume MediaPipe face detection
4. Monitor browser events (tab switch, fullscreen, clipboard)
5. Send all events → WebSocket → proctor backend
6. Show minimal floating status indicator (recording active)
7. Show overlay alerts on violations (configurable severity threshold)
8. On exam completion: agent.js cleans up and reports final status
```

**Host app ↔ Agent communication (global API):**
```javascript
// Host app signals exam lifecycle
window.AgentProctor.emit('exam:started');
window.AgentProctor.emit('exam:question-changed', { questionId: 42 });
window.AgentProctor.emit('exam:submitted');

// Host app listens to proctor events
window.addEventListener('proctor:violation', (e) => {
  // e.detail: { code: 'c2', severity: 'high', message: 'Face not visible' }
});
window.addEventListener('proctor:state-change', (e) => {
  // e.detail.state: 'active' | 'paused' | 'completed'
});

// Query state
const state = window.AgentProctor.getState();
// { status, credibility, violationCount, isRecording }
```

### Tier 2: NPM SDK (Phase 5 — Modern Framework Integration)
> **Deep integration: React/Vue/Angular components + hooks.**
> **Same proctor-hosted verification flow, then SDK takes over.**

**Package: `@techmachers/proctor-sdk`**

```bash
npm install @techmachers/proctor-sdk
```

**React / Next.js:**
```tsx
import { ProctorProvider, ProctorStatus, useProctor } from '@techmachers/proctor-sdk/react';

// Before exam: redirect to verification
import { getVerificationUrl } from '@techmachers/proctor-sdk';
const url = await getVerificationUrl(sessionToken); // proctor-hosted page
window.location.href = url; // candidate completes verification there

// After verification redirect back:
export default function ExamPage({ sessionToken }) {
  return (
    <ProctorProvider sessionToken={sessionToken}>
      <ProctorStatus />  {/* Minimal recording indicator */}
      <ExamContent />
    </ProctorProvider>
  );
}

function ExamContent() {
  const { state, credibility, complete } = useProctor();
  return (
    <div>
      <QuestionRenderer />
      <button onClick={complete}>Submit Exam</button>
    </div>
  );
}
```

**Vue 3:**
```vue
<script setup>
import { useProctor } from '@techmachers/proctor-sdk/vue';
const { state, credibility, complete } = useProctor({ sessionToken: props.token });
</script>
```

**Vanilla JS (MERN / any SPA):**
```javascript
import { AgentProctor } from '@techmachers/proctor-sdk';

const proctor = new AgentProctor({ sessionToken: 'sess_xxx' });
await proctor.connect();   // reconnect after verification
proctor.start();           // begin active monitoring
// later...
await proctor.complete();  // end session
proctor.destroy();         // cleanup
```

### Verification Flow — Universal Across All Tiers

```
┌──────────────────────────────────────────────────────────────────────┐
│               UNIVERSAL VERIFICATION FLOW                            │
│                                                                      │
│  Assessment System              Proctor Platform                     │
│  ──────────────────             ─────────────────                    │
│                                                                      │
│  1. Admin creates exam ──────► Control Plane stores exam config      │
│     (sets exam_app_url,          (addons, verification steps,        │
│      addons, callbacks)           metric weights)                    │
│                                                                      │
│  2. Candidate clicks            3. Proctor verification page        │
│     "Start Exam" ──────────────► (branded per tenant)               │
│                                   • Keycloak SSO login               │
│                                   • Browser check                    │
│                                   • Camera + Mic permissions         │
│                                   • Face capture                     │
│                                   • ID proof (if configured)         │
│                                   • Screen share grant               │
│                                   • 360° environment scan (if conf.) │
│                                                                      │
│  4a. [Tier 3] Proctor embeds exam_app_url in iframe                  │
│                                                                      │
│  4b. [Tier 1/2] Proctor redirects to callback_url with signed JWT    │
│      ◄──────────────────── proctor_token (verification_passed,       │
│                             session_id, candidate_id, exp)           │
│      Assessment app validates JWT → renders exam + agent.js/SDK      │
│                                                                      │
│  5. During exam: proctor monitors via LiveKit + MediaPipe + events   │
│                                                                      │
│  6. Exam ends: session finalised, recording stored, score computed   │
└──────────────────────────────────────────────────────────────────────┘
```

### Keycloak SSO — Shared Between Proctor & Assessment System

```
┌─────────────────────┐     ┌──────────────────────┐
│ Assessment System   │     │ Proctor Platform     │
│ (Keycloak Client:   │     │ (Keycloak Client:    │
│  assessment-web)    │     │  proctor-web)        │
└────────┬────────────┘     └────────┬─────────────┘
         │                           │
         └───────────┬───────────────┘
                     ▼
            ┌─────────────────┐
            │ Keycloak Realm: │
            │ proctor         │
            │                 │
            │ Users are shared│
            │ Roles per client│
            │ SSO across both │
            └─────────────────┘

Candidate logs into assessment system → Keycloak session active →
Redirected to proctor verification → already authenticated (SSO) →
No re-login needed → verification starts immediately
```

### API Key Model — Per Organisation

```
Organisation signs up → gets:
  • pk_org_xxxxx  (public key — safe for frontend, identifies org)
  • sk_org_xxxxx  (secret key — server-side only, creates sessions, signs JWTs)

Key management:
  • Rotate: POST /api/v1/orgs/:id/keys/rotate (generates new pair)
  • Revoke: DELETE /api/v1/orgs/:id/keys/:key_id
  • Multiple keys: org can have multiple active key pairs (for rotation)

DB columns added to organisations table:
  api_keys JSONB  -- [{ id, pk, sk_hash, created_at, revoked_at }]
```

### SDK Internal Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│         @techmachers/proctor-sdk  /  agent.js                   │
│                                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │ Core        │  │ UI Layer     │  │ Detection Layer       │ │
│  │             │  │              │  │                       │ │
│  │ • Config    │  │ • Floating   │  │ • MediaPipe WASM      │ │
│  │ • Auth      │  │   status     │  │   (face detection)    │ │
│  │ • State     │  │   indicator  │  │ • Browser events      │ │
│  │   machine   │  │ • Alert      │  │   (tab, fullscreen)   │ │
│  │ • Event bus │  │   overlay    │  │ • Keystroke analysis  │ │
│  │ • Lifecycle │  │ • Self-view  │  │ • Clipboard monitor   │ │
│  │             │  │   (mini cam) │  │                       │ │
│  └──────┬──────┘  └──────────────┘  └───────────┬───────────┘ │
│         │                                       │             │
│  ┌──────┴───────────────────────────────────────┴───────────┐ │
│  │                  Transport Layer                          │ │
│  │                                                           │ │
│  │  • WebSocket  → Proctor backend (events, violations)      │ │
│  │  • WebRTC     → LiveKit (webcam, mic, screen streams)     │ │
│  │  • REST       → Session API (init, complete, config)      │ │
│  │  • Beacon     → Fallback for event delivery               │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Bundle sizes:                                                  │
│  • agent.js core:      ~15 KB (gzip)                           │
│  • UI layer:           ~30 KB (gzip)                           │
│  • MediaPipe WASM:     ~5 MB  (lazy-loaded after verification) │
│  • LiveKit client:     ~80 KB (gzip)                           │
└─────────────────────────────────────────────────────────────────┘
```

### Integration Complexity Comparison

| Tier | Integration Effort | Lines of Code | App Modification | Phase |
|------|-------------------|---------------|-----------------|-------|
| **Tier 3: iframe** | 5 minutes | 0 (just provide exam URL) | None | Phase 1 |
| **Tier 1: Script tag** | 30 minutes | ~5 HTML + ~10 server | Minimal | Phase 5 |
| **Tier 2: NPM SDK** | 1–2 hours | ~20 lines | Moderate | Phase 5 |

---

## 🎨 UX STRATEGY — WIREFRAME-FIRST DEVELOPMENT

### Design Principle
> **Every phase starts with wireframes / mockups → approved → THEN implementation**

### UX Library & Design System Stack

#### Core UI Framework
| Library | Purpose | Why |
|---------|---------|-----|
| [**Next.js 14+**](https://nextjs.org) | App framework | SSR, routing, API routes, fast DX |
| [**shadcn/ui**](https://ui.shadcn.com) | Component library | Radix-based, fully customisable, not a dependency |
| [**Tailwind CSS**](https://tailwindcss.com) | Styling | Utility-first, consistent, fast iteration |
| [**Radix UI**](https://radix-ui.com) | Primitives | Accessible, unstyled, composable |

#### Rich UX Components
| Library | Purpose | Why |
|---------|---------|-----|
| [**TanStack Table**](https://tanstack.com/table) | Data grids | Headless, virtualized, sorting/filtering/pagination |
| [**Recharts**](https://recharts.org) | Charts & analytics | React-native, composable, responsive |
| [**Tremor**](https://tremor.so) | Dashboard components | Built on Tailwind, beautiful analytics out of the box |
| [**Framer Motion**](https://framer.com/motion) | Animations | Spring physics, layout animations, gesture support |
| [**Lucide Icons**](https://lucide.dev) | Icons | Consistent, 1000+ icons, tree-shakeable |
| [**cmdk**](https://cmdk.paco.me) | Command palette | Spotlight-style navigation (⌘K) |
| [**Sonner**](https://sonner.emilkowal.ski) | Toasts | Beautiful, stackable notifications |
| [**nuqs**](https://nuqs.47ng.com) | URL state | Type-safe URL search params for filters |

#### Media & Playback
| Library | Purpose | Why |
|---------|---------|-----|
| [**Video.js**](https://videojs.com) | Video player | Extensible, plugin ecosystem |
| [**livekit/components-react**](https://github.com/livekit/components-js) | LiveKit React UI | Pre-built video tiles, controls |
| [**wavesurfer.js**](https://wavesurfer.xyz) | Audio waveforms | Timeline visualization for audio |

#### Design Inspiration & References
| Site | What to learn |
|------|--------------|
| [**Linear**](https://linear.app) | Clean data tables, keyboard-first UX, command palette |
| [**Vercel Dashboard**](https://vercel.com/dashboard) | Real-time logs, deployment status, clean layout |
| [**Grafana**](https://grafana.com) | Analytics dashboards, time-series visualization |
| [**Loom**](https://loom.com) | Video playback with timeline markers, sharing |
| [**Figma**](https://figma.com) | Multi-user real-time collaboration UI patterns |
| [**Retool**](https://retool.com) | Admin panel patterns, data-heavy interfaces |
| [**Tailwind UI**](https://tailwindui.com) | Pre-built page layouts, application shells |
| [**Dribble - Proctoring**](https://dribbble.com/search/proctoring) | Proctoring-specific UI inspiration |

---

## 👤 APPLICATION VIEWS — TWO PORTALS

### Portal 0: Product Site (`ayan.nunmai.local`)
> **VoltStack-inspired one-pager** — dark, animated, premium product marketing

| Section | Description |
|---------|-------------|
| **Hero** | Bold tagline + CTA + animated product preview |
| **Maturity Model** | 3-level evolution (Manual → Automated → Agentic) |
| **Capabilities** | Think (AI detection) → Act (rules & scoring) → Command (monitoring) |
| **How It Works** | Verification → Monitor → Score → Audit flow |
| **Integration** | Tier 1/2/3 with code snippets |
| **Trust & Safety** | Privacy, safety envelopes, human override |
| **Footer** | Tech Machers logo + legal links |

### Portal 1: Candidate Portal (`ayan.nunmai.local/session/:token`)
> Simple, distraction-free, focused on verification + exam-taking

| Screen | Description |
|--------|-------------|
| **Verification** | Proctor-hosted wizard: browser/camera/mic/screen/face/ID checks |
| **Exam Room** | Proctor shell + exam app in sandboxed iframe |
| **Post-Exam** | Confirmation, redirect to assessment system |

### Portal 2: Admin Platform (`ayan.nunmai.local/admin`)
> Rich, data-heavy, real-time monitoring and management

| Screen | Description |
|--------|-------------|
| **Dashboard** | Overview: active sessions, today's exams, violation heatmap |
| **Organisations** | Multi-tenant management (Phase 5) |
| **Exams** | Create/edit exams, configure rules & addons |
| **Batches** | Group management under exams |
| **Deliveries** | Calendar view, assign candidates to delivery slots |
| **Sessions** | Real-time session grid (like your current screenshot) |
| **Session Detail** | Tabs: Live View / Violations / Metrics / Recording / Score |
| **Live Monitor Wall** | Multi-session grid — 4/9/16 webcam tiles |
| **Playback** | Dual-view player with violation timeline |
| **Analytics** | Org-wide stats, trends, batch comparisons |
| **Rules Config** | Edit violation types, weights, thresholds |
| **Settings** | Organisation config, branding, integrations |

---

## 🎭 REVISED 6-PHASE ROADMAP — WITH UX MILESTONES

---

### 🟢 PHASE 1: Foundation MVP (Weeks 1–4)
> **Goal**: Ayan.ai product site + working proctor agent + admin dashboard + verification portal

#### 📐 1.0 UX DESIGN SPRINT (Week 1, Days 1–3)
> **Wireframes MUST be approved before implementation begins**

**Deliverable: Figma / Excalidraw mockups for:**

##### Candidate Portal Screens
- [ ] **Login page** — Keycloak redirect with Ayan.ai branding
  - Logo, tagline, "Sign in with SSO" button
  - Dark navy/cyan/gold theme (Ayan.ai branding)
- [ ] **My Exams dashboard** — scheduled exams list
  - Exam card: title, date/time, duration, countdown
  - Status: upcoming / in-progress / completed
  - "Start Exam" button (active only when scheduled)
- [ ] **System Check wizard** — 4-step pre-flight
  - Step 1: Browser check (compatibility)
  - Step 2: Camera check (preview + permission grant)
  - Step 3: Microphone check (volume meter)
  - Step 4: Screen share readiness
  - Progress bar, pass/fail indicators, "Proceed" button
- [ ] **Exam Room** — full-screen exam interface
  - Top bar: timer, exam title, minimize webcam preview
  - Main area: exam content (questions / iframe)
  - Bottom: navigation (next/prev), submit button
  - Floating webcam self-view (draggable, collapsible)
  - Status indicators: recording active, screen shared

##### Admin Platform Screens
- [ ] **Application shell** — sidebar + header layout
  - Collapsible sidebar (icons when collapsed)
  - Top bar: search, notifications, user avatar
  - Command palette (⌘K) for quick navigation
  - Breadcrumb navigation
- [ ] **Dashboard** — overview page
  - Stat cards: active sessions, exams today, violations today, avg credibility
  - Active sessions mini-grid (live thumbnails)
  - Violation trend chart (last 7 days)
  - Upcoming exams list
- [ ] **Sessions list** — main monitoring grid
  - TanStack Table with: #, Title, Candidate, Started, Duration, Credibility %, Status
  - Credibility shown as colour-coded progress bar (green/yellow/orange/red)
  - Status badges: Created, Active, Stopped, Completed
  - Filters: by exam, date range, risk level, status
  - Bulk actions: stop, export, archive
  - Real-time updates (rows flash when violation occurs)
- [ ] **Session detail** — tabbed panel
  - **Live View tab**: webcam + screen side by side (LiveKit components)
  - **Violations tab**: timeline list with severity badges
  - **Metrics tab**: violation codes bar chart (b1, b2, c1, c2... like existing)
  - **Score tab**: credibility gauge + breakdown
  - **Recording tab**: playback with timeline (Phase 4, placeholder for now)
  - **Notes tab**: examiner comments
- [ ] **Exam config** — create/edit exam
  - Basic: title, duration, instructions
  - **Addons tab** (checkboxes like existing):
    Equipment check, Face photography, Record video,
    Enable screen capture, Content copy protection,
    Rules of the event, WebRTC check, Safe Exam Browser
  - **Metrics tab** (weights per violation code):
    Grid of violation codes with weight sliders (0–1)
  - **Schedule tab**: assign candidates, set time slots

**UX Design References for mockups:**
- Sidebar layout → [Linear app](https://linear.app)
- Data table → [shadcn/ui data table](https://ui.shadcn.com/docs/components/data-table)
- Session cards → [Tremor dashboard](https://tremor.so)
- Status badges → [shadcn badges](https://ui.shadcn.com/docs/components/badge)
- Command palette → [cmdk](https://cmdk.paco.me)
- System check wizard → [shadcn stepper pattern](https://ui.shadcn.com)

#### 🔨 1.1 Infrastructure Setup (Week 1, Days 3–5)

**Step 1: Fix monorepo + add frontend workspaces**
- [x] Clean up TypeScript project references → `pnpm build` passes
- [x] `apps/web` workspace created — Next.js 14+ (Ayan.ai product site already built)
- [ ] Extend `apps/web/package.json` to add:
  - next, react, tailwindcss, shadcn/ui, @tanstack/react-table
  - recharts, framer-motion, lucide-react, cmdk, sonner
  - @livekit/components-react, livekit-client
  - keycloak-js
- [ ] Configure Tailwind with Ayan.ai colour palette (see BRANDING & DNS section):
  - Navy-950 background, cyan-400 accent, gold-400 secondary
  - Dark-first design system inspired by VoltStack.ai
  - Gradient text: cyan-400 → gold-400 for hero headings
- [ ] Setup shadcn/ui with custom theme
- [ ] Create app shell (sidebar + header + main content area)
- [ ] **White-labeling foundation**:
  - Dynamic branding system (logo, colors, fonts per tenant)
  - Template system for all candidate-facing text/messaging
  - Zero hardcoded "Ayan" or "Tech Machers" strings in candidate interfaces
  - Browser title/favicon system per tenant
  - Custom CSS injection support

**Step 2: Docker Compose — core infra**
- [ ] Create `infrastructure/docker/docker-compose.yml`
  - PostgreSQL 16 with init scripts
  - Redis 7
  - Keycloak 24 with realm import
  - LiveKit server with API keys
- [ ] Create `infrastructure/docker/init-scripts/`
  - Full entity schema (organisations, exams, batches, deliveries, sessions, violations)
- [ ] Create `.env.development` with all service URLs/keys
- [ ] Write `scripts/infra-up.sh` / `infra-down.sh`
- [ ] Verify all containers start and health-check pass

**Step 3: Keycloak configuration (Super Admin Only)**
- [ ] Create realm: `proctor-admin` (for Ayan super admin only)
- [ ] Create client: `admin-portal` (confidential) — super admin access
- [ ] Create super admin user: admin@ayan.nunmai.local
- [ ] JWT middleware for federated SSO:
  - Multi-issuer public key validation
  - Claims extraction and user context creation
  - Tenant isolation based on org_id from JWT
- [ ] Row-level security policies in PostgreSQL

#### 🔨 1.2 API Gateway + Control Plane (Week 2, Days 1–3)

**Step 4: API Gateway with JWT Federation**
- [ ] Express.js service with:
  - Multi-issuer JWT validation middleware
  - Claims extraction for tenant/role context
  - Row-level security enforcement
  - Route proxying to internal services
  - Health check endpoint
  - CORS, rate limiting, request logging
- [ ] Trusted issuer configuration for development/testing
- [ ] Dockerfile for API Gateway

**Step 5: Control Plane — full entity APIs**
- [ ] Organisation APIs:
  - `POST /api/v1/orgs` — create org
  - `GET /api/v1/orgs/:id` — get org details
  - `PATCH /api/v1/orgs/:id` — update config/branding
- [ ] Exam APIs:
  - `POST /api/v1/exams` — create exam (with addons + metric weights)
  - `GET /api/v1/exams` — list exams (with org filter)
  - `PATCH /api/v1/exams/:id` — update config
- [ ] Batch APIs:
  - `POST /api/v1/batches` — create batch under exam
  - `GET /api/v1/batches` — list (with exam filter)
- [ ] Delivery APIs:
  - `POST /api/v1/deliveries` — create delivery (batch + candidates + time)
  - `GET /api/v1/deliveries` — list (filterable)
- [ ] Session APIs:
  - `POST /api/v1/sessions` — start proctoring session
  - `GET /api/v1/sessions` — list sessions (filterable, paginated)
  - `GET /api/v1/sessions/:id` — full session detail
  - `PATCH /api/v1/sessions/:id` — update (end, pause)
  - `GET /api/v1/sessions/:id/violations` — violation list
  - `GET /api/v1/sessions/:id/score` — current score
- [ ] PostgreSQL schema (full entity model):
  ```sql
  organisations (id, external_id, name, slug, logo_url, theme, default_rules_config, keycloak_realm, api_keys, created_at)
  -- api_keys: JSONB [{ id, pk, sk_hash, created_at, revoked_at }]
  -- theme: JSONB { primary_color, secondary_color, background_color, text_color, font_family, custom_css_url, verification_messages: {welcome, camera_check, id_capture, room_scan, rules_title, completion} }
  exams (id, external_id, org_id, title, description, duration_min, instructions, exam_app_url, addons_config, metrics_config, rules_config, callback_url, created_by, created_at)
  batches (id, external_id, exam_id, name, description, created_at)
  deliveries (id, external_id, batch_id, scheduled_at, end_at, status, candidate_ids[], created_at)
  sessions (id, external_id, delivery_id, batch_id, exam_id, candidate_id, room_id, agent_id, status, credibility_score, risk_level, started_at, ended_at)
  violations (id, session_id, code, type, severity, confidence, weight, metadata, timestamp)
  recordings (id, session_id, type, storage_url, duration_sec, size_bytes, created_at)
  score_history (id, session_id, score, breakdown, timestamp)
  ```
- [ ] Prisma ORM setup with migrations
- [ ] Row-level security policies for tenant isolation
- [ ] Seed data: test org, exam, batch, delivery, candidate (with external_id fields for TAO sync)
- [ ] JWT claims-based user auto-provisioning

## 🚨 PHASE PLAN IMPACTS — FEDERATED SSO ARCHITECTURE

### Key Changes to Implementation Timeline

**Phase 1 (Week 1-3): Infrastructure**
```diff
+ ADD: JWT validation middleware with multi-issuer support
+ ADD: Row-level security policies in PostgreSQL  
+ ADD: Trusted issuer configuration framework
- REMOVE: Full Keycloak realm setup (only super admin realm)
- REMOVE: Role-based user management UI for Phase 1
```

**Phase 2 (Week 4-8): Core Platform** 
```diff  
+ ADD: Claims-based user auto-provisioning logic
+ ADD: Tenant context extraction from JWT
+ ADD: Enhanced API testing with mock JWT issuers
+ MODIFY: All API endpoints filter by org_id from JWT claims
+ MODIFY: Session creation flow auto-detects candidate context
```

**Phase 5 (Week 17-22): Multi-Tenant & Enterprise**
```diff
+ ADD: SAML 2.0 support for enterprise customers  
+ ADD: SCIM user provisioning protocols
+ ADD: JIT (Just-in-Time) user provisioning
+ ADD: Advanced claims mapping configuration  
+ MODIFY: Super admin portal focus on org management vs user management
```

### Integration Testing Requirements

**Development Environment:**  
- Mock JWT issuer for testing (`auth.mock.local`)
- Sample JWT tokens with various org_id/role combinations
- Row-level security verification tests

**Staging Environment:**
- Nunmai SSO integration testing  
- TAO CE JWT claims compatibility testing
- Cross-tenant isolation validation

### Security Considerations

**JWT Validation:**
- Public key rotation handling (JWKS endpoint monitoring)
- Token expiration and refresh logic
- Audience validation to prevent token reuse
- Claims validation (required fields, format, etc.)

**Tenant Isolation:**
- Database query auto-filtering by org_id
- Storage bucket access control per tenant
- LiveKit room naming with tenant prefixes
- Recording access restricted by tenant

**Trust Boundaries:**
- Trusted issuer allowlist configuration
- Claims mapping security (prevent privilege escalation)
- API rate limiting per tenant
- Audit logging for cross-tenant access attempts

---

#### 🔨 1.3 LiveKit Integration (Week 2, Days 4–5)

**Step 6: LiveKit room management**
- [ ] Token generation: `POST /api/v1/livekit/token`
  - Scoped per session (room = session ID)
  - Permissions: publish video + audio + screen
- [ ] Room lifecycle: auto-create on session start, auto-close on end
- [ ] LiveKit webhook receiver for room events
- [ ] LiveKit Egress setup (recording to local disk for MVP)

#### 🔨 1.4 Candidate Portal — Tier 3 Implementation (Week 3)
> **Phase 1 uses Tier 3 (iframe embed): proctor owns the entire experience.**
> **Verification is proctor-hosted. Exam app runs inside iframe.**

**Step 7: Proctor-hosted verification page (Next.js)**
- [ ] `GET /session/:token` — proctor verification entry point
  - Validate session token → load exam config + addons
  - **Load tenant branding** (logo, colors, org name, custom messaging) from organisation config
  - **White-label enforcement**: Zero "Ayan" or "Tech Machers" references anywhere
  - SSO authentication via JWT claims (org_id, exam_id, candidate context)
- [ ] **White-labeled verification wizard** (configurable steps from `exam.addons_config`):
  - **Tenant branding throughout**: Logo, colors, organization name, support contact
  - Step 1: **Browser check** — "{Tenant} Exam System Compatibility Check"
  - Step 2: **Camera check** — "{Tenant} Camera Verification" with tenant instructions  
  - Step 3: **Microphone check** — "{Tenant} Audio Check" with tenant messaging
  - Step 4: **Screen share** — "{Tenant} Screen Access Setup" with tenant guidelines
  - Step 5: **Face capture** — "{Tenant} Identity Verification" (if `face_verify` addon on)
  - Step 6: **ID proof capture** — "Upload your {Tenant} ID" (if `id_verify` addon on)
  - Step 7: **360° environment scan** — "{Tenant} Exam Environment Check" (if `env_scan` addon on)
  - **Custom messaging per step**: Tenant-specific instructions, no generic text
  - **Tenant support contact**: Help button → tenant email/phone (not Ayan support)
  - Browser tab title: "{Tenant} Exam Verification" (never "Ayan" or "Proctor")
  - Progress bar, pass/fail per step, "Proceed to {Exam Title}" button
  - All verification data stored server-side (face photo → MinIO, results → DB)
- [ ] **White-labeled exam room** page — proctor shell with embedded exam app:
  - Top bar: timer, exam title, recording indicator, candidate name (all tenant branded)
  - Main area: **iframe embedding `exam.exam_app_url`** (sandboxed)
  - Floating webcam self-view (draggable, collapsible) with tenant colors
  - Status indicators: recording active, screen shared, face detected (tenant styled)
  - Full-screen enforcement on the proctor shell
  - postMessage listener for exam app lifecycle events
  - Browser tab: "{Exam Title} - {Tenant Name}" (no Ayan references)
  - Status indicators: recording active, screen shared, face detected
  - Full-screen enforcement on the proctor shell
  - postMessage listener for exam app lifecycle events
- [ ] **Post-exam** page:
  - Session summary, confirmation message
  - Redirect to assessment system (if configured)

**Step 8: Browser event detection (within proctor shell)**
- [ ] Tab visibility API (`visibilitychange`) → code `b2`
- [ ] Window focus/blur → code `b2`
- [ ] Fullscreen exit → code `b3`
- [ ] Copy/paste interception → code `s2`
- [ ] Right-click disable
- [ ] DevTools detection (basic)
- [ ] iframe focus tracking (candidate clicking outside exam iframe)
- [ ] All events → WebSocket → server → violation log

#### 🔨 1.5 MediaPipe Face Detection (Week 3, continued)

**Step 9: Browser-side face detection**
- [ ] Load MediaPipe Face Detection (WASM)
- [ ] Process webcam frames at 5 FPS
- [ ] Detect: face count (0, 1, 2+), face position
- [ ] Generate violation codes:
  - `c1` — webcam disabled
  - `c2` — face invisible / not looking
  - `c3` — multiple faces
- [ ] Send via WebSocket with confidence + timestamp
- [ ] Server: evaluate + store in violations table

#### 🔨 1.6 Admin Dashboard — Implementation (Week 4)

**Step 10: Admin platform (Next.js, same app, role-based routing)**
- [ ] App shell: sidebar + header + command palette
- [ ] **Dashboard page**:
  - Stat cards (shadcn Card + Tremor metrics)
  - Active sessions count (live via WebSocket)
  - Violations today (Recharts line chart)
  - Upcoming exams
- [ ] **Sessions list page**:
  - TanStack Table with all columns from mockup
  - Credibility % as coloured bar
  - Status badges (shadcn Badge)
  - Filters panel (date, exam, status, risk level)
  - Click row → session detail
- [ ] **Session detail page**:
  - **Live View tab**: LiveKit video tiles (webcam + screen)
  - **Violations tab**: chronological list with severity badges
  - **Metrics tab**: bar chart of violation codes (b1, c1, m2...)
  - **Score tab**: credibility gauge (Recharts radial)
  - Notes/comments area
- [ ] **Exam management page**:
  - Create/edit exam form
  - Addons toggles (like existing Session Card → Addons tab)
  - Metrics weight editor (sliders per violation code)

#### ✅ PHASE 1 MILESTONE — DEMO READY

**What works end-to-end:**
```
✓ Tier 3 integration: proctor wraps any exam app URL in iframe
✓ **Demo Quiz App**: Full financial literacy quiz with 10 questions (localhost:3001)
✓ **White-labeled verification**: tenant branding, zero provider references
✓ Candidate enters exam room → LiveKit streams webcam + screen
✓ Exam app runs inside sandboxed iframe (zero integration needed)
✓ MediaPipe detects face presence/absence in real-time
✓ Tab switches, fullscreen exits are logged with violation codes
✓ Admin dashboard shows live sessions with credibility %
✓ Session detail shows violations + metrics chart
✓ Session is recorded via LiveKit Egress
✓ Ayan.ai product site live (VoltStack-inspired, dark-first)
✓ Modern UI with shadcn/ui, Tailwind, navy/cyan/gold dark-first theme
✓ Federated SSO with JWT claims-based tenant isolation
✓ **Demo Data Seeding**: Complete entity structure (Exam → Batch → Delivery → Session)
```

**UX Quality Bar:**
- Responsive (desktop-first, tablet-ready)
- Dark mode support built-in
- Command palette navigation (⌘K)
- Animated transitions (Framer Motion)
- Toast notifications for real-time events (Sonner)
- Keyboard navigation throughout

---

## 🎮 DEMO QUIZ APPLICATION

### Purpose & Architecture
**Internal demonstration app** showcasing complete Ayan.ai integration capabilities and TAO CE compatibility.

**Location**: `apps/demo-quiz/` - Next.js application on port 3001

**Key Features**:
- 💰 **Financial Literacy Quiz**: 10 comprehensive questions covering compound interest, credit scores, investment basics, budgeting, and insurance
- ⏱️ **15-minute timer** with visual warnings (25% = warning, 10% = critical)
- 📊 **Question navigation** with progress tracking and overview grid
- 🔗 **Real-time proctor integration** via postMessage API
- 📈 **Results calculation** with 70% passing score and detailed feedback
- 📱 **Mobile-responsive** interface with Tailwind CSS
- 🎨 **Iframe-compatible** for seamless Tier 3 integration

### Proctor System Integration
**Communication Events** (sent to parent proctor system):
```typescript
// Quiz lifecycle tracking
QUIZ_STARTED → { examId, candidateId, startTime }
ANSWER_SELECTED → { questionId, questionNumber, selectedOption, timestamp }  
QUIZ_COMPLETED → { answers, score, passed, timeSpent, endTime }
QUIZ_INTERRUPTED → { currentQuestion, answeredQuestions, reason }
```

### Demo Entity Structure
**Complete implementation** of our defined hierarchy:
```
🏢 Computer Science Department (Organisation)
 └── 📚 Financial Literacy Challenge 2026 (Exam)
      ├── 👥 Fall 2026 CS Cohort (Batch)
      └── 👥 Spring 2027 CS Cohort (Batch)
           └── 📅 Scheduled Deliveries
                ├── Tomorrow (candidates: 001, 002, 003)
                ├── +3 Days (candidates: 004, 005)
                └── +7 Days (candidates: 006, 007, 008)
                     └── 🎯 Ready Sessions for Proctoring Demo
```

### White-Label Configuration
**Tenant branding** applied throughout:
- **Organization**: Computer Science Department - University
- **Support**: exams@cs.university.edu | +1-555-CS-EXAMS  
- **Colors**: Blue primary (#1e40af), gold secondary (#f59e0b)
- **Messaging**: CS Department-specific instructions and policies
- **Logo**: University CS department branding
- **Zero Ayan references** in candidate experience

### Setup & Usage
```bash
# 1. Generate demo data with proper entity relationships
cd apps/demo-quiz
npm run setup:demo

# 2. Apply generated SQL to PostgreSQL database
psql -d ayan_db -f seed-data/demo-quiz-seed.sql

# 3. Start demo quiz application  
npm run dev  # → http://localhost:3001

# 4. Start main Ayan.ai proctoring system
# 5. Create session using generated session IDs
# 6. Demo complete integration: verification → quiz → monitoring → results
```

### TAO CE Integration Proof
- ✅ **Same entity structure**: Exam → Batch → Delivery → Session
- ✅ **External ID mapping**: All entities have `external_id` fields for TAO sync
- ✅ **JWT integration**: Candidate context from external authentication
- ✅ **Session lifecycle**: Matches TAO delivery execution model
- ✅ **Results format**: Compatible with external gradebook sync
- ✅ **Iframe compatibility**: Works with TAO's assessment delivery framework

---

### 🟠 PHASE 2: AI Detection Layer (Weeks 5–9)
> **Goal**: Advanced AI — persons, phones, audio + event streaming

#### 📐 2.0 UX DESIGN SPRINT (Week 5, Day 1)

**New/Updated screens to wireframe:**
- [ ] **Live Monitor Wall** — grid of webcam tiles (4/9/16 layout)
  - Each tile: candidate name, credibility %, violation indicator
  - Click tile → expand to session detail
  - Auto-highlight tiles with active violations (red border pulse)
  - Reference: Figma multi-user / video conferencing layouts
- [ ] **Violation feed** — real-time scrolling event list
  - Violation card: icon + code + description + confidence + timestamp
  - Severity colour coding
  - Filter by type, session, severity
  - Reference: [Vercel logs](https://vercel.com) real-time streaming
- [ ] **AI Detection status panel** — within session detail
  - Show what AI models are active for this session
  - Detection confidence indicators
  - Model health status

#### 🔨 2.1 Vision AI Service — YOLOv8 (Week 5–6)

**Step 1: Python service scaffold**
- [ ] `services/ai-vision/` — FastAPI app
- [ ] Dockerfile (CPU + optional CUDA)
- [ ] API: `POST /detect` (single frame), `WS /stream` (continuous)

**Step 2: YOLOv8 detection**
- [ ] YOLOv8n (nano) for speed
- [ ] Detection targets: person (>1), cell phone, book, earphones
- [ ] Output: class, confidence, bbox → mapped to violation codes (c3, m3, h1, a2)
- [ ] De-duplication (same violation within 10s window)

**Step 3: MediaPipe server-side enhancement**
- [ ] Head pose estimation (yaw/pitch/roll) → code `c5` (looking away)
- [ ] Gaze direction analysis
- [ ] Hand tracking (hand near ear = phone gesture)

**Step 4: Frame pipeline**
- [ ] LiveKit → extract frames at configurable FPS
- [ ] Send to vision service → events to Kafka

#### 🔨 2.2 Audio AI Service (Week 7–8)

**Step 5: Whisper.cpp + pyannote**
- [ ] `services/ai-audio/` — FastAPI
- [ ] Audio stream → 5-second windows → process
- [ ] Detect: speech presence, speaker count, noise level
- [ ] Violation codes: m1 (mic muted), m2 (background noise), a1 (multiple speakers)

#### 🔨 2.3 Event Stream Architecture (Week 9)

**Step 6: Kafka pipeline**
- [ ] Topics: `proctor.events.{vision,audio,screen,violations,scoring}`
- [ ] Consumers: rule engine, scoring, real-time dashboard
- [ ] Multi-modal correlation (vision + audio cross-validation)

#### 🔨 2.4 Admin UI Updates (Week 9)

**Step 7: Implement new screens**
- [ ] **Live Monitor Wall** page (from wireframe)
- [ ] **Violation feed** component (real-time WebSocket)
- [ ] Session detail → AI Detection panel
- [ ] Update metrics chart with new AI violation codes

#### ✅ PHASE 2 MILESTONE
```
✓ YOLOv8 detects phones, multiple persons, objects
✓ Audio detects multiple speakers, background noise
✓ Kafka event pipeline operational
✓ Live Monitor Wall shows all active sessions
✓ Real-time violation feed with AI confidence scores
✓ Detection latency < 2 seconds
```

---

### 🔵 PHASE 3: Rule + Scoring Engine (Weeks 10–12)
> **Goal**: Configurable rules, weighted scoring, credibility index

#### 📐 3.0 UX DESIGN SPRINT (Week 10, Day 1)

**New screens to wireframe:**
- [ ] **Rule Editor** — visual rule builder
  - Drag-and-drop rule conditions
  - IF → THEN → weight/action configuration
  - Rule templates (strict, moderate, lenient)
  - Test rules against sample events
  - Reference: [n8n.io](https://n8n.io) workflow builder for visual rule editing
- [ ] **Scoring Dashboard** — per session
  - Real-time credibility gauge (animated, 0–100)
  - Score breakdown by category (browser, camera, mic, screen, AI)
  - Risk level indicator with colour transition
  - Score timeline graph (how credibility changed during exam)
  - Reference: credit score dashboards, Tremor KPI cards
- [ ] **Exam Config → Metrics tab** — enhanced from Phase 1
  - Violation code grid with weight sliders
  - Category grouping (Browser / Camera / Mic / Screen / AI)
  - Preview: "with these weights, a typical session scores X%"

#### 🔨 3.1 Rule Engine Service (Week 10–11)

- [ ] `services/rule-engine/` — Kafka consumer + rule evaluation
- [ ] JSON-based rule definitions (per exam, per org)
- [ ] Support: threshold, frequency, duration, combination conditions
- [ ] Rule configuration API (CRUD)

#### 🔨 3.2 Scoring Engine (Week 11–12)

- [ ] `services/scoring-engine/`
- [ ] Base score: 100, penalty per violation code × weight
- [ ] Frequency multiplier, time decay
- [ ] Risk classification: Low (90+) / Medium (70-89) / High (50-69) / Critical (<50)
- [ ] Real-time score push via WebSocket
- [ ] Score history stored in TimescaleDB

#### 🔨 3.3 Admin UI Updates (Week 12)

- [ ] **Rule Editor** page (from wireframe)
- [ ] **Session detail → Score tab** enhanced:
  - Animated credibility gauge
  - Category breakdown chart
  - Score timeline graph
- [ ] **Sessions list**: credibility column now updates live
- [ ] **Exam config → Metrics tab** enhanced with weight sliders

#### ✅ PHASE 3 MILESTONE
```
✓ Rules configurable per exam via visual editor
✓ Credibility score updates in real-time
✓ Score breakdown by violation category
✓ Risk levels displayed with colour coding
✓ Admin can customise all violation weights
```

---

### 🟣 PHASE 4: Playback & Audit (Weeks 13–16) ✅ COMPLETED
> **Goal**: Session recordings with violation-indexed playback

#### 📐 4.0 UX DESIGN SPRINT (Week 13, Day 1)

**New screens to wireframe:**
- [x] **Playback page** — the crown jewel
  - **Layout**: dual video player (webcam left, screen right)
  - **Timeline bar**: full width, violation markers colour-coded
  - **Violation markers**: clickable icons on timeline (like your existing)
  - **Violation sidebar**: scrollable list, click → jump to time
  - **Playback controls**: play/pause, speed (0.5x, 1x, 1.5x, 2x), skip ±10s
  - **Zoom timeline**: scrubber for detailed view of violation-heavy periods
  - **AI annotations**: overlay bounding boxes on video (face, phone, person)
  - Reference: [Loom](https://loom.com) for playback UX, your existing timeline UI
- [x] **Audit Review Queue** — examiner workflow
  - List of sessions requiring review (sorted by risk)
  - Per session: approve / flag / reject
  - Per violation: confirm / dismiss / add note
  - Batch actions: approve all low-risk sessions
  - Reference: code review UIs (GitHub PR review)
- [x] **Audit Report** (printable/PDF)
  - Session summary: candidate, exam, duration, credibility
  - Violation table: time, code, description, severity, confidence
  - Score breakdown
  - Examiner verdict + notes
  - Ayan.ai + Tech Machers branding

#### 🔨 4.1 Recording Storage (Week 13–14)

- [x] MinIO S3-compatible storage (Docker Compose)
- [x] LiveKit Egress → MinIO bucket
- [x] Generate thumbnails at violation timestamps
- [x] Pre-signed URLs for secure playback
- [x] Lifecycle/retention policies

#### 🔨 4.2 Playback UI Implementation (Week 14–15)

- [x] Dual Video.js players (webcam + screen, synchronised)
- [x] Custom timeline component with violation markers
- [x] Click marker → both players jump to timestamp
- [x] Playback speed controls
- [x] AI annotation overlays (bounding boxes from detection data)
- [x] wavesurfer.js audio timeline (optional)

#### 🔨 4.3 Audit Workflow (Week 15–16)

- [x] Review queue page
- [x] Per-violation: confirm / dismiss / escalate actions
- [x] Examiner notes per session
- [x] PDF report generation (react-pdf or puppeteer)
- [x] CSV export for bulk analysis

#### ✅ PHASE 4 MILESTONE
```
✓ Dual-view playback (webcam + screen synchronised)
✓ Violation-indexed timeline with jump-to-timestamp
✓ AI annotation overlays on recorded video
✓ Audit review workflow for examiners
✓ PDF + CSV export
✓ Secure recording storage with retention
```

---

### 🟣 PHASE 5: Multi-Tenant, SDK & Enterprise (Weeks 17–22)
> **Goal**: Multi-org SaaS, Tier 1/2 SDK for external integration, branding, monitoring

#### 📐 5.0 UX DESIGN SPRINT (Week 17, Day 1)

**New screens to wireframe:**
- [ ] **Super Admin portal** — multi-org management
  - Organisation list with usage stats
  - Create org → provision realm + DB + API keys
  - Org health dashboard
- [ ] **Org Settings page**
  - **White-Label Branding tab**: 
    - Logo upload (candidate interfaces)
    - Color theme: primary, secondary, background, text
    - Organization name and support contact details
    - Custom messaging for verification steps
    - Custom CSS upload for advanced styling
    - Preview: "how candidates will see verification flow"
  - Default rules configuration
  - **Integration tab**: API keys (pk/sk), webhook URLs, callback config
  - User management (invite admins)
- [ ] **White-labeled verification page** — tenant branded
  - Tenant logo, colors, messaging throughout
  - Hardware check: "University of XYZ Camera Test" (not "Ayan Camera Test")
  - Photo capture: "Please upload your University ID" (tenant-specific)
  - Environment scan: "Show your exam space per CS Dept guidelines"
  - Zero references to Ayan.ai, Tech Machers, or provider branding
- [ ] **SDK Developer Portal** (docs site)
  - Interactive SDK documentation
  - Integration guides: Script Tag (Tier 1), NPM SDK (Tier 2), iframe (Tier 3)
  - **White-labeling guide**: How to configure tenant branding
  - Code examples: PHP, Python, Node.js, Java (server-side session creation)
  - Code examples: React, Vue, Angular, vanilla JS (client-side agent)
  - API reference with try-it-out
  - Webhook event reference
  - Reference: [Stripe Docs](https://stripe.com/docs), [Twilio Docs](https://www.twilio.com/docs)
- [ ] **Delivery Management** — enhanced
  - Calendar view of deliveries
  - Batch comparison analytics
  - Candidate progress overview

#### 🔨 5.1 Multi-Tenant (Week 17–19)
- [ ] Enhanced federated SSO:
  - Support multiple trusted issuers (university SSO, corporate LDAP)
  - Dynamic public key rotation handling
  - Claims mapping configuration per issuer
- [ ] Org auto-provisioning:
  - Create org from JWT claims if not exists
  - Default settings inheritance
  - Tenant user auto-enrollment
- [ ] DB: enhanced row-level security with org_id isolation
- [ ] MinIO: bucket-per-org with JWT-based access control
- [ ] Branding engine (logo, colours, fonts per org)
- [ ] Custom violation types, webhook notifications
- [ ] API key provisioning for direct API access:
  - `POST /api/v1/orgs/:id/keys` → generate pk_org + sk_org pair
  - Alternative to JWT for server-to-server integration

#### 🔨 5.2 White-Label Branding Engine (Week 19-20)
> **Complete provider anonymity for all candidate-facing interfaces**

- [ ] **Branding Configuration System**:
  - Database schema: `org_branding` table with theme settings
  - Logo storage in MinIO with CDN URLs
  - Color palette validation (accessibility compliance)
  - Custom CSS upload with sanitization
  - Font family selection from approved list
- [ ] **Verification Flow White-Labeling**:
  - Dynamic logo injection in all verification steps
  - Color theming for buttons, progress bars, status indicators
  - Custom messaging per step (camera check, ID capture, room scan)
  - Tenant support contact information
  - Organization name throughout (never "Ayan" or "Tech Machers")
- [ ] **Monitoring Interface Branding**:
  - Recording indicator with tenant colors
  - Help button → tenant support (not Ayan support)
  - Status messages in tenant voice
  - Error pages with tenant troubleshooting contact
- [ ] **Zero Provider References Policy**:
  - Code scan for hardcoded "Ayan" or "Tech Machers" strings
  - Dynamic text replacement system
  - Tenant-configurable terms ("proctoring" vs "invigilation")
  - Browser tab titles: "University Exam" not "Ayan Proctor"
- [ ] **Branding Preview System**:
  - Live preview of verification flow with tenant branding
  - Mobile responsive preview
  - Accessibility validation (contrast ratios)
  - A/B testing framework for branding effectiveness
> **Enable legacy PHP/Django/Rails/WordPress apps to integrate with proctoring**

- [ ] Build `agent.js` — single file, CDN-hosted:
  - `https://ayan.nunmai.local/agent.js`
  - Reads `data-session` attribute for session token
  - Core bundle: ~15 KB gzip (no WASM at this stage)
  - Lazy-loads MediaPipe WASM (~5 MB) on connect
  - Lazy-loads LiveKit client (~80 KB) on connect
- [ ] Session creation API (server-side, authenticated with sk_org):
  - `POST /api/v1/sessions` with `callback_url` field
  - Returns `{ session_token, verification_url }`
  - Assessment app redirects candidate → `verification_url`
- [ ] Verification redirect flow:
  - Proctor-hosted verification page runs all configured checks
  - On success → redirect to `callback_url?proctor_token=eyJ...`
  - `proctor_token` is a signed JWT (HS256 with sk_org) containing:
    `{ session_id, candidate_id, verification_passed: true, exp }`
  - Assessment app validates JWT → renders exam page with `<script>` tag
- [ ] `window.AgentProctor` global API:
  - `.emit(event, data)` — exam lifecycle events
  - `.getState()` — current status, credibility, violation count
  - `.on(event, callback)` — listen to proctor events
  - `.destroy()` — cleanup
- [ ] DOM events on `window`:
  - `proctor:state-change` — status transitions
  - `proctor:violation` — violation detected (code, severity, message)
  - `proctor:score-update` — credibility changed
- [ ] Integration test with sample PHP app
- [ ] Integration test with sample Django app

#### 🔨 5.3 Tier 1: Script Tag SDK — `agent.js` (Week 20–21)
> **Deep integration with React, Next.js, Vue, Angular, MERN apps**

- [ ] Publish `@techmachers/proctor-sdk` on npm:
  - `@techmachers/proctor-sdk` — core (vanilla JS)
  - `@techmachers/proctor-sdk/react` — React hooks + components
  - `@techmachers/proctor-sdk/vue` — Vue 3 composables
- [ ] React integration:
  - `<ProctorProvider sessionToken={...}>` — context provider
  - `<ProctorStatus />` — floating recording indicator component
  - `useProctor()` — hook: state, credibility, complete(), violations[]
  - `getVerificationUrl(token)` — helper for redirect flow
- [ ] Vue integration:
  - `useProctor({ sessionToken })` — composable
  - `<ProctorStatus />` — component
- [ ] Vanilla JS:
  - `new AgentProctor({ sessionToken })` — class-based API
  - `.connect()`, `.start()`, `.complete()`, `.destroy()`
- [ ] TypeScript: full type definitions included
- [ ] Tree-shakeable, ESM + CJS builds

#### 🔨 5.4 Tier 2: NPM SDK — `@techmachers/proctor-sdk` (Week 21–22)

- [ ] Docs site (Next.js / Nextra or Fumadocs):
  - Quick start guide (5-minute integration)
  - Tier 1 guide: step-by-step with PHP, Python, Node.js, Java examples
  - Tier 2 guide: React, Next.js, Vue, Angular examples
  - Tier 3 guide: iframe embed (just provide URL)
  - API reference: full REST API with request/response examples
  - Webhook reference: events, payloads, retry policy
  - Authentication guide: API keys, JWT validation
  - Verification flow: sequence diagrams, customisation options
- [ ] Webhook system:
  - `session.started`, `session.completed`, `session.violation`
  - `verification.passed`, `verification.failed`
  - Configurable per org: POST to callback URLs with signed payload
- [ ] Sample integration apps (in `examples/` directory):
  - `examples/php-legacy/` — PHP + script tag
  - `examples/nextjs-sdk/` — Next.js + @techmachers/proctor-sdk
  - `examples/express-api/` — Node.js session creation

#### 🔨 5.5 Developer Portal & Documentation (Week 22)

- [ ] Docs site (Next.js / Nextra or Fumadocs):
  - Quick start guide (5-minute integration)
  - **White-labeling setup guide**: Complete branding customization walkthrough
  - Tier 1 guide: step-by-step with PHP, Python, Node.js, Java examples
  - Tier 2 guide: React, Next.js, Vue, Angular examples
  - Tier 3 guide: iframe embed (just provide URL)
  - API reference: full REST API with request/response examples
  - Webhook reference: events, payloads, retry policy
  - Authentication guide: API keys, JWT validation
  - Verification flow: sequence diagrams, customisation options
- [ ] Webhook system:
  - `session.started`, `session.completed`, `session.violation`
  - `verification.passed`, `verification.failed`
  - Configurable per org: POST to callback URLs with signed payload
- [ ] Sample integration apps (in `examples/` directory):
  - `examples/php-legacy/` — PHP + script tag
  - `examples/nextjs-sdk/` — Next.js + @techmachers/proctor-sdk
  - `examples/express-api/` — Node.js session creation
  - `examples/white-label-demo/` — Complete branding customization demo
- [ ] Prometheus + Grafana monitoring stack
- [ ] Advanced SSO features:
  - SAML 2.0 support for enterprise customers
  - SCIM user provisioning
  - Just-in-time (JIT) user provisioning from JWT claims
- [ ] Super admin portal implementation
- [ ] Usage analytics per org (sessions, violations, storage)
- [ ] **External Platform Integration**
  - TAO CE 2025 sync APIs (exams, deliveries, scores)
  - Moodle/Canvas/Blackboard webhook adapters
  - Bulk import/export utilities for assessment platforms
  - Real-time score sync with external gradebooks

#### 🔨 5.6 Enterprise Features (Week 22)
- [ ] Prometheus + Grafana monitoring stack
- [ ] Advanced SSO features:
  - SAML 2.0 support for enterprise customers
  - SCIM user provisioning
  - Just-in-time (JIT) user provisioning from JWT claims
- [ ] Super admin portal implementation
- [ ] Usage analytics per org (sessions, violations, storage)
- [ ] **External Platform Integration**
  - TAO CE 2025 sync APIs (exams, deliveries, scores)
  - Moodle/Canvas/Blackboard webhook adapters
  - Bulk import/export utilities for assessment platforms
  - Real-time score sync with external gradebooks

#### ✅ PHASE 5 MILESTONE
```
✓ Multi-tenant with full isolation
✓ Complete white-label branding for all candidate interfaces (zero provider references)
✓ Custom logo, colors, messaging per tenant
✓ API key provisioning (pk_org + sk_org per org)
✓ Tier 1: agent.js script tag — works with PHP, Django, Rails, WordPress
✓ Tier 2: @techmachers/proctor-sdk — React, Vue, vanilla JS
✓ Proctor-hosted verification → redirect flow with signed JWT
✓ Federated SSO with JWT claims-based tenant isolation
✓ Developer portal with integration guides + white-labeling docs
✓ Webhook notifications for session lifecycle
✓ Sample integration apps for PHP, Next.js, Express
✓ Enterprise SSO adapters (SAML, SCIM, JIT provisioning)
✓ External platform sync (TAO CE, Moodle, Canvas) with bi-directional APIs
✓ Full observability stack
✓ Zero copyright/provider references in candidate experience
```

---

### 🔴 PHASE 6: Agentic Intelligence (Weeks 23+)
> **Goal**: LLM-powered reasoning, pattern detection, autonomous decisions

#### 📐 6.0 UX DESIGN SPRINT (Week 23, Day 1)

**New screens to wireframe:**
- [ ] **AI Insights panel** — within session detail
  - AI-generated narrative: "what happened and why"
  - Confidence reasoning per violation
  - Pattern detection highlights
- [ ] **Cohort Analytics** — cross-session intelligence
  - Anomaly detection (this candidate vs cohort baseline)
  - Risk prediction heatmap
  - Trend analysis over multiple exam cycles
- [ ] **AI Agent Status** — monitoring
  - Per-session agent health
  - Model performance metrics
  - Auto-learning feedback loop visualization

#### 🔨 6.1 LLM Reasoning Layer (Week 23–25)
- [ ] Ollama integration (Mistral 7B / Llama 3)
- [ ] Multi-modal event → narrative generation
- [ ] Pattern recognition across sessions
- [ ] Autonomous violation classification
- [ ] Self-improving via admin feedback loop

#### ✅ PHASE 6 MILESTONE
```
✓ AI-generated session narratives
✓ Cross-session pattern detection
✓ Predictive risk assessment
✓ False positive rate < 5%
✓ Autonomous agent decisions
```

---

## 🔧 SYSTEM INFRASTRUCTURE

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      Traefik (reverse proxy + TLS)              │
└──────────────────────────┬──────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
  ┌──────────────┐ ┌─────────────┐ ┌──────────────┐
  │  Keycloak    │ │ API Gateway │ │ LiveKit      │
  │  auth.ayan.  │ │ api.ayan.   │ │ media.ayan.  │
  │  nunmai.local│ │ nunmai.local│ │ nunmai.local │
  └──────┬───────┘ └──────┬──────┘ └──────┬───────┘
         │                │               │
         │         ┌──────┴──────┐        │
         │         ▼             ▼        │
         │  ┌────────────┐ ┌─────────┐   │
         │  │ Control    │ │ Session │   │
         │  │ Plane      │ │ Manager │   │
         │  └────────────┘ └────┬────┘   │
         │                      │        │
         │              ┌───────┴────────┤
         │              ▼                ▼
         │  ┌─────────────────────────────────┐
         │  │        AI Processing Layer       │
         │  │  ┌──────────┐  ┌──────────────┐ │
         │  │  │ Vision   │  │ Audio        │ │
         │  │  │ (YOLOv8  │  │ (whisper.cpp │ │
         │  │  │ MediaPipe)│  │  pyannote)   │ │
         │  │  └──────────┘  └──────────────┘ │
         │  └──────────┬──────────────────────┘
         │             │
         │             ▼
         │  ┌─────────────────────────────────┐
         │  │        Event Pipeline            │
         │  │  Kafka → Rule Engine → Scoring   │
         │  └──────────┬──────────────────────┘
         │             │
         │             ▼
         │  ┌─────────────────────────────────┐
         │  │        Data Layer                │
         │  │  PostgreSQL │ TimescaleDB │ MinIO│
         │  │  Redis (cache + pub/sub)         │
         │  └─────────────────────────────────┘
         │
         ▼
  ┌──────────────────────────────────────┐
  │  Next.js App (ayan.nunmai.local)     │
  │  ├─ /              ← Product Site    │
  │  ├─ /admin/*       ← Admin Platform  │
  │  ├─ /session/:tok  ← Verification    │
  │  ├─ /exam/:tok     ← Exam Room       │
  │  └─ /playback/*    ← Playback UI     │
  └──────────────────────────────────────┘
```

### Infrastructure Components (Docker Compose)

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| **Keycloak** | quay.io/keycloak/keycloak:24 | 8080 | SSO, org realms |
| **PostgreSQL** | postgres:16-alpine | 5432 | Core data |
| **TimescaleDB** | timescale/timescaledb-ha:pg16 | 5433 | Time-series events |
| **Redis** | redis:7-alpine | 6379 | Cache, pub/sub |
| **Kafka** | bitnami/kafka:3.7 (KRaft) | 9092 | Event streaming |
| **MinIO** | minio/minio:latest | 9000/9001 | Recording storage |
| **LiveKit** | livekit/livekit-server:latest | 7880/7881 | WebRTC media |
| **Traefik** | traefik:v3 | 80/443 | Reverse proxy |
| **Ollama** | ollama/ollama:latest | 11434 | Local LLM (Phase 6) |

---

## 📚 GITHUB REPOSITORIES — REUSE MAP

### Open-Source Dependencies — by module

#### 🎥 Media & Streaming
| Repository | Use | Phase |
|------------|-----|-------|
| [livekit/livekit](https://github.com/livekit/livekit) | Media server | Phase 1 |
| [livekit/client-sdk-js](https://github.com/livekit/client-sdk-js) | Browser WebRTC SDK | Phase 1 |
| [livekit/egress](https://github.com/livekit/egress) | Recording/export | Phase 1 |
| [livekit/components-js](https://github.com/livekit/components-js) | React video components | Phase 1 |

#### 👁️ Vision AI
| Repository | Use | Phase |
|------------|-----|-------|
| [google/mediapipe](https://github.com/google/mediapipe) | Face detection (WASM) | Phase 1 |
| [ultralytics/ultralytics](https://github.com/ultralytics/ultralytics) | YOLOv8 detection | Phase 2 |
| [opencv/opencv-python](https://github.com/opencv/opencv-python) | Image processing | Phase 2 |
| [microsoft/onnxruntime](https://github.com/microsoft/onnxruntime) | ML inference | Phase 2 |

#### 🔊 Audio AI
| Repository | Use | Phase |
|------------|-----|-------|
| [ggml-org/whisper.cpp](https://github.com/ggml-org/whisper.cpp) | Speech-to-text | Phase 2 |
| [pyannote/pyannote-audio](https://github.com/pyannote/pyannote-audio) | Speaker diarization | Phase 2 |

#### 📊 Infrastructure
| Repository | Use | Phase |
|------------|-----|-------|
| [apache/kafka](https://github.com/apache/kafka) | Event streaming | Phase 2 |
| [timescale/timescaledb](https://github.com/timescale/timescaledb) | Time-series data | Phase 2 |
| [minio/minio](https://github.com/minio/minio) | Object storage | Phase 4 |
| [keycloak/keycloak](https://github.com/keycloak/keycloak) | SSO/identity | Phase 1 |

#### 🤖 LLM (Phase 6)
| Repository | Use | Phase |
|------------|-----|-------|
| [ollama/ollama](https://github.com/ollama/ollama) | Local LLM runtime | Phase 6 |
| [qdrant/qdrant](https://github.com/qdrant/qdrant) | Vector DB | Phase 6 |

---

## 🖥️ PREREQUISITES

### Developer Machine
```
Node.js       >= 20 LTS
Python        >= 3.11
pnpm          >= 9.x
Docker        >= 24.x + Docker Compose v2
Git           >= 2.40
```

### Hardware (Dev)
```
RAM           >= 16 GB
CPU           >= 4 cores
Disk          >= 50 GB free
GPU           Optional (for YOLO acceleration)
Webcam        Required for testing
```

---

## 📊 SUCCESS METRICS

| Metric | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 | Phase 6 |
|--------|---------|---------|---------|---------|---------|---------|
| Face detection accuracy | >90% | >95% | — | — | — | — |
| Object detection accuracy | — | >90% | — | — | — | — |
| Processing latency | <1s | <2s | <1s | — | — | <3s |
| False positive rate | <15% | <10% | <8% | — | — | <5% |
| Concurrent sessions | 5 | 20 | 50 | 100 | 500+ | 500+ |
| UX: Lighthouse score | >90 | >90 | >90 | >90 | >90 | >90 |
| UX: Core Web Vitals | Pass | Pass | Pass | Pass | Pass | Pass |

---

## 🚀 IMMEDIATE NEXT STEPS — START PHASE 1

### Day 1: Product Site + Branding  
1. ✅ Build Ayan.ai one-pager site (VoltStack-inspired, dark theme)
2. ✅ Save Ayan.ai logo to `/public/ayan-logo.png` 
3. ✅ Configure Tailwind with Ayan.ai palette (navy/cyan/gold)
4. ✅ Implement logos throughout site (navigation, footer, admin areas)
5. Set up `ayan.nunmai.local` in `/etc/hosts` for local development

### Day 1-2: Infrastructure
5. Docker Compose with PostgreSQL + Redis + Keycloak + LiveKit
6. Keycloak realm + test users
7. Add `apps/web` workspace (Next.js + shadcn/ui + Tailwind)

### Day 3: UX Design Sprint
8. Create wireframes for verification wizard + exam room
9. Create wireframes for admin platform (shell, dashboard, sessions, session detail)
10. Review & approve mockups

### Day 4-5: API Foundation
11. API Gateway with Keycloak auth → `api.ayan.nunmai.local`
12. Control Plane with full entity schema
13. Seed data for development

**This document is the single source of truth for the project.**
