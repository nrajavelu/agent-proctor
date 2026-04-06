'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, Users, Settings, BarChart3,
  Globe, Database, Shield, Zap, 
  Monitor, Brain, Eye, Headphones,
  ChevronRight, LogOut, Home
} from 'lucide-react';

interface SuperAdminNavProps {
  activeView: string;
  setActiveView: (view: string) => void;
  onLogout: () => void;
  sessionData: any;
  children?: React.ReactNode;
}

const navItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: Home,
    description: 'Overview and quick actions'
  },
  {
    id: 'tenants',
    label: 'Tenant Management',
    icon: Building2,
    description: 'Manage customers and organizations'
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    description: 'System usage and insights'
  },
  {
    id: 'settings',
    label: 'Global Settings',
    icon: Settings,
    description: 'System-wide configuration'
  },
  {
    id: 'monitoring',
    label: 'System Monitor',
    icon: Monitor,
    description: 'Real-time system health'
  },
  {
    id: 'integrations',
    label: 'Integrations',
    icon: Globe,
    description: 'API and webhook management'
  }
];

export default function SuperAdminNav({ 
  activeView, 
  setActiveView, 
  onLogout, 
  sessionData,
  children
}: SuperAdminNavProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [realTimeStats, setRealTimeStats] = useState({
    activeSessions: 2847,
    totalTenants: 47,
    systemHealth: 98.2,
    violationsToday: 156
  });

  // Update current time every second  
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timeInterval);
  }, []);

  // Update stats in real-time
  useEffect(() => {
    const updateStats = () => {
      const now = new Date();
      const variation = Math.sin(now.getTime() / 50000) * 100;
      
      setRealTimeStats({
        activeSessions: Math.max(0, Math.floor(2847 + variation)),
        totalTenants: 47 + Math.floor(Math.random() * 3),
        systemHealth: parseFloat((98.2 + (Math.random() * 0.4 - 0.2)).toFixed(1)),
        violationsToday: 156 + Math.floor(Math.random() * 10 - 5)
      });
    };
    
    updateStats();
    const interval = setInterval(updateStats, 3000); // Update every 3 seconds
    
    return () => clearInterval(interval);
  }, []);

  const proctoringStats = [
    { label: 'Active Sessions', value: realTimeStats.activeSessions.toLocaleString(), change: '+12%', color: 'text-green-400' },
    { label: 'Total Tenants', value: realTimeStats.totalTenants.toString(), change: '+3', color: 'text-cyan-400' },
    { label: 'System Health', value: `${realTimeStats.systemHealth}%`, change: 'Excellent', color: 'text-green-400' },
    { label: 'Violations Today', value: realTimeStats.violationsToday.toString(), change: '-8%', color: 'text-orange-400' }
  ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-navy-950 via-navy-900 to-slate-900">
      {/* Sidebar */}
      <motion.div 
        className={`bg-navy-900/80 backdrop-blur-lg border-r border-white/10 transition-all duration-300 ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}
        animate={{ width: sidebarCollapsed ? 64 : 256 }}
      >
        <div className="flex flex-col h-full">
          {/* Logo & Header */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between">
              {!sidebarCollapsed && (
                <div>
                  <h1 className="text-xl font-bold text-white">Super Admin</h1>
                  <p className="text-sm text-gray-400">Proctoring Platform</p>
                </div>
              )}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <ChevronRight className={`w-4 h-4 transition-transform ${sidebarCollapsed ? '' : 'rotate-180'}`} />
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          {!sidebarCollapsed && (
            <div className="p-4 border-b border-white/10">
              <div className="grid grid-cols-2 gap-2">
                {proctoringStats.map((stat, index) => (
                  <div key={index} className="bg-navy-800/50 rounded-lg p-2">
                    <p className="text-xs text-gray-400">{stat.label}</p>
                    <p className="font-semibold text-white text-sm">{stat.value}</p>
                    <p className={`text-xs ${stat.color}`}>{stat.change}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex-1 p-4">
            <nav className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveView(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all hover:bg-white/10 ${
                      isActive 
                        ? 'bg-cyan-400/20 text-cyan-400 border border-cyan-400/30' 
                        : 'text-gray-300 hover:text-white'
                    }`}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {!sidebarCollapsed && (
                      <div>
                        <p className="font-medium">{item.label}</p>
                        <p className="text-xs opacity-70">{item.description}</p>
                      </div>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* User Info & Logout */}
          <div className="p-4 border-t border-white/10">
            {!sidebarCollapsed && (
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">SA</span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">Super Admin</p>
                    <p className="text-gray-400 text-xs">{sessionData?.user?.email || 'superadmin@ayan.ai'}</p>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  <p>Organization: {sessionData?.organization?.name || 'System Administrator'}</p>
                  <p>Role: Platform Administrator</p>
                </div>
              </div>
            )}
            
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-red-500/20 rounded-lg transition-colors"
              title={sidebarCollapsed ? 'Logout' : undefined}
            >
              <LogOut className="w-4 h-4" />
              {!sidebarCollapsed && <span>Logout</span>}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-navy-800/50 backdrop-blur-lg border-b border-white/10 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white capitalize">
                {activeView === 'tenants' ? 'Tenant Management' : 
                 activeView === 'analytics' ? 'Analytics & Insights' :
                 activeView === 'settings' ? 'Global Settings' :
                 activeView === 'monitoring' ? 'System Monitor' :
                 activeView === 'integrations' ? 'Integrations' :
                 'Dashboard Overview'}
              </h2>
              <p className="text-gray-400 text-sm">
                {activeView === 'dashboard' ? 'Platform overview and quick actions' :
                 activeView === 'tenants' ? 'Manage customers and organizational accounts' :
                 activeView === 'analytics' ? 'System usage analytics and insights' :
                 activeView === 'settings' ? 'Configure system-wide proctoring parameters' :
                 activeView === 'monitoring' ? 'Real-time system health and performance' :
                 activeView === 'integrations' ? 'API management and webhook configuration' :
                 'Super Admin Dashboard'}
              </p>
            </div>

            {/* System Status Indicator */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                System Online • Last update: {currentTime.toLocaleTimeString()}
              </div>
              
              {/* Real-time stats */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-cyan-400" />
                  <span className="text-gray-300">CPU: {Math.floor(realTimeStats.systemHealth + Math.random() * 10)}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-green-400" />
                  <span className="text-gray-300">Memory: {Math.floor(62 + Math.random() * 15)}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-purple-400" />
                  <span className="text-gray-300">{realTimeStats.activeSessions.toLocaleString()} Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
}