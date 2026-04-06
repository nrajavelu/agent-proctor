import { useEffect, useState, useCallback } from 'react';

interface Session {
  sessionId: string;
  candidateId: string;
  examId: string;
  organizationId: string;
  status: 'active' | 'completed' | 'terminated';
  startedAt: Date;
  completedAt?: Date;
  score: number;
  credibilityScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  violations: Violation[];
  currentQuestion?: number;
  totalQuestions?: number;
  metadata: any;
}

interface Violation {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  timestamp: Date;
  description: string;
  confidence: number;
  source: string;
  metadata?: any;
}

interface UseSessionManagerOptions {
  organizationId?: string;
  autoConnect?: boolean;
}

interface UseSessionManagerReturn {
  sessions: Session[];
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
  refreshSessions: () => void;
}

export function useSessionManager(options: UseSessionManagerOptions = {}): UseSessionManagerReturn {
  const { organizationId, autoConnect = true } = options;
  
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (isConnecting || isConnected) return;
    
    setIsConnecting(true);
    setError(null);
    
    try {
      const wsUrl = new URL('ws://localhost:8080');
      wsUrl.searchParams.set('type', 'admin');
      if (organizationId) {
        wsUrl.searchParams.set('organizationId', organizationId);
      }
      
      const websocket = new WebSocket(wsUrl);
      
      websocket.onopen = () => {
        console.log('🔗 Connected to Session Manager');
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        
        // Request current sessions
        websocket.send(JSON.stringify({
          type: 'admin:request_sessions'
        }));
      };
      
      websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };
      
      websocket.onclose = () => {
        console.log('❌ WebSocket connection closed');
        setIsConnected(false);
        setIsConnecting(false);
        setWs(null);
        
        // Auto-reconnect after 3 seconds
        if (autoConnect) {
          setTimeout(() => {
            if (!isConnected && !isConnecting) {
              connect();
            }
          }, 3000);
        }
      };
      
      websocket.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setError('Failed to connect to session manager');
        setIsConnecting(false);
      };
      
      setWs(websocket);
      
    } catch (error) {
      console.error('❌ Error creating WebSocket:', error);
      setError('Failed to create WebSocket connection');
      setIsConnecting(false);
    }
  }, [organizationId, autoConnect, isConnecting, isConnected]);

  const disconnect = useCallback(() => {
    if (ws) {
      ws.close();
      setWs(null);
    }
    setIsConnected(false);
    setIsConnecting(false);
  }, [ws]);

  const refreshSessions = useCallback(() => {
    if (ws && isConnected) {
      ws.send(JSON.stringify({
        type: 'admin:request_sessions'
      }));
    }
  }, [ws, isConnected]);

  const handleMessage = (message: any) => {
    switch (message.type) {
      case 'sessions:list':
        setSessions(message.data);
        break;
      
      case 'session:new':
        setSessions(prev => [message.data, ...prev]);
        break;
      
      case 'session:updated':
        setSessions(prev => prev.map(session => 
          session.sessionId === message.data.sessionId ? message.data : session
        ));
        break;
      
      case 'session:ended':
        setSessions(prev => prev.map(session => 
          session.sessionId === message.data.sessionId ? message.data : session
        ));
        break;
      
      case 'violation:new':
        setSessions(prev => prev.map(session => {
          if (session.sessionId === message.sessionId) {
            return {
              ...session,
              violations: [...session.violations, message.data]
            };
          }
          return session;
        }));
        break;
      
      default:
        console.warn('❓ Unknown message type:', message.type);
    }
  };

  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [autoConnect]);

  return {
    sessions,
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    refreshSessions
  };
}