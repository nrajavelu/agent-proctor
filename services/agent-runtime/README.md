# Agent Runtime Service

The Agent Runtime service is the core component of the proctoring platform that handles real-time media processing and violation detection. It connects to LiveKit rooms as an agent participant and processes video/audio streams through AI services.

## Overview

The Agent Runtime service:
- Connects to LiveKit rooms as an automated agent participant
- Processes video frames and audio chunks in real-time
- Integrates with AI services (vision, audio, behavior analysis)
- Detects violations based on configurable rules
- Reports violations and metrics to the API Gateway
- Manages agent lifecycle and health monitoring

## Architecture

### Core Components

1. **Agent Manager** - Orchestrates agent lifecycle
2. **LiveKit Client** - Handles room connections and media streams
3. **Agent** - Processes media and detects violations
4. **AI Service Client** - Interfaces with AI processing services
5. **Webhook Client** - Sends notifications to API Gateway

### Media Processing Pipeline

```
LiveKit Room → Media Streams → Frame/Audio Extraction → AI Analysis → Violation Detection → Scoring → Webhooks
```

## Configuration

The service requires several environment variables:

```env
# Basic Configuration
NODE_ENV=development
PORT=3003
LOG_LEVEL=info

# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=agent_proctor_dev
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# LiveKit Configuration
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_secret

# AI Services Configuration
AI_VISION_SERVICE_URL=http://localhost:8001
AI_AUDIO_SERVICE_URL=http://localhost:8002
AI_BEHAVIOR_SERVICE_URL=http://localhost:8003

# API Gateway Integration
API_GATEWAY_URL=http://localhost:3001
```

## API Endpoints

### Agent Management

- `POST /api/v1/agents/start` - Start agent for session
- `POST /api/v1/agents/stop` - Stop agent for session  
- `GET /api/v1/agents/status/:sessionId` - Get agent status
- `GET /api/v1/agents` - List all agents
- `POST /api/v1/agents/:agentId/restart` - Restart specific agent

### Session Monitoring

- `GET /api/v1/sessions/:sessionId` - Get session details
- `GET /api/v1/sessions/:sessionId/analytics` - Get session analytics
- `GET /api/v1/sessions/:sessionId/violations` - Get session violations

### Health Monitoring

- `GET /api/v1/health` - Comprehensive health check
- `GET /api/v1/health/live` - Liveness probe
- `GET /api/v1/health/ready` - Readiness probe

## Agent Lifecycle

### Starting an Agent

When a session begins, the API Gateway calls the agent runtime to start monitoring:

```bash
curl -X POST http://localhost:3003/api/v1/agents/start \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "session-123"}'
```

The agent:
1. Retrieves session configuration from the database
2. Connects to the specified LiveKit room
3. Subscribes to participant video/audio tracks
4. Starts processing media streams
5. Reports status changes via webhooks

### Media Processing

The agent processes media in real-time:
- **Video frames**: Extracted at 1-2 FPS for analysis
- **Audio chunks**: Processed in 1-second intervals
- **Queue management**: Maintains processing queues with overflow protection
- **AI service calls**: Sends frames/audio to respective AI services
- **Violation detection**: Converts AI responses to violations

### Violation Detection

Violations are detected based on:
- **Face verification**: Multiple faces, no face, face not recognized
- **Gaze tracking**: Looking away from screen for extended periods
- **Audio monitoring**: Background noise, multiple voices
- **Motion analysis**: Excessive movement, leaving frame
- **Behavioral analysis**: Prohibited objects, suspicious activities

### Stopping an Agent

Agents can be stopped:
- Automatically when session ends
- Manually via API call
- Due to connection errors (with auto-restart)
- During service shutdown

## Integration with AI Services

### Vision AI Service API

```http
POST /analyze/frame
Content-Type: application/json

{
  "image": "base64_encoded_frame",
  "session_config": {
    "face_verification": true,
    "gaze_tracking": true,
    "motion_detection": true
  }
}
```

### Audio AI Service API

```http
POST /analyze/audio
Content-Type: application/json

{
  "audio": "base64_encoded_audio",
  "sample_rate": 16000,
  "session_config": {
    "noise_detection": true,
    "speech_analysis": true
  }
}
```

