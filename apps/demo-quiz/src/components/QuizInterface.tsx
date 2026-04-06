'use client';

import { useState, useEffect, useMemo, memo } from 'react';
import { Clock, CheckCircle, AlertCircle, ArrowRight, ArrowLeft, Shield, Camera, Eye, AlertTriangle, Wifi } from 'lucide-react';
import { useProctoring } from '@/hooks/useProctoring';

interface QuizInterfaceProps {
  candidateData: {
    candidateId: string;
    accessCode: string;
    sessionId: string;
  };
  onLogout: () => void;
}

// Demo quiz data
const DEMO_QUESTIONS = [
  {
    question: "What is the primary purpose of diversification in investing?",
    options: [
      "To maximize returns regardless of risk",
      "To minimize risk by spreading investments across different assets",
      "To concentrate wealth in the best performing stocks",
      "To time the market effectively"
    ],
    correct: 1
  },
  {
    question: "Which of the following best describes compound interest?",
    options: [
      "Interest paid only on the original principal",
      "Interest that decreases over time",
      "Interest earned on both the original principal and previously earned interest",
      "Interest paid at the end of an investment term only"
    ],
    correct: 2
  },
  {
    question: "What is a credit score primarily used for?",
    options: [
      "To determine investment returns",
      "To assess creditworthiness for loans and financial products",
      "To calculate tax obligations",
      "To measure inflation rates"
    ],
    correct: 1
  },
  {
    question: "Which type of account typically offers the highest liquidity?",
    options: [
      "Certificate of Deposit (CD)",
      "Savings Account",
      "Money Market Account",  
      "Checking Account"
    ],
    correct: 3
  },
  {
    question: "What does APR stand for in financial terms?",
    options: [
      "Annual Percentage Rate",
      "Average Principal Return",
      "Automated Payment Reminder",
      "Asset Protection Ratio"
    ],
    correct: 0
  }
];

