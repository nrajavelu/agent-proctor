'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Activity, Users, Shield, AlertTriangle, 
  Clock, Eye, Mic, Brain, ChevronRight,
  Search, Filter, MoreVertical, LogOut,
  RefreshCw, User, Building2, Settings,
  Globe, UserPlus, BarChart3, Cog,
  Database, Package, Zap, Wifi, WifiOff
} from 'lucide-react';
import { useSessionManager } from '../../../../hooks/useSessionManager';

// Super Admin Components
import SuperAdminNav from '../components/SuperAdminNav';
import SuperAdminDashboard from '../components/SuperAdminDashboard';
import TenantManagement from '../components/TenantManagement';
import Analytics from '../components/Analytics';
import GlobalSettings from '../components/GlobalSettings';

interface TenantSession {
  userId: string;
  email: string;
  organizationId: string;
  organizationName: string;
  organizationType: 'tenant' | 'system-admin';
  role: string;
  features: string[];
  loginTime: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [tenantSession, setTenantSession] = useState<TenantSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'in-progress'>('all');
  const [examFilter, setExamFilter] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState<'tenant-admin' | 'super-admin'>('tenant-admin');
  const [superAdminActiveView, setSuperAdminActiveView] = useState('dashboard');
  const [mounted, setMounted] = useState(false);

  // Detect if user is super admin
  const isSuperAdmin = tenantSession?.organizationType === 'system-admin';

  // Use real-time session manager
  const {
    sessions,
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    refreshSessions
  } = useSessionManager({
    organizationId: tenantSession?.organizationId,
    autoConnect: true
  });

  useEffect(() => {
    setMounted(true);
    // Check authentication
    const sessionData = localStorage.getItem('tenant_session');
    if (!sessionData) {
      router.push('/admin/login');
      return;
    }
    
    try {
      const session = JSON.parse(sessionData);
      setTenantSession(session);
      setLoading(false);
    } catch {
      router.push('/admin/login');
    }
  }, [router]);

  const handleLogout = () => {
    disconnect();
    localStorage.removeItem('tenant_session');
    router.push('/admin/login');
  };
  
  const handleRefresh = () => {
    refreshSessions();
  };

