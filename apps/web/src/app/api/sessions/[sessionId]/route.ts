import { NextRequest, NextResponse } from 'next/server';

// Mock function to generate session details
function generateSessionDetail(sessionId: string) {
  // Try to find the session from our mock generator
  const now = new Date();
  
  // Generate consistent data based on sessionId
  const hash = sessionId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  const organizations = [
    '554be9e2-7918-4c1f-8d5b-ad2a3a2abd94', // CS University
    '443be9e2-7918-4c1f-8d5b-ad2a3a2abd95', // Engineering College
    '332be9e2-7918-4c1f-8d5b-ad2a3a2abd96'  // Business School
  ];
  
  const candidates = [
    'student001@cs.university.edu',
    'student002@cs.university.edu', 
    'student003@cs.university.edu',
    'student101@eng.college.edu',
    'student102@eng.college.edu',
    'student201@business.school.edu'
  ];
  
  const candidateId = candidates[hash % candidates.length];
  const organizationId = organizations[hash % organizations.length];
  
  // Determine exam based on organization
  let examId = 'financial-literacy-2026';
  if (candidateId.includes('@eng.college.edu')) {
    examId = 'engineering-midterm-2024';
  } else if (candidateId.includes('@business.school.edu')) {
    examId = 'business-final-2024';
  }
  
  const isActive = hash % 3 === 0;
  const status = isActive ? 'active' : 'completed';
  
  // Generate violations based on candidate
  const violations = [];
  const violationTypes = [
    { type: 'background_noise', severity: 'warning', description: 'Background noise detected during exam' },
    { type: 'multiple_people', severity: 'critical', description: 'Multiple people detected in camera feed' },
    { type: 'multiple_voices', severity: 'critical', description: 'Multiple speakers detected in audio' },
    { type: 'camera_blocked', severity: 'critical', description: 'Camera view was blocked or obstructed' },
    { type: 'face_not_visible', severity: 'warning', description: 'Candidate face not visible in camera' },
    { type: 'tab_focus_lost', severity: 'warning', description: 'Browser tab lost focus' },
    { type: 'fullscreen_exit', severity: 'warning', description: 'Exited fullscreen exam mode' }
  ];
  
  // Generate violations based on candidate risk profile
  let numViolations = 0;
  if (candidateId.includes('student002') || candidateId.includes('student102')) {
    numViolations = 2 + (hash % 3); // 2-4 violations
  } else if (candidateId.includes('student003') || candidateId.includes('student101') || candidateId.includes('student201')) {
    numViolations = 4 + (hash % 4); // 4-7 violations  
  } else {
    numViolations = hash % 2; // 0-1 violations for clean sessions
  }
  
  for (let i = 0; i < numViolations; i++) {
    const violation = violationTypes[(hash + i) % violationTypes.length];
    const minutesAgo = 5 + ((hash + i) % 45); // 5-50 minutes ago
    const timestamp = new Date(now.getTime() - minutesAgo * 60 * 1000);
    
    violations.push({
      id: `violation-${i}`,
      type: violation.type,
      severity: violation.severity,
      timestamp: timestamp.toISOString(),
      description: violation.description,
      confidence: 75 + ((hash + i) % 20), // 75-94% confidence
      resolved: false,
      source: 'ai-proctor'
    });
  }
  
  // Calculate credibility score based on violations
  let credibilityScore = 95;
  violations.forEach(v => {
    if (v.severity === 'critical') credibilityScore -= 15;
    else if (v.severity === 'warning') credibilityScore -= 8;
    else credibilityScore -= 3;
  });
  credibilityScore = Math.max(credibilityScore, 25);
  
  // Determine risk level
  let riskLevel = 'low';
  if (credibilityScore < 60) riskLevel = 'critical';
  else if (credibilityScore < 80) riskLevel = 'high';
  else if (credibilityScore < 90) riskLevel = 'medium';
  
  const duration = 1800 + (hash % 1200); // 30-50 minutes
  const startTime = new Date(now.getTime() - duration * 1000);
  
  return {
    sessionId,
    candidateId,
    candidateName: candidateId.split('@')[0],
    examId,
    organizationId,
    status,
    score: Math.min(95, 60 + (hash % 35)),
    credibilityScore,
    riskLevel,
    violations,
    duration,
    startedAt: startTime.toISOString(),
    completedAt: status === 'completed' ? now.toISOString() : null,
    aiAgents: {
      vision: { status: 'active', healthScore: 90 + (hash % 10) },
      audio: { status: 'active', healthScore: 88 + (hash % 12) },
      behavior: { status: 'active', healthScore: 92 + (hash % 8) }
    }
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = params.sessionId;
    
    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session ID is required'
        },
        { status: 400 }
      );
    }
    
    console.log(`🔍 Fetching session detail for ID: ${sessionId}`);
    
    // Generate session detail
    const sessionDetail = generateSessionDetail(sessionId);
    
    console.log(`✅ Generated session detail for ${sessionDetail.candidateId} (${sessionDetail.violations.length} violations)`);
    
    return NextResponse.json({
      success: true,
      session: sessionDetail
    });
    
  } catch (error) {
    console.error('❌ Session Detail API Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch session detail',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}