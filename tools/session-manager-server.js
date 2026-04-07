#!/usr/bin/env node

const { WebSocket, WebSocketServer } = require('ws');
const { randomUUID } = require('crypto');

class SessionManager {
  constructor(port = 8081) {
    this.sessions = new Map();
    this.clients = new Map();
    this.wss = new WebSocketServer({ port });
    this.setupWebSocketServer();
    // Start idle checker interval (every 60 seconds)
    this._idleInterval = setInterval(() => this._checkIdleSessions(), 60000);
    // Start retention cleanup (every 10 minutes)
    this._retentionInterval = setInterval(() => this._cleanupRetention(), 600000);

    // Platform settings (configurable via admin)
    this.settings = {
      evidence: {
        storageMode: 'inline',  // 'inline' (base64 in-memory) or 'minio' (S3 upload)
        captureScreenshots: true,
        captureWebcamFrames: true,
        captureAudioClips: true,
        retentionDays: 1,       // how many days to keep evidence data
        maxEvidenceSizeKB: 200, // max per-evidence payload
      }
    };

    console.log(`🚀 Session Manager WebSocket Server running on port ${port}`);
  }

  setupWebSocketServer() {
    this.wss.on('connection', (ws, req) => {
      const clientId = randomUUID();
      const url = new URL(req.url || '', `http://localhost`);
      const clientType = url.searchParams.get('type');
      const organizationId = url.searchParams.get('organizationId') || undefined;
      const sessionId = url.searchParams.get('sessionId') || undefined;

      const client = {
        id: clientId,
        ws,
        type: clientType,
        organizationId,
        sessionId
      };

      this.clients.set(clientId, client);
      console.log(`📱 ${clientType} client connected: ${clientId}`);

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(clientId, message);
        } catch (error) {
          console.error('❌ Error parsing message:', error);
        }
      });

      ws.on('close', () => {
        // When a candidate disconnects, mark their session as disconnected
        const disconnectedClient = this.clients.get(clientId);
        if (disconnectedClient && disconnectedClient.type === 'candidate' && disconnectedClient.sessionId) {
          const session = this.sessions.get(disconnectedClient.sessionId);
          if (session && session.status === 'active') {
            session.lastActivity = new Date();
            // Don't end it immediately — idle checker will handle status transitions
            console.log(`📱 Candidate disconnected, session ${session.sessionId} will be monitored for idle`);
          }
        }
        this.clients.delete(clientId);
        console.log(`📱 Client disconnected: ${clientId}`);
      });

