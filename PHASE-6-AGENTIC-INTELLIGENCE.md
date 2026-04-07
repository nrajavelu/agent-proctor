# 🤖 Phase 6: TRUE AGENTIC INTELLIGENCE LAYER

> **Release Branch**: `release/v2.0-phase5-complete` (tag: `v2.0-phase5`)  
> **Development Branch**: Create `feature/phase6-agentic-layer` from `main`  
> **Target**: Weeks 23+ | **Product**: Ayan.ai by Tech Machers  
> **Goal**: Transform from "violation detector" → "intelligent exam integrity agent"

---

## � ISOLATION STRATEGY — DO NOT TOUCH PHASE 5

### Rule: Phase 5 = FROZEN. Phase 6 = NEW everything.

The existing running setup (containers, apps, ports, volumes) must **never be altered or reused**.
Phase 6 creates a **completely separate** stack with its own naming convention.

### Naming Convention
| Layer | Phase 5 (FROZEN) | Phase 6 (NEW) |
|-------|-----------------|---------------|
| Docker compose | `infrastructure/docker/docker-compose.yml` | `infrastructure/docker/docker-compose.p6.yml` |
| Container prefix | `ayan-*` | `ayan-p6-*` |
| Volume prefix | `postgres_data`, `redis_data`, etc. | `p6_postgres_data`, `p6_redis_data`, etc. |
| Network | `ayan-network` | `ayan-p6-network` |
| PostgreSQL DB | `ayan_db` (port 5432) | `ayan_p6_db` (port **5442**) |
| Redis | port 6379 | port **6389** |
| Keycloak | port 8080 | port **8180** |
| LiveKit | port 7880 | port **7980** |
| MinIO | port 9000/9090 | port **9100/9190** |
| Prometheus | port 9091 | port **9191** |
| Grafana | port 3002 | port **3012** |
| Ollama (NEW) | — | port **11434** |
| Qdrant (NEW) | — | port **6333/6334** |
| Quiz App | port 3001 (`apps/demo-quiz/`) | port **3101** (`apps/demo-quiz-p6/`) |
| Admin Dashboard | port 3003 (`apps/web/`) | port **3103** (`apps/web-p6/`) |
| Session Manager | port 8081 (`tools/session-manager-server.js`) | port **8181** (`tools/p6-session-manager-server.js`) |
| Control Plane | port 4001 (`services/control-plane/`) | port **4101** (`services/control-plane-p6/`) |
| Agent Reasoning (NEW) | — | port **4105** (`services/agent-reasoning/`) |
| SDK file | `proctor-sdk-standalone.js` | `proctor-sdk-p6.js` |

### What NEVER gets modified
- `infrastructure/docker/docker-compose.yml` — Phase 5 containers
- `apps/demo-quiz/` — Phase 5 quiz app (port 3001)
- `apps/web/` — Phase 5 admin dashboard (port 3003)
- `tools/session-manager-server.js` — Phase 5 session manager (port 8081)
- `services/control-plane/` — Phase 5 control plane (port 4001)
- Any existing Docker volumes (`postgres_data`, `redis_data`, `minio_data`, etc.)
- The branding site at `ayan.nunmai.local`

### What gets CREATED fresh
- `infrastructure/docker/docker-compose.p6.yml` — Phase 6 isolated compose
- `apps/demo-quiz-p6/` — copied from demo-quiz, reconfigured for new ports
- `apps/web-p6/` — copied from web, reconfigured for new ports
- `tools/p6-session-manager-server.js` — forked with decision engine, new port
- `services/control-plane-p6/` — forked with candidate profiles, new port
- `services/agent-reasoning/` — brand new LLM reasoning service
- All new Docker volumes with `p6_` prefix

---

## 📋 PICKUP CONTEXT — PHASE 5 REFERENCE (READ-ONLY)

### Phase 5 Running Setup (DO NOT MODIFY)
| Service | Port | File | Lines |
|---------|------|------|-------|
| **Quiz App** (Next.js) | 3001 | `apps/demo-quiz/` | — |
| **Admin Dashboard** (Next.js) | 3003 | `apps/web/` | — |
| **Session Manager** (Node WS) | 8081 | `tools/session-manager-server.js` | 566 |
| **Control Plane** (Express) | 4001 | `services/control-plane/` | — |
| **Proctor SDK** (standalone JS) | — | `apps/demo-quiz/public/proctor-sdk-standalone.js` | 998 |

