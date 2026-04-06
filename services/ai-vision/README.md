# Vision AI Service

YOLOv8-based computer vision service for real-time proctoring violation detection.

## Overview

The Vision AI service processes video frames from proctoring sessions and detects violations such as:
- Multiple persons in frame
- Cell phones and unauthorized devices  
- Prohibited objects (books, external keyboards)
- Looking away from screen (head pose analysis)

## Features

### Object Detection
- **YOLOv8 Nano** for fast, accurate detection
- **Real-time processing** optimized for video streams
- **Configurable confidence thresholds** 
- **GPU/CPU support** for flexible deployment

### Violation Mapping
- **Automatic violation code mapping** (c3, m3, h1, a2, c5)
- **Deduplication logic** prevents spam violations
- **Severity classification** (low, medium, high, critical)
- **Session-aware tracking** with cooldown periods

### API Integration
- **RESTful API** compatible with Agent Runtime
- **Base64 image processing** for easy integration
- **Comprehensive error handling** with proper HTTP codes
- **Performance metrics** and health monitoring

## API Endpoints

### Core Endpoints

#### `POST /api/v1/analyze/frame`
Main endpoint for the Agent Runtime service.

```json
{
  "image": "base64_encoded_frame",
  "session_config": {
    "face_verification": true,
    "object_detection": true,
    "confidence_threshold": 0.25
  },
  "session_id": "session-123",
  "participant_id": "participant-456",
  "timestamp": 1649123456.789
}
```

**Response:**
```json
{
  "success": true,
  "violations": [
    {
      "code": "m3",
      "type": "motion",
      "severity": "critical",
      "confidence": 0.87,
      "description": "Cell phone detected",
      "timestamp": 1649123456.789,
      "metadata": {
        "detection_count": 1,
        "class_id": 67,
        "class_name": "cell phone",
        "bbox": {"x1": 100, "y1": 150, "x2": 200, "y2": 250}
      }
    }
  ],
  "detections": [...],
  "confidence": 0.92,
  "processing_time_ms": 45.2,
  "metadata": {...}
}
```

#### `POST /api/v1/detect`
Object detection without violation mapping.

```json
{
  "image": "base64_encoded_image",
  "session_id": "session-123",
  "frame_id": "frame-001"
}
```

### Utility Endpoints

- `GET /health` - Health check with model status
- `GET /api/v1/stats` - Performance metrics and statistics
- `GET /api/v1/config` - Current service configuration 
- `POST /api/v1/upload` - Upload image file for testing
- `POST /api/v1/test` - Test service with sample image

## Configuration

### Environment Variables

```env
# Service Configuration
SERVICE_NAME=ai-vision
PORT=8001
LOG_LEVEL=info

# Model Configuration  
YOLO_MODEL_PATH=yolov8n.pt
CONFIDENCE_THRESHOLD=0.25
IOU_THRESHOLD=0.45
DEVICE=cpu

# Performance
MAX_IMAGE_SIZE=1280
BATCH_SIZE=1
MAX_FILE_SIZE_MB=10

# Violation Settings
DEDUPLICATION_WINDOW_SECONDS=10
VIOLATION_COOLDOWN_SECONDS=5
```

### Violation Code Mapping

| YOLO Class | Object | Violation Code | Severity | Description |
|------------|--------|----------------|----------|-------------|
| 0 (>1) | person | c3 | high | Multiple persons detected |
| 67 | cell phone | m3 | critical | Cell phone detected |
| 73 | laptop | a2 | medium | Unauthorized laptop |
| 76 | keyboard | a2 | medium | External keyboard |
| 84 | book | h1 | medium | Reading material detected |

## Installation & Setup

### Local Development

```bash
# Clone and navigate
cd services/ai-vision

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Edit .env with your settings

# Run development server
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

### Docker Deployment

```bash
# Build image
docker build -t ai-vision:latest .

# Run container
docker run -d \
  --name ai-vision \
  -p 8001:8001 \
  --env-file .env \
  ai-vision:latest

# Check logs
docker logs -f ai-vision
```

### Docker Compose (Recommended)

```yaml
version: '3.8'
services:
  ai-vision:
    build: .
    ports:
      - "8001:8001"
    environment:
      - DEVICE=cpu
      - LOG_LEVEL=info
    volumes:
      - ./models:/app/models
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## Performance & Scaling

