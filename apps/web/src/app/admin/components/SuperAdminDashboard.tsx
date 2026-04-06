'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, Building2, Eye, AlertTriangle, CheckCircle,
  TrendingUp, Monitor, Globe, Settings, Zap,
  Clock, Database, Activity, Shield, Brain
} from 'lucide-react';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: any;
  action: () => void;
  color: string;
}

interface SystemAlert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: string;
}

interface SuperAdminDashboardProps {
  setActiveView: (view: string) => void;
}

export default function SuperAdminDashboard({ setActiveView }: SuperAdminDashboardProps) {
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
  
  // Generate dynamic system alerts
  useEffect(() => {
    const generateAlerts = () => {
      const possibleAlerts = [
        {
          id: '1',
          type: 'warning' as const,
          title: 'High CPU Usage',
          message: `CPU usage is at ${Math.floor(Math.random() * 20 + 75)}% - monitor for performance impact`,
          timestamp: `${Math.floor(Math.random() * 10 + 1)} minutes ago`
        },
        {
          id: '2', 
          type: 'success' as const,
          title: 'New Tenant Activated',
          message: 'Global Assessment Solutions completed onboarding successfully',
          timestamp: `${Math.floor(Math.random() * 30 + 10)} minutes ago`
        },
        {
          id: '3',
          type: 'info' as const,
          title: 'System Update',
          message: 'Proctoring AI model updated to v2.1 with improved accuracy',
          timestamp: `${Math.floor(Math.random() * 60 + 30)} minutes ago`
        },
        {
          id: '4',
          type: 'warning' as const,
          title: 'Storage Usage Alert',
          message: `Storage usage at ${Math.floor(Math.random() * 10 + 85)}% - consider cleanup`,
          timestamp: `${Math.floor(Math.random() * 15 + 5)} minutes ago`
        }
      ];
      
      // Show 2-4 random alerts
      const numAlerts = Math.floor(Math.random() * 3) + 2;
      const shuffled = possibleAlerts.sort(() => 0.5 - Math.random());
      setSystemAlerts(shuffled.slice(0, numAlerts));
    };
    
    generateAlerts();
    const interval = setInterval(generateAlerts, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const quickActions: QuickAction[] = [
    {
      id: 'add-tenant',
      title: 'Add New Tenant',
      description: 'Onboard a new customer organization',
      icon: Building2,
      action: () => setActiveView('tenants'),
      color: 'from-cyan-400 to-blue-500'
    },
    {
      id: 'system-settings',
      title: 'System Settings',
      description: 'Configure global proctoring parameters',
      icon: Settings,
      action: () => setActiveView('settings'),
      color: 'from-purple-400 to-pink-500'
    },
    {
      id: 'view-analytics',
      title: 'View Analytics',
      description: 'Check system performance and usage',
      icon: TrendingUp,
      action: () => setActiveView('analytics'),
      color: 'from-green-400 to-emerald-500'
    },
    {
      id: 'monitor-system',
      title: 'System Monitor',
      description: 'Real-time system health monitoring',
      icon: Monitor,
      action: () => setActiveView('monitoring'),
      color: 'from-orange-400 to-red-500'
    }
  ];

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'error': return 'text-red-400 bg-red-400/20 border-red-400/30';
      case 'warning': return 'text-yellow-400 bg-yellow-400/20 border-yellow-400/30';
      case 'success': return 'text-green-400 bg-green-400/20 border-green-400/30';
      default: return 'text-blue-400 bg-blue-400/20 border-blue-400/30';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error': return AlertTriangle;
      case 'warning': return AlertTriangle;
      case 'success': return CheckCircle;
      default: return AlertTriangle;
    }
  };

  const [liveStats, setLiveStats] = useState({
    activeSessions: 2847,
    totalTenants: 47,
    systemHealth: 98.2,
    violationsToday: 156,
    cpuUsage: 45,
    memoryUsage: 62,
    uptime: '15 days, 8 hours'
  });

  // Simulate real-time updates with more realistic patterns
  useEffect(() => {
    const updateLiveStats = () => {
      const now = new Date();
      const timeVariation = Math.sin(now.getTime() / 100000);
      const randomVariation = Math.random();
      
      setLiveStats(prev => ({
        activeSessions: Math.max(0, Math.floor(2847 + timeVariation * 200 + (randomVariation - 0.5) * 50)),
        totalTenants: 47 + Math.floor(Math.random() * 3),
        systemHealth: parseFloat((98.2 + (Math.random() * 0.3 - 0.15)).toFixed(1)),
        violationsToday: Math.max(0, 156 + Math.floor((Math.random() - 0.5) * 20)),
        cpuUsage: Math.max(20, Math.min(90, prev.cpuUsage + (Math.random() - 0.5) * 8)),
        memoryUsage: Math.max(30, Math.min(95, prev.memoryUsage + (Math.random() - 0.5) * 6)),
        uptime: calculateUptime(now)
      }));
    };
    
    const interval = setInterval(updateLiveStats, 2000); // Update every 2 seconds
    updateLiveStats(); // Initial update
    
    return () => clearInterval(interval);
  }, []);
  
  const calculateUptime = (currentTime: Date): string => {
    const startTime = new Date('2024-03-22'); // Simulated server start time
    const diff = currentTime.getTime() - startTime.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days} days, ${hours} hours`;
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-cyan-400/20 to-blue-500/20 border border-cyan-400/30 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-2xl font-bold text-white">Welcome to Super Admin Dashboard</h1>
              <div className="flex items-center gap-2 px-2 py-1 bg-green-400/10 rounded-full">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-green-400 text-xs font-medium">LIVE DATA</span>
              </div>
            </div>
            <p className="text-gray-300">Manage your entire proctoring platform from here • Real-time updates every 2 seconds</p>
          </div>
          <div className="flex items-center gap-4 text-right">
            <div className="text-center">
              <p className="text-2xl font-bold text-cyan-400">{liveStats.activeSessions.toLocaleString()}</p>
              <p className="text-sm text-gray-300">Active Sessions</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-400">{liveStats.totalTenants}</p>
              <p className="text-sm text-gray-300">Total Tenants</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">{liveStats.systemHealth}%</p>
              <p className="text-sm text-gray-300">System Health</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <motion.button
                key={action.id}
                onClick={action.action}
                className="bg-navy-800/50 border border-white/10 rounded-xl p-6 text-left hover:border-white/20 transition-all group"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className={`w-12 h-12 bg-gradient-to-r ${action.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{action.title}</h3>
                <p className="text-gray-400 text-sm">{action.description}</p>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* System Overview & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real-time System Stats */}
        <div className="bg-navy-800/50 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Real-time System Stats
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-400/20 rounded-lg">
                  <Eye className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <p className="text-white font-medium">Active Sessions</p>
                  <p className="text-sm text-gray-400">Currently monitoring</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-cyan-400">{liveStats.activeSessions.toLocaleString()}</p>
                <div className="flex items-center gap-1 text-green-400 text-sm">
                  <TrendingUp className="w-3 h-3" />
                  <span>Live</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-400/20 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-orange-400" />
                </div>
                <div>
                  <p className="text-white font-medium">Violations Today</p>
                  <p className="text-sm text-gray-400">Total detected</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-orange-400">{liveStats.violationsToday}</p>
                <div className="flex items-center gap-1 text-red-400 text-sm">
                  <TrendingUp className="w-3 h-3" />
                  <span>-8.2%</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">CPU Usage</span>
                <span className="text-white">{liveStats.cpuUsage}%</span>
              </div>
              <div className="w-full bg-navy-700 rounded-full h-2">
                <motion.div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    liveStats.cpuUsage > 80 ? 'bg-red-400' : liveStats.cpuUsage > 60 ? 'bg-yellow-400' : 'bg-green-400'
                  }`}
                  style={{ width: `${liveStats.cpuUsage}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Memory Usage</span>
                <span className="text-white">{liveStats.memoryUsage}%</span>
              </div>
              <div className="w-full bg-navy-700 rounded-full h-2">
                <motion.div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    liveStats.memoryUsage > 80 ? 'bg-red-400' : liveStats.memoryUsage > 60 ? 'bg-yellow-400' : 'bg-green-400'
                  }`}
                  style={{ width: `${liveStats.memoryUsage}%` }}
                />
              </div>
            </div>

            <div className="pt-2 border-t border-white/10">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-300">System Uptime</span>
                <span className="text-green-400 font-medium">{liveStats.uptime}</span>
              </div>
            </div>
          </div>
        </div>

        {/* System Alerts */}
        <div className="bg-navy-800/50 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            System Alerts
          </h3>
          
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {systemAlerts.map((alert) => {
              const Icon = getAlertIcon(alert.type);
              return (
                <div key={alert.id} className={`p-4 rounded-lg border ${getAlertColor(alert.type)}`}>
                  <div className="flex items-start gap-3">
                    <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{alert.title}</p>
                      <p className="text-sm opacity-80 mt-1">{alert.message}</p>
                      <p className="text-xs opacity-60 mt-2">{alert.timestamp}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-white/10">
            <button
              onClick={() => setActiveView('monitoring')}
              className="w-full text-center text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
            >
              View All System Logs →
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-navy-800/50 border border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Recent Platform Activity
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-navy-700/50 rounded-lg">
            <div className="p-2 bg-green-400/20 rounded-lg">
              <CheckCircle className="w-4 h-4 text-green-400" />
            </div>
            <div className="flex-1">
              <p className="text-white text-sm">New tenant "Global Assessment Solutions" onboarded successfully</p>
              <p className="text-gray-400 text-xs">15 minutes ago</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-navy-700/50 rounded-lg">
            <div className="p-2 bg-blue-400/20 rounded-lg">
              <Settings className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-white text-sm">Global proctoring settings updated by system administrator</p>
              <p className="text-gray-400 text-xs">1 hour ago</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-navy-700/50 rounded-lg">
            <div className="p-2 bg-purple-400/20 rounded-lg">
              <Database className="w-4 h-4 text-purple-400" />
            </div>
            <div className="flex-1">
              <p className="text-white text-sm">Daily system backup completed successfully</p>
              <p className="text-gray-400 text-xs">2 hours ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}