const QuizInterface = memo(function QuizInterface({ candidateData, onLogout }: QuizInterfaceProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(1800); // 30 minutes
  const [isCompleted, setIsCompleted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [simulationEnabled, setSimulationEnabled] = useState(false); // Simulation toggle
  const [alerts, setAlerts] = useState<any[]>([]); // Violation alerts for candidate

  // Map candidateData to expected org structure - memoize to prevent changes
  const organizationId = useMemo(() => {
    if (candidateData.accessCode.startsWith('EXAM')) return '554be9e2-7918-4c1f-8d5b-ad2a3a2abd94'; // CS
    if (candidateData.accessCode.startsWith('MIDTERM')) return '123e4567-e89b-12d3-a456-426614174000'; // ENG
    return '987fcdeb-51a2-43d7-8f9e-123456789abc'; // Business
  }, [candidateData.accessCode]);

  // Memoize proctoring options to prevent unnecessary re-renders
  const proctoringOptions = useMemo(() => ({
    candidateId: candidateData.candidateId,
    examId: 'financial-literacy-demo',
    organizationId,
    enableSimulation: simulationEnabled
  }), [candidateData.candidateId, organizationId, simulationEnabled]);

  const {
    sessionId,
    isConnected,
    isSessionActive,
    violations,
    credibilityScore,
    riskLevel,
    isVideoReady,
    isInWarmupPeriod,
    startSession,
    endSession,
    triggerViolation,
    connect
  } = useProctoring(proctoringOptions);

  // Listen for new violations and show alerts
  useEffect(() => {
    if (violations.length > 0) {
      const lastViolation = violations[violations.length - 1];
      if (lastViolation.isAlert && !alerts.find(a => a.id === lastViolation.id)) {
        setAlerts(prev => [...prev, lastViolation]);
        
        // Auto-remove alert after 5 seconds
        setTimeout(() => {
          setAlerts(prev => prev.filter(a => a.id !== lastViolation.id));
        }, 5000);
      }
    }
  }, [violations, alerts]);

  // Timer
  useEffect(() => {
    if (isSessionActive && timeLeft > 0 && !isCompleted) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !isCompleted) {
      handleSubmit();
    }
  }, [timeLeft, isSessionActive, isCompleted]);

  // Manual violation triggers for testing
  const testViolations = [
    { type: 'tab-switch', description: 'Switched to another browser tab', severity: 'warning' as const },
    { type: 'face-not-visible', description: 'Face not clearly visible', severity: 'critical' as const },
    { type: 'multiple-faces', description: 'Multiple people detected', severity: 'critical' as const },
    { type: 'audio-anomaly', description: 'Background conversation detected', severity: 'info' as const }
  ];

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerSelect = (answerIndex: number) => {
    setAnswers(prev => ({ ...prev, [currentQuestion]: answerIndex }));
  };

  const handleNext = () => {
    if (currentQuestion < DEMO_QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = () => {
    setIsCompleted(true);
    setShowResults(true);
    endSession();
  };

  const calculateScore = () => {
    let correct = 0;
    DEMO_QUESTIONS.forEach((q, index) => {
      if (answers[index] === q.correct) correct++;
    });
    return Math.round((correct / DEMO_QUESTIONS.length) * 100);
  };

  const getAnsweredCount = () => {
    return Object.keys(answers).length;
  };

  // Show results screen
  if (showResults) {
    const finalScore = calculateScore();
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full">
          <div className="text-center">
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Exam Completed</h1>
            
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">Exam Score</h3>
                  <p className="text-3xl font-bold text-blue-600">{finalScore}%</p>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Credibility Score</h3>
                  <p className={`text-3xl font-bold ${riskLevel === 'low' ? 'text-green-600' : 
                    riskLevel === 'medium' ? 'text-yellow-600' : 'text-red-600'}`}>
                    {credibilityScore}%
                  </p>
                </div>
              </div>
            </div>

            {violations.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-yellow-800 mb-2">
                  ⚠️ Violations Detected: {violations.length}
                </h3>
                <div className="text-sm text-yellow-700 max-h-32 overflow-y-auto">
                  {violations.slice(-5).reverse().map((v, i) => (
                    <div key={i} className="mb-1">• {typeof v === 'string' ? v : v.description}</div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-gray-600 mb-6">
              <p>Session ID: {sessionId}</p>
              <p>Completed: {new Date().toLocaleString()}</p>
            </div>

            <button
              onClick={onLogout}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
            >
              Return to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with proctoring status */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Shield className="w-6 h-6 text-blue-600" />
              <span className="font-semibold">Financial Literacy Assessment</span>
              {sessionId && (
                <span className="text-sm text-gray-500">Session: {sessionId.slice(-8)}</span>
              )}
            </div>
            
            <div className="flex items-center space-x-6">
              {/* Connection Status */}
              <div className="flex items-center space-x-2">
                <Wifi className={`w-4 h-4 ${isConnected ? 'text-green-500' : 'text-red-500'}`} />
                <span className={`text-sm font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>

              {/* Video System Status */}
              {isSessionActive && (
                <div className="flex items-center space-x-2">
                  <Camera className={`w-4 h-4 ${isVideoReady ? 'text-green-500' : 'text-yellow-500'}`} />
                  <span className={`text-sm font-medium ${
                    isInWarmupPeriod ? 'text-yellow-600' :
                    isVideoReady ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {isInWarmupPeriod ? 'Initializing...' : 
                     isVideoReady ? 'Video Ready' : 'Video Loading'}
                  </span>
                </div>
              )}

      {/* Credibility Score - with dynamic color coding */}
              {isSessionActive && (
                <div className="flex items-center space-x-2">
                  <Eye className="w-4 h-4 text-blue-500" />
                  <span className={`text-sm font-medium ${
                    credibilityScore >= 80 ? 'text-green-600' : 
                    credibilityScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    Credibility: {credibilityScore}%
                  </span>
                </div>
              )}
              
              {/* Timer */}
              <div className="flex items-center space-x-2">
                <Clock className={`w-5 h-5 ${timeLeft < 300 ? 'text-red-500' : 'text-gray-500'}`} />
                <span className={`font-mono text-lg ${timeLeft < 300 ? 'text-red-600' : 'text-gray-700'}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Violation Alerts */}
      {alerts.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-lg shadow-lg border-l-4 max-w-sm transition-all duration-300 ease-in-out ${
                alert.severity === 'critical' ? 'bg-red-50 border-red-400 text-red-800' :
                alert.severity === 'warning' ? 'bg-yellow-50 border-yellow-400 text-yellow-800' :
                'bg-blue-50 border-blue-400 text-blue-800'
              }`}
            >
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertTriangle className={`h-5 w-5 ${
                    alert.severity === 'critical' ? 'text-red-400' :
                    alert.severity === 'warning' ? 'text-yellow-400' :
                    'text-blue-400'
                  }`} />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">
                    {alert.severity === 'critical' ? 'Critical Violation' :
                     alert.severity === 'warning' ? 'Warning' : 'Notice'}
                  </p>
                  <p className="text-xs mt-1">
                    {alert.message}
                  </p>
                  <p className="text-xs mt-1 opacity-75">
                    Credibility: {alert.credibilityScore}%
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="max-w-4xl mx-auto p-4">
        {/* Session Start */}
        {!isSessionActive && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-4">Ready to Start Your Exam?</h2>
              <p className="text-gray-600 mb-4">
                This is a proctored examination. Your session will be monitored for violations.
              </p>
              <p className="text-sm text-blue-600 mb-6">
                🎥 AI proctoring will initialize after exam start (warmup period)
              </p>
              
              {/* Simulation Toggle */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-center space-x-3">
                  <span className="text-sm font-medium text-yellow-800">Testing Mode:</span>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={simulationEnabled}
                      onChange={(e) => setSimulationEnabled(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-yellow-800">Enable Violation Simulation</span>
                  </label>
                </div>
                <p className="text-xs text-yellow-600 mt-2">
                  When checked, automatic violation testing will occur during the exam
                </p>
              </div>
              
              <button
                onClick={startSession}
                disabled={!isConnected}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Start Secured Exam
              </button>
              {!isConnected && (
                <p className="text-red-500 text-sm mt-2">Connecting to proctoring server...</p>
              )}
            </div>
          </div>
        )}

        {/* System Initialization Status */}
        {isSessionActive && isInWarmupPeriod && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-600 border-t-transparent"></div>
              <div>
                <h3 className="font-medium text-yellow-800">Setting up AI Proctoring</h3>
                <p className="text-sm text-yellow-700">
                  Initializing video and behavioral analysis systems... Please remain seated and face the camera.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* System Ready Status */}
        {isSessionActive && !isInWarmupPeriod && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <h3 className="font-medium text-green-800">AI Proctoring Active</h3>
                <p className="text-sm text-green-700">
                  Video monitoring and behavioral analysis are now operational. You may begin your exam.
                </p>
              </div>
            </div>
          </div>
        )}
                      onChange={(e) => setSimulationEnabled(e.target.checked)}
                      className="w-4 h-4 text-yellow-600 border-yellow-300 rounded focus:ring-yellow-500"
                    />
                    <span className="text-sm text-yellow-700">
                      {simulationEnabled ? '🎭 Demo Mode (Simulated violations)' : '🔍 Real Mode (Your actions only)'}
                    </span>
                  </label>
                </div>
                <p className="text-xs text-yellow-600 mt-2 text-center">
                  {simulationEnabled 
                    ? 'Will generate random violations every 10 seconds for demo purposes'
                    : 'Only real browser events (tab switches, right clicks, etc.) will be detected'
                  }
                </p>
              </div>
              
              <button
                onClick={startSession}
                disabled={!isConnected}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isConnected ? 'Start Exam' : 'Connecting...'}
              </button>
            </div>
          </div>
        )}

        {/* Quiz Interface */}
        {isSessionActive && (
          <>
            {/* Progress Bar */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">
                  Question {currentQuestion + 1} of {DEMO_QUESTIONS.length}
                </span>
                <span className="text-sm text-gray-600">
                  Answered: {getAnsweredCount()}/{DEMO_QUESTIONS.length}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentQuestion + 1) / DEMO_QUESTIONS.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Question */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                {DEMO_QUESTIONS[currentQuestion].question}
              </h2>
              
              <div className="space-y-3">
                {DEMO_QUESTIONS[currentQuestion].options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(index)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      answers[currentQuestion] === index
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center">
                      <div className={`w-6 h-6 rounded-full border-2 mr-3 flex items-center justify-center ${
                        answers[currentQuestion] === index
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300'
                      }`}>
                        {answers[currentQuestion] === index && (
                          <div className="w-3 h-3 rounded-full bg-white" />
                        )}
                      </div>
                      <span className="text-gray-900">{option}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between">
              <button
                onClick={handlePrevious}
                disabled={currentQuestion === 0}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <div className="flex space-x-3">
                {/* Test Violation Buttons - only non-video violations during warmup */}
                {testViolations
                  .filter(v => isInWarmupPeriod ? 
                    !['face-not-visible', 'multiple-faces'].includes(v.type) : true
                  )
                  .map((violation, index) => (
                  <button
                    key={index}
                    onClick={() => triggerViolation(violation)}
                    disabled={isInWarmupPeriod && ['face-not-visible', 'multiple-faces'].includes(violation.type)}
                    className={`px-3 py-1 text-xs rounded transition-opacity ${
                      isInWarmupPeriod && ['face-not-visible', 'multiple-faces'].includes(violation.type) ? 
                        'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400' :
                        (violation.severity === 'critical' ? 'bg-red-100 text-red-700 hover:bg-red-200' :
                         violation.severity === 'warning' ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' :
                         'bg-gray-100 text-gray-700 hover:bg-gray-200')
                    }`}
                    title={isInWarmupPeriod && ['face-not-visible', 'multiple-faces'].includes(violation.type) ? 
                      'Video system initializing...' : `Test: ${violation.description}`}
                  >
                    Test {violation.type.split('-')[0]}
                  </button>
                ))}
              </div>

              {currentQuestion === DEMO_QUESTIONS.length - 1 ? (
                <button
                  onClick={handleSubmit}
                  className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Submit Exam</span>
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  disabled={currentQuestion >= DEMO_QUESTIONS.length - 1}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Next</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* System Status Display */}
            {isSessionActive && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-4">
                    <div className={`flex items-center space-x-2 ${
                      isInWarmupPeriod ? 'text-yellow-700' : 'text-green-700'
                    }`}>
                      <Camera className="w-4 h-4" />
                      <span>
                        {isInWarmupPeriod ? '🕐 Video system initializing...' :
                         isVideoReady ? '✅ Video monitoring active' : '⚠️ Video loading'}
                      </span>
                    </div>
                    
                    {/* Simulation Status */}
                    <div className={`flex items-center space-x-2 ${
                      simulationEnabled ? 'text-orange-700' : 'text-blue-700'
                    }`}>
                      <span className="text-xs">
                        {simulationEnabled ? '🎭 Demo violations active' : '🔍 Real violations only'}
                      </span>
                    </div>
                    
                    {isInWarmupPeriod && (
                      <span className="text-blue-600">
                        📊 Behavioral monitoring active
                      </span>
                    )}
                  </div>
                  <div className="text-blue-600 font-medium">
                    Session: {sessionId?.slice(-8)}
                  </div>
                </div>
              </div>
            )}

            {/* Violation Display */}
            {violations.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span className="font-semibold text-red-800">
                    Recent Violations ({violations.length})
                  </span>
                </div>
                <div className="text-sm text-red-700 max-h-32 overflow-y-auto">
                  {violations.slice(-3).reverse().map((v, i) => (
                    <div key={i} className="mb-1">
                      • {typeof v === 'string' ? v : v.description}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
});

export default QuizInterface;