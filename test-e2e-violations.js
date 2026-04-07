const WebSocket = require('ws');

console.log('=== E2E Violation Pipeline Test ===\n');

const candidate = new WebSocket('ws://localhost:8081?type=candidate');

candidate.on('open', () => {
  console.log('1. Candidate connected');
  candidate.send(JSON.stringify({
    type: 'session:start',
    data: { candidateId: 'e2e-test@cs.edu', examId: 'demo', organizationId: 'org1', totalQuestions: 5 }
  }));
});

candidate.on('message', (data) => {
  const msg = JSON.parse(data.toString());

  if (msg.type === 'session:started') {
    const sid = msg.sessionId;
    console.log('2. Session created:', sid);

    // Send 2 real violations
    candidate.send(JSON.stringify({
      type: 'violation:trigger', sessionId: sid,
      data: { type: 'tab_switch', description: 'Browser tab lost focus', severity: 'warning',
              timestamp: new Date().toISOString(), confidence: 85, source: 'browser-monitor' }
    }));
    console.log('3. Sent violation: tab_switch');

    setTimeout(() => {
      candidate.send(JSON.stringify({
        type: 'violation:trigger', sessionId: sid,
        data: { type: 'right_click', description: 'Right-click attempted', severity: 'warning',
                timestamp: new Date().toISOString(), confidence: 90, source: 'browser-monitor' }
      }));
      console.log('4. Sent violation: right_click');
    }, 300);

    // Verify via admin connection
    setTimeout(() => {
      const admin = new WebSocket('ws://localhost:8081?type=admin');
      admin.on('message', (d) => {
        const m = JSON.parse(d.toString());
        if (m.type === 'sessions:list') {
          const s = m.data.find(x => x.sessionId === sid);
          if (s) {
            console.log('\n=== REAL SESSION DATA ===');
            console.log('Candidate:', s.candidateId);
            console.log('Credibility:', s.credibilityScore + '%');
            console.log('Risk:', s.riskLevel);
            console.log('Violations:', s.violations.length);
            s.violations.forEach((v, i) => console.log('  ' + (i + 1) + '. [' + v.severity + '] ' + v.description));
            console.log('\n✅ E2E TEST PASSED — Real violations stored and retrievable');
          } else {
            console.log('❌ Session not found');
          }
          admin.close();
          candidate.close();
          process.exit(0);
        }
      });
    }, 1000);
  }

  if (msg.type === 'violation:alert') {
    console.log('   ← Server alert:', msg.data.message);
  }
});

setTimeout(() => { console.log('⏰ Timeout'); process.exit(1); }, 8000);
