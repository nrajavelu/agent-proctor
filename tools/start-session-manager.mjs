#!/usr/bin/env node

import { getSessionManager } from '../apps/web/lib/session-manager.js';

console.log('🚀 Starting Agentic AI Proctoring Session Manager...');

// Start the session manager
const sessionManager = getSessionManager();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Gracefully shutting down session manager...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Gracefully shutting down session manager...');
  process.exit(0);
});

console.log('✅ Session Manager is running on port 8080');
console.log('📡 WebSocket endpoint: ws://localhost:8080');
console.log('🎯 Ready to handle candidate and admin connections');
console.log('\nPress Ctrl+C to stop...');