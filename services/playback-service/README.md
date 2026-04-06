# Playbook & Audit Service

Comprehensive session recording playbook and audit service for the Agent Proctor platform.

## Features

### 📹 **Recording Management**
- LiveKit session recording integration
- Automated indexing and metadata extraction
- Multi-format video processing (WebM, MP4)
- Thumbnail generation and preview clips

### 🔍 **Violation Analysis**
- AI-powered violation detection using Vision, Audio, and Behavior services
- Real-time and post-session analysis
- Violation timeline with precise timestamps
- Confidence scoring and evidence compilation

### 📊 **Audit Reports**
- Comprehensive session audit reports
- Violation evidence with screenshots and clips
- Statistical analysis and trends
- Export to PDF, JSON, and CSV

### 🎯 **Smart Playback**
- Violation-aware video player
- Quick seek to incident timestamps
- Multi-angle view synchronization
- Slow-motion analysis for critical moments

## API Endpoints

### Recording Management
- `POST /api/recordings/ingest` - Ingest new recording
- `GET /api/recordings/:sessionId` - Get session recording
- `GET /api/recordings/:sessionId/metadata` - Get recording metadata
- `DELETE /api/recordings/:sessionId` - Delete recording

### Violation Analysis
- `POST /api/analysis/session/:sessionId` - Analyze session
- `GET /api/analysis/:sessionId/violations` - Get violations
- `GET /api/analysis/:sessionId/timeline` - Get violation timeline
- `POST /api/analysis/realtime` - Real-time analysis hook

### Audit Reports
- `GET /api/audit/:sessionId/report` - Generate audit report
- `GET /api/audit/:sessionId/export/:format` - Export report
- `GET /api/audit/sessions/summary` - Bulk session summary

### Playback
- `GET /api/playback/:sessionId/config` - Get playback configuration
- `GET /api/playback/:sessionId/seek/:timestamp` - Get frame at timestamp
- `GET /api/playback/:sessionId/thumbnails` - Get video thumbnails

## Architecture

```
Playback Service
├── Recording Ingestion
│   ├── LiveKit Integration
│   ├── Video Processing (FFmpeg)
│   └── Metadata Extraction
├── AI Analysis Pipeline
│   ├── Vision AI Integration
│   ├── Audio AI Integration
│   ├── Behavior AI Integration
│   └── Violation Aggregation
├── Audit Engine
│   ├── Report Generation
│   ├── Evidence Compilation
│   └── Export Pipeline
└── Playback Engine
    ├── Smart Seeking
    ├── Thumbnail Generation
    └── Multi-angle Sync
```

## Tech Stack

- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js with async/await
- **Database**: PostgreSQL with TimescaleDB for time-series data
- **Cache**: Redis for session state and frequent queries
- **Storage**: MinIO/S3 for recordings and artifacts
- **Video Processing**: FFmpeg for transcoding and analysis
- **AI Integration**: HTTP clients for Vision, Audio, Behavior services

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test

# Lint code
pnpm lint
```

## Configuration

 Copy `.env.example` to `.env` and configure:

- Database connections (PostgreSQL, Redis)
- Storage backend (MinIO or S3)
- AI service endpoints
- Processing limits and thresholds

## Deployment

The service is containerized and ready for Kubernetes deployment with:

- Health checks and readiness probes
- Resource limits and auto-scaling
- Persistent storage for recordings
- Integration with monitoring stack