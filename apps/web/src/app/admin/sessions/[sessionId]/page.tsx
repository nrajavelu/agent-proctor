'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Shield, Eye, Mic, Brain, AlertTriangle,
  Clock, Activity, Camera, Download,
  Volume2, Monitor, BarChart3, TrendingUp, Play
} from 'lucide-react';

interface SessionDetail {
  sessionId: string;
  shortId?: string;
  candidateId: string;
  examId: string;
  organizationId: string;
  status: string;
  score: {
    current: number;
    credibilityIndex: number;
    riskLevel: string;
  };
  violations: Array<{
    id: string;
    type: string;
    severity: string;
    timestamp: string;
    description: string;
    confidence: number;
    resolved: boolean;
    source: string;
    evidence?: {
      type: string;
      format: string;
      data?: any;
      durationMs?: number;
      capturedAt?: string;
      expired?: boolean;
      truncated?: boolean;
      originalSizeKB?: number;
      storageMode?: string;
      storagePath?: string;
    } | null;
  }>;
  aiAgents: {
    vision: { status: string; healthScore: number };
    audio: { status: string; healthScore: number };
    behavior: { status: string; healthScore: number };
  };
  duration: number;
  createdAt: string;
}

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params?.sessionId as string;
  
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'evidence' | 'scoring' | 'behavior' | 'playback' | 'export'>('overview');

  useEffect(() => {
    if (sessionId) {
      fetchSessionDetail();
      // Auto-refresh every 5 seconds for live sessions
      const interval = setInterval(fetchSessionDetail, 5000);
      return () => clearInterval(interval);
    }
  }, [sessionId]);

  const fetchSessionDetail = async () => {
    try {
      console.log(`🔍 Fetching session detail for: ${sessionId}`);
      
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.session) {
          const sessionData = data.session;
          const transformedSession: SessionDetail = {
            sessionId: sessionData.sessionId,
            shortId: sessionData.shortId,
            candidateId: sessionData.candidateId || sessionData.candidateName || 'Unknown',
            examId: sessionData.examId,
            organizationId: sessionData.organizationId,
            status: sessionData.status || (sessionData.completedAt ? 'completed' : 'active'),
            score: {
              current: sessionData.score || 0,
              credibilityIndex: sessionData.credibilityScore || 95,
              riskLevel: sessionData.riskLevel || 'low'
            },
            violations: sessionData.violations?.map((v: any, index: number) => ({
              id: `violation-${index}`,
              type: v.type || 'unknown',
              severity: v.severity || 'warning',
              timestamp: v.timestamp || sessionData.startedAt,
              description: v.description || v.message || 'Unknown violation',
              confidence: v.confidence || 85,
              resolved: v.resolved || false,
              source: v.source || 'proctor-system',
              evidence: v.evidence || null
            })) || [],
            aiAgents: {
              vision: { status: 'active', healthScore: 95 },
              audio: { status: 'active', healthScore: 92 },
              behavior: { status: 'active', healthScore: 98 }
            },
            duration: sessionData.duration || 0,
            createdAt: sessionData.startedAt || sessionData.createdAt || new Date().toISOString()
          };
          
          setSession(transformedSession);
          console.log('✅ Session detail loaded successfully');
        }
      }
    } catch (error) {
      console.error('❌ Failed to fetch session detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return hours > 0 ? `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}` : `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getViolationIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'face_not_detected': case 'multiple_faces': return Camera;
      case 'background_noise': case 'multiple_voices': return Volume2;
      case 'tab_focus_lost': case 'browser_switch': return Monitor;
      default: return AlertTriangle;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'info': return 'text-blue-400 bg-blue-400/10';
      case 'warning': return 'text-yellow-400 bg-yellow-400/10';
      case 'critical': return 'text-red-400 bg-red-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-400 mt-2">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <p className="text-white text-lg">Session not found</p>
          <p className="text-gray-400">The requested session could not be loaded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-950">
      <header className="border-b border-white/10 bg-navy-900/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <div>
                <h1 className="text-xl font-bold text-white">Session Detail</h1>
                <p className="text-gray-400 text-sm font-mono">{(session as any)?.shortId || sessionId.slice(-12)}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {session.status === 'active' ? (
                  <>
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="px-3 py-1 rounded-full text-xs font-medium text-green-400 bg-green-400/10 border border-green-400/20">
                      🔴 LIVE SESSION
                    </span>
                  </>
                ) : session.status === 'completed' ? (
                  <>
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span className="px-3 py-1 rounded-full text-xs font-medium text-blue-400 bg-blue-400/10 border border-blue-400/20">
                      ✅ COMPLETED
                    </span>
                  </>
                ) : session.status === 'abandoned' ? (
                  <span className="px-3 py-1 rounded-full text-xs font-medium text-gray-400 bg-gray-400/10 border border-gray-400/20">
                    ⚪ ABANDONED
                  </span>
                ) : session.status.startsWith('idle-') ? (
                  <>
                    <div className={`w-2 h-2 rounded-full ${session.status === 'idle-red' ? 'bg-red-400' : session.status === 'idle-amber' ? 'bg-orange-400' : 'bg-yellow-400'}`}></div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                      session.status === 'idle-red' ? 'text-red-400 bg-red-400/10 border-red-400/20' :
                      session.status === 'idle-amber' ? 'text-orange-400 bg-orange-400/10 border-orange-400/20' :
                      'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
                    }`}>
                      ⏸ IDLE {session.status === 'idle-red' ? '(15m+)' : session.status === 'idle-amber' ? '(10m)' : '(5m)'}
                    </span>
                  </>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-medium text-gray-400 bg-gray-400/10">
                    {session.status.toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="mb-8">
          <div className="border-b border-white/10">
            <nav className="flex space-x-8">
              {[
                { id: 'overview', label: 'Overview', icon: Shield },
                { id: 'timeline', label: 'Timeline', icon: Clock },
                { id: 'evidence', label: 'Evidence', icon: Camera },
                { id: 'scoring', label: 'Scoring', icon: BarChart3 },
                { id: 'behavior', label: 'Behavior AI', icon: Brain },
                { id: 'playback', label: 'Playback', icon: Play },
                { id: 'export', label: 'Export', icon: Download }
              ].map((tab) => {
                const IconComponent = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-1 py-4 text-sm font-medium transition-colors ${
                      isActive 
                        ? 'text-cyan-400 border-b-2 border-cyan-400' 
                        : 'text-gray-400 hover:text-white border-b-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <IconComponent className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {activeTab === 'overview' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-navy-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Shield className="w-5 h-5 text-cyan-400" />
                  <span className="text-gray-400">Credibility Score</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-white">{session.score.credibilityIndex}%</span>
                  <span className={`text-sm px-2 py-1 rounded ${
                    session.score.riskLevel === 'low' ? 'text-green-400 bg-green-400/10' : 'text-yellow-400 bg-yellow-400/10'
                  }`}>
                    {session.score.riskLevel}
                  </span>
                </div>
              </div>

              <div className="bg-navy-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  <span className="text-gray-400">Violations</span>
                </div>
                <span className="text-2xl font-bold text-white">{session.violations.length}</span>
              </div>

              <div className="bg-navy-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="w-5 h-5 text-blue-400" />
                  <span className="text-gray-400">Duration</span>
                </div>
                <span className="text-2xl font-bold text-white">{formatDuration(session.duration)}</span>
              </div>

              <div className="bg-navy-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Activity className="w-5 h-5 text-green-400" />
                  <span className="text-gray-400">AI Health</span>
                </div>
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <Eye className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-white">{Math.round(session.aiAgents.vision.healthScore)}%</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <Mic className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-white">{Math.round(session.aiAgents.audio.healthScore)}%</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <Brain className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-white">{Math.round(session.aiAgents.behavior.healthScore)}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-navy-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <AlertTriangle className="w-6 h-6 text-yellow-400" />
                <h3 className="text-lg font-semibold text-white">Detected Violations</h3>
              </div>

              {session.violations.length > 0 ? (
                <div className="space-y-4">
                  {session.violations.map((violation) => {
                    const IconComponent = getViolationIcon(violation.type);
                    return (
                      <div
                        key={violation.id}
                        className="flex items-center gap-4 p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <div className="flex-shrink-0">
                          <IconComponent className="w-5 h-5 text-yellow-400" />
                        </div>
                        <div className="flex-grow">
                          <div className="text-white font-medium">{violation.description}</div>
                          <div className="text-gray-400 text-sm">{violation.type.replace(/_/g, ' ')} • {formatTimestamp(violation.timestamp)}</div>
                        </div>
                        <div className="flex-shrink-0">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(violation.severity)}`}>
                            {violation.severity}
                          </span>
                        </div>
                        <div className="flex-shrink-0 text-gray-400 text-sm">
                          {violation.confidence}% confidence
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <TrendingUp className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No violations detected in this session</p>
                  <p className="text-gray-500 text-sm">This indicates excellent candidate behavior</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="bg-navy-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Clock className="w-6 h-6 text-cyan-400" />
              <h3 className="text-lg font-semibold text-white">Session Timeline</h3>
            </div>
            {session.violations.length > 0 ? (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-white/10"></div>
                <div className="space-y-6">
                  {/* Session start event */}
                  <div className="flex items-start gap-4 relative">
                    <div className="w-8 h-8 rounded-full bg-green-400/20 border border-green-400/40 flex items-center justify-center flex-shrink-0 z-10">
                      <Activity className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <div className="text-white font-medium">Session Started</div>
                      <div className="text-gray-400 text-sm">{formatTimestamp(session.createdAt)}</div>
                      <div className="text-gray-500 text-xs mt-1">Candidate: {session.candidateId} | Exam: {session.examId}</div>
                    </div>
                  </div>
                  {/* Violations in chronological order for timeline */}
                  {[...session.violations].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()).map((v, i) => (
                    <div key={v.id || i} className="flex items-start gap-4 relative">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                        v.severity === 'critical' ? 'bg-red-400/20 border border-red-400/40' :
                        v.severity === 'warning' ? 'bg-yellow-400/20 border border-yellow-400/40' :
                        'bg-blue-400/20 border border-blue-400/40'
                      }`}>
                        <AlertTriangle className={`w-4 h-4 ${
                          v.severity === 'critical' ? 'text-red-400' :
                          v.severity === 'warning' ? 'text-yellow-400' : 'text-blue-400'
                        }`} />
                      </div>
                      <div className="flex-grow">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{v.description}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            v.severity === 'critical' ? 'text-red-400 bg-red-400/10' :
                            v.severity === 'warning' ? 'text-yellow-400 bg-yellow-400/10' :
                            'text-blue-400 bg-blue-400/10'
                          }`}>{v.severity}</span>
                        </div>
                        <div className="text-gray-400 text-sm">{formatTimestamp(v.timestamp)}</div>
                        <div className="text-gray-500 text-xs mt-1">Source: {v.source} | Confidence: {v.confidence}%</div>
                      </div>
                    </div>
                  ))}
                  {/* Session end event if completed */}
                  {session.status === 'completed' && (
                    <div className="flex items-start gap-4 relative">
                      <div className="w-8 h-8 rounded-full bg-blue-400/20 border border-blue-400/40 flex items-center justify-center flex-shrink-0 z-10">
                        <Shield className="w-4 h-4 text-blue-400" />
                      </div>
                      <div>
                        <div className="text-white font-medium">Session Completed</div>
                        <div className="text-gray-400 text-sm">Final Credibility: {session.score.credibilityIndex}%</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">No events recorded yet</div>
            )}
          </div>
        )}

        {activeTab === 'evidence' && (
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="bg-navy-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <Camera className="w-6 h-6 text-cyan-400" />
                <h3 className="text-lg font-semibold text-white">Evidence Summary</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-gray-400 text-sm mb-1">Browser Violations</div>
                  <div className="text-white text-2xl font-bold">
                    {session.violations.filter((v: any) => v.source === 'browser-monitor').length}
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-gray-400 text-sm mb-1">Vision AI Alerts</div>
                  <div className="text-white text-2xl font-bold">
                    {session.violations.filter((v: any) => v.source === 'ai-vision').length}
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-gray-400 text-sm mb-1">Audio AI Alerts</div>
                  <div className="text-white text-2xl font-bold">
                    {session.violations.filter((v: any) => v.source === 'ai-audio').length}
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-gray-400 text-sm mb-1">With Evidence</div>
                  <div className="text-cyan-400 text-2xl font-bold">
                    {session.violations.filter((v: any) => v.evidence && !v.evidence.expired).length}
                  </div>
                </div>
              </div>

              {/* Violation breakdown */}
              <div className="space-y-3 mb-6">
                <h4 className="text-white font-medium">Violation Breakdown by Type</h4>
                {Object.entries(
                  session.violations.reduce((acc: Record<string, number>, v: any) => {
                    acc[v.type] = (acc[v.type] || 0) + 1;
                    return acc;
                  }, {})
                ).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                  <div key={type} className="flex items-center gap-3">
                    <div className="flex-grow">
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-300 text-sm">{type.replace(/_/g, ' ')}</span>
                        <span className="text-gray-400 text-sm">{count as number}</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-400 rounded-full" style={{width: `${Math.min(100, ((count as number) / session.violations.length) * 100)}%`}}></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Evidence items */}
            <div className="bg-navy-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Evidence Attachments</h3>
              <div className="space-y-4">
                {session.violations.filter((v: any) => v.evidence && !v.evidence.expired).length === 0 ? (
                  <div className="text-center py-8">
                    <Camera className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-400">No evidence captured for this session</p>
                    <p className="text-gray-500 text-xs mt-1">Evidence capture may be disabled or data may have expired per retention policy</p>
                  </div>
                ) : (
                  session.violations
                    .filter((v: any) => v.evidence && !v.evidence.expired)
                    .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .map((v: any, idx: number) => (
                      <div key={idx} className="bg-white/5 rounded-lg p-4 border border-white/5">
                        <div className="flex items-start gap-4">
                          {/* Evidence content */}
                          <div className="flex-shrink-0 w-48">
                            {v.evidence.type === 'webcam_frame' && v.evidence.data ? (
                              <div>
                                <img
                                  src={v.evidence.data}
                                  alt="Webcam capture"
                                  className="w-full rounded border border-white/10"
                                />
                                <div className="text-xs text-gray-500 mt-1 text-center">Webcam Frame</div>
                              </div>
                            ) : v.evidence.type === 'audio_clip' && v.evidence.data ? (
                              <div>
                                <audio controls className="w-full" style={{height: '36px'}}>
                                  <source src={v.evidence.data} type="audio/webm" />
                                </audio>
                                <div className="text-xs text-gray-500 mt-1 text-center">
                                  Audio Clip ({Math.round((v.evidence.durationMs || 0) / 1000)}s)
                                </div>
                              </div>
                            ) : v.evidence.type === 'screenshot_metadata' && v.evidence.data ? (
                              <div className="bg-navy-800 rounded p-2 text-xs font-mono">
                                <div className="text-cyan-400 mb-1">📸 Page State</div>
                                <div className="text-gray-300">Page: {v.evidence.data.page || '-'}</div>
                                <div className="text-gray-300">URL: {v.evidence.data.url || '-'}</div>
                                <div className="text-gray-300">Visible: {v.evidence.data.visibility || '-'}</div>
                                <div className="text-gray-300">FS: {String(v.evidence.data.fullscreen)}</div>
                                <div className="text-gray-300">VP: {v.evidence.data.viewport || '-'}</div>
                              </div>
                            ) : v.evidence.type === 'screenshot' && v.evidence.data ? (
                              <div>
                                <img
                                  src={v.evidence.data}
                                  alt="Screenshot capture"
                                  className="w-full rounded border border-white/10"
                                />
                                <div className="text-xs text-gray-500 mt-1 text-center">Screenshot</div>
                              </div>
                            ) : v.evidence.truncated ? (
                              <div className="bg-yellow-400/10 rounded p-3 text-xs">
                                <div className="text-yellow-400">⚠ Evidence truncated</div>
                                <div className="text-gray-400 mt-1">Original: {v.evidence.originalSizeKB}KB (exceeded limit)</div>
                              </div>
                            ) : (
                              <div className="bg-white/5 rounded p-3 text-xs text-gray-500">
                                {v.evidence.storageMode === 'minio' ? (
                                  <div>
                                    <div className="text-purple-400">📁 Stored in MinIO</div>
                                    <div className="mt-1">{v.evidence.storagePath}</div>
                                  </div>
                                ) : (
                                  <div>No preview available</div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Violation details */}
                          <div className="flex-grow">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                v.severity === 'critical' ? 'bg-red-400/10 text-red-400' :
                                v.severity === 'warning' ? 'bg-yellow-400/10 text-yellow-400' :
                                'bg-blue-400/10 text-blue-400'
                              }`}>{v.severity}</span>
                              <span className="text-xs text-gray-500 px-2 py-0.5 bg-white/5 rounded">{v.source}</span>
                            </div>
                            <div className="text-white font-medium text-sm">{v.description}</div>
                            <div className="text-gray-500 text-xs mt-1">
                              {v.type.replace(/_/g, ' ')} • {new Date(v.timestamp).toLocaleTimeString()} • {v.confidence}% confidence
                            </div>
                            {v.evidence.capturedAt && (
                              <div className="text-gray-600 text-xs mt-0.5">
                                Evidence captured: {new Date(v.evidence.capturedAt).toLocaleTimeString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'scoring' && (
          <div className="space-y-6">
            <div className="bg-navy-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <BarChart3 className="w-6 h-6 text-cyan-400" />
                <h3 className="text-lg font-semibold text-white">Credibility Scoring Breakdown</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-center mb-6">
                    <div className={`text-6xl font-bold ${
                      session.score.credibilityIndex >= 80 ? 'text-green-400' :
                      session.score.credibilityIndex >= 60 ? 'text-yellow-400' :
                      session.score.credibilityIndex >= 40 ? 'text-orange-400' : 'text-red-400'
                    }`}>{session.score.credibilityIndex}%</div>
                    <div className="text-gray-400 mt-2">Overall Credibility</div>
                    <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-2 ${
                      session.score.riskLevel === 'low' ? 'bg-green-400/10 text-green-400' :
                      session.score.riskLevel === 'medium' ? 'bg-yellow-400/10 text-yellow-400' :
                      session.score.riskLevel === 'high' ? 'bg-orange-400/10 text-orange-400' :
                      'bg-red-400/10 text-red-400'
                    }`}>{session.score.riskLevel} risk</div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="text-white font-medium">Penalty Breakdown</h4>
                  {(() => {
                    const criticals = session.violations.filter(v => v.severity === 'critical').length;
                    const warnings = session.violations.filter(v => v.severity === 'warning').length;
                    const infos = session.violations.filter(v => v.severity === 'info').length;
                    return (
                      <>
                        <div className="flex justify-between items-center bg-white/5 rounded-lg p-3">
                          <span className="text-red-400">Critical Violations</span>
                          <span className="text-white font-bold">{criticals} × 15 = -{criticals * 15} pts</span>
                        </div>
                        <div className="flex justify-between items-center bg-white/5 rounded-lg p-3">
                          <span className="text-yellow-400">Warnings</span>
                          <span className="text-white font-bold">{warnings} × 5 = -{warnings * 5} pts</span>
                        </div>
                        <div className="flex justify-between items-center bg-white/5 rounded-lg p-3">
                          <span className="text-blue-400">Info Events</span>
                          <span className="text-white font-bold">{infos} × 2 = -{infos * 2} pts</span>
                        </div>
                        <div className="flex justify-between items-center bg-cyan-400/10 rounded-lg p-3 border border-cyan-400/20">
                          <span className="text-cyan-400 font-medium">Total Penalty</span>
                          <span className="text-white font-bold">-{criticals * 15 + warnings * 5 + infos * 2} pts</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'behavior' && (
          <div className="space-y-6">
            <div className="bg-navy-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <Brain className="w-6 h-6 text-cyan-400" />
                <h3 className="text-lg font-semibold text-white">Behavior AI Analysis</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white/5 rounded-lg p-4 text-center">
                  <Eye className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                  <div className="text-white font-bold text-lg">{session.aiAgents.vision.healthScore}%</div>
                  <div className="text-gray-400 text-sm">Vision AI Health</div>
                  <div className={`text-xs mt-1 ${session.aiAgents.vision.healthScore > 90 ? 'text-green-400' : 'text-yellow-400'}`}>
                    {session.aiAgents.vision.status}
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-4 text-center">
                  <Mic className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                  <div className="text-white font-bold text-lg">{session.aiAgents.audio.healthScore}%</div>
                  <div className="text-gray-400 text-sm">Audio AI Health</div>
                  <div className={`text-xs mt-1 ${session.aiAgents.audio.healthScore > 90 ? 'text-green-400' : 'text-yellow-400'}`}>
                    {session.aiAgents.audio.status}
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-4 text-center">
                  <Brain className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                  <div className="text-white font-bold text-lg">{session.aiAgents.behavior.healthScore}%</div>
                  <div className="text-gray-400 text-sm">Behavior AI Health</div>
                  <div className={`text-xs mt-1 ${session.aiAgents.behavior.healthScore > 90 ? 'text-green-400' : 'text-yellow-400'}`}>
                    {session.aiAgents.behavior.status}
                  </div>
                </div>
              </div>

              <h4 className="text-white font-medium mb-4">AI-Detected Events</h4>
              {(() => {
                const aiViolations = session.violations.filter(v =>
                  v.source === 'ai-vision' || v.source === 'ai-audio' || v.source === 'ai-behavior'
                );
                if (aiViolations.length === 0) return (
                  <div className="text-center py-8 text-gray-400">No AI-specific events detected</div>
                );
                return (
                  <div className="space-y-3">
                    {aiViolations.map((v, i) => {
                      const IconC = v.source === 'ai-vision' ? Eye : v.source === 'ai-audio' ? Mic : Brain;
                      return (
                        <div key={v.id || i} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                          <IconC className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                          <div className="flex-grow">
                            <div className="text-white text-sm">{v.description}</div>
                            <div className="text-gray-500 text-xs">{v.source} | {formatTimestamp(v.timestamp)} | {v.confidence}% conf.</div>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-xs ${getSeverityColor(v.severity)}`}>{v.severity}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {activeTab === 'playback' && (
          <div className="bg-navy-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Play className="w-6 h-6 text-cyan-400" />
              <h3 className="text-lg font-semibold text-white">Session Playback</h3>
            </div>
            <div className="mb-6">
              <div className="bg-white/5 rounded-lg p-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Session Duration</span>
                  <span className="text-white">{formatDuration(session.duration)}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Total Events</span>
                  <span className="text-white">{session.violations.length}</span>
                </div>
              </div>
            </div>
            {/* Violation timeline bar */}
            <div className="mb-6">
              <h4 className="text-white font-medium mb-3">Violation Distribution</h4>
              <div className="relative h-12 bg-white/5 rounded-lg overflow-hidden">
                {session.duration > 0 && session.violations.map((v, i) => {
                  const startTime = new Date(session.createdAt).getTime();
                  const vTime = new Date(v.timestamp).getTime();
                  const pct = Math.min(100, Math.max(0, ((vTime - startTime) / (session.duration * 1000)) * 100));
                  return (
                    <div key={i} className={`absolute top-0 h-full w-0.5 ${
                      v.severity === 'critical' ? 'bg-red-400' : v.severity === 'warning' ? 'bg-yellow-400' : 'bg-blue-400'
                    }`} style={{left: `${pct}%`}} title={v.description}></div>
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Start</span>
                <span>End</span>
              </div>
            </div>
            {/* Event log */}
            <h4 className="text-white font-medium mb-3">Event Log (Chronological)</h4>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {[...session.violations].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()).map((v, i) => (
                <div key={i} className="flex items-center gap-3 p-2 bg-white/5 rounded text-sm">
                  <span className="text-gray-500 font-mono text-xs w-20 flex-shrink-0">{formatTimestamp(v.timestamp)}</span>
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    v.severity === 'critical' ? 'bg-red-400' : v.severity === 'warning' ? 'bg-yellow-400' : 'bg-blue-400'
                  }`}></span>
                  <span className="text-gray-300 flex-grow">{v.description}</span>
                  <span className="text-gray-500 text-xs">{v.source}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'export' && (
          <div className="bg-navy-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Download className="w-6 h-6 text-cyan-400" />
              <h3 className="text-lg font-semibold text-white">Export Session Data</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => {
                  const data = JSON.stringify(session, null, 2);
                  const blob = new Blob([data], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = `session-${session.shortId || sessionId.slice(-8)}.json`;
                  a.click(); URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-3 p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <Download className="w-6 h-6 text-cyan-400" />
                <div>
                  <div className="text-white font-medium">Export as JSON</div>
                  <div className="text-gray-400 text-sm">Full session data with all violations</div>
                </div>
              </button>
              <button
                onClick={() => {
                  const lines = ['Timestamp,Type,Severity,Description,Source,Confidence'];
                  session.violations.forEach(v => {
                    lines.push(`${v.timestamp},${v.type},${v.severity},"${v.description}",${v.source},${v.confidence}`);
                  });
                  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = `violations-${session.shortId || sessionId.slice(-8)}.csv`;
                  a.click(); URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-3 p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <Download className="w-6 h-6 text-green-400" />
                <div>
                  <div className="text-white font-medium">Export Violations CSV</div>
                  <div className="text-gray-400 text-sm">Violation log in spreadsheet format</div>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}