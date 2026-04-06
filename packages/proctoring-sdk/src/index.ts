/**
 * Agentic AI Proctoring SDK
 * Universal integration for any web application
 * 
 * Usage:
 * <script src="https://proctor.yourdomain.com/sdk.js"></script>
 * <script>
 *   ProctorSDK.init({
 *     candidateId: 'student001@cs.university.edu',
 *     examId: 'financial-literacy-demo',
 *     organizationId: 'cs-dept-uuid',
 *     sessionManager: 'ws://localhost:8080'
 *   });
 * </script>
 */

interface ProctoringConfig {
  candidateId: string;
  examId: string;
  organizationId?: string;
  sessionManager?: string;
  enableSimulation?: boolean;
  widgetUrl?: string;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'custom';
  autoStart?: boolean;
  minimized?: boolean;
}

interface ViolationEvent {
  id: string;
  type: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  timestamp: string;
  credibilityScore?: number;
}

class ProctorSDK {
  private static instance: ProctorSDK | null = null;
  private iframe: HTMLIFrameElement | null = null;
  private config: Required<ProctoringConfig> = {
    candidateId: '',
    examId: '',
    organizationId: '',
    sessionManager: 'ws://localhost:8080',
    enableSimulation: false,
    widgetUrl: '/packages/proctoring-widget/src/widget.html',
    position: 'top-right',
    autoStart: true,
    minimized: false
  };
  private isInitialized = false;
  private eventListeners: { [key: string]: Function[] } = {};

  /**
   * Initialize the proctoring SDK
   */
  static init(config: ProctoringConfig): ProctorSDK {
    if (ProctorSDK.instance) {
      ProctorSDK.instance.destroy();
    }

    ProctorSDK.instance = new ProctorSDK();
    ProctorSDK.instance.initialize(config);
    return ProctorSDK.instance;
  }

  /**
   * Get the current SDK instance
   */
  static getInstance(): ProctorSDK | null {
    return ProctorSDK.instance;
  }

  /**
   * Private constructor - use ProctorSDK.init() instead
   */
  private constructor() {
    this.setupMessageListener();
  }

  /**
   * Initialize the widget
   */
  private initialize(config: Partial<ProctoringConfig>): void {
    // Merge configuration with defaults
    this.config = { ...this.config, ...config };

    // Validate required configuration
    if (!this.config.candidateId || !this.config.examId) {
      throw new Error('candidateId and examId are required');
    }

    // Create and embed widget iframe
    this.createWidget();
    this.isInitialized = true;

    console.log('Agentic AI Proctoring SDK initialized', {
      candidateId: this.config.candidateId,
      examId: this.config.examId,
      organizationId: this.config.organizationId
    });

    // Auto-start if configured
    if (this.config.autoStart) {
      this.start();
    }
  }

  /**
   * Create and embed the widget iframe
   */
  private createWidget(): void {
    // Remove existing widget if any
    this.removeWidget();

    // Create iframe
    this.iframe = document.createElement('iframe');
    this.iframe.id = 'agentic-proctor-widget';
    
    // Build widget URL with configuration
    const widgetUrl = new URL(this.config.widgetUrl, window.location.origin);
    widgetUrl.searchParams.set('candidateId', this.config.candidateId);
    widgetUrl.searchParams.set('examId', this.config.examId);
    widgetUrl.searchParams.set('organizationId', this.config.organizationId);
    widgetUrl.searchParams.set('sessionManager', this.config.sessionManager);
    widgetUrl.searchParams.set('simulation', this.config.enableSimulation.toString());

    this.iframe.src = widgetUrl.toString();

    // Configure iframe properties
    this.iframe.style.cssText = `
      position: fixed;
      top: 0;
      right: 0;
      width: 300px;
      height: 100vh;
      border: none;
      z-index: 999999;
      pointer-events: auto;
      background: transparent;
      transition: all 0.3s ease;
    `;

    // Apply position
    this.applyPosition();

    // Apply initial minimized state
    if (this.config.minimized) {
      this.minimize();
    }

    // Add to DOM
    document.body.appendChild(this.iframe);

    // Wait for iframe to load, then send configuration
    this.iframe.onload = () => {
      this.sendToWidget({
        type: 'PROCTOR_CONFIG',
        config: {
          candidateId: this.config.candidateId,
          examId: this.config.examId,
          organizationId: this.config.organizationId,
          sessionManager: this.config.sessionManager,
          enableSimulation: this.config.enableSimulation
        }
      });
    };
  }

