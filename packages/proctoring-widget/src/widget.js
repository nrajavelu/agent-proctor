/**
 * Standalone AI Proctoring Widget
 * Self-contained iframe widget for universal integration
 * Maintains session state, WebSocket connections, and violation detection
 */

class ProctoringWidget {
    constructor() {
        // Configuration from URL parameters or postMessage
        this.config = {
            sessionManagerUrl: 'ws://localhost:8080',
            candidateId: null,
            examId: null,
            organizationId: null,
            enableSimulation: false
        };

        // State management
        this.state = {
            sessionId: null,
            isConnected: false,
            isSessionActive: false,
            isVideoReady: false,
            isInWarmupPeriod: false,
            credibilityScore: 100,
            violations: [],
            connectionAttempts: 0,
            lastHeartbeat: null
        };

        // WebSocket connection
        this.ws = null;
        this.heartbeatInterval = null;
        this.reconnectTimer = null;

        // UI elements
        this.elements = {};

        // Initialize widget
        this.init();
    }

    /**
     * Initialize the widget
     */
    init() {
        this.parseConfig();
        this.bindElements();
        this.setupEventListeners();
        this.loadSessionFromStorage();
        this.connect();

        // Auto-hide after 10 seconds if no interaction
        setTimeout(() => {
            if (!this.isMinimized()) {
                this.minimize();
            }
        }, 10000);
    }

    /**
     * Parse configuration from URL parameters and postMessage
     */
    parseConfig() {
        const urlParams = new URLSearchParams(window.location.search);
        
        this.config.candidateId = urlParams.get('candidateId');
        this.config.examId = urlParams.get('examId');
        this.config.organizationId = urlParams.get('organizationId');
        this.config.sessionManagerUrl = urlParams.get('sessionManager') || this.config.sessionManagerUrl;
        this.config.enableSimulation = urlParams.get('simulation') === 'true';

        // Listen for configuration from parent window
        window.addEventListener('message', (event) => {
            if (event.data.type === 'PROCTOR_CONFIG') {
                Object.assign(this.config, event.data.config);
                this.restart();
            }
        });
    }

