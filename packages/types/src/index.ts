/**
 * Core types for Agentic AI Proctoring Platform
 */

// Session Types
export interface ProctoringSession {
  id: string;
  tenantId: string;
  candidateId: string;
  examId: string;
  agentId: string;
  status: SessionStatus;
  startTime: Date;
  endTime?: Date;
  configuration: SessionConfiguration;
}

export enum SessionStatus {
  PENDING = 'pending',
  ACTIVE = 'active', 
  PAUSED = 'paused',
  COMPLETED = 'completed',
  TERMINATED = 'terminated'
}

// Agent Types
export interface ProctoringAgent {
  id: string;
  sessionId: string;
  status: AgentStatus;
  capabilities: AgentCapabilities;
  configuration: AgentConfiguration;
  lastHeartbeat: Date;
}

export enum AgentStatus {
  INITIALIZING = 'initializing',
  READY = 'ready',
  MONITORING = 'monitoring',
  PAUSED = 'paused', 
  DISCONNECTED = 'disconnected'
}

export interface AgentCapabilities {
  video: boolean;
  audio: boolean;
  screen: boolean;
  behavioral: boolean;
}

// AI Processing Types
export interface ViolationEvent {
  id: string;
  sessionId: string;
  timestamp: Date;
  type: ViolationType;
  severity: ViolationSeverity;
  confidence: number;
  metadata: Record<string, any>;
  aiProcessorId: string;
}

export enum ViolationType {
  // Visual violations
  MULTIPLE_FACES = 'multiple_faces',
  NO_FACE_DETECTED = 'no_face_detected',
  FACE_NOT_VISIBLE = 'face_not_visible',
  SUSPICIOUS_OBJECT = 'suspicious_object',
  
  // Audio violations  
  MULTIPLE_VOICES = 'multiple_voices',
  BACKGROUND_NOISE = 'background_noise',
  SUSPICIOUS_AUDIO = 'suspicious_audio',
  
  // Screen violations
  TAB_SWITCH = 'tab_switch',
  WINDOW_SWITCH = 'window_switch', 
  COPY_PASTE = 'copy_paste',
  FULLSCREEN_EXIT = 'fullscreen_exit',
  
  // Behavioral violations
  SUSPICIOUS_MOVEMENT = 'suspicious_movement',
  LOOKING_AWAY = 'looking_away',
  RAPID_TYPING = 'rapid_typing'
}

export enum ViolationSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Rule Engine Types
export interface Rule {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: RuleCondition[];
  action: RuleAction;
  weight: number;
}

export interface RuleCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in';
  value: any;
}

export interface RuleAction {
  type: 'flag' | 'warning' | 'terminate';
  message?: string;
  notifyProctor?: boolean;
}

// Configuration Types
export interface SessionConfiguration {
  rules: string[]; // Rule IDs
  aiSensitivity: AISensitivity;
  recordingEnabled: boolean;
  proctorNotifications: boolean;
  allowedResources: string[];
}

export interface AgentConfiguration {
  videoSettings: VideoSettings;
  audioSettings: AudioSettings;
  screenSettings: ScreenSettings;
  behaviorSettings: BehaviorSettings;
}

export interface VideoSettings {
  enabled: boolean;
  faceDetection: boolean;
  objectDetection: boolean;
  frameRate: number;
  resolution: string;
}

export interface AudioSettings {
  enabled: boolean;
  voiceDetection: boolean;
  noiseDetection: boolean;
  micSensitivity: number;
}

export interface ScreenSettings {
  enabled: boolean;
  tabSwitchDetection: boolean;
  copyPasteDetection: boolean;
  fullscreenRequired: boolean;
}

export interface BehaviorSettings {
  enabled: boolean;
  eyeTracking: boolean;
  movementAnalysis: boolean;
  typingPatterns: boolean;
}

export enum AISensitivity {
  LOW = 'low',
  MEDIUM = 'medium', 
  HIGH = 'high'
}

// Scoring Types
export interface SessionScore {
  sessionId: string;
  overallScore: number;
  credibilityIndex: number;
  riskLevel: RiskLevel;
  violationCounts: Record<ViolationType, number>;
  categories: ScoreCategory[];
  lastUpdated: Date;
}

export enum RiskLevel {
  VERY_LOW = 'very_low',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high'
}

export interface ScoreCategory {
  name: string;
  score: number;
  weight: number;
  violations: ViolationEvent[];
}

// Media & Streaming Types
export interface MediaStream {
  sessionId: string;
  type: 'video' | 'audio' | 'screen';
  url: string;
  quality: 'low' | 'medium' | 'high';
  isRecording: boolean;
}

// Tenant Configuration
export interface Tenant {
  id: string;
  name: string;
  configuration: TenantConfiguration;
  status: 'active' | 'suspended' | 'inactive';
  createdAt: Date;
}

export interface TenantConfiguration {
  defaultRules: string[];
  aiConfiguration: AISensitivity;
  branding: {
    logoUrl?: string;
    primaryColor?: string;
    name?: string;
  };
  integrations: {
    webhookUrl?: string;
    apiKeys?: Record<string, string>;
  };
}

// API Response Types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// SDK Types
export interface SDKConfiguration {
  apiUrl: string;
  tenantId: string;
  sessionId?: string;
  agentCapabilities?: Partial<AgentCapabilities>;
  debug?: boolean;
}