### Phase 5 Docker Infrastructure (FROZEN — docker-compose.yml)
| Container | Port | Purpose |
|-----------|------|---------|
| ayan-keycloak | 8080 | SSO/Identity |
| ayan-postgres | 5432 | Primary DB |
| ayan-redis | 6379 | Cache/Sessions |
| ayan-storage | 9000/9090 | Object Storage (MinIO) |
| ayan-livekit | 7880 | WebRTC Media |
| ayan-grafana | 3002 | Monitoring |
| ayan-prometheus | 9091 | Metrics |

### Key Files — Architecture Map
```
📦 Proctor SDK (browser-side AI)
├── proctor-sdk-standalone.js       ← Real AI: face detection, audio analysis, behavior AI
│   ├── _startFaceDetection()       ← Camera skin-tone analysis (no external models)
│   ├── _startAudioMonitor()        ← AudioContext frequency/volume analysis  
│   ├── _startBehaviorAI()          ← Mouse/keyboard pattern analysis
│   ├── _captureScreenshot()        ← Canvas JPEG with page state + webcam inset
│   ├── _captureWebcamFrame()       ← JPEG from video element
│   ├── _captureAudioClip()         ← WebM from MediaRecorder ring buffer (init segment preserved)
│   ├── _violationQueue[]           ← Batch delivery via violation:batch protocol
│   └── destroy()                   ← Full cleanup + widget removal on exam submit

📦 Session Manager (server-side hub)  
├── session-manager-server.js       ← WebSocket hub for all clients
│   ├── _handleViolationBatch()     ← Processes violation batches from SDK
│   ├── _processEvidence()          ← Inline base64 or MinIO storage
│   ├── _cleanupRetention()         ← Evidence retention (1-90 days configurable)
│   ├── admin:get_settings          ← Push settings to admin dashboard
│   └── admin:update_settings       ← Global settings save from admin UI

📦 Admin Dashboard
├── hooks/usePlatformStats.ts       ← Real-time stats (sessions, violations, orgs)
├── hooks/useSessionManager.ts      ← WebSocket connection to session manager
├── TenantManagement.tsx            ← View/Settings/Actions per tenant (localStorage)
├── SuperAdminDashboard.tsx         ← Real data from usePlatformStats
├── Analytics.tsx                   ← Real session analytics
├── SystemMonitor.tsx               ← CPU/memory/Docker container stats
├── Integrations.tsx                ← Service health checks
├── GlobalSettings.tsx              ← Evidence & Storage, Proctoring, AI, Security tabs
└── sessions/[sessionId]/page.tsx   ← Timeline, Evidence, Scoring, Behavior, Playback, Export
```

### Current Violation Types (SDK → Server)
| Source | Type | Severity | Evidence |
|--------|------|----------|----------|
| `browser-monitor` | tab_switch, fullscreen_exit, copy_paste, devtools, right_click | warning/critical | Screenshot (JPEG) |
| `ai-vision` | no_face_detected, multiple_faces | warning/critical | Webcam frame (JPEG) |
| `ai-audio` | background_voices, loud_noise | warning | Audio clip (WebM) |
| `ai-behavior` | rapid_typing, mouse_jitter, idle_too_long | info/warning | None |

### Credibility Score System
- Starts at 100%, decremented per violation severity
- Critical: -15, Warning: -8, Info: -3
- Synced via WebSocket heartbeat every 30s
- Displayed in admin dashboard in real-time

---

## 🎯 PHASE 6 — FULL SCOPE

### 6.1 Decision Autonomy System

**Auto-Terminate / Pause Exam**
```
When credibilityScore < threshold (configurable per tenant):
  → Agent decides: PAUSE exam (lock UI, show warning) or TERMINATE
  → Decision logged with LLM reasoning chain
  → Admin gets real-time push notification with AI explanation
  → Candidate sees clear message: "Session paused by integrity system"
```