    /**
     * Bind DOM elements
     */
    bindElements() {
        this.elements = {
            widget: document.getElementById('proctoring-widget'),
            sessionInfo: document.getElementById('session-info'),
            connectionStatus: document.getElementById('connection-status'),
            videoStatus: document.getElementById('video-status'),
            credibilityScore: document.getElementById('credibility-score'),
            violationCount: document.getElementById('violation-count'),
            violationsList: document.getElementById('violations-list'),
            alertOverlay: document.getElementById('alert-overlay')
        };
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Window events
        window.addEventListener('beforeunload', () => {
            this.disconnect();
        });

        // Storage events for session persistence
        window.addEventListener('storage', (event) => {
            if (event.key === 'proctor_session') {
                this.loadSessionFromStorage();
            }
        });

        // Browser events for violation detection
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.reportViolation('tab_focus_lost', 'Browser tab lost focus', 'warning');
            }
        });

        window.addEventListener('blur', () => {
            this.reportViolation('window_blur', 'Window lost focus', 'warning');
        });

        // Fullscreen detection
        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement) {
                this.reportViolation('fullscreen_exit', 'Exited fullscreen mode', 'warning');
            }
        });
    }

    /**
     * Connect to session manager WebSocket
     */
    connect() {
        if (!this.config.candidateId || !this.config.examId) {
            console.warn('Missing required configuration for proctoring widget');
            return;
        }

        try {
            this.updateStatus('connection', 'connecting', 'Connecting...');
            
            this.ws = new WebSocket(this.config.sessionManagerUrl);
            
            this.ws.onopen = () => {
                console.log('Connected to session manager');
                this.state.isConnected = true;
                this.state.connectionAttempts = 0;
                this.updateStatus('connection', 'connected', 'Connected');
                this.startSession();
                this.startHeartbeat();
            };

            this.ws.onmessage = (event) => {
                this.handleMessage(JSON.parse(event.data));
            };

            this.ws.onclose = () => {
                console.log('Disconnected from session manager');
                this.state.isConnected = false;
                this.updateStatus('connection', 'disconnected', 'Disconnected');
                this.stopHeartbeat();
                this.scheduleReconnect();
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.state.connectionAttempts++;
                this.updateStatus('connection', 'disconnected', 'Connection failed');
            };

        } catch (error) {
            console.error('Failed to connect to session manager:', error);
            this.updateStatus('connection', 'disconnected', 'Connection failed');
            this.scheduleReconnect();
        }
    }

    /**
     * Disconnect from session manager
     */
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.stopHeartbeat();
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }
    }

    /**
     * Schedule reconnection attempt
     */
    scheduleReconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }

        const delay = Math.min(5000 * Math.pow(2, this.state.connectionAttempts), 30000);
        console.log(`Reconnecting in ${delay / 1000} seconds...`);

        this.reconnectTimer = setTimeout(() => {
            if (!this.state.isConnected) {
                this.connect();
            }
        }, delay);
    }

    /**
     * Start session
     */
    startSession() {
        if (!this.state.isConnected || this.state.isSessionActive) {
            return;
        }

        const message = {
            type: 'session:start',
            payload: {
                candidateId: this.config.candidateId,
                examId: this.config.examId,
                organizationId: this.config.organizationId,
                timestamp: new Date().toISOString(),
                browserInfo: {
                    userAgent: navigator.userAgent,
                    language: navigator.language,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                }
            }
        };

        this.sendMessage(message);
        this.state.isInWarmupPeriod = true;
        this.updateStatus('video', 'connecting', 'Initializing...');

        // Simulate warmup period (3-5 seconds)
        setTimeout(() => {
            this.state.isInWarmupPeriod = false;
            this.state.isVideoReady = true;
            this.updateStatus('video', 'connected', 'Active');
            
            if (this.config.enableSimulation) {
                this.startSimulation();
            }
        }, 4000);
    }

    /**
     * Handle incoming WebSocket messages
     */
    handleMessage(message) {
        switch (message.type) {
            case 'session:started':
                this.state.sessionId = message.payload.sessionId;
                this.state.isSessionActive = true;
                this.saveSessionToStorage();
                this.updateSessionInfo();
                break;

            case 'violation:detected':
                this.addViolation(message.payload);
                break;

            case 'credibility:updated':
                this.state.credibilityScore = message.payload.score;
                this.updateCredibilityScore();
                break;

            case 'session:ended':
                this.state.isSessionActive = false;
                this.clearSessionFromStorage();
                break;

            case 'heartbeat:ack':
                this.state.lastHeartbeat = new Date();
                break;
        }
    }

    /**
     * Send message to session manager
     */
    sendMessage(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }

    /**
     * Start heartbeat to maintain connection
     */
    startHeartbeat() {
        this.stopHeartbeat();
        this.heartbeatInterval = setInterval(() => {
            this.sendMessage({ type: 'heartbeat', payload: { timestamp: new Date().toISOString() } });
        }, 30000);
    }

    /**
     * Stop heartbeat
     */
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    /**
     * Report violation
     */
    reportViolation(type, description, severity = 'warning') {
        if (!this.state.isSessionActive) {
            return;
        }

        const violation = {
            id: `violation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type,
            description,
            severity,
            timestamp: new Date().toISOString(),
            sessionId: this.state.sessionId
        };

        this.sendMessage({
            type: 'violation:report',
            payload: violation
        });

        this.addViolation(violation);
        this.showAlert(violation);
    }

    /**
     * Add violation to local state
     */
    addViolation(violation) {
        this.state.violations.push(violation);
        this.state.violations = this.state.violations.slice(-10); // Keep last 10
        this.updateViolationsList();
    }

    /**
     * Show alert notification
     */
    showAlert(violation) {
        const alert = document.createElement('div');
        alert.className = `alert-notification ${violation.severity}`;
        alert.textContent = violation.description;

        this.elements.alertOverlay.appendChild(alert);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (alert.parentNode) {
                alert.parentNode.removeChild(alert);
            }
        }, 5000);

        // Notify parent window
        window.parent.postMessage({
            type: 'PROCTOR_VIOLATION_ALERT',
            violation
        }, '*');
    }

    /**
     * Update status indicators
     */
    updateStatus(type, status, text) {
        const element = this.elements[type + 'Status'];
        if (!element) return;

        // Update text
        const textNode = element.childNodes[element.childNodes.length - 1];
        if (textNode) {
            textNode.textContent = text;
        }

        // Update dot color
        const dot = element.querySelector('.status-dot') || element.querySelector('.loading');
        if (dot) {
            dot.className = dot.className.includes('loading') ? '' : 'status-dot';
            
            switch (status) {
                case 'connected':
                    dot.className = 'status-dot dot-green';
                    break;
                case 'connecting':
                    dot.className = 'loading';
                    break;
                case 'disconnected':
                    dot.className = 'status-dot dot-red';
                    break;
            }
        }

        // Update status class
        element.className = element.className.replace(/status-\w+/g, '') + ` status-${status}`;
    }

    /**
     * Update credibility score display
     */
    updateCredibilityScore() {
        const element = this.elements.credibilityScore;
        element.textContent = `${this.state.credibilityScore}%`;
        
        // Update color based on score
        element.className = element.className.replace(/credibility-\w+/g, '');
        if (this.state.credibilityScore >= 80) {
            element.classList.add('credibility-high');
        } else if (this.state.credibilityScore >= 60) {
            element.classList.add('credibility-medium');
        } else {
            element.classList.add('credibility-low');
        }
    }

    /**
     * Update violations list display
     */
    updateViolationsList() {
        const list = this.elements.violationsList;
        const count = this.elements.violationCount;
        
        count.textContent = this.state.violations.length;
        
        if (this.state.violations.length === 0) {
            list.innerHTML = '<div style="text-align: center; color: #6b7280; font-size: 11px; margin-top: 20px;">No violations detected</div>';
            return;
        }

        list.innerHTML = this.state.violations.slice(-5).reverse().map(violation => {
            return `
                <div class="violation-item ${violation.severity}">
                    <div class="violation-type">${violation.description}</div>
                    <div class="violation-time">${new Date(violation.timestamp).toLocaleTimeString()}</div>
                </div>
            `;
        }).join('');
    }

    /**
     * Update session information display
     */
    updateSessionInfo() {
        if (this.state.sessionId) {
            this.elements.sessionInfo.textContent = `Session: ${this.state.sessionId.slice(-8)}`;
        } else {
            this.elements.sessionInfo.textContent = 'Session: Not connected';
        }
    }

    /**
     * Save session to local storage
     */
    saveSessionToStorage() {
        const sessionData = {
            sessionId: this.state.sessionId,
            candidateId: this.config.candidateId,
            examId: this.config.examId,
            startTime: new Date().toISOString(),
            credibilityScore: this.state.credibilityScore,
            violations: this.state.violations
        };

        localStorage.setItem('proctor_session', JSON.stringify(sessionData));
    }

    /**
     * Load session from local storage
     */
    loadSessionFromStorage() {
        const savedSession = localStorage.getItem('proctor_session');
        if (savedSession) {
            try {
                const sessionData = JSON.parse(savedSession);
                this.state.sessionId = sessionData.sessionId;
                this.state.credibilityScore = sessionData.credibilityScore || 100;
                this.state.violations = sessionData.violations || [];
                
                this.updateSessionInfo();
                this.updateCredibilityScore();
                this.updateViolationsList();
            } catch (error) {
                console.error('Failed to load session from storage:', error);
                this.clearSessionFromStorage();
            }
        }
    }

    /**
     * Clear session from local storage
     */
    clearSessionFromStorage() {
        localStorage.removeItem('proctor_session');
    }

    /**
     * Start violation simulation for testing
     */
    startSimulation() {
        const simulationViolations = [
            { type: 'background_noise', description: 'Background noise detected', severity: 'info' },
            { type: 'face_not_visible', description: 'Face not clearly visible', severity: 'warning' },
            { type: 'multiple_people', description: 'Multiple people detected', severity: 'critical' },
            { type: 'tab_switch', description: 'Switched to another tab', severity: 'warning' },
            { type: 'camera_blocked', description: 'Camera appears to be blocked', severity: 'critical' }
        ];

        let violationIndex = 0;
        const simulateViolation = () => {
            if (!this.state.isSessionActive || !this.config.enableSimulation) {
                return;
            }

            const violation = simulationViolations[violationIndex % simulationViolations.length];
            this.reportViolation(violation.type, violation.description, violation.severity);
            
            // Decrease credibility score
            this.state.credibilityScore = Math.max(30, this.state.credibilityScore - Math.random() * 15);
            this.updateCredibilityScore();
            
            violationIndex++;
            setTimeout(simulateViolation, 8000 + Math.random() * 12000); // 8-20 seconds
        };

        setTimeout(simulateViolation, 5000); // Start after 5 seconds
    }

    /**
     * Toggle minimized state
     */
    toggleMinimize() {
        if (this.isMinimized()) {
            this.expand();
        } else {
            this.minimize();
        }
    }

    /**
     * Check if widget is minimized
     */
    isMinimized() {
        return this.elements.widget.classList.contains('minimized');
    }

    /**
     * Minimize widget
     */
    minimize() {
        this.elements.widget.classList.add('minimized');
        
        // Notify parent window
        window.parent.postMessage({
            type: 'PROCTOR_WIDGET_MINIMIZED'
        }, '*');
    }

    /**
     * Expand widget
     */
    expand() {
        this.elements.widget.classList.remove('minimized');
        
        // Notify parent window
        window.parent.postMessage({
            type: 'PROCTOR_WIDGET_EXPANDED'
        }, '*');
    }

    /**
     * Restart widget with new configuration
     */
    restart() {
        this.disconnect();
        this.state = {
            sessionId: null,
            isConnected: false,
            isSessionActive: false,
            isVideoReady: false,
            isInWarmupPeriod: false,
            credibilityScore: 100,
            violations: [],
            connectionAttempts: 0,
            lastHeartbeat: null
        };
        this.connect();
    }
}

// Global functions for HTML interaction
window.toggleMinimize = function() {
    if (window.proctoringWidget) {
        window.proctoringWidget.toggleMinimize();
    }
};

// Initialize widget when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.proctoringWidget = new ProctoringWidget();
    });
} else {
    window.proctoringWidget = new ProctoringWidget();
}