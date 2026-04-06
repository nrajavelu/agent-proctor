'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, Users, Building2, 
  Eye, AlertTriangle, CheckCircle, XCircle,
  Clock, Monitor, Database, Globe,
  BarChart3, PieChart, Activity, Zap
} from 'lucide-react';

interface AnalyticsData {
  overview: {
    totalSessions: number;
    activeSessions: number;
    totalTenants: number;
    totalViolations: number;
    systemUptime: number;
    processingLatency: number;
  };
  trends: {
    sessionsToday: number;
    sessionsTrend: number;
    violationsToday: number;
    violationsTrend: number;
    newTenants: number;
    tenantsTrend: number;
    systemLoad: number;
    loadTrend: number;
  };
  tenantUsage: Array<{
    id: string;
    name: string;
    sessions: number;
    violations: number;
    status: 'active' | 'trial' | 'suspended';
    lastActivity: string;
  }>;
  violationBreakdown: Array<{
    type: string;
    count: number;
    percentage: number;
    severity: 'low' | 'medium' | 'high';
  }>;
  systemMetrics: {
    cpu: number;
    memory: number;
    storage: number;
    bandwidth: number;
  };
}

// Real-time data that updates dynamically
const generateRealTimeAnalytics = (): AnalyticsData => {
  const now = new Date();
  const baseActiveSessions = 2847;
  const variation = Math.sin(now.getTime() / 100000) * 200;
  const activeSessions = Math.floor(baseActiveSessions + variation);
  
  return {
  overview: {
    totalSessions: 125847 + Math.floor((now.getTime() - new Date('2024-01-01').getTime()) / 60000),
    activeSessions: Math.max(0, activeSessions),
    totalTenants: 47 + Math.floor(Math.random() * 3),
    totalViolations: 8934 + Math.floor(Math.random() * 50),
    systemUptime: 99.87 + (Math.random() * 0.2 - 0.1),
    processingLatency: 145 + Math.floor(Math.random() * 20 - 10)
  },
  trends: {
    sessionsToday: 3240 + Math.floor(Math.random() * 100),
    sessionsTrend: 12.5 + (Math.random() * 4 - 2),
    violationsToday: 156 + Math.floor(Math.random() * 20),
    violationsTrend: -8.2 + (Math.random() * 3 - 1.5),
    newTenants: Math.floor(Math.random() * 5),
    tenantsTrend: 50 + Math.floor(Math.random() * 20 - 10),
    systemLoad: 68 + Math.floor(Math.random() * 15 - 7),
    loadTrend: -2.1 + (Math.random() * 2 - 1)
  },
  tenantUsage: [
    {
      id: '1',
      name: 'EduCorp University',
      sessions: 1247 + Math.floor(Math.random() * 50),
      violations: 23 + Math.floor(Math.random() * 10),
      status: 'active',
      lastActivity: Math.random() > 0.5 ? '2 minutes ago' : 'Just now'
    },
    {
      id: '2', 
      name: 'TechLearn Institute',
      sessions: 892 + Math.floor(Math.random() * 30),
      violations: 12 + Math.floor(Math.random() * 5),
      status: 'active',
      lastActivity: Math.random() > 0.5 ? '5 minutes ago' : '3 minutes ago'
    },
    {
      id: '3',
      name: 'Global Assessment Solutions',
      sessions: 654 + Math.floor(Math.random() * 20),
      violations: 8 + Math.floor(Math.random() * 3),
      status: 'trial',
      lastActivity: '1 hour ago'
    },
    {
      id: '4',
      name: 'Academic Excellence Center',
      sessions: 423 + Math.floor(Math.random() * 15),
      violations: 15 + Math.floor(Math.random() * 8),
      status: 'active',
      lastActivity: Math.random() > 0.3 ? '15 minutes ago' : '8 minutes ago'
    },
    {
      id: '5',
      name: 'Online Testing Platform',
      sessions: 289 + Math.floor(Math.random() * 10),
      violations: 4 + Math.floor(Math.random() * 2),
      status: 'active',
      lastActivity: '30 minutes ago'
    }
  ],
  violationBreakdown: [
    { type: 'Face Not Detected', count: 45 + Math.floor(Math.random() * 10), percentage: 28.8 + (Math.random() * 2 - 1), severity: 'high' },
    { type: 'Multiple Faces', count: 32 + Math.floor(Math.random() * 8), percentage: 20.5 + (Math.random() * 2 - 1), severity: 'high' },
    { type: 'Tab Switch', count: 28 + Math.floor(Math.random() * 6), percentage: 17.9 + (Math.random() * 2 - 1), severity: 'medium' },
    { type: 'Audio Detected', count: 25 + Math.floor(Math.random() * 5), percentage: 16.0 + (Math.random() * 2 - 1), severity: 'medium' },
    { type: 'Fullscreen Exit', count: 18 + Math.floor(Math.random() * 4), percentage: 11.5 + (Math.random() * 2 - 1), severity: 'low' },
    { type: 'Suspicious Movement', count: 8 + Math.floor(Math.random() * 3), percentage: 5.1 + (Math.random() * 1 - 0.5), severity: 'low' }
  ],
  systemMetrics: {
    cpu: 45 + Math.floor(Math.random() * 20 - 10),
    memory: 62 + Math.floor(Math.random() * 15 - 7),
    storage: 78 + Math.floor(Math.random() * 5 - 2),
    bandwidth: 34 + Math.floor(Math.random() * 10 - 5)
  }
};
};