### Behavior AI Service API

```http
POST /analyze/behavior
Content-Type: application/json

{
  "image": "base64_encoded_frame",
  "session_config": {
    "object_detection": true,
    "posture_analysis": true
  }
}
```

## Database Schema

The agent runtime uses several database tables:

### agent_instances
Tracks active agent instances
- `id` - Agent UUID
- `session_id` - Associated session
- `room_id` - LiveKit room ID
- `started_at` - Agent start time
- `capabilities` - Agent feature flags

### agent_status
Real-time agent status (updated frequently)
- `agent_id` - Agent reference
- `session_id` - Session reference
- `status` - Current agent state
- `metrics` - Performance metrics JSON
- `updated_at` - Last update timestamp

### violations
Detected violations from AI analysis
- `id` - Violation UUID
- `session_id` - Session reference
- `agent_id` - Detecting agent
- `violation_code` - Standardized violation code
- `violation_type` - Category (face, audio, motion, etc.)
- `severity` - Impact level
- `confidence` - AI confidence score
- `metadata` - Additional violation data
- `score_impact` - Score reduction amount

## Monitoring and Metrics

### Performance Metrics

The agent tracks various metrics:
- **Processing latency**: Time to process frames/audio
- **Queue depths**: Media queues current size
- **AI service latency**: Response times from AI services
- **Violation rates**: Violations detected per minute
- **Memory/CPU usage**: Resource consumption

### Health Monitoring

Health checks verify:
- Database connectivity
- Redis connectivity
- LiveKit connection status
- AI service availability
- Agent responsiveness

### Alerting

The service emits alerts for:
- Agent failures and restarts
- High violation rates
- Processing queue overflow
- AI service timeouts
- Resource exhaustion

## Deployment

### Docker

```bash
# Build the image
docker build -t agent-runtime .

# Run with environment file
docker run --env-file .env -p 3003:3003 agent-runtime
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: agent-runtime
spec:
  replicas: 3
  selector:
    matchLabels:
      app: agent-runtime
  template:
    metadata:
      labels:
        app: agent-runtime
    spec:
      containers:
      - name: agent-runtime
        image: agent-runtime:latest
        ports:
        - containerPort: 3003
        env:
        - name: NODE_ENV
          value: production
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
```

## Development

### Running Locally

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
npm start
```

### Testing Agent Functionality

```bash
# Start a test agent
curl -X POST http://localhost:3003/api/v1/agents/start \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "test-session-1"}'

# Check agent status
curl http://localhost:3003/api/v1/agents/status/test-session-1

# Stop the agent
curl -X POST http://localhost:3003/api/v1/agents/stop \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "test-session-1", "reason": "Test complete"}'
```

## Integration with Platform

The Agent Runtime integrates with:

1. **API Gateway**: Receives start/stop commands, sends violation webhooks
2. **Control Plane**: Gets session configuration and rules
3. **AI Services**: Sends media for analysis
4. **Scoring Engine**: Reports violations for score calculation
5. **LiveKit**: Connects to rooms and processes media streams

## Security

- Agent tokens are generated with minimal required permissions
- Media is processed in memory without persistent storage
- AI service communication uses internal network
- Database queries use parameterized statements
- Webhook signatures prevent replay attacks

## Performance Considerations

- **Frame sampling**: Processes 1-2 FPS to balance accuracy and performance
- **Queue management**: Prevents memory overflow during processing spikes
- **Connection pooling**: Reuses database and HTTP connections
- **Graceful degradation**: Continues processing even if some AI services fail
- **Auto-scaling**: Multiple agent instances can run concurrently

## Troubleshooting

### Common Issues

1. **Agent won't start**: Check LiveKit connectivity and session data
2. **High memory usage**: Monitor frame processing queues
3. **Violation detection lag**: Check AI service response times
4. **Connection drops**: Verify WebSocket connectivity to LiveKit

### Logs and Debugging

```bash
# Enable debug logging
export LOG_LEVEL=debug

# View agent logs
docker logs -f agent-runtime-container

# Monitor specific session
curl http://localhost:3003/api/v1/sessions/{sessionId}/analytics
```