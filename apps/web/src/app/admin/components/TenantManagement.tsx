'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, Plus, Settings, Users, Globe,
  Search, Filter, MoreVertical, Edit,
  Eye, Trash2, CheckCircle, XCircle,
  Clock, Calendar, ExternalLink
} from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  domain: string;
  status: 'active' | 'suspended' | 'trial' | 'expired';
  plan: 'starter' | 'professional' | 'enterprise';
  userCount: number;
  sessionCount: number;
  monthlyUsage: number;
  createdAt: string;
  lastActivity: string;
  features: string[];
  customization: {
    logo?: string;
    primaryColor: string;
    secondaryColor: string;
  };
  integration: {
    callbackUrl: string;
    authMethod: 'oauth' | 'api-key' | 'jwt';
    webhookSecret: string;
  };
  billing: {
    currentPeriodStart: string;
    currentPeriodEnd: string;
    nextBillingDate: string;
    amount: number;
    currency: string;
  };
}

// Generate dynamic tenant data  
const generateDynamicTenants = (): Tenant[] => {
  const baseTime = Date.now();
  return [
  {
    id: '554be9e2-7918-4c1f-8d5b-ad2a3a2abd94',
    name: 'Computer Science Department - University',
    domain: 'cs.university.edu',
    status: 'active',
    plan: 'enterprise',
    userCount: 1250 + Math.floor(Math.random() * 50),
    sessionCount: 15847 + Math.floor(Math.random() * 200),
    monthlyUsage: Math.floor(85 + Math.random() * 10),
    createdAt: '2024-01-15T00:00:00Z',
    lastActivity: new Date(baseTime - Math.floor(Math.random() * 2 * 60 * 60 * 1000)).toISOString(),
    features: ['face-detection', 'screen-sharing', 'ai-behavior', 'advanced-analytics'],
    customization: {
      logo: '/logos/cs-university.png',
      primaryColor: '#1e40af',
      secondaryColor: '#3b82f6'
    },
    integration: {
      callbackUrl: 'https://cs.university.edu/api/proctoring/callback',
      authMethod: 'oauth',
      webhookSecret: 'wh_cs_univ_2024'
    },
    billing: {
      currentPeriodStart: '2024-03-01T00:00:00Z',
      currentPeriodEnd: '2024-03-31T23:59:59Z',
      nextBillingDate: '2024-04-01T00:00:00Z',
      amount: 2499,
      currency: 'USD'
    }
  },
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Engineering College Assessment Center',
    domain: 'eng.college.edu',
    status: 'active',
    plan: 'professional',
    userCount: 850 + Math.floor(Math.random() * 30),
    sessionCount: 5641 + Math.floor(Math.random() * 50),
    monthlyUsage: Math.floor(70 + Math.random() * 8),
    createdAt: '2024-02-01T00:00:00Z',
    lastActivity: new Date(baseTime - Math.floor(Math.random() * 5 * 60 * 60 * 1000)).toISOString(),
    features: ['face-detection', 'screen-sharing', 'basic-analytics'],
    customization: {
      primaryColor: '#059669',
      secondaryColor: '#10b981'
    },
    integration: {
      callbackUrl: 'https://eng.college.edu/webhook/proctor',
      authMethod: 'api-key',
      webhookSecret: 'wh_eng_college_2024'
    },
    billing: {
      currentPeriodStart: '2024-03-01T00:00:00Z',
      currentPeriodEnd: '2024-03-31T23:59:59Z',
      nextBillingDate: '2024-04-01T00:00:00Z',
      amount: 1299,
      currency: 'USD'
    }
  },
  {
    id: '987fcdeb-51a2-43d7-8f9e-123456789abc',
    name: 'Business School Testing Services',
    domain: 'business.school.edu',
    status: 'trial',
    plan: 'starter',
    userCount: 120 + Math.floor(Math.random() * 20),
    sessionCount: 456 + Math.floor(Math.random() * 30),
    monthlyUsage: Math.floor(45 + Math.random() * 15),
    createdAt: '2024-03-15T00:00:00Z',
    lastActivity: new Date(baseTime - Math.floor(Math.random() * 24 * 60 * 60 * 1000)).toISOString(),
    features: ['face-detection', 'basic-analytics'],
    customization: {
      primaryColor: '#dc2626',
      secondaryColor: '#ef4444'
    },
    integration: {
      callbackUrl: 'https://business.school.edu/api/callbacks/proctor',
      authMethod: 'jwt',
      webhookSecret: 'wh_business_school_2024'
    },
    billing: {
      currentPeriodStart: '2024-03-15T00:00:00Z',
      currentPeriodEnd: '2024-04-15T23:59:59Z',
      nextBillingDate: '2024-04-16T00:00:00Z',
      amount: 0,
      currency: 'USD'
    }
  }
];
};