  /**
   * Apply positioning to the widget
   */
  private applyPosition(): void {
    if (!this.iframe) return;

    const styles: { [key: string]: string } = {};

    switch (this.config.position) {
      case 'top-left':
        styles.top = '0';
        styles.left = '0';
        styles.right = 'auto';
        styles.bottom = 'auto';
        break;
      case 'bottom-left':
        styles.bottom = '0';
        styles.left = '0';
        styles.right = 'auto';
        styles.top = 'auto';
        break;
      case 'bottom-right':
        styles.bottom = '0';
        styles.right = '0';
        styles.left = 'auto';
        styles.top = 'auto';
        break;
      case 'top-right':
      default:
        styles.top = '0';
        styles.right = '0';
        styles.left = 'auto';
        styles.bottom = 'auto';
        break;
    }

    Object.assign(this.iframe.style, styles);
  }

  /**
   * Remove the widget from DOM
   */
  private removeWidget(): void {
    const existing = document.getElementById('agentic-proctor-widget');
    if (existing) {
      existing.remove();
    }
    this.iframe = null;
  }

  /**
   * Setup message listener for iframe communication
   */
  private setupMessageListener(): void {
    window.addEventListener('message', (event) => {
      // Verify origin if needed
      // if (event.origin !== expectedOrigin) return;

      const { type, ...data } = event.data;

      switch (type) {
        case 'PROCTOR_VIOLATION_ALERT':
          this.emit('violation', data.violation);
          break;

        case 'PROCTOR_WIDGET_MINIMIZED':
          this.emit('minimized');
          break;

        case 'PROCTOR_WIDGET_EXPANDED':
          this.emit('expanded');
          break;

        case 'PROCTOR_SESSION_STARTED':
          this.emit('session:started', data);
          break;

        case 'PROCTOR_SESSION_ENDED':
          this.emit('session:ended', data);
          break;

        case 'PROCTOR_CREDIBILITY_UPDATED':
          this.emit('credibility:updated', data.score);
          break;
      }
    });
  }

  /**
   * Send message to widget iframe
   */
  private sendToWidget(message: any): void {
    if (this.iframe && this.iframe.contentWindow) {
      this.iframe.contentWindow.postMessage(message, '*');
    }
  }

  /**
   * Public API Methods
   */

  /**
   * Start proctoring session
   */
  start(): void {
    if (!this.isInitialized) {
      throw new Error('SDK not initialized. Call ProctorSDK.init() first.');
    }

    this.sendToWidget({ type: 'PROCTOR_START' });
    this.emit('started');
  }

  /**
   * Stop proctoring session
   */
  stop(): void {
    this.sendToWidget({ type: 'PROCTOR_STOP' });
    this.emit('stopped');
  }

  /**
   * Pause proctoring session
   */
  pause(): void {
    this.sendToWidget({ type: 'PROCTOR_PAUSE' });
    this.emit('paused');
  }

  /**
   * Resume proctoring session
   */
  resume(): void {
    this.sendToWidget({ type: 'PROCTOR_RESUME' });
    this.emit('resumed');
  }

  /**
   * Minimize the widget
   */
  minimize(): void {
    if (this.iframe) {
      this.iframe.style.width = '60px';
      this.iframe.style.height = '60px';
      this.iframe.style.borderRadius = '50%';
    }
    this.sendToWidget({ type: 'PROCTOR_MINIMIZE' });
  }

  /**
   * Expand the widget
   */
  expand(): void {
    if (this.iframe) {
      this.iframe.style.width = '300px';
      this.iframe.style.height = '100vh';
      this.iframe.style.borderRadius = '0';
    }
    this.sendToWidget({ type: 'PROCTOR_EXPAND' });
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ProctoringConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.sendToWidget({
      type: 'PROCTOR_CONFIG_UPDATE',
      config: newConfig
    });
  }

  /**
   * Show/hide the widget
   */
  show(): void {
    if (this.iframe) {
      this.iframe.style.display = 'block';
    }
  }

  hide(): void {
    if (this.iframe) {
      this.iframe.style.display = 'none';
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<ProctoringConfig> {
    return { ...this.config };
  }

  /**
   * Check if SDK is initialized
   */
  isReady(): boolean {
    return this.isInitialized && !!this.iframe;
  }

  /**
   * Event Management
   */

  /**
   * Add event listener
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  /**
   * Remove event listener
   */
  off(event: string, callback?: Function): void {
    if (!this.eventListeners[event]) return;

    if (callback) {
      this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
    } else {
      this.eventListeners[event] = [];
    }
  }

  /**
   * Emit event
   */
  private emit(event: string, ...args: any[]): void {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in event listener for '${event}':`, error);
        }
      });
    }
  }

  /**
   * Destroy the SDK instance
   */
  destroy(): void {
    this.removeWidget();
    this.eventListeners = {};
    this.isInitialized = false;
    ProctorSDK.instance = null;
  }
}

// Global window object
declare global {
  interface Window {
    ProctorSDK: typeof ProctorSDK;
  }
}

// Export for global access
if (typeof window !== 'undefined') {
  window.ProctorSDK = ProctorSDK;
}

export default ProctorSDK;
export { ProctoringConfig, ViolationEvent };