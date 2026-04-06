import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';

// Basic configuration
const config = {
  server: {
    port: process.env['PORT'] || 4001,
    host: process.env['HOST'] || '0.0.0.0'
  },
  env: process.env['NODE_ENV'] || 'development',
  cors: {
    origins: ['http://localhost:3001', 'http://localhost:3002', 'http://localhost:4000']
  },
  services: {
    apiGateway: 'http://localhost:4000',
    tenantService: 'http://localhost:3002',
    aiVision: 'http://localhost:5000',
    aiAudio: 'http://localhost:5001', 
    aiBehavior: 'http://localhost:5002',
    ruleEngine: 'http://localhost:5003',
    scoringEngine: 'http://localhost:5004'
  }
};

// Basic logger
const logger = {
  info: (msg: string, meta?: any) => console.log(`[CONTROL-PLANE] ${msg}`, meta || ''),
  error: (msg: string, error?: any) => console.error(`[CONTROL-PLANE] ERROR: ${msg}`, error || ''),
  warn: (msg: string, meta?: any) => console.warn(`[CONTROL-PLANE] WARN: ${msg}`, meta || ''),
  debug: (msg: string, meta?: any) => console.debug(`[CONTROL-PLANE] DEBUG: ${msg}`, meta || '')
};

const app = express() as Application;
const server = createServer(app);

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", 'wss:', 'ws:', 'https:'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: config.cors.origins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Requested-With'],
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req: Request, res: Response, next) => {
  const start = Date.now();
  logger.info(`${req.method} ${req.path}`, { ip: req.ip });
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  
  next();
});

// Session storage (in-memory for demo)
const sessions: Map<string, any> = new Map();
const activeAgents: Map<string, any> = new Map();

// Basic auth middleware
const basicAuth = (req: Request, res: Response, next: any) => {
  const apiKey = req.header('X-API-Key');
  const authHeader = req.header('Authorization');
  
  if (apiKey || authHeader) {
    (req as any).user = {
      id: 'demo-user-123',
      orgId: '554be9e2-7918-4c1f-8d5b-ad2a3a2abd94',
      role: 'admin'
    };
    next();
  } else {
    res.status(401).json({ error: 'Authentication required' });
  }
};

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  const servicesHealth = {
    apiGateway: 'unknown',
    tenantService: 'unknown', 
    aiVision: 'unknown',
    aiAudio: 'unknown',
    aiBehavior: 'unknown',
    ruleEngine: 'unknown',
    scoringEngine: 'unknown'
  };
  
  res.json({
    service: 'Ayan.ai Control Plane',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: config.env,
    activeSessionsCount: sessions.size,
    activeAgentsCount: activeAgents.size,
    servicesHealth,
    checks: {
      server: 'ok',
      memory: process.memoryUsage(),
      uptime: process.uptime()
    }
  });
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'Ayan.ai Control Plane',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: config.env,
    description: 'Central orchestration service for AI proctoring sessions',
    capabilities: [
      'Session lifecycle management',
      'AI agent coordination',
      'Real-time monitoring orchestration',
      'Service health monitoring',
      'Event distribution'
    ],
    endpoints: {
      sessions: 'POST /api/v1/sessions - Create proctoring session',
      sessionControl: 'POST /api/v1/sessions/:sessionId/control - Control session',
      agents: 'GET /api/v1/agents - List active agents',
      events: 'GET /api/v1/events/:sessionId - Session event stream'
    }
  });
});