Implementation targets:
- [ ] `ProctorAgent.decisionEngine` — rule + LLM hybrid evaluator
- [ ] Configurable thresholds per tenant in GlobalSettings (auto-pause at 40%, terminate at 15%)
- [ ] `session:pause` / `session:terminate` WebSocket events from server → SDK
- [ ] SDK handles pause: lock quiz UI, overlay message, resume on admin approval
- [ ] SDK handles terminate: end session, submit partial answers, show termination screen

**Auto-Flag High-Risk Sessions**
```
Risk levels: LOW (85-100) | MEDIUM (50-84) | HIGH (25-49) | CRITICAL (<25)
Auto-flag: Sessions that drop to HIGH within first 5 minutes
Proctor notification: Real-time push to monitoring dashboard
Escalation: CRITICAL sessions get priority queue position
```

- [ ] Risk classification service with time-weighted scoring
- [ ] Priority queue in admin session list (critical first, blinking)
- [ ] Push notifications (browser Notification API) to logged-in proctors
- [ ] Escalation rules configurable per tenant

### 6.2 Adaptive Rules Engine

**Not Fixed Weights — Learned Behavior Per Cohort**
```
Current: Static weights (critical=-15, warning=-8, info=-3)
Phase 6: Dynamic weights learned from cohort behavior baselines

Example:
  If 80% of cohort triggers "tab_switch" once → reduce weight for first occurrence
  If only 2% trigger "multiple_faces" → increase weight (anomalous)
  
Cohort = all sessions in same Exam + Batch
Baseline = rolling average updated after each completed session
```

- [ ] `CohortBaseline` model — per exam statistical profile
  - Mean/stddev for each violation type frequency
  - Normal behavior patterns (typing speed, mouse movement ranges)
  - Time-of-exam behavior curves
- [ ] `AdaptiveWeightEngine` — adjusts scores based on z-score deviation from cohort
- [ ] Feedback loop: admin confirms/overrides → weights retrain
- [ ] Visual: "Why this score?" explanation showing cohort comparison

### 6.3 Memory Layer — Candidate History

**Pattern Reuse Across Sessions**
```
Candidate A took 3 exams:
  Exam 1: 2 tab switches, score 78% — low risk
  Exam 2: 8 tab switches, multiple faces detected, score 34% — high risk  
  Exam 3: Starting now...
  
Agent context: "This candidate had a high-risk session (#2). 
  Monitor face detection more closely. 
  Previous pattern: violations peak at 15-20 minute mark."
```

- [ ] `CandidateProfile` — persistent store per candidate
  - Session history summary (not raw data)
  - Violation pattern fingerprint
  - Risk trend (improving / worsening / stable)
  - Behavioral signature (typical typing speed, mouse patterns)
- [ ] Agent pre-load: when session starts, load candidate profile into agent context
- [ ] Cross-session anomaly: flag if current behavior deviates from candidate's own baseline
- [ ] Storage: PostgreSQL `candidate_profiles` table with JSONB history
- [ ] Vector embeddings of session narratives for similarity search (Qdrant)

### 6.4 Goal-Driven Agent Architecture

**Goal: "Ensure Exam Integrity" — Not Just "Detect Violations"**
```
Current reactive loop:
  Event → Classify → Score → Display

Phase 6 goal-driven loop:
  Goal: "Ensure this exam is fair and the candidate is who they claim to be"
  ├── Sub-goal: Verify identity (face matches, consistent presence)
  ├── Sub-goal: Ensure solo work (no help, no external resources)  
  ├── Sub-goal: Maintain exam conditions (focus, timing, environment)
  └── Sub-goal: Preserve evidence chain (capture proof of violations)
  
  For each sub-goal:
    Observe → Reason → Decide → Act → Learn
```

- [ ] `AgentGoalTree` — hierarchical goal decomposition
- [ ] Each sub-goal has its own monitoring strategy and success criteria
- [ ] Agent dynamically adjusts attention: if identity is verified, shift focus to solo-work
- [ ] Periodic self-assessment: "Am I achieving my goals? What should I focus on?"

### 6.5 Action System

