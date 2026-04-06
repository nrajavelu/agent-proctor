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
              source: v.source || 'proctor-system'
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
                <p className="text-gray-400 text-sm font-mono">{sessionId.slice(-12)}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {session.status === 'active' || session.status === 'in-progress' ? (
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
            <div className="text-gray-400">
              Timeline view will show chronological events and violations.
            </div>
          </div>
        )}

        {['evidence', 'scoring', 'behavior', 'playback', 'export'].map((tab) => (
          activeTab === tab && (
            <div key={tab} className="bg-navy-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6">
              <div className="text-center py-12">
                <div className="text-3xl mb-4">🚧</div>
                <p className="text-gray-400">
                  {tab.charAt(0).toUpperCase() + tab.slice(1)} view is coming soon
                </p>
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  );
}