### Benchmarks
- **Processing Time**: ~40-60ms per frame (CPU)
- **Throughput**: ~15-20 FPS sustained
- **Memory Usage**: ~500MB with YOLOv8n
- **Model Size**: ~6MB (YOLOv8 Nano)

### GPU Acceleration

```env
# Enable CUDA (requires NVIDIA GPU + drivers)
DEVICE=cuda

# Or specific GPU
DEVICE=cuda:0
```

**Performance with GPU**:
- **Processing Time**: ~15-25ms per frame
- **Throughput**: ~30-40 FPS sustained
- **Memory Usage**: ~2GB VRAM + 300MB RAM

### Scaling Considerations

1. **Horizontal Scaling**: Deploy multiple instances behind load balancer
2. **Model Variants**: Use YOLOv8s/m/l for higher accuracy vs speed trade-off
3. **Batch Processing**: Process multiple frames together for better GPU utilization
4. **Caching**: Cache model weights and common computations

## Integration with Agent Runtime

The Vision AI service integrates with the Agent Runtime through HTTP API calls:

```typescript
// Agent Runtime integration
const visionResponse = await axios.post(
  'http://ai-vision:8001/api/v1/analyze/frame',
  {
    image: frameBase64,
    session_config: sessionConfig,
    session_id: sessionId,
    participant_id: participantId,
    timestamp: Date.now()
  }
);

const violations = visionResponse.data.violations;
```

## Monitoring & Observability

### Health Checks
```bash
# Basic health
curl http://localhost:8001/health

# Detailed stats
curl http://localhost:8001/api/v1/stats

# Test processing
curl -X POST http://localhost:8001/api/v1/test
```

### Metrics Available
- Frames processed count
- Average processing time
- Violations detected count
- Model load status
- Memory usage
- Error rates

### Logging
```python
# Configure log levels
LOG_LEVEL=debug  # debug, info, warning, error

# Sample log output
2024-04-05 10:30:15 - vision_service - INFO - Frame analysis complete: 2 violations, 43.2ms
2024-04-05 10:30:16 - violation_mapper - DEBUG - Mapped cell phone detection to violation m3
```

## Troubleshooting

### Common Issues

**Model Download Fails**
```bash
# Manual download
python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"
```

**CUDA Out of Memory**
```env
# Reduce batch size or switch to CPU
DEVICE=cpu
BATCH_SIZE=1
```

**High Memory Usage**
```env
# Reduce max image size
MAX_IMAGE_SIZE=640
```

**Slow Processing**
```env
# Lower confidence threshold for faster processing
CONFIDENCE_THRESHOLD=0.5
```

### Debug Mode
```bash
# Run with debug logging
LOG_LEVEL=debug uvicorn app.main:app --reload

# Test with sample image  
curl -X POST http://localhost:8001/api/v1/test
```

## Development

### Adding New Violation Types

1. **Update ViolationMapper**:
```python
# In violation_mapper.py
VIOLATION_CLASS_MAP[new_class_id] = {
    "violation_code": "x1",
    "violation_type": ViolationType.NEW_TYPE,
    "severity": ViolationSeverity.MEDIUM,
    "description": "New violation detected"
}
```

2. **Add to Models**:
```python
# In models/detection.py
class ViolationType(str, Enum):
    NEW_TYPE = "new_category"
```

3. **Test Integration**:
```bash
# Test new detection
curl -X POST http://localhost:8001/api/v1/analyze/frame \
  -H "Content-Type: application/json" \
  -d '{"image": "...", "session_config": {...}}'
```

### Custom Model Training

For organization-specific objects (books, ID cards, etc.):

```python
# Train custom YOLOv8 model
from ultralytics import YOLO

model = YOLO('yolov8n.pt')
model.train(
    data='custom_dataset.yaml',
    epochs=100,
    imgsz=640
)
```

## Security

- **Input validation** on all image uploads
- **File size limits** to prevent DoS
- **Base64 sanitization** to prevent injection
- **No data persistence** - images processed in memory only
- **CORS configuration** for allowed origins only

## License

Part of the Agentic AI Proctoring Platform - Proprietary License