**Trigger Alerts → Notify Proctor → Lock UI**

| Trigger | Action | Channel | Reversible |
|---------|--------|---------|------------|
| credibility < 50% | Flag session | Admin WS push | — |
| credibility < 30% | Notify proctor | Browser notification + toast | — |
| No face for 60s | Pause exam | SDK `session:pause` | Yes (admin resume) |
| Multiple faces 3× | Lock UI | SDK `session:lock` | Yes (admin unlock) |
| credibility < 15% | Terminate | SDK `session:terminate` | No (final) |
| Exam submitted | Clear proctoring | SDK `destroy()` | — |

- [ ] `ActionDispatcher` in session-manager — evaluates trigger conditions
- [ ] Admin override: manual pause/resume/terminate from session detail
- [ ] Action log: every autonomous action recorded with reasoning
- [ ] Configurable per tenant: which actions are auto vs manual-only

### 6.6 LLM Reasoning Layer (Mistral / Llama via Ollama)

**Narrative Generation — "What Happened and Why"**
```
Input: Session violations[], timeline, evidence[], candidateProfile
Output: 
  "During the Financial Literacy exam on April 7, 2026, candidate Jane Doe 
   (ID: jane-2024) exhibited concerning behavior between minutes 12-18. 
   Face detection lost the candidate 3 times (confidence: high), and 
   background voices were detected twice. Combined with her previous 
   high-risk session on March 15, this pattern suggests external assistance. 
   Recommended action: Flag for manual review. Credibility: 42%."
```

- [ ] Ollama setup in Docker (Mistral 7B or Llama 3 8B — fits in 8GB RAM)
- [ ] `NarrativeEngine` service — takes session data, generates human-readable report
- [ ] Prompt templates for: session summary, violation explanation, risk assessment
- [ ] Streaming generation to admin UI (SSE/WS)
- [ ] "AI Insights" tab in session detail page
- [ ] Batch generation: generate narratives for all completed sessions overnight

**Autonomous Violation Classification**
```
Current: Rule-based (if face_count > 1 → "multiple_faces")
Phase 6: LLM classifies ambiguous cases

Example:
  Face detection returns confidence 0.6 (borderline)
  + Audio detected voice (confidence 0.7)
  + Tab was switched 2s ago
  
  LLM reasoning: "The low face confidence combined with detected voice 
  and recent tab switch suggests the candidate may have turned to speak 
  with someone off-screen. Classification: SUSPECTED_ASSISTANCE (high)"
```

- [ ] `ViolationClassifier` — feeds multi-modal signals to LLM for reasoning
- [ ] Structured output: classification + confidence + reasoning chain
- [ ] Admin can accept/reject classification → feedback loop

**Cross-Session Pattern Detection**
```
Across all sessions in an exam batch:
  - Are candidates showing correlated behavior? (cheating ring?)
  - Is one candidate's answers matching another's timing? 
  - Anomalous score distribution? (everyone scores 90%+ → leaked paper?)
```

- [ ] `PatternDetector` — runs after batch completion
- [ ] Correlation analysis: violation timing patterns across candidates
- [ ] Alert: "3 candidates in Batch 7 had identical tab-switch patterns at 14:32"
- [ ] Vector similarity: embed violation sequences, find clusters

### 6.7 Self-Learning Feedback Loop
```
Admin reviews session → confirms or overrides AI classification
  ↓
Feedback stored: (violation_data, ai_classification, admin_decision)
  ↓
Periodic retraining: adjust classification prompts / weights
  ↓
False positive rate decreases over time
  ↓
Goal: <5% false positive rate by end of Phase 6
```

- [ ] Feedback table: `ai_feedback (session_id, violation_id, ai_said, admin_said, timestamp)`
- [ ] Weekly analysis: which violation types have highest override rate?
- [ ] Auto-adjust: if "background_voices" is overridden 40% of time → reduce sensitivity
- [ ] Dashboard: "AI Accuracy" metrics showing improvement over time

---

## 🏗️ NEW SERVICES TO BUILD

