#!/usr/bin/env node

const { WebSocket } = require('ws');

console.log('Testing WebSocket connection to session manager...');

const ws = new WebSocket('ws://localhost:8080?type=candidate');

ws.on('open', () => {
    console.log('✅ WebSocket connected as candidate');
    
    // Send session start message
    const message = {
        type: 'session:start',
        data: {
            candidateId: 'test-candidate-node',
            examId: 'test-exam-node',
            organizationId: 'test-org-node',
            totalQuestions: 5,
            metadata: {
                userAgent: 'Node.js Test Client',
                timestamp: new Date().toISOString()
            }
        }
    };
    
    console.log('📤 Sending session start message...');
    ws.send(JSON.stringify(message));
});

ws.on('message', (data) => {
    const message = JSON.parse(data);
    console.log('📨 Received message:', message);
});

ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
});

ws.on('close', () => {
    console.log('🔌 WebSocket connection closed');
    process.exit(0);
});

// Auto close after 10 seconds
setTimeout(() => {
    console.log('⏰ Closing connection after timeout');
    ws.close();
}, 10000);