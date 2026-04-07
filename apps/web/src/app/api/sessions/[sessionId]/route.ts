import { NextRequest, NextResponse } from 'next/server';
import WebSocket from 'ws';

/**
 * Fetch a real session from the session manager via one-shot WebSocket request.
 * Falls back to 404 if the session doesn't exist.
 */
function fetchSessionFromManager(sessionId: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('ws://localhost:8081?type=admin');
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('Timeout fetching session'));
    }, 3000);

    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'admin:request_sessions' }));
    });

    ws.on('message', (data: any) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'sessions:list') {
          clearTimeout(timeout);
          const session = (msg.data || []).find((s: any) => s.sessionId === sessionId);
          ws.close();
          resolve(session || null);
        }
      } catch { /* ignore parse errors */ }
    });

    ws.on('error', (err: any) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = params.sessionId;
    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Session ID is required' }, { status: 400 });
    }

    console.log(`🔍 Fetching REAL session detail for ID: ${sessionId}`);

    const session = await fetchSessionFromManager(sessionId);

    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    // Calculate duration
    const startedAt = session.startedAt ? new Date(session.startedAt) : new Date();
    const endedAt = session.completedAt ? new Date(session.completedAt) : new Date();
    const duration = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);

    // Sort violations reverse chronologically (newest first)
    const sortedViolations = (session.violations || [])
      .map((v: any, i: number) => ({
        id: v.id || `v-${i}`,
        type: v.type,
        severity: v.severity || 'warning',
        timestamp: v.timestamp,
        description: v.description,
        confidence: v.confidence || 85,
        resolved: false,
        source: v.source || 'browser-monitor',
        evidence: v.evidence || null
      }))
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        shortId: session.shortId || session.sessionId.slice(0, 8),
        candidateId: session.candidateId,
        candidateName: session.candidateId,
        examId: session.examId,
        organizationId: session.organizationId,
        status: session.status || 'active',
        score: session.score || 0,
        credibilityScore: session.credibilityScore ?? 100,
        riskLevel: session.riskLevel || 'low',
        violations: sortedViolations,
        duration,
        startedAt: startedAt.toISOString(),
        completedAt: session.completedAt || null,
        aiAgents: {
          vision:   { status: 'active', healthScore: 95 },
          audio:    { status: 'active', healthScore: 92 },
          behavior: { status: 'active', healthScore: 98 }
        }
      }
    });
  } catch (error) {
    console.error('❌ Session Detail API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch session detail' },
      { status: 500 }
    );
  }
}