### 1. Agent Reasoning Service (TypeScript + Ollama) — NEW
```
services/agent-reasoning/
  ├── src/
  │   ├── index.ts              ← Express server (port 4105)
  │   ├── ollama-client.ts      ← Ollama API wrapper (→ ayan-p6-ollama:11434)
  │   ├── narrative-engine.ts   ← Session narrative generation
  │   ├── violation-classifier.ts ← Multi-modal classification
  │   ├── pattern-detector.ts   ← Cross-session analysis (→ ayan-p6-qdrant:6333)
  │   └── feedback-loop.ts      ← Self-learning from admin feedback
  ├── prompts/
  │   ├── session-summary.txt   ← Prompt template
  │   ├── violation-classify.txt
  │   └── risk-assessment.txt
  ├── Dockerfile
  └── package.json
```
Port: **4105** | Connects to: `ayan-p6-ollama` (11434), `ayan-p6-qdrant` (6333), `ayan-p6-postgres` (5442)

### 2. Decision Engine (within p6-session-manager-server.js)
```
Extend tools/p6-session-manager-server.js (port 8181):
  ├── DecisionEngine class
  │   ├── evaluateSession()     ← Check thresholds, trigger actions
  │   ├── autoFlag()            ← Risk level classification
  │   ├── autoPause()           ← Lock exam UI
  │   ├── autoTerminate()       ← End session
  │   └── notifyProctor()       ← Push notification to admin (→ apps/web-p6)
  └── AdaptiveWeightEngine class
      ├── getCohortBaseline()   ← Statistical profile per exam
      ├── adjustWeight()        ← Dynamic weight based on z-score
      └── updateBaseline()      ← Post-session baseline update
```

### 3. Candidate Profile Service (in control-plane-p6)
```
Extend services/control-plane-p6/ (port 4101):
  ├── candidate-profiles table (ayan-p6-postgres, port 5442)
  │   ├── candidate_id, org_id
  │   ├── session_history JSONB  ← [{sessionId, date, score, riskLevel, highlights}]
  │   ├── violation_fingerprint JSONB ← {type_counts, timing_patterns}
  │   ├── behavioral_signature JSONB  ← {avg_typing_speed, mouse_patterns}
  │   └── risk_trend VARCHAR     ← 'improving' | 'worsening' | 'stable'
  └── Vector embeddings in ayan-p6-qdrant for narrative similarity search
```

---

## 🐳 PHASE 6 DOCKER COMPOSE (SEPARATE FILE)

Create `infrastructure/docker/docker-compose.p6.yml` — completely isolated from Phase 5:

