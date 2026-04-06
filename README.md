# Agentic AI Proctoring Platform

> Revolutionary AI-powered proctoring that works as deployable agents, attachable to any web application.

## 🎯 Vision

Transform proctoring from "build-into-app" to "attach-agent-to-app" paradigm. Deploy autonomous AI agents that can monitor any examination environment through webcam, screen, and audio analysis with configurable rules and real-time violation detection.

## 🏗️ Architecture

```
[Frontend SDK]
   ↓
[API Gateway]
   ↓
[Control Plane Services]
 ├── Tenant Service
 ├── Rule Service  
 ├── Session Service
   ↓
[Media Layer - LiveKit Cluster]
   ↓
[AI Processing Layer]
 ├── Vision AI Service (YOLOv8, MediaPipe)
 ├── Audio AI Service (Whisper, pyannote)
 ├── Screen AI Service (Browser APIs)
 ├── Behavior AI Service (Pattern Detection)
 └── LLM Service (Mistral/Llama via Ollama)
   ↓
[Data Layer]
 ├── PostgreSQL
 ├── MinIO (S3-compatible storage)
 ├── TimescaleDB (Events)
 └── Apache Kafka (Event Bus)
   ↓
[Analytics + Playback UI]
```

## 🚀 Key Features

- **Agent-First Architecture**: Each session = 1 autonomous AI agent
- **Universal Integration**: SDK-based injection into any webapp
- **Zero API Costs**: 100% open-source AI stack
- **Hybrid AI Processing**: CV models + LLM reasoning
- **Tenant Configurable**: Rules, weights, AI sensitivity
- **Real-time Analytics**: Live violation detection and scoring
- **Comprehensive Playback**: Indexed recordings with violation timeline

## 📁 Monorepo Structure

```
services/
├── control-plane/           # Central management APIs
├── agent-runtime/           # Deployable agent per session
├── ai-vision/              # Computer vision processing
├── ai-audio/               # Audio analysis service  
├── ai-behavior/            # Pattern detection service
├── rule-engine/            # Configurable policy engine
├── scoring-engine/         # Weighted scoring system
├── playback-service/       # Recording & audit system
└── api-gateway/            # Main entry point

packages/
├── shared/                 # Common utilities
├── sdk/                   # Frontend integration SDK
└── types/                 # TypeScript definitions

infrastructure/
├── docker/                # Container definitions
├── kubernetes/            # K8s manifests  
└── terraform/             # Infrastructure as code

tools/
├── dev-scripts/           # Development utilities
└── monitoring/            # Observability setup
```

## 🛠️ Technology Stack

### Core Services
- **Runtime**: Node.js + TypeScript
- **AI Services**: Python + FastAPI
- **API Gateway**: Express.js/Fastify
- **Event Streaming**: Apache Kafka

### AI & Media
- **Computer Vision**: YOLOv8, MediaPipe
- **Audio Processing**: Whisper.cpp, pyannote-audio  
- **Media Streaming**: LiveKit
- **LLM**: Mistral 7B/Llama 3 via Ollama

### Infrastructure  
- **Databases**: PostgreSQL, TimescaleDB
- **Object Storage**: MinIO
- **Containers**: Docker + Kubernetes
- **Monitoring**: Prometheus + Grafana

## 🎯 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.9+
- Docker & Docker Compose
- pnpm (package manager)

### Quick Start
```bash
# Install dependencies
pnpm install

# Start development environment
pnpm dev

# Run AI services
pnpm ai:start

# Access dashboard
open http://localhost:3000
```

## 📊 Development Status

### Phase 1: Core Foundation
- [ ] Monorepo setup with workspaces
- [ ] Basic service scaffolding
- [ ] Docker containerization
- [ ] Development environment

### Phase 2: Media & AI
- [ ] LiveKit integration
- [ ] Vision AI service (YOLOv8)
- [ ] Audio processing pipeline
- [ ] Basic rule engine

### Phase 3: Intelligence Layer
- [ ] Behavior pattern detection
- [ ] LLM integration for reasoning
- [ ] Advanced scoring algorithms
- [ ] Violation classification

### Phase 4: Platform Features
- [ ] Multi-tenant architecture
- [ ] SDK development
- [ ] Analytics dashboard
- [ ] Playback system

## 🤝 Contributing

This platform is designed for collaborative development. Each service can be developed independently while following the shared architectural principles.

## 📄 License

Open source - details TBD

---

**Built for the future of AI-powered examination integrity** 🚀