// Create and orchestrate a new proctoring session
app.post('/api/v1/sessions', basicAuth, async (req: Request, res: Response) => {
  const { candidateId, examId, organizationId, examConfig } = req.body;
  const user = (req as any).user;
  
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  logger.info('Creating new proctoring session', { sessionId, candidateId, examId, orgId: user.orgId });
  
  // Mock session configuration based on organization
  const sessionConfig = {
    aiServices: {
      vision: { 
        enabled: true,
        features: ['face_detection', 'eye_tracking', 'head_pose', 'multiple_person_detection'],
        sensitivity: 'medium',
        alerts: ['face_not_detected', 'multiple_faces', 'looking_away_extended']
      },
      audio: {
        enabled: true, 
        features: ['background_noise', 'multiple_voices', 'suspicious_sounds'], 
        sensitivity: 'medium',
        alerts: ['loud_background_noise', 'multiple_voices_detected', 'suspicious_audio']
      },
      behavior: {
        enabled: true,
        features: ['typing_pattern', 'screen_interaction', 'tab_switching'],
        sensitivity: 'medium', 
        alerts: ['unusual_typing', 'excessive_tab_switches', 'copy_paste_detected']
      }
    },
    rules: {
      autoTerminate: false,
      maxViolations: 5,
      warningThreshold: 3,
      recordingRequired: true,
      identityVerification: true
    },
    notifications: {
      realTime: true,
      webhookUrl: null,
      emailAlerts: true
    }
  };
  
  // Create session record
  const session = {
    sessionId,
    candidateId,
    examId,
    organizationId: user.orgId,
    status: 'initializing',
    createdAt: new Date().toISOString(),
    startedAt: null,
    endedAt: null,
    config: sessionConfig,
    aiAgents: {
      vision: { status: 'pending', agentId: null, lastUpdate: null },
      audio: { status: 'pending', agentId: null, lastUpdate: null },
      behavior: { status: 'pending', agentId: null, lastUpdate: null }
    },
    violations: [],
    events: [],
    score: {
      current: 100,
      credibilityIndex: 1.0,
      riskLevel: 'none',
      factors: {}
    },
    recordingInfo: {
      status: 'pending',
      recordingId: null,
      segments: []
    }
  };
  
  sessions.set(sessionId, session);
  
  // Simulate AI agent deployment
  setTimeout(() => {
    logger.info('Deploying AI agents for session', { sessionId });
    
    // Mock agent deployment
    const agents = ['vision', 'audio', 'behavior'];
    agents.forEach(agentType => {
      const agentId = `${agentType}_agent_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      
      session.aiAgents[agentType] = {
        status: 'active',
        agentId,
        lastUpdate: new Date().toISOString(),
        healthScore: 0.95 + Math.random() * 0.05,
        processedEvents: 0
      };
      
      activeAgents.set(agentId, {
        agentId,
        type: agentType,
        sessionId,
        status: 'active',
        startedAt: new Date().toISOString(),
        metrics: {
          eventsProcessed: 0,
          averageProcessingTime: 45 + Math.random() * 30, // ms
          successRate: 0.98 + Math.random() * 0.02
        }
      });
      
      logger.info(`AI agent deployed: ${agentType}`, { sessionId, agentId });
    });
    
    session.status = 'active';
    session.startedAt = new Date().toISOString();
    
    // Simulate some initial events
    session.events.push({
      timestamp: new Date().toISOString(),
      type: 'session_started',
      severity: 'info',
      source: 'control_plane',
      message: 'Proctoring session initialized successfully'
    });
    
    session.events.push({
      timestamp: new Date().toISOString(),
      type: 'ai_agents_deployed',
      severity: 'success', 
      source: 'control_plane',
      message: 'All AI monitoring agents are active and ready'
    });
    
    logger.info('Session fully initialized', { sessionId, agentCount: agents.length });
  }, 2000); // 2 second delay to simulate deployment
  
  res.json({
    success: true,
    sessionId,
    session: {
      sessionId,
      status: session.status,
      candidateId,
      examId,
      organizationId: user.orgId,
      config: sessionConfig,
      createdAt: session.createdAt,
      estimatedDeploymentTime: '2-3 seconds'
    },
    message: 'Proctoring session is being initialized. AI agents will be deployed shortly.'
  });
});

// Get session status and details
app.get('/api/v1/sessions/:sessionId', basicAuth, (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const session = sessions.get(sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found', sessionId });
  }
  
  // Calculate real-time metrics
  const currentTime = new Date();
  const startTime = session.startedAt ? new Date(session.startedAt) : currentTime;
  const durationMs = currentTime.getTime() - startTime.getTime();
  
  // Simulate ongoing monitoring with mock violations
  if (session.status === 'active' && session.violations.length === 0) {
    // Add some mock violations for demo
    const mockViolations = [
      {
        id: `v_${Date.now()}_1`,
        type: 'background_noise',
        severity: 'warning',
        timestamp: new Date(Date.now() - 120000).toISOString(), // 2 minutes ago
        source: 'ai_audio',
        description: 'Elevated background noise detected',
        confidence: 0.78,
        resolved: true,
        autoResolved: true,
        duration: 8000 // ms
      },
      {
        id: `v_${Date.now()}_2`,
        type: 'tab_focus_lost',
        severity: 'info',
        timestamp: new Date(Date.now() - 60000).toISOString(), // 1 minute ago 
        source: 'ai_behavior',
        description: 'Browser tab lost focus for 4 seconds',
        confidence: 1.0,
        resolved: true,
        autoResolved: false,
        duration: 4000 // ms
      }
    ];
    
    session.violations = mockViolations;
    
    // Update score based on violations
    const warningCount = mockViolations.filter(v => v.severity === 'warning').length;
    const infoCount = mockViolations.filter(v => v.severity === 'info').length;
    
    session.score.current = Math.max(70, 100 - (warningCount * 5) - (infoCount * 2));
    session.score.credibilityIndex = Math.max(0.7, 1.0 - (warningCount * 0.1) - (infoCount * 0.05));
    session.score.riskLevel = session.score.current > 85 ? 'low' : session.score.current > 70 ? 'medium' : 'high';
  }
  
  const response = {
    ...session,
    duration: Math.floor(durationMs / 1000), // seconds
    realTimeMetrics: {
      aiAgentsHealth: Object.keys(session.aiAgents).map(type => ({
        type,
        status: session.aiAgents[type].status,
        healthScore: session.aiAgents[type].healthScore || 0,
        lastUpdate: session.aiAgents[type].lastUpdate
      })),
      eventProcessingRate: Math.floor(Math.random() * 50) + 20, // events per minute
      memoryUsage: Math.floor(Math.random() * 200) + 100, // MB
      cpuUsage: Math.floor(Math.random() * 30) + 10 // %
    }
  };
  
  res.json({
    success: true,
    session: response
  });
});

// Session control operations
app.post('/api/v1/sessions/:sessionId/control', basicAuth, (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { action, reason } = req.body;
  const session = sessions.get(sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found', sessionId });
  }
  
  logger.info('Session control action', { sessionId, action, reason });
  
  switch (action) {
    case 'pause':
      session.status = 'paused';
      session.events.push({
        timestamp: new Date().toISOString(),
        type: 'session_paused',
        severity: 'warning',
        source: 'control_plane',
        message: `Session paused: ${reason || 'Manual pause'}`
      });
      break;
      
    case 'resume':
      session.status = 'active';
      session.events.push({
        timestamp: new Date().toISOString(),
        type: 'session_resumed',
        severity: 'info',
        source: 'control_plane',
        message: 'Session resumed'
      });
      break;
      
    case 'terminate':
      session.status = 'terminated';
      session.endedAt = new Date().toISOString();
      
      // Clean up agents
      Object.values(session.aiAgents).forEach(agent => {
        if (agent.agentId) {
          activeAgents.delete(agent.agentId);
        }
      });
      
      session.events.push({
        timestamp: new Date().toISOString(),
        type: 'session_terminated',
        severity: 'error',
        source: 'control_plane',
        message: `Session terminated: ${reason || 'Manual termination'}`
      });
      break;
      
    case 'complete':
      session.status = 'completed';
      session.endedAt = new Date().toISOString();
      
      // Clean up agents
      Object.values(session.aiAgents).forEach(agent => {
        if (agent.agentId) {
          activeAgents.delete(agent.agentId);
        }
      });
      
      session.events.push({
        timestamp: new Date().toISOString(),
        type: 'session_completed',
        severity: 'success',
        source: 'control_plane',
        message: 'Session completed successfully'
      });
      break;
      
    default:
      return res.status(400).json({ 
        error: 'Invalid action', 
        validActions: ['pause', 'resume', 'terminate', 'complete'] 
      });
  }
  
  res.json({
    success: true,
    sessionId,
    action,
    newStatus: session.status,
    timestamp: new Date().toISOString(),
    message: `Session ${action} operation completed successfully`
  });
});

// Get active agents
app.get('/api/v1/agents', basicAuth, (req: Request, res: Response) => {
  const agentsList = Array.from(activeAgents.values());
  
  const summary = {
    totalAgents: agentsList.length,
    byType: {
      vision: agentsList.filter(a => a.type === 'vision').length,
      audio: agentsList.filter(a => a.type === 'audio').length,
      behavior: agentsList.filter(a => a.type === 'behavior').length
    },
    byStatus: {
      active: agentsList.filter(a => a.status === 'active').length,
      idle: agentsList.filter(a => a.status === 'idle').length,
      error: agentsList.filter(a => a.status === 'error').length
    }
  };
  
  res.json({
    success: true,
    summary,
    agents: agentsList
  });
});

// Get session events stream
app.get('/api/v1/events/:sessionId', basicAuth, (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { since, limit = 50 } = req.query;
  
  const session = sessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found', sessionId });
  }
  
  let events = [...session.events];
  
  // Filter by timestamp if 'since' is provided
  if (since) {
    const sinceDate = new Date(since as string);
    events = events.filter(e => new Date(e.timestamp) > sinceDate);
  }
  
  // Limit results
  events = events.slice(0, parseInt(limit as string));
  
  res.json({
    success: true,
    sessionId,
    eventCount: events.length,
    events: events.reverse() // Most recent first
  });
});

// List all sessions
app.get('/api/v1/sessions', basicAuth, (req: Request, res: Response) => {
  const { status, limit = 20 } = req.query;
  
  let sessionsList = Array.from(sessions.values());
  
  // Filter by status if provided
  if (status) {
    sessionsList = sessionsList.filter(s => s.status === status);
  }
  
  // Limit results
  sessionsList = sessionsList.slice(0, parseInt(limit as string));
  
  const summary = {
    totalSessions: sessions.size,
    byStatus: {
      active: Array.from(sessions.values()).filter(s => s.status === 'active').length,
      paused: Array.from(sessions.values()).filter(s => s.status === 'paused').length,
      completed: Array.from(sessions.values()).filter(s => s.status === 'completed').length,
      terminated: Array.from(sessions.values()).filter(s => s.status === 'terminated').length
    }
  };
  
  res.json({
    success: true,
    summary,
    sessions: sessionsList.map(s => ({
      sessionId: s.sessionId,
      candidateId: s.candidateId, 
      examId: s.examId,
      status: s.status,
      createdAt: s.createdAt,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      violationCount: s.violations.length,
      score: s.score.current
    }))
  });
});

// Error handling middleware
app.use((error: Error, req: Request, res: Response, next: any) => {
  logger.error('Unhandled error', error);
  
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    message: config.env === 'development' ? error.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Route not found',
    code: 'ROUTE_NOT_FOUND', 
    path: req.originalUrl,
    method: req.method,
    availableRoutes: [
      'GET /health',
      'GET /',
      'POST /api/v1/sessions',
      'GET /api/v1/sessions',
      'GET /api/v1/sessions/:sessionId',
      'POST /api/v1/sessions/:sessionId/control',
      'GET /api/v1/agents',
      'GET /api/v1/events/:sessionId'
    ]
  });
});

// Start server
const PORT = config.server.port;

server.listen(PORT, () => {
  logger.info(`Control Plane server started`, {
    port: PORT,
    environment: config.env,
    nodeVersion: process.version,
    processId: process.pid,
    timestamp: new Date().toISOString(),
    endpoints: [
      `Health: http://localhost:${PORT}/health`,
      `Sessions: http://localhost:${PORT}/api/v1/sessions`,
      `Agents: http://localhost:${PORT}/api/v1/agents`
    ]
  });
});

export { app, server };