```yaml
version: '3.8'

# ============================================================
# PHASE 6: AGENTIC INTELLIGENCE — ISOLATED STACK
# All containers: ayan-p6-* | All volumes: p6_* | Network: ayan-p6-network
# DO NOT merge into docker-compose.yml (Phase 5 frozen)
# ============================================================

services:
  # ── Core Database ──────────────────────────────────────────
  ayan-p6-postgres:
    image: postgres:16-alpine
    container_name: ayan-p6-postgres
    environment:
      POSTGRES_DB: ayan_p6_db
      POSTGRES_USER: ayan_p6_user
      POSTGRES_PASSWORD: ayan_p6_pass_dev
    volumes:
      - p6_postgres_data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d:ro
    ports:
      - "5442:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ayan_p6_user -d ayan_p6_db"]
      interval: 30s
      timeout: 10s
      retries: 5
    restart: unless-stopped
    networks:
      - ayan-p6-network

  # ── Redis ─────────────────────────────────────────────────
  ayan-p6-redis:
    image: redis:7-alpine
    container_name: ayan-p6-redis
    ports:
      - "6389:6379"
    volumes:
      - p6_redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 5
    restart: unless-stopped
    networks:
      - ayan-p6-network

  # ── Keycloak SSO ──────────────────────────────────────────
  ayan-p6-keycloak:
    image: quay.io/keycloak/keycloak:24.0
    container_name: ayan-p6-keycloak
    environment:
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://ayan-p6-postgres:5432/ayan_p6_db
      KC_DB_USERNAME: ayan_p6_user
      KC_DB_PASSWORD: ayan_p6_pass_dev
      KC_DB_SCHEMA: keycloak
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: admin_p6_pass
      KC_HTTP_PORT: 8080
      KC_HOSTNAME_STRICT: "false"
      KC_HOSTNAME_STRICT_HTTPS: "false"
      JAVA_OPTS: "-Xms64m -Xmx512m -XX:+UseContainerSupport"
    ports:
      - "8180:8080"
    command: start-dev
    depends_on:
      ayan-p6-postgres:
        condition: service_healthy
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 1g
    networks:
      - ayan-p6-network

  # ── LiveKit ───────────────────────────────────────────────
  ayan-p6-livekit:
    image: livekit/livekit-server:v1.5.2
    container_name: ayan-p6-livekit
    volumes:
      - ./livekit-p6.yaml:/livekit.yaml:ro
    command: ["--config", "/livekit.yaml"]
    ports:
      - "7980:7880"
      - "7981:7881"
      - "50200-50300:50200-50300/udp"
    depends_on:
      - ayan-p6-redis
    restart: unless-stopped
    networks:
      - ayan-p6-network

  # ── MinIO ─────────────────────────────────────────────────
  ayan-p6-storage:
    image: minio/minio:latest
    container_name: ayan-p6-storage
    environment:
      MINIO_ROOT_USER: ayan_p6_admin
      MINIO_ROOT_PASSWORD: ayan_p6_admin_pass
    ports:
      - "9100:9000"
      - "9190:9090"
    volumes:
      - p6_minio_data:/data
    command: server /data --console-address ":9090"
    restart: unless-stopped
    networks:
      - ayan-p6-network

  # ── Prometheus ────────────────────────────────────────────
  ayan-p6-prometheus:
    image: prom/prometheus:latest
    container_name: ayan-p6-prometheus
    ports:
      - "9191:9090"
    volumes:
      - p6_prometheus_data:/prometheus
      - ./monitoring/prometheus-p6.yml:/etc/prometheus/prometheus.yml:ro
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    restart: unless-stopped
    networks:
      - ayan-p6-network

  # ── Grafana ───────────────────────────────────────────────
  ayan-p6-grafana:
    image: grafana/grafana:latest
    container_name: ayan-p6-grafana
    ports:
      - "3012:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin_p6_pass
    volumes:
      - p6_grafana_data:/var/lib/grafana
    restart: unless-stopped
    networks:
      - ayan-p6-network

  # ── Ollama LLM (NEW for Phase 6) ─────────────────────────
  ayan-p6-ollama:
    image: ollama/ollama:latest
    container_name: ayan-p6-ollama
    ports:
      - "11434:11434"
    volumes:
      - p6_ollama_data:/root/.ollama
    deploy:
      resources:
        limits:
          memory: 8G
    restart: unless-stopped
    networks:
      - ayan-p6-network

  # ── Qdrant Vector DB (NEW for Phase 6) ───────────────────
  ayan-p6-qdrant:
    image: qdrant/qdrant:latest
    container_name: ayan-p6-qdrant
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - p6_qdrant_data:/qdrant/storage
    restart: unless-stopped
    networks:
      - ayan-p6-network

volumes:
  p6_postgres_data:
  p6_redis_data:
  p6_minio_data:
  p6_prometheus_data:
  p6_grafana_data:
  p6_ollama_data:
  p6_qdrant_data:

networks:
  ayan-p6-network:
    driver: bridge
```

### Start Phase 6 stack (without touching Phase 5)
```bash
cd infrastructure/docker
docker compose -f docker-compose.p6.yml up -d
docker exec ayan-p6-ollama ollama pull mistral:7b
```

### Verify isolation
```bash
# Phase 5 containers (should still be running untouched)
docker ps --filter name=ayan- --filter name=!ayan-p6 --format '{{.Names}} {{.Ports}}'

# Phase 6 containers (new stack)
docker ps --filter name=ayan-p6 --format '{{.Names}} {{.Ports}}'
```

---

## 📱 NEW UI COMPONENTS