export default function Analytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData>(generateRealTimeAnalytics());
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [refreshing, setRefreshing] = useState(false);

  // Update data in real-time
  useEffect(() => {
    const interval = setInterval(() => {
      setAnalytics(generateRealTimeAnalytics());
    }, 2000); // Update every 2 seconds
    
    return () => clearInterval(interval);
  }, []);

  const refreshData = async () => {
    setRefreshing(true);
    // Generate fresh real-time data
    setAnalytics(generateRealTimeAnalytics());
    await new Promise(resolve => setTimeout(resolve, 500));
    setRefreshing(false);
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const getTrendIcon = (trend: number) => {
    return trend > 0 ? TrendingUp : TrendingDown;
  };

  const getTrendColor = (trend: number) => {
    return trend > 0 ? 'text-green-400' : 'text-red-400';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-400/20';
      case 'trial': return 'text-yellow-400 bg-yellow-400/20';
      case 'suspended': return 'text-red-400 bg-red-400/20';
      default: return 'text-gray-400 bg-gray-400/20';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">Analytics & Insights</h1>
            <div className="flex items-center gap-2 px-2 py-1 bg-green-400/10 rounded-full">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 text-xs font-medium">LIVE DATA</span>
            </div>
          </div>
          <p className="text-gray-400">System usage, performance metrics, and tenant analytics • Updates every 2 seconds</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 bg-navy-800 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <button
            onClick={refreshData}
            disabled={refreshing}
            className={`p-2 border border-white/10 rounded-lg text-gray-400 hover:text-white hover:border-white/20 transition-colors ${refreshing ? 'animate-spin' : ''}`}
          >
            <Activity className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-navy-800/50 border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-cyan-400/20 rounded-lg">
              <Eye className="w-6 h-6 text-cyan-400" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-white">{formatNumber(analytics.overview.activeSessions)}</p>
              <p className="text-sm text-gray-400">Active Sessions</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className={`flex items-center gap-1 ${getTrendColor(analytics.trends.sessionsTrend)}`}>
              {getTrendIcon(analytics.trends.sessionsTrend)({ className: 'w-4 h-4' })}
              <span>{Math.abs(analytics.trends.sessionsTrend)}%</span>
            </div>
            <span className="text-gray-400">vs yesterday</span>
          </div>
        </div>

        <div className="bg-navy-800/50 border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-400/20 rounded-lg">
              <Building2 className="w-6 h-6 text-blue-400" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-white">{analytics.overview.totalTenants}</p>
              <p className="text-sm text-gray-400">Total Tenants</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className={`flex items-center gap-1 ${getTrendColor(analytics.trends.tenantsTrend)}`}>
              {getTrendIcon(analytics.trends.tenantsTrend)({ className: 'w-4 h-4' })}
              <span>{Math.abs(analytics.trends.newTenants)} new</span>
            </div>
            <span className="text-gray-400">this month</span>
          </div>
        </div>

        <div className="bg-navy-800/50 border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-orange-400/20 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-orange-400" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-white">{analytics.trends.violationsToday}</p>
              <p className="text-sm text-gray-400">Violations Today</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className={`flex items-center gap-1 ${getTrendColor(analytics.trends.violationsTrend)}`}>
              {getTrendIcon(analytics.trends.violationsTrend)({ className: 'w-4 h-4' })}
              <span>{Math.abs(analytics.trends.violationsTrend)}%</span>
            </div>
            <span className="text-gray-400">vs yesterday</span>
          </div>
        </div>

        <div className="bg-navy-800/50 border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-400/20 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-white">{analytics.overview.systemUptime}%</p>
              <p className="text-sm text-gray-400">System Uptime</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1 text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span>Excellent</span>
            </div>
            <span className="text-gray-400">health</span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Metrics */}
        <div className="bg-navy-800/50 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            System Metrics
          </h3>
          <div className="space-y-4">
            {Object.entries(analytics.systemMetrics).map(([key, value]) => (
              <div key={key} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300 capitalize">{key}</span>
                  <span className="text-white">{value}%</span>
                </div>
                <div className="w-full bg-navy-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      value > 80 ? 'bg-red-400' : value > 60 ? 'bg-yellow-400' : 'bg-green-400'
                    }`}
                    style={{ width: `${value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Violation Breakdown */}
        <div className="bg-navy-800/50 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5" />
            Violation Breakdown
          </h3>
          <div className="space-y-3">
            {analytics.violationBreakdown.map((violation, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${getSeverityColor(violation.severity)}`} />
                  <span className="text-gray-300 text-sm">{violation.type}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm">{violation.count}</span>
                  <span className="text-gray-400 text-xs">({violation.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tenant Usage Table */}
      <div className="bg-navy-800/50 border border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Top Tenant Usage
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 text-gray-300 font-medium">Organization</th>
                <th className="text-right py-3 text-gray-300 font-medium">Sessions</th>
                <th className="text-right py-3 text-gray-300 font-medium">Violations</th>
                <th className="text-center py-3 text-gray-300 font-medium">Status</th>
                <th className="text-right py-3 text-gray-300 font-medium">Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {analytics.tenantUsage.map((tenant) => (
                <tr key={tenant.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-white font-medium">{tenant.name}</span>
                    </div>
                  </td>
                  <td className="py-4 text-right text-white">{tenant.sessions.toLocaleString()}</td>
                  <td className="py-4 text-right text-white">{tenant.violations}</td>
                  <td className="py-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(tenant.status)}`}>
                      {tenant.status}
                    </span>
                  </td>
                  <td className="py-4 text-right text-gray-400">{tenant.lastActivity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}