      // Send current sessions to admin clients
      if (clientType === 'admin') {
        this.sendSessionsToAdmin(clientId);
      }
    });
  }

  handleMessage(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'session:start':
        this.startSession(message.data, clientId);
        break;
      case 'session:update':
        this.updateSession(message.data, clientId);
        break;
      case 'session:end':
        this.endSession(message.sessionId, clientId);
        break;
      case 'session:heartbeat':
        this._handleHeartbeat(message.sessionId, message.data);
        break;
      case 'violation:trigger':
        this.triggerViolation(message.sessionId, message.data);
        break;
      case 'violation:batch':
        this._handleViolationBatch(message.sessionId, message.data);
        break;
      case 'admin:request_sessions':
        this.sendSessionsToAdmin(clientId);
        break;
      case 'admin:get_settings':
        this._sendSettings(clientId);
        break;
      case 'admin:update_settings':
        this._updateSettings(message.data, clientId);
        break;
      default:
        console.warn('❓ Unknown message type:', message.type);
    }
  }

  startSession(sessionData, clientId) {
    // Dedup: if same candidate created a session within last 3 seconds, just return existing
    const recentSession = Array.from(this.sessions.values()).find(
      s => s.candidateId === sessionData.candidateId &&
           s.organizationId === sessionData.organizationId &&
           s.status === 'active' &&
           (Date.now() - new Date(s.startedAt).getTime()) < 3000
    );
    if (recentSession) {
      console.log(`⚠️ Dedup: returning existing session ${recentSession.sessionId} (created <3s ago)`);
      const client = this.clients.get(clientId);
      if (client) {
        client.sessionId = recentSession.sessionId;
        client.ws.send(JSON.stringify({
          type: 'session:started',
          sessionId: recentSession.sessionId,
          shortId: recentSession.shortId,
          data: recentSession
        }));
      }
      return;
    }

    // Mark any existing active sessions for this candidate as abandoned
    for (const [id, session] of this.sessions) {
      if (session.candidateId === sessionData.candidateId &&
          session.organizationId === sessionData.organizationId &&
          (session.status === 'active' || session.status === 'idle-yellow' || session.status === 'idle-amber' || session.status === 'idle-red')) {
        session.status = 'abandoned';
        session.completedAt = new Date();
        console.log(`🔄 Marked old session ${id} as abandoned for candidate ${sessionData.candidateId}`);
        this.broadcastToAdmins({ type: 'session:updated', data: session });
      }
    }

    // Generate short ID for display (matches widget format)
    const shortId = Math.random().toString(36).slice(2, 10);
    const sessionId = randomUUID();
    const now = new Date();
    const session = {
      sessionId,
      shortId,
      candidateId: sessionData.candidateId,
      examId: sessionData.examId,
      organizationId: sessionData.organizationId,
      status: 'active',
      startedAt: now,
      lastActivity: now,
      score: 0,
      credibilityScore: 100,
      riskLevel: 'low',
      violations: [],
      currentQuestion: 0,
      totalQuestions: sessionData.totalQuestions || 20,
      metadata: sessionData.metadata || {}
    };

    this.sessions.set(sessionId, session);
    
    // Update client with session ID
    const client = this.clients.get(clientId);
    if (client) {
      client.sessionId = sessionId;
      client.ws.send(JSON.stringify({
        type: 'session:started',
        sessionId,
        shortId,
        data: session
      }));
    }

    // Notify all admin clients
    this.broadcastToAdmins({
      type: 'session:new',
      data: session
    });

    console.log(`🎯 New session started: ${sessionId} (${shortId}) for ${sessionData.candidateId}`);
  }

  updateSession(updateData, clientId) {
    const client = this.clients.get(clientId);
    if (!client?.sessionId) return;

    const session = this.sessions.get(client.sessionId);
    if (!session) return;

    // Update session data
    Object.assign(session, updateData);
    session.lastActivity = new Date();

    // Broadcast update to admins
    this.broadcastToAdmins({
      type: 'session:updated',
      data: session
    });
  }

  endSession(sessionId, clientId) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.status = 'completed';
    session.completedAt = new Date();

    this.broadcastToAdmins({
      type: 'session:ended',
      data: session
    });

    console.log(`🏁 Session ended: ${sessionId}`);
  }

  _handleHeartbeat(sessionId, data) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Only mark as real user activity if user actually interacted
    const hasRealActivity = data && data.hasUserActivity;
    if (hasRealActivity) {
      session.lastActivity = new Date();
      // If session was idle, restore to active
      if (session.status.startsWith('idle-')) {
        session.status = 'active';
        console.log(`💚 Session ${sessionId} restored to active (user activity detected)`);
        this.broadcastToAdmins({ type: 'session:updated', data: session });
      }
    }
    // Always update lastHeartbeat so we know WS is alive
    session.lastHeartbeat = new Date();
  }

  _checkIdleSessions() {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (session.status === 'completed' || session.status === 'abandoned') continue;

      const lastAct = session.lastActivity ? new Date(session.lastActivity).getTime() : new Date(session.startedAt).getTime();
      const idleMinutes = (now - lastAct) / 60000;

      let newStatus = 'active';
      if (idleMinutes >= 15) newStatus = 'idle-red';
      else if (idleMinutes >= 10) newStatus = 'idle-amber';
      else if (idleMinutes >= 5) newStatus = 'idle-yellow';

      if (newStatus !== session.status) {
        const oldStatus = session.status;
        session.status = newStatus;
        console.log(`⏱️  Session ${id} status: ${oldStatus} → ${newStatus} (idle ${Math.round(idleMinutes)}m)`);
        this.broadcastToAdmins({ type: 'session:updated', data: session });
      }
    }
  }

  triggerViolation(sessionId, violationData) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Only reset idle on user-initiated events (browser-monitor), NOT on AI-generated events
    const isUserAction = violationData.source === 'browser-monitor';
    if (isUserAction) {
      session.lastActivity = new Date();
      if (session.status.startsWith('idle-')) {
        session.status = 'active';
      }
    }

    const violation = {
      id: randomUUID(),
      type: violationData.type,
      severity: violationData.severity || 'warning',
      timestamp: violationData.timestamp || new Date().toISOString(),
      description: violationData.description,
      confidence: violationData.confidence || Math.floor(Math.random() * 20 + 75),
      source: violationData.source || 'ai-proctor',
      metadata: violationData.metadata,
      evidence: this._processEvidence(violationData.evidence)
    };

    session.violations.push(violation);

    // Update credibility score — use same penalties as SDK
    const penalty = violation.severity === 'critical' ? 15 : 
                   violation.severity === 'warning' ? 5 : 2;
    session.credibilityScore = Math.max(10, session.credibilityScore - penalty);
    
    // Update risk level
    if (session.credibilityScore < 40) session.riskLevel = 'critical';
    else if (session.credibilityScore < 60) session.riskLevel = 'high';
    else if (session.credibilityScore < 80) session.riskLevel = 'medium';
    else session.riskLevel = 'low';

    console.log(`🚨 Violation: ${violation.type} | Session: ${sessionId} | Credibility: ${session.credibilityScore}% | Source: ${violation.source}`);

    // Broadcast violation to all relevant clients
    this.broadcastToAdmins({
      type: 'violation:new',
      sessionId,
      data: violation
    });

    // Send updated session data to admins
    this.broadcastToAdmins({
      type: 'session:updated',
      data: session
    });

    // Send credibility sync back to candidate
    const candidateClient = Array.from(this.clients.values()).find(
      c => c.type === 'candidate' && c.sessionId === sessionId
    );
    
    if (candidateClient) {
      candidateClient.ws.send(JSON.stringify({
        type: 'violation:alert',
        data: {
          message: `Violation detected: ${violation.description}`,
          severity: violation.severity,
          type: violation.type,
          credibilityScore: session.credibilityScore,
          violationCount: session.violations.length,
          timestamp: violation.timestamp
        }
      }));
    }
  }

  _handleViolationBatch(sessionId, violations) {
    if (!Array.isArray(violations) || violations.length === 0) return;
    const session = this.sessions.get(sessionId);
    if (!session) return;

    let hasUserAction = false;
    for (const violationData of violations) {
      if (violationData.source === 'browser-monitor') hasUserAction = true;

      const violation = {
        id: randomUUID(),
        type: violationData.type,
        severity: violationData.severity || 'warning',
        timestamp: violationData.timestamp || new Date().toISOString(),
        description: violationData.description,
        confidence: violationData.confidence || Math.floor(Math.random() * 20 + 75),
        source: violationData.source || 'ai-proctor',
        metadata: violationData.metadata,
        evidence: this._processEvidence(violationData.evidence)
      };

      session.violations.push(violation);

      const penalty = violation.severity === 'critical' ? 15 :
                     violation.severity === 'warning' ? 5 : 2;
      session.credibilityScore = Math.max(10, session.credibilityScore - penalty);

      console.log(`🚨 Violation: ${violation.type} | Session: ${sessionId} | Credibility: ${session.credibilityScore}% | Source: ${violation.source}`);
    }

    // Update risk level
    if (session.credibilityScore < 40) session.riskLevel = 'critical';
    else if (session.credibilityScore < 60) session.riskLevel = 'high';
    else if (session.credibilityScore < 80) session.riskLevel = 'medium';
    else session.riskLevel = 'low';

    // Only reset idle on user-initiated browser events
    if (hasUserAction) {
      session.lastActivity = new Date();
      if (session.status.startsWith('idle-')) {
        session.status = 'active';
      }
    }

    // Single broadcast for the whole batch
    this.broadcastToAdmins({ type: 'session:updated', data: session });

    // Send credibility sync back to candidate
    const candidateClient = Array.from(this.clients.values()).find(
      c => c.type === 'candidate' && c.sessionId === sessionId
    );
    if (candidateClient) {
      candidateClient.ws.send(JSON.stringify({
        type: 'violation:alert',
        data: {
          message: `${violations.length} violation(s) recorded`,
          severity: violations[violations.length - 1].severity,
          type: violations[violations.length - 1].type,
          credibilityScore: session.credibilityScore,
          violationCount: session.violations.length,
          timestamp: new Date().toISOString()
        }
      }));
    }

    console.log(`📦 Batch: ${violations.length} violations for session ${sessionId} | Credibility: ${session.credibilityScore}%`);
  }

  // Process and optionally store evidence from violation payloads
  _processEvidence(evidence) {
    if (!evidence) return null;
    const settings = this.settings.evidence;
    console.log(`📎 Processing evidence: type=${evidence.type}, format=${evidence.format}, hasData=${!!evidence.data}`);

    // Check if evidence type is enabled
    if ((evidence.type === 'screenshot_metadata' || evidence.type === 'screenshot') && !settings.captureScreenshots) return null;
    if (evidence.type === 'webcam_frame' && !settings.captureWebcamFrames) return null;
    if (evidence.type === 'audio_clip' && !settings.captureAudioClips) return null;

    // Size check for base64 payloads
    if (evidence.data && typeof evidence.data === 'string') {
      const sizeKB = Math.round(evidence.data.length * 0.75 / 1024); // base64 overhead
      if (sizeKB > settings.maxEvidenceSizeKB) {
        console.log(`⚠ Evidence too large (${sizeKB}KB > ${settings.maxEvidenceSizeKB}KB limit), storing metadata only`);
        return { type: evidence.type, format: evidence.format, truncated: true, originalSizeKB: sizeKB };
      }
    }

    if (settings.storageMode === 'inline') {
      // Store directly in the violation object (in-memory)
      return {
        type: evidence.type,
        format: evidence.format || 'unknown',
        data: evidence.data || null,
        durationMs: evidence.durationMs || null,
        capturedAt: new Date().toISOString()
      };
    }

    // storageMode === 'minio' — placeholder for S3/MinIO upload
    // In production: upload evidence.data to MinIO, return URL reference
    console.log(`📁 MinIO storage mode — would upload ${evidence.type} to object storage`);
    return {
      type: evidence.type,
      format: evidence.format || 'unknown',
      storageMode: 'minio',
      storagePath: `evidence/${new Date().toISOString().slice(0,10)}/${randomUUID()}.${evidence.format === 'image/jpeg' ? 'jpg' : evidence.format === 'audio/webm' ? 'webm' : 'json'}`,
      capturedAt: new Date().toISOString(),
      durationMs: evidence.durationMs || null
    };
  }

  // Send current settings to admin client
  _sendSettings(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return;
    client.ws.send(JSON.stringify({
      type: 'settings:current',
      data: this.settings
    }));
  }

  // Update settings from admin
  _updateSettings(data, clientId) {
    if (!data) return;
    // Deep merge evidence settings
    if (data.evidence) {
      Object.assign(this.settings.evidence, data.evidence);
    }
    console.log(`⚙️ Settings updated:`, JSON.stringify(this.settings.evidence));
    // Broadcast updated settings to all admins
    this.broadcastToAdmins({ type: 'settings:updated', data: this.settings });
    // Acknowledge to requesting client
    const client = this.clients.get(clientId);
    if (client) {
      client.ws.send(JSON.stringify({ type: 'settings:saved', data: this.settings }));
    }
  }

  // Cleanup old sessions and evidence based on retention period
  _cleanupRetention() {
    const retentionMs = this.settings.evidence.retentionDays * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - retentionMs;
    let cleaned = 0;

    for (const [id, session] of this.sessions) {
      const createdAt = new Date(session.startedAt).getTime();
      if (createdAt < cutoff && (session.status === 'completed' || session.status === 'abandoned')) {
        // Strip evidence from old violations to free memory
        for (const v of session.violations) {
          if (v.evidence && v.evidence.data) {
            v.evidence = { type: v.evidence.type, format: v.evidence.format, expired: true, capturedAt: v.evidence.capturedAt };
          }
        }
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Retention cleanup: stripped evidence from ${cleaned} expired sessions (>${this.settings.evidence.retentionDays}d old)`);
    }
  }

  sendSessionsToAdmin(clientId) {
    const client = this.clients.get(clientId);
    if (!client || client.type !== 'admin') return;

    const sessions = Array.from(this.sessions.values()).filter(session => {
      return !client.organizationId || session.organizationId === client.organizationId;
    });

    client.ws.send(JSON.stringify({
      type: 'sessions:list',
      data: sessions
    }));
  }

  broadcastToAdmins(message) {
    this.clients.forEach(client => {
      if (client.type === 'admin') {
        try {
          client.ws.send(JSON.stringify(message));
        } catch (error) {
          console.error('❌ Error sending to admin client:', error);
        }
      }
    });
  }

  getAllSessions() {
    return Array.from(this.sessions.values());
  }
}

// Start the session manager
console.log('🚀 Starting Agentic AI Proctoring Session Manager...');

const sessionManager = new SessionManager(8081);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Gracefully shutting down session manager...');
  clearInterval(sessionManager._idleInterval);
  clearInterval(sessionManager._retentionInterval);
  sessionManager.wss.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Gracefully shutting down session manager...');
  clearInterval(sessionManager._idleInterval);
  clearInterval(sessionManager._retentionInterval);
  sessionManager.wss.close();
  process.exit(0);
});

console.log('✅ Session Manager is running on port 8081');
console.log('📡 WebSocket endpoint: ws://localhost:8081');
console.log('🎯 Ready to handle candidate and admin connections');
console.log('\nPress Ctrl+C to stop...');

module.exports = { SessionManager };