export default function TenantManagement() {
  const [tenants, setTenants] = useState<Tenant[]>(generateDynamicTenants());
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'trial' | 'suspended'>('all');
  const [planFilter, setPlanFilter] = useState<'all' | 'starter' | 'professional' | 'enterprise'>('all');
  
  // Update tenant data in real-time
  useEffect(() => {
    const updateTenantData = () => {
      setTenants(generateDynamicTenants());
    };
    
    const interval = setInterval(updateTenantData, 15000); // Update every 15 seconds
    return () => clearInterval(interval);
  }, []);

  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tenant.domain.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || tenant.status === statusFilter;
    const matchesPlan = planFilter === 'all' || tenant.plan === planFilter;
    return matchesSearch && matchesStatus && matchesPlan;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'trial': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'suspended': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'expired': return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'starter': return 'text-blue-400 bg-blue-400/10';
      case 'professional': return 'text-purple-400 bg-purple-400/10';
      case 'enterprise': return 'text-orange-400 bg-orange-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const timeAgo = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">Tenant Management</h1>
            <div className="flex items-center gap-2 px-2 py-1 bg-green-400/10 rounded-full">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 text-xs font-medium">LIVE DATA</span>
            </div>
          </div>
          <p className="text-gray-400">Manage organizations and their proctoring configurations • Updates every 15 seconds</p>
        </div>
        <button className="inline-flex items-center gap-2 bg-cyan-400 hover:bg-cyan-300 text-navy-950 px-4 py-2 rounded-lg font-medium transition-colors">
          <Plus className="w-4 h-4" />
          Add Tenant
        </button>
      </div>

      {/* Filters */}
      <div className="bg-navy-800/50 border border-white/10 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search tenants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-navy-900 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-navy-900 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="suspended">Suspended</option>
          </select>
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value as any)}
            className="px-3 py-2 bg-navy-900 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            <option value="all">All Plans</option>
            <option value="starter">Starter</option>
            <option value="professional">Professional</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
      </div>

      {/* Tenants Grid */}
      <div className="grid gap-4">
        {filteredTenants.map((tenant, index) => (
          <motion.div
            key={tenant.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-navy-800/50 border border-white/10 rounded-xl p-6 hover:border-white/20 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Building2 className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-lg font-semibold text-white">{tenant.name}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(tenant.status)}`}>
                    {tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1)}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPlanColor(tenant.plan)}`}>
                    {tenant.plan.charAt(0).toUpperCase() + tenant.plan.slice(1)}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-400">Domain</p>
                    <p className="text-white font-medium">{tenant.domain}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Users</p>
                    <p className="text-white font-medium">{tenant.userCount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Sessions</p>
                    <p className="text-white font-medium">{tenant.sessionCount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Monthly Usage</p>
                    <p className="text-white font-medium">{tenant.monthlyUsage}%</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-400">Created</p>
                    <p className="text-white font-medium">{formatDate(tenant.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Last Activity</p>
                    <p className="text-white font-medium">{timeAgo(tenant.lastActivity)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Next Billing</p>
                    <p className="text-white font-medium">
                      {tenant.status === 'trial' ? 'Trial Period' : formatCurrency(tenant.billing.amount, tenant.billing.currency)}
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-400 mb-2">Features</p>
                  <div className="flex flex-wrap gap-2">
                    {tenant.features.map(feature => (
                      <span
                        key={feature}
                        className="px-2 py-1 bg-navy-700 text-cyan-400 text-xs rounded border border-cyan-400/20"
                      >
                        {feature.replace('-', ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="p-2 text-gray-400 hover:text-white hover:bg-navy-700 rounded-lg transition-colors">
                  <Eye className="w-4 h-4" />
                </button>
                <button className="p-2 text-gray-400 hover:text-white hover:bg-navy-700 rounded-lg transition-colors">
                  <Settings className="w-4 h-4" />
                </button>
                <button className="p-2 text-gray-400 hover:text-white hover:bg-navy-700 rounded-lg transition-colors">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredTenants.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-2">No tenants found</h3>
          <p className="text-gray-500">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
}