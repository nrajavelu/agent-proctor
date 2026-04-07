console.log('🚀 Loading ProctorSDK Standalone...');

window.ProctorSDK = {
  init: function(config) {
    console.log('ProctorSDK.init called with config:', config);
    const instance = new ProctorSession(config);
    window.ProctorSDKInstance = instance;
    setTimeout(() => instance.start(), 100);
    return instance;
  },
  getInstance: function() {
    return window.ProctorSDKInstance;
  }
};

function ProctorSession(config) {
  this.config = {
    sessionManager: 'ws://localhost:8080',
    enableSimulation: false,
    ...config
  };
  this.sessionId = null;
  this.websocket = null;
  this.widget = null;
  this.violations = [];
  this.credibilityScore = 100;
  this.isActive = false;
  this.eventHandlers = {};

  this.on = function(event, handler) {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(handler);
  };

  this.emit = function(event, data) {
    const handlers = this.eventHandlers[event];
    if (handlers) {
      handlers.forEach(h => h(data));
    }
  };

  this.start = function() {
    console.log('🎯 Starting proctoring session...');
    this.createWidget();
    this.connectWebSocket();
    if (this.config.enableSimulation) {
      setTimeout(() => this.startViolationSimulation(), 3000);
    }
    this.isActive = true;
    this.emit('session:started', { sessionId: this.sessionId });
  };

  this.createWidget = function() {
    console.log('🎨 Creating proctoring widget...');
    
    // Remove existing widget
    const existing = document.getElementById('proctoring-widget-container');
    if (existing) {
      console.log('Removing existing widget');
      existing.remove();
    }

    // Generate session ID
    this.sessionId = 'session_' + Math.random().toString(36).substr(2, 9);
    const shortId = this.sessionId.slice(-8);

    // Create widget container
    const container = document.createElement('div');
    container.id = 'proctoring-widget-container';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 300px;
      height: 220px;
      z-index: 10000;
      border: 2px solid #3b82f6;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.15);
      background: white;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    `;

    container.innerHTML = `
      <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 12px; font-size: 14px; font-weight: 600;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div id="pulse-dot" style="width: 8px; height: 8px; background: #10b981; border-radius: 50%; animation: pulse 2s infinite;"></div>
          AI Proctoring Active
        </div>
        <div style="font-size: 11px; opacity: 0.9; margin-top: 4px;">Session: ${shortId}</div>
      </div>
      
      <div style="padding: 16px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
          <div style="font-size: 12px; color: #374151;">Status</div>
          <div id="session-status" style="color: #f59e0b; font-size: 12px; font-weight: 500;">Connecting...</div>
        </div>
        
        <div style="margin-bottom: 12px;">
          <div style="font-size: 12px; color: #374151; margin-bottom: 4px;">Credibility</div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div id="credibility-score" style="font-size: 18px; font-weight: 600; color: #10b981;">100%</div>
            <div style="flex: 1; background: #f3f4f6; height: 6px; border-radius: 3px;">
              <div id="credibility-bar" style="height: 100%; background: #10b981; width: 100%; transition: all 0.3s;"></div>
            </div>
          </div>
        </div>
        
        <div style="margin-bottom: 8px;">
          <div style="font-size: 12px; color: #374151;">Violations</div>
          <div id="violation-count" style="font-size: 14px; font-weight: 500; color: #10b981;">0 detected</div>
        </div>
        
        <div id="violation-list" style="max-height: 60px; overflow-y: auto; font-size: 11px;">
          <div style="color: #10b981; margin: 2px 0;">✓ Video monitoring active</div>
          <div style="color: #10b981; margin: 2px 0;">✓ Audio analysis running</div>
        </div>
      </div>
    `;

    // Add CSS for pulse animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    `;
    document.head.appendChild(style);

    // Add to page
    document.body.appendChild(container);
    this.widget = container;
    
    console.log('✅ Proctoring widget created successfully');
    console.log('Widget element:', container);
  };

  this.connectWebSocket = function() {
    console.log('📡 Connecting to session manager...');
    
    try {
      const wsUrl = this.config.sessionManager + '?type=candidate';
      console.log('WebSocket URL:', wsUrl);
      
      this.websocket = new WebSocket(wsUrl);
      
      this.websocket.onopen = () => {
        console.log('✅ Connected to session manager as candidate');
        this.updateWidgetStatus('Connected', '#10b981');
        this.startSession();
      };
      
      this.websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📨 Received message:', message);
          this.handleWebSocketMessage(message);
        } catch (error) {
          console.error('❌ Error parsing message:', error);
        }
      };
      
      this.websocket.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        this.updateWidgetStatus('Disconnected', '#ef4444');
      };
      
      this.websocket.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        this.updateWidgetStatus('Error', '#ef4444');
      };
      
    } catch (error) {
      console.error('❌ Failed to create WebSocket:', error);
      this.updateWidgetStatus('Connection Failed', '#ef4444');
    }
  };

  this.startSession = function() {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      const sessionData = {
        type: 'session:start',
        data: {
          candidateId: this.config.candidateId,
          examId: this.config.examId,
          organizationId: this.config.organizationId,
          totalQuestions: 5,
          metadata: {
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
          }
        }
      };
      
      console.log('📤 Sending session start message:', sessionData);
      this.websocket.send(JSON.stringify(sessionData));
    }
  };

  this.handleWebSocketMessage = function(message) {
    switch (message.type) {
      case 'session:started':
        this.sessionId = message.sessionId;
        this.updateWidgetStatus('Session Active', '#10b981');
        console.log('🎉 Session confirmed with ID:', this.sessionId);
        this.emit('session:started', message.data);
        break;
      case 'violation:new':
        this.handleViolation(message.data);
        break;
      default:
        console.log('❓ Unknown message type:', message.type);
    }
  };

  this.updateWidgetStatus = function(status, color = '#10b981') {
    const statusEl = document.getElementById('session-status');
    if (statusEl) {
      statusEl.textContent = status;
      statusEl.style.color = color;
    }
  };

  this.handleViolation = function(violation) {
    console.log('🚨 Handling violation:', violation);
    
    this.violations.push(violation);
    this.credibilityScore = Math.max(20, this.credibilityScore - 15);
    
    // Send violation to session manager
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN && this.sessionId) {
      const violationMessage = {
        type: 'violation:trigger',
        sessionId: this.sessionId,
        data: {
          type: violation.type,
          description: violation.description,
          severity: violation.severity || 'warning',
          timestamp: new Date().toISOString(),
          confidence: 95,
          metadata: {
            source: 'ProctorSDK',
            candidateId: this.config.candidateId
          }
        }
      };
      
      console.log('📤 Sending violation to session manager:', violationMessage);
      this.websocket.send(JSON.stringify(violationMessage));
    } else {
      console.warn('⚠️ Cannot send violation - WebSocket not connected or no session ID');
    }
    
    // Update UI
    this.updateViolationDisplay();
    this.showAlert(violation);
    this.emit('violation', violation);
  };

  this.updateViolationDisplay = function() {
    const countEl = document.getElementById('violation-count');
    const scoreEl = document.getElementById('credibility-score');
    const barEl = document.getElementById('credibility-bar');
    const listEl = document.getElementById('violation-list');
    
    if (countEl) {
      countEl.textContent = this.violations.length + ' detected';
      countEl.style.color = this.violations.length > 0 ? '#ef4444' : '#10b981';
    }
    
    if (scoreEl) {
      scoreEl.textContent = this.credibilityScore + '%';
      scoreEl.style.color = this.credibilityScore > 80 ? '#10b981' : 
                           this.credibilityScore > 60 ? '#f59e0b' : '#ef4444';
    }
    
    if (barEl) {
      barEl.style.width = this.credibilityScore + '%';
      barEl.style.background = this.credibilityScore > 80 ? '#10b981' : 
                              this.credibilityScore > 60 ? '#f59e0b' : '#ef4444';
    }
    
    if (listEl && this.violations.length > 0) {
      const recent = this.violations.slice(-3);
      listEl.innerHTML = recent.map(v => 
        `<div style="color: #ef4444; margin: 2px 0;">⚠ ${v.description}</div>`
      ).join('');
    }
  };

  this.showAlert = function(violation) {
    const alert = document.createElement('div');
    alert.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10001;
      background: #fee2e2;
      border: 1px solid #fca5a5;
      color: #dc2626;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    alert.innerHTML = '⚠️ Violation: ' + violation.description;
    document.body.appendChild(alert);
    
    setTimeout(() => {
      if (alert.parentNode) {
        alert.remove();
      }
    }, 4000);
  };

  this.startViolationSimulation = function() {
    console.log('🎭 Starting violation simulation...');
    
    const violations = [
      { type: 'tab_switch', description: 'Tab focus lost', severity: 'warning' },
      { type: 'face_not_visible', description: 'Face not visible', severity: 'critical' },
      { type: 'background_noise', description: 'Audio detected', severity: 'info' },
      { type: 'multiple_faces', description: 'Multiple people', severity: 'critical' }
    ];
    
    let count = 0;
    const interval = setInterval(() => {
      if (count >= violations.length || !this.isActive) {
        console.log('🎭 Violation simulation complete');
        clearInterval(interval);
        return;
      }
      
      const violation = violations[count];
      this.handleViolation(violation);
      count++;
    }, 5000);
  };

  this.stop = function() {
    console.log('🛑 Stopping proctoring session');
    this.isActive = false;
    
    if (this.websocket) {
      if (this.sessionId) {
        this.websocket.send(JSON.stringify({
          type: 'session:end',
          sessionId: this.sessionId
        }));
      }
      this.websocket.close();
    }
  };

  this.destroy = function() {
    console.log('💥 Destroying ProctorSDK instance');
    this.stop();
    if (this.widget) {
      this.widget.remove();
      this.widget = null;
    }
    if (window.ProctorSDKInstance === this) {
      window.ProctorSDKInstance = null;
    }
  };
}

console.log('✅ ProctorSDK Standalone loaded and ready');