  // Filter sessions based on current filters
  const filteredSessions = sessions.filter(session => {
    if (filter !== 'all' && session.status !== filter) return false;
    if (examFilter && !session.examId.toLowerCase().includes(examFilter.toLowerCase())) return false;
    if (searchTerm && !session.candidateId.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const formatTimestamp = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getTimeSince = (timestamp: string | Date) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    switch (status) {
      case 'active':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'completed':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'terminated':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getRiskBadge = (riskLevel: string) => {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    switch (riskLevel) {
      case 'low':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'medium':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'high':
        return `${baseClasses} bg-orange-100 text-orange-800`;
      case 'critical':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!tenantSession) {
    return null;
  }

  // Super Admin View
  if (isSuperAdmin && activeView === 'super-admin') {
    return (
      <div className="min-h-screen bg-navy-950 overflow-hidden">
        <SuperAdminNav 
          activeView={superAdminActiveView}
          setActiveView={setSuperAdminActiveView}
          tenantSession={tenantSession}
          onSwitchToTenant={() => setActiveView('tenant-admin')}
          onLogout={handleLogout}
        />
        
        <div className="lg:pl-64">
          <main className="py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {superAdminActiveView === 'dashboard' && <SuperAdminDashboard />}
              {superAdminActiveView === 'tenants' && <TenantManagement />}
              {superAdminActiveView === 'analytics' && <Analytics />}
              {superAdminActiveView === 'settings' && <GlobalSettings />}
            </div>
          </main>
        </div>
      </div>
    );
  }

  const activeSessions = filteredSessions.filter(s => s.status === 'active').length;
  const totalViolations = filteredSessions.reduce((sum, s) => sum + s.violations.length, 0);
  const avgCredibilityScore = Math.round(
    filteredSessions.reduce((sum, s) => sum + s.credibilityScore, 0) / Math.max(filteredSessions.length, 1)
  );

  return (
    <div className="min-h-screen bg-navy-950">
      {/* Navigation */}
      <nav className="bg-navy-900 border-b border-navy-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-cyan-400 mr-3" />
              <span className="text-xl font-semibold text-white">Proctoring Dashboard</span>
              <span className="ml-4 text-sm text-cyan-400">{tenantSession.organizationName}</span>
            </div>
            <div className="flex items-center space-x-4">
              {/* Real-time connection status */}
              <div className="flex items-center space-x-2">
                {isConnected ? (
                  <Wifi className="w-5 h-5 text-green-400" />
                ) : (
                  <WifiOff className="w-5 h-5 text-red-400" />
                )}
                <span className={`text-sm font-medium ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                  {isConnected ? 'Live' : isConnecting ? 'Connecting...' : 'Disconnected'}
                </span>
              </div>

              <button
                onClick={handleRefresh}
                disabled={!isConnected || loading}
                className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                title="Refresh sessions"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>

              {isSuperAdmin && (
                <button
                  onClick={() => setActiveView('super-admin')}
                  className="px-3 py-1 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Super Admin
                </button>
              )}

              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Error Display */}
        {error && (
          <div className="mb-4 bg-red-900 border border-red-700 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-400 mr-2" />
              <span className="text-red-200">Connection Error: {error}</span>
              <button
                onClick={connect}
                className="ml-4 px-3 py-1 bg-red-700 text-white text-sm rounded hover:bg-red-600"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-navy-800 rounded-lg p-6 border border-navy-700"
          >
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-green-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Active Sessions</p>
                <p className="text-2xl font-semibold text-white">{activeSessions}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-navy-800 rounded-lg p-6 border border-navy-700"
          >
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Total Sessions</p>
                <p className="text-2xl font-semibold text-white">{filteredSessions.length}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-navy-800 rounded-lg p-6 border border-navy-700"
          >
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-yellow-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Violations</p>
                <p className="text-2xl font-semibold text-white">{totalViolations}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-navy-800 rounded-lg p-6 border border-navy-700"
          >
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-cyan-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Avg Credibility</p>
                <p className="text-2xl font-semibold text-white">{avgCredibilityScore}%</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Filters */}
        <div className="bg-navy-800 rounded-lg p-6 border border-navy-700 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Status</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="w-full bg-navy-900 border border-navy-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500"
              >
                <option value="all">All Sessions</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Exam</label>
              <input
                type="text"
                placeholder="Filter by exam..."
                value={examFilter}
                onChange={(e) => setExamFilter(e.target.value)}
                className="w-full bg-navy-900 border border-navy-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Candidate</label>
              <input
                type="text"
                placeholder="Search candidates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-navy-900 border border-navy-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500"
              />
            </div>
            
            <div className="flex items-end">
              <button
                onClick={handleRefresh}
                disabled={loading || !isConnected}
                className="w-full bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        {/* Sessions Table */}
        <div className="bg-navy-800 rounded-lg border border-navy-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-navy-700">
            <h2 className="text-lg font-semibold text-white">Live Sessions</h2>
            <p className="text-sm text-gray-400">Real-time monitoring of exam sessions</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-navy-700">
              <thead className="bg-navy-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Candidate / Exam
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Risk Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Credibility
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Violations
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Started
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-navy-800 divide-y divide-navy-700">
                {filteredSessions.map((session) => (
                  <tr key={session.sessionId} className="hover:bg-navy-750 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-white">{session.candidateId}</div>
                        <div className="text-sm text-gray-400">{session.examId}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getStatusBadge(session.status)}>
                        {session.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getRiskBadge(session.riskLevel)}>
                        {session.riskLevel}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${
                        session.credibilityScore >= 90 ? 'text-green-400' :
                        session.credibilityScore >= 80 ? 'text-yellow-400' :
                        session.credibilityScore >= 60 ? 'text-orange-400' :
                        'text-red-400'
                      }`}>
                        {session.credibilityScore}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${
                        session.violations.length === 0 ? 'text-green-400' :
                        session.violations.length <= 2 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {session.violations.length}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">
                        {session.completedAt ? 
                          formatDuration(Math.floor((new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime()) / 1000)) :
                          formatDuration(Math.floor((new Date().getTime() - new Date(session.startedAt).getTime()) / 1000))
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">{formatTimestamp(session.startedAt)}</div>
                      <div className="text-xs text-gray-500">{getTimeSince(session.startedAt)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => router.push(`/admin/sessions/${session.sessionId}`)}
                        className="text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredSessions.length === 0 && (
              <div className="px-6 py-12 text-center">
                <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-300 mb-2">No sessions found</h3>
                <p className="text-gray-500">
                  {!isConnected ? 'Connect to the session manager to see live sessions.' :
                   sessions.length === 0 ? 'No active sessions at the moment.' :
                   'Try adjusting your filters.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}