### Admin Dashboard Additions
1. **AI Insights Tab** (session detail) — LLM-generated narrative + reasoning chain
2. **Risk Priority Queue** — critical sessions pinned to top with blinking indicator
3. **Cohort Analytics Page** — baseline comparison, anomaly heatmap
4. **Candidate History Panel** — past sessions, risk trend chart
5. **AI Accuracy Dashboard** — false positive rate, admin override rate, improvement curve
6. **Agent Actions Log** — every auto-pause/terminate with LLM reasoning
7. **Proctor Notifications** — browser push notifications for high-risk events

### SDK Additions
1. `session:pause` handler — lock quiz UI, show "Paused by Integrity System"
2. `session:resume` handler — unlock UI on admin approval
3. `session:terminate` handler — end session, submit partial, show termination screen
4. `session:lock` handler — full UI lock requiring admin intervention

---

## 🔀 IMPLEMENTATION ORDER (Suggested)

### Sprint 0: Isolation Setup (Day 1)
0. Create `docker-compose.p6.yml` with all `ayan-p6-*` containers
1. Copy `apps/demo-quiz` → `apps/demo-quiz-p6` (port 3101)
2. Copy `apps/web` → `apps/web-p6` (port 3103)
3. Fork `tools/session-manager-server.js` → `tools/p6-session-manager-server.js` (port 8181)
4. Fork `services/control-plane` → `services/control-plane-p6` (port 4101)
5. Update all WS URLs, API URLs, env vars in Phase 6 copies
6. Verify both Phase 5 and Phase 6 stacks run simultaneously

### Sprint 1: Foundation (Week 23)
7. `docker compose -f docker-compose.p6.yml up -d` (Ollama + Qdrant + all infra)
8. `agent-reasoning` service scaffold + Ollama client (port 4105)
9. Basic narrative generation (single session → text)
10. "AI Insights" tab in session detail UI (`apps/web-p6`)

### Sprint 2: Decision Autonomy (Week 24)
11. `DecisionEngine` in `p6-session-manager-server.js` (threshold checks)
12. SDK pause/resume/terminate/lock handlers in `proctor-sdk-p6.js`
13. Admin manual controls (pause/resume/terminate buttons) in `apps/web-p6`
14. Risk priority queue in dashboard
15. Proctor browser notifications

### Sprint 3: Adaptive Intelligence (Week 25)
16. `CohortBaseline` model + adaptive weights
17. `CandidateProfile` service + history storage (ayan-p6-postgres)
18. Agent pre-load with candidate context
19. Cohort analytics page in `apps/web-p6`

### Sprint 4: Advanced LLM (Week 26)
20. Multi-modal violation classification via LLM (ayan-p6-ollama)
21. Cross-session pattern detection (ayan-p6-qdrant)
22. Feedback loop (admin accept/reject → retrain)
23. AI accuracy dashboard

### Sprint 5: Polish + Integration (Week 27)
24. End-to-end testing with real exam scenarios on Phase 6 stack
25. Performance tuning (LLM latency, concurrent sessions)
26. Documentation and SDK updates
27. False positive rate validation (<5% target)
28. Migration guide: how to promote Phase 6 → production (replacing Phase 5)

---

## 💡 ADDITIONAL SUGGESTIONS (Beyond Original Scope)

### 1. Proctor Copilot Mode
Instead of fully autonomous, offer **"Copilot"** mode where the AI suggests actions and the human proctor approves with one click. Reduces liability while still being fast.

### 2. Exam Environment Fingerprinting
Capture browser fingerprint, IP geolocation, and device info at session start. Flag if a candidate takes multiple exams from different devices/locations in short timeframes.

### 3. Answer Timing Correlation
If integrated with the exam platform (TAO CE), compare answer submission timing across candidates. Statistically identical timing patterns → collusion detection.

### 4. Post-Exam AI Report Card
Auto-generate a PDF "Integrity Report" per session with:
- AI narrative summary
- Evidence thumbnails
- Credibility timeline chart
- Risk classification with reasoning
- Proctor signature field

### 5. Webhook System for LMS Integration
Fire webhooks on key events (session.flagged, session.terminated, session.completed) so external LMS/assessment platforms can react in real-time.

