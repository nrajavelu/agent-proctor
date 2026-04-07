#!/usr/bin/env node

const { WebSocket } = require('ws');

console.log('🧪 Testing complete violation flow...');

// Step 1: Create session
const candidateWs = new WebSocket('ws://localhost:8080?type=candidate');

candidateWs.on('open', () => {
    console.log('✅ Candidate WebSocket connected');
    
    // Send session start
    const sessionData = {
        type: 'session:start',
        data: {
            candidateId: 'test-violation-candidate',
            examId: 'violation-test-exam',
            organizationId: 'test-org',
            totalQuestions: 1,
            metadata: {
                userAgent: 'Node.js Test Client',
                timestamp: new Date().toISOString()
            }
        }
    };
    
    console.log('📤 Sending session start...');
    candidateWs.send(JSON.stringify(sessionData));
});

candidateWs.on('message', (data) => {
    const message = JSON.parse(data);
    console.log('📨 Candidate received:', message);
    
    if (message.type === 'session:started') {
        const sessionId = message.sessionId;
        console.log(`🎯 Session started with ID: ${sessionId}`);
        
        // Wait 2 seconds then send violations
        setTimeout(() => {
            console.log('🚨 Sending test violations...');
            
            const testViolations = [
                { type: 'tab_switch', description: 'Browser tab lost focus', severity: 'warning' },
                { type: 'face_not_visible', description: 'Student face not visible in camera', severity: 'critical' },
                { type: 'background_noise', description: 'Background audio detected', severity: 'info' },
                { type: 'multiple_faces', description: 'Multiple people detected in camera', severity: 'critical' }
            ];
            
            testViolations.forEach((violation, index) => {
                setTimeout(() => {
                    const violationMessage = {
                        type: 'violation:trigger',
                        sessionId: sessionId,
                        data: {
                            type: violation.type,
                            description: violation.description,
                            severity: violation.severity,
                            timestamp: new Date().toISOString(),
                            confidence: 95,
                            metadata: {
                                source: 'NodeTest',
                                candidateId: 'test-violation-candidate'
                            }
                        }
                    };
                    
                    console.log(`📤 Sending violation ${index + 1}: ${violation.description}`);
                    candidateWs.send(JSON.stringify(violationMessage));
                }, index * 2000);
            });
            
            // Close connection after all violations sent
            setTimeout(() => {
                console.log('🏁 Test complete - closing connection');
                candidateWs.close();
            }, 10000);
            
        }, 2000);
    }
});

candidateWs.on('error', (error) => {
    console.error('❌ Candidate WebSocket error:', error);
});

candidateWs.on('close', () => {
    console.log('🔌 Candidate WebSocket closed');
    process.exit(0);
});

// Setup admin monitoring
const adminWs = new WebSocket('ws://localhost:8080?type=admin');

adminWs.on('open', () => {
    console.log('📱 Admin WebSocket connected');
    adminWs.send(JSON.stringify({ type: 'admin:request_sessions' }));
});

adminWs.on('message', (data) => {
    const message = JSON.parse(data);
    console.log('📊 Admin received:', message.type);
    
    if (message.type === 'violation:new') {
        console.log(`🚨 ADMIN SAW VIOLATION: ${message.data.description} (${message.data.type})`);
    }
});

adminWs.on('error', (error) => {
    console.error('❌ Admin WebSocket error:', error);
});