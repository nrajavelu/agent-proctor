# 🤖 Phase 6: TRUE AGENTIC INTELLIGENCE LAYER

> **Release Branch**: `release/v2.0-phase5-complete` (tag: `v2.0-phase5`)  
> **Development Branch**: Create `feature/phase6-agentic-layer` from `main`  
> **Target**: Weeks 23+ | **Product**: Ayan.ai by Tech Machers  
> **Goal**: Transform from "violation detector" → "intelligent exam integrity agent"

---

## 📋 PICKUP CONTEXT — READ THIS FIRST

### What's Running (Phase 5 Complete)
| Service | Port | File | Lines |
|---------|------|------|-------|
| **Quiz App** (Next.js) | 3001 | `apps/demo-quiz/` | — |
| **Admin Dashboard** (Next.js) | 3003 | `apps/web/` | — |
| **Session Manager** (Node WS) | 8081 | `tools/session-manager-server.js` | 566 |
| **Control Plane** (Express) | 4001 | `services/control-plane/` | — |
| **Proctor SDK** (standalone JS) | — | `apps/demo-quiz/public/proctor-sdk-standalone.js` | 998 |

### Docker Infrastructure (docker-compose.yml)
| Container | Port | Purpose |
|-----------|------|---------|
| Keycloak | 8080 | SSO/Identity |
| PostgreSQL | 5432 | Primary DB |
| Redis | 6379 | Cache/Sessions |
| MinIO | 9000/9090 | Object Storage |
| LiveKit | 7880 | WebRTC Media |
| Grafana | 3002 | Monitoring |
| Prometheus | 9091 | Metrics |

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

### 1. Agent Reasoning Service (TypeScript + Ollama)
```
services/agent-reasoning/
  ├── src/
  │   ├── index.ts              ← Express server
  │   ├── ollama-client.ts      ← Ollama API wrapper
  │   ├── narrative-engine.ts   ← Session narrative generation
  │   ├── violation-classifier.ts ← Multi-modal classification
  │   ├── pattern-detector.ts   ← Cross-session analysis
  │   └── feedback-loop.ts      ← Self-learning from admin feedback
  ├── prompts/
  │   ├── session-summary.txt   ← Prompt template
  │   ├── violation-classify.txt
  │   └── risk-assessment.txt
  ├── Dockerfile
  └── package.json
```
Port: **4005** | Depends on: Ollama (11434), PostgreSQL, Redis

### 2. Decision Engine (within Session Manager)
```
Extend tools/session-manager-server.js:
  ├── DecisionEngine class
  │   ├── evaluateSession()     ← Check thresholds, trigger actions
  │   ├── autoFlag()            ← Risk level classification
  │   ├── autoPause()           ← Lock exam UI
  │   ├── autoTerminate()       ← End session
  │   └── notifyProctor()       ← Push notification to admin
  └── AdaptiveWeightEngine class
      ├── getCohortBaseline()   ← Statistical profile per exam
      ├── adjustWeight()        ← Dynamic weight based on z-score
      └── updateBaseline()      ← Post-session baseline update
```

### 3. Candidate Profile Service
```
Extend or new service:
  ├── candidate-profiles table (PostgreSQL)
  │   ├── candidate_id, org_id
  │   ├── session_history JSONB  ← [{sessionId, date, score, riskLevel, highlights}]
  │   ├── violation_fingerprint JSONB ← {type_counts, timing_patterns}
  │   ├── behavioral_signature JSONB  ← {avg_typing_speed, mouse_patterns}
  │   └── risk_trend VARCHAR     ← 'improving' | 'worsening' | 'stable'
  └── Vector embeddings in Qdrant for narrative similarity search
```

---

## 🐳 NEW DOCKER SERVICES

Add to `infrastructure/docker/docker-compose.yml`:

```yaml
  # Phase 6: Local LLM
  ollama:
    image: ollama/ollama:latest
    container_name: ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    deploy:
      resources:
        limits:
          memory: 8G
    restart: unless-stopped

  # Phase 6: Vector DB for session embeddings
  qdrant:
    image: qdrant/qdrant:latest
    container_name: qdrant
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant_data:/qdrant/storage
    restart: unless-stopped
```

Post-start: `docker exec ollama ollama pull mistral:7b`

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

### Sprint 1: Foundation (Week 23)
1. Docker: Add Ollama + Qdrant to compose
2. `agent-reasoning` service scaffold + Ollama client
3. Basic narrative generation (single session → text)
4. "AI Insights" tab in session detail UI

### Sprint 2: Decision Autonomy (Week 24)
5. `DecisionEngine` in session manager (threshold checks)
6. SDK pause/resume/terminate/lock handlers
7. Admin manual controls (pause/resume/terminate buttons)
8. Risk priority queue in dashboard
9. Proctor browser notifications

### Sprint 3: Adaptive Intelligence (Week 25)
10. `CohortBaseline` model + adaptive weights
11. `CandidateProfile` service + history storage
12. Agent pre-load with candidate context
13. Cohort analytics page in admin

### Sprint 4: Advanced LLM (Week 26)
14. Multi-modal violation classification via LLM
15. Cross-session pattern detection
16. Feedback loop (admin accept/reject → retrain)
17. AI accuracy dashboard

### Sprint 5: Polish + Integration (Week 27)
18. End-to-end testing with real exam scenarios
19. Performance tuning (LLM latency, concurrent sessions)
20. Documentation and SDK updates
21. False positive rate validation (<5% target)

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
# 1. Ensure you're on main with Phase 5 complete
git checkout main
git log --oneline -3  # Should show v2.0-phase5 tag

# 2. Create Phase 6 feature branch
git checkout -b feature/phase6-agentic-layer

# 3. Start infrastructure
cd infrastructure/docker
docker compose up -d

# 4. Pull Ollama model (first time only)
docker exec ollama ollama pull mistral:7b

# 5. Start services
cd ../../
node tools/session-manager-server.js &
cd apps/demo-quiz && pnpm dev &
cd ../web && pnpm dev &
cd ../../services/control-plane && pnpm dev &

# 6. Begin Sprint 1: Create agent-reasoning service
mkdir -p services/agent-reasoning/src
# ... follow implementation order above
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