### 6. Anomaly-Based Alert Suppression
If the AI learns that a specific exam consistently triggers "tab_switch" (e.g., exam requires opening a reference doc), auto-suppress that violation type for that exam rather than flagging every candidate.

### 7. Voice Print Verification
Using the audio stream already captured, create a voice fingerprint at session start. If a different voice is detected mid-exam, flag as "suspected person switch."

### 8. Candidate Stress Detection
Using webcam + behavioral signals, detect stress indicators (rapid blinking, facial micro-expressions, erratic mouse movement). Not for penalizing, but for proctor awareness.

---

## 🚀 HOW TO START PHASE 6

```bash
# ============================================================
# STEP 0: Verify Phase 5 is untouched and running
# ============================================================
docker ps --filter name=ayan- --format '{{.Names}}: {{.Status}}'
# Should show: ayan-postgres, ayan-redis, ayan-keycloak, etc.
# DO NOT stop these. Leave them running.

# ============================================================
# STEP 1: Switch to feature branch
# ============================================================
git checkout main
git log --oneline -3  # Should show v2.0-phase5 tag
git checkout -b feature/phase6-agentic-layer

# ============================================================
# STEP 2: Create Phase 6 app copies (DO NOT modify originals)
# ============================================================
cp -r apps/demo-quiz apps/demo-quiz-p6
cp -r apps/web apps/web-p6
cp tools/session-manager-server.js tools/p6-session-manager-server.js
cp -r services/control-plane services/control-plane-p6

# Update ports in Phase 6 copies:
# apps/demo-quiz-p6/next.config.js  → port 3101
# apps/web-p6/next.config.js        → port 3103
# tools/p6-session-manager-server.js → port 8181
# services/control-plane-p6/         → port 4101
# SDK WS URL: ws://localhost:8181

# ============================================================
# STEP 3: Start Phase 6 Docker stack (separate compose file)
# ============================================================
cd infrastructure/docker
docker compose -f docker-compose.p6.yml up -d

# Pull LLM model (first time only)
docker exec ayan-p6-ollama ollama pull mistral:7b

# ============================================================
# STEP 4: Start Phase 6 services (new ports)
# ============================================================
cd ../../
node tools/p6-session-manager-server.js &          # port 8181
cd apps/demo-quiz-p6 && PORT=3101 pnpm dev &       # port 3101
cd ../web-p6 && PORT=3103 pnpm dev &               # port 3103
cd ../../services/control-plane-p6 && PORT=4101 pnpm dev &  # port 4101

# ============================================================
# STEP 5: Create new service
# ============================================================
mkdir -p services/agent-reasoning/src
# ... follow implementation order in Sprint 1

# ============================================================
# VERIFY: Both stacks running independently
# ============================================================
# Phase 5: http://localhost:3001 (quiz), http://localhost:3003 (admin)
# Phase 6: http://localhost:3101 (quiz), http://localhost:3103 (admin)
```

### Port Map Reference
```
Phase 5 (FROZEN)          Phase 6 (NEW)
─────────────────         ─────────────────
Quiz:       3001          Quiz:       3101
Admin:      3003          Admin:      3103
Session WS: 8081          Session WS: 8181
Control:    4001          Control:    4101
Postgres:   5432          Postgres:   5442
Redis:      6379          Redis:      6389
Keycloak:   8080          Keycloak:   8180
LiveKit:    7880          LiveKit:    7980
MinIO:      9000/9090     MinIO:      9100/9190
Grafana:    3002          Grafana:    3012
Prometheus: 9091          Prometheus: 9191
—                         Ollama:     11434
—                         Qdrant:     6333
—                         Agent AI:   4105
```

---

## 📊 SUCCESS CRITERIA

| Metric | Target |
|--------|--------|
| LLM narrative generation latency | < 5 seconds |
| Autonomous action accuracy | > 90% (admin agrees with AI decision) |
| False positive rate | < 5% (down from ~10-15% in Phase 5) |
| Cross-session pattern detection | Identify 80%+ of correlated violations |
| Admin override rate | < 10% (AI gets it right 90%+ of time) |
| Candidate profile match | Detect behavior deviation from self-baseline |
| Concurrent sessions with AI | 50+ with < 3s decision latency |
