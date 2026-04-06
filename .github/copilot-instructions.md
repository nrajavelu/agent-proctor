<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Agentic AI Proctoring Platform

This is a monorepo workspace for an Agentic AI Proctoring Platform with microservices architecture.

## Architecture Overview
- **Control Plane**: Central management, tenant configuration, session orchestration
- **Agent Runtime**: Deployed per session, connects to media + AI services  
- **Media Layer**: LiveKit for streaming, recording, rooms
- **AI Processing Layer**: Vision AI, Audio AI, Screen AI, Behavior AI
- **Rule Engine**: Configurable policies, event → violation mapping
- **Scoring Engine**: Weighted scoring, credibility index
- **Playback & Audit**: Indexed recordings, violation timeline

## Tech Stack
- **Services**: TypeScript/Node.js
- **AI Modules**: Python with YOLOv8, MediaPipe, Whisper
- **Infrastructure**: Docker, Kubernetes, Apache Kafka
- **Storage**: PostgreSQL, MinIO, TimescaleDB
- **Media**: LiveKit
- **Open Source**: No paid APIs, fully self-contained

## Development Guidelines
- Follow microservices architecture patterns
- Use event-driven design
- Maintain stateless services
- Implement proper containerization
- Focus on tenant configurability
- Ensure pluggable, SDK-based integration