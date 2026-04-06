#!/usr/bin/env node

const { WebSocket, WebSocketServer } = require('ws');
const { randomUUID } = require('crypto');

class SessionManager {
  constructor(port = 8080) {
    this.sessions = new Map();
    this.clients = new Map();
    this.wss = new WebSocketServer({ port });
    this.setupWebSocketServer();
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
      case 'violation:trigger':
        this.triggerViolation(message.sessionId, message.data);
        break;
      case 'admin:request_sessions':
        this.sendSessionsToAdmin(clientId);
        break;
      default:
        console.warn('❓ Unknown message type:', message.type);
    }
  }

  startSession(sessionData, clientId) {
    // Check if this candidate already has an active session
    const existingSession = Array.from(this.sessions.values()).find(
      session => session.candidateId === sessionData.candidateId && 
                 session.organizationId === sessionData.organizationId && 
                 session.status === 'active'
    );
    
    if (existingSession) {
      console.log(`⚠️ Candidate ${sessionData.candidateId} already has active session: ${existingSession.sessionId}`);
      
      // Send back existing session instead of creating new one
      const client = this.clients.get(clientId);
      if (client) {
        client.sessionId = existingSession.sessionId;
        client.ws.send(JSON.stringify({
          type: 'session:started',
          sessionId: existingSession.sessionId,
          data: existingSession
        }));
      }
      
      return;
    }
    
    const sessionId = randomUUID();
    const session = {
      sessionId,
      candidateId: sessionData.candidateId,
      examId: sessionData.examId,
      organizationId: sessionData.organizationId,
      status: 'active',
      startedAt: new Date(),
      score: 0,
      credibilityScore: 95,
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
        data: session
      }));
    }

    // Notify all admin clients
    this.broadcastToAdmins({
      type: 'session:new',
      data: session
    });

    console.log(`🎯 New session started: ${sessionId} for ${sessionData.candidateId}`);
  }

  updateSession(updateData, clientId) {
    const client = this.clients.get(clientId);
    if (!client?.sessionId) return;

    const session = this.sessions.get(client.sessionId);
    if (!session) return;

    // Update session data
    Object.assign(session, updateData);

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

    // Calculate final scores
    const violationPenalty = session.violations.reduce((total, v) => {
      switch (v.severity) {
        case 'critical': return total + 15;
        case 'warning': return total + 8;
        case 'info': return total + 3;
        default: return total;
      }
    }, 0);

    session.credibilityScore = Math.max(25, 95 - violationPenalty);
    
    if (session.credibilityScore < 60) session.riskLevel = 'critical';
    else if (session.credibilityScore < 80) session.riskLevel = 'high';
    else if (session.credibilityScore < 90) session.riskLevel = 'medium';
    else session.riskLevel = 'low';

    this.broadcastToAdmins({
      type: 'session:ended',
      data: session
    });

    console.log(`🏁 Session ended: ${sessionId}`);
  }

  triggerViolation(sessionId, violationData) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const violation = {
      id: randomUUID(),
      type: violationData.type,
      severity: violationData.severity || 'warning',
      timestamp: new Date().toISOString(), // Use ISO string for consistency
      description: violationData.description,
      confidence: violationData.confidence || Math.floor(Math.random() * 20 + 75),
      source: violationData.source || 'ai-proctor',
      metadata: violationData.metadata
    };

    session.violations.push(violation);

    // Update credibility score
    const penalty = violation.severity === 'critical' ? 15 : 
                   violation.severity === 'warning' ? 8 : 3;
    session.credibilityScore = Math.max(25, session.credibilityScore - penalty);
    
    // Update risk level
    if (session.credibilityScore < 60) session.riskLevel = 'critical';
    else if (session.credibilityScore < 80) session.riskLevel = 'high';
    else if (session.credibilityScore < 90) session.riskLevel = 'medium';

    console.log(`🚨 Violation triggered: ${violation.type} in session ${sessionId} | Credibility: ${session.credibilityScore}% | Source: ${violation.source}`);

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

    // Send to candidate if warranted - ALWAYS send for real-time alerts
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
          timestamp: violation.timestamp
        }
      }));
      
      if (violation.severity === 'critical') {
        candidateClient.ws.send(JSON.stringify({
          type: 'violation:warning',
          data: {
            message: 'Please ensure you follow exam guidelines',
            severity: violation.severity
          }
        }));
      }
    }

    console.log(`🚨 Violation triggered: ${violation.type} in session ${sessionId}`);
  }

  sendSessionsToAdmin(clientId) {
    const client = this.clients.get(clientId);
    if (!client || client.type !== 'admin') return;

    const sessions = Array.from(this.sessions.values()).filter(session => {
      // Super admin sees all, org admin sees only their org
      return !client.organizationId || session.organizationId === client.organizationId;
    });

    console.log(`📊 DEBUG: Admin ${clientId} requested sessions. Found ${sessions.length} sessions:`);
    sessions.forEach(session => {
      console.log(`  - Session: ${session.sessionId} | Candidate: ${session.candidateId} | Status: ${session.status} | Org: ${session.organizationId}`);
    });

    client.ws.send(JSON.stringify({
      type: 'sessions:list',
      data: sessions
    }));
  }

  broadcastToAdmins(message) {
    console.log(`📢 DEBUG: Broadcasting to ${this.clients.size} total clients:`);
    let adminCount = 0;
    this.clients.forEach(client => {
      if (client.type === 'admin') {
        adminCount++;
        try {
          console.log(`  📤 Sending to admin ${client.id}: ${message.type}`);
          client.ws.send(JSON.stringify(message));
        } catch (error) {
          console.error('❌ Error sending to admin client:', error);
        }
      }
    });
    console.log(`📢 DEBUG: Broadcasted to ${adminCount} admin clients`);
  }

  getAllSessions() {
    return Array.from(this.sessions.values());
  }
}

// Start the session manager
console.log('🚀 Starting Agentic AI Proctoring Session Manager...');

const sessionManager = new SessionManager(8080);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Gracefully shutting down session manager...');
  sessionManager.wss.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Gracefully shutting down session manager...');
  sessionManager.wss.close();
  process.exit(0);
});

console.log('✅ Session Manager is running on port 8080');
console.log('📡 WebSocket endpoint: ws://localhost:8080');
console.log('🎯 Ready to handle candidate and admin connections');
console.log('\nPress Ctrl+C to stop...');

module.exports = { SessionManager };