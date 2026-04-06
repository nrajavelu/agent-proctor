"""Mock AI Audio Service for Demo Environment"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uvicorn
import time
import random
import logging
import asyncio

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AI Audio Service (Demo Mock)",
    description="Mock audio analysis service for proctoring demo",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://localhost:3002", "http://localhost:4000", "http://localhost:4001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class AudioAnalysisRequest(BaseModel):
    session_id: str
    audio_data: str  # base64 encoded audio chunk
    timestamp: str
    participant_id: str = "candidate-123"
    duration_ms: int = 1000
    sample_rate: int = 44100
    session_config: Dict[str, Any] = {}

class AudioEvent(BaseModel):
    type: str
    confidence: float
    start_time_ms: float
    end_time_ms: float
    frequency_range: List[float]  # [min_hz, max_hz]
    amplitude: float
    description: str
    metadata: Dict[str, Any] = {}

class SpeechAnalysis(BaseModel):
    text_detected: bool
    confidence: float
    word_count: int
    speaker_count: int
    language: Optional[str] = None
    sentiment: Optional[str] = None
    speech_rate: float  # words per minute
    volume_level: str  # quiet, normal, loud

class Violation(BaseModel):
    type: str
    severity: str  # info, warning, critical
    confidence: float
    description: str
    timestamp: str
    source: str = "ai_audio"
    duration_ms: int
    metadata: Dict[str, Any] = {}

class AudioAnalysisResponse(BaseModel):
    session_id: str
    chunk_id: str
    timestamp: str
    processing_time_ms: float
    audio_events: List[AudioEvent]
    speech_analysis: SpeechAnalysis
    violations: List[Violation]
    noise_level: str  # quiet, acceptable, noisy, very_noisy
    audio_quality_score: float  # 0-100
    background_classification: str

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    model_loaded: bool
    uptime: float
    memory_usage: Dict[str, Any]

# Mock data generators
def generate_mock_audio_events(duration_ms: int) -> List[AudioEvent]:
    """Generate realistic mock audio events."""
    events = []
    
    # Common background sounds
    background_events = [
        {
            "type": "keyboard_typing",
            "description": "Keyboard typing detected",
            "freq_range": [200, 4000],
            "confidence_base": 0.85
        },
        {
            "type": "mouse_click",
            "description": "Mouse click detected", 
            "freq_range": [1000, 8000],
            "confidence_base": 0.92
        },
        {
            "type": "page_turn",
            "description": "Paper rustling/page turning",
            "freq_range": [100, 2000],
            "confidence_base": 0.78
        },
        {
            "type": "chair_movement",
            "description": "Chair movement or adjustment",
            "freq_range": [50, 500],  
            "confidence_base": 0.71
        },
        {
            "type": "ambient_noise",
            "description": "Low-level ambient noise",
            "freq_range": [20, 200],
            "confidence_base": 0.65
        }
    ]
    
    # More likely to have typing and mouse clicks
    for event_type in random.choices(background_events, k=random.randint(1, 4)):
        start_time = random.uniform(0, duration_ms * 0.8)
        duration = random.uniform(50, 500)
        
        events.append(AudioEvent(
            type=event_type["type"],
            confidence=event_type["confidence_base"] + random.random() * 0.15 - 0.05,
            start_time_ms=start_time,
            end_time_ms=start_time + duration,
            frequency_range=event_type["freq_range"],
            amplitude=random.uniform(0.1, 0.7),
            description=event_type["description"],
            metadata={
                "detection_algorithm": "spectral_analysis_mock",
                "snr_ratio": random.uniform(5, 25)  # signal to noise ratio
            }
        ))
    
    return events

def generate_mock_speech_analysis() -> SpeechAnalysis:
    """Generate mock speech analysis results."""
    # Most of the time no speech (person working silently)
    has_speech = random.random() < 0.25  # 25% chance of speech
    
    if not has_speech:
        return SpeechAnalysis(
            text_detected=False,
            confidence=0.95,
            word_count=0,
            speaker_count=0,
            speech_rate=0.0,
            volume_level="quiet"
        )
    
    # If speech is detected
    word_count = random.randint(1, 15)
    speaker_count = random.choices([1, 2, 3], weights=[70, 25, 5])[0]  # Mostly single speaker
    
    return SpeechAnalysis(
        text_detected=True,
        confidence=0.82 + random.random() * 0.15,
        word_count=word_count,
        speaker_count=speaker_count,
        language="en" if random.random() < 0.9 else "unknown",
        sentiment=random.choice(["neutral", "focused", "stressed", "frustrated"]),
        speech_rate=120 + random.randint(-30, 50),  # words per minute
        volume_level=random.choice(["quiet", "normal", "loud"])
    )

def generate_mock_violations(speech_analysis: SpeechAnalysis, session_duration_minutes: int) -> List[Violation]:
    """Generate mock audio violations based on analysis."""
    violations = []
    current_time = time.time()
    
    # Base violation chance increases with session time (fatigue factor)
    base_violation_chance = 0.12
    time_factor = min(1.8, 1.0 + (session_duration_minutes / 90) * 0.8)
    violation_chance = base_violation_chance * time_factor
    
    if random.random() < violation_chance:
        violation_types = [
            {
                "type": "background_noise",
                "severity": "warning",
                "description": "Elevated background noise detected (>40dB)",
                "base_confidence": 0.84,
                "duration": random.randint(3000, 12000)
            },
            {
                "type": "multiple_voices",
                "severity": "critical",
                "description": "Multiple speakers detected simultaneously",
                "base_confidence": 0.91,
                "duration": random.randint(2000, 8000)
            },
            {
                "type": "suspicious_audio",
                "severity": "warning",
                "description": "Potential external communication detected",
                "base_confidence": 0.76,
                "duration": random.randint(5000, 15000)
            },
            {
                "type": "loud_background_noise",
                "severity": "info",
                "description": "Temporary loud background noise (>60dB)",
                "base_confidence": 0.88,
                "duration": random.randint(1000, 4000)
            },
            {
                "type": "audio_device_change",
                "severity": "info", 
                "description": "Audio input device changed during session",
                "base_confidence": 0.95,
                "duration": 500
            }
        ]
        
        # More likely to have multiple voices violation if speech is detected with multiple speakers
        if speech_analysis.text_detected and speech_analysis.speaker_count > 1:
            violation_weights = [20, 60, 30, 15, 5]  # Heavily weight multiple_voices
        else:
            violation_weights = [40, 5, 25, 25, 5]   # Normal distribution
        
        violation = random.choices(violation_types, weights=violation_weights)[0]
        violations.append(Violation(
            type=violation["type"],
            severity=violation["severity"], 
            confidence=violation["base_confidence"] + random.random() * 0.1 - 0.05,
            description=violation["description"],
            timestamp=time.strftime("%Y-%m-%dT%H:%M:%S.%fZ", time.gmtime(current_time)),
            duration_ms=violation["duration"],
            metadata={
                "audio_analysis_id": f"audio_{int(current_time * 1000)}",
                "detection_algorithm": "whisper_vad_mock",
                "frequency_analysis": True,
                "spectral_features": random.randint(12, 24)
            }
        ))
    
    return violations

def calculate_noise_level(events: List[AudioEvent], violations: List[Violation]) -> str:
    """Calculate overall noise level classification."""
    violation_count = len([v for v in violations if "noise" in v.type])
    ambient_events = len([e for e in events if "ambient" in e.type or "background" in e.type])
    
    total_noise_score = violation_count * 3 + ambient_events
    
    if total_noise_score >= 6:
        return "very_noisy"
    elif total_noise_score >= 4:
        return "noisy" 
    elif total_noise_score >= 2:
        return "acceptable"
    else:
        return "quiet"

def calculate_audio_quality_score(events: List[AudioEvent], violations: List[Violation]) -> float:
    """Calculate audio quality score (0-100)."""
    base_score = 90
    
    # Penalties
    violation_penalty = len(violations) * 8
    noisy_event_penalty = len([e for e in events if e.amplitude > 0.6]) * 3
    
    quality_score = max(40, base_score - violation_penalty - noisy_event_penalty + random.randint(-5, 5))
    return float(quality_score)

# Service state
service_start_time = time.time()
processed_chunks = 0

@app.get("/", response_model=Dict[str, Any])
async def root():
    """Root endpoint with service information."""
    return {
        "service": "AI Audio Service",
        "version": "1.0.0", 
        "status": "operational",
        "type": "mock-demo",
        "description": "Mock audio analysis service for proctoring demo",
        "capabilities": [
            "Speech detection and transcription",
            "Background noise analysis",
            "Multiple speaker detection", 
            "Audio quality assessment",
            "Violation detection",
            "Real-time audio streaming"
        ],
        "endpoints": {
            "health": "GET /health",
            "analyze": "POST /api/v1/analyze/audio",
            "stream": "WS /api/v1/stream/audio",
            "stats": "GET /api/v1/stats"
        },
        "mock_features": {
            "realistic_speech_detection": True,
            "noise_classification": True,
            "multi_speaker_analysis": True,
            "demo_safe": True
        }
    }

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint for monitoring.""" 
    uptime = time.time() - service_start_time
    
    # Mock memory usage
    memory_usage = {
        "rss": random.randint(80, 130) * 1024 * 1024,  # 80-130 MB
        "heap_used": random.randint(60, 90) * 1024 * 1024,   # 60-90 MB  
        "external": random.randint(10, 20) * 1024 * 1024     # 10-20 MB
    }
    
    return HealthResponse(
        status="healthy",
        service="AI Audio Service",
        version="1.0.0",
        model_loaded=True,
        uptime=uptime,
        memory_usage=memory_usage
    )

@app.post("/api/v1/analyze/audio", response_model=AudioAnalysisResponse)
async def analyze_audio(request: AudioAnalysisRequest):
    """Analyze audio chunk for violations - main proctoring endpoint."""
    global processed_chunks
    processed_chunks += 1
    
    start_time = time.time()
    
    logger.info(f"Analyzing audio for session {request.session_id}")
    
    try:
        # Simulate processing delay (30-100ms for audio processing)
        processing_delay = random.uniform(0.03, 0.10)
        await asyncio.sleep(processing_delay)
        
        # Calculate session duration for realistic violations
        session_duration_minutes = random.randint(5, 90)  # Mock session duration
        
        # Generate mock analysis results
        audio_events = generate_mock_audio_events(request.duration_ms)
        speech_analysis = generate_mock_speech_analysis()
        violations = generate_mock_violations(speech_analysis, session_duration_minutes)
        
        noise_level = calculate_noise_level(audio_events, violations)
        audio_quality_score = calculate_audio_quality_score(audio_events, violations)
        
        # Background classification
        background_types = ["office", "home", "quiet_room", "public_space", "noisy_environment"]
        background_weights = [30, 45, 20, 3, 2]  # Most likely home or office
        background_classification = random.choices(background_types, weights=background_weights)[0]
        
        processing_time = (time.time() - start_time) * 1000
        chunk_id = f"audio_{int(time.time() * 1000)}_{random.randint(1000, 9999)}"
        
        response = AudioAnalysisResponse(
            session_id=request.session_id,
            chunk_id=chunk_id,
            timestamp=request.timestamp,
            processing_time_ms=processing_time,
            audio_events=audio_events,
            speech_analysis=speech_analysis,
            violations=violations,
            noise_level=noise_level,
            audio_quality_score=audio_quality_score,
            background_classification=background_classification
        )
        
        logger.info(
            f"Audio analysis complete: {len(violations)} violations, "
            f"speech: {speech_analysis.text_detected}, quality: {audio_quality_score}, "
            f"processing: {processing_time:.1f}ms"
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Audio analysis error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Audio analysis failed: {str(e)}"
        )

@app.post("/api/v1/detect/speech")
async def detect_speech(request: AudioAnalysisRequest):
    """Simple speech detection without full analysis."""
    start_time = time.time()
    
    try:
        speech_analysis = generate_mock_speech_analysis()
        processing_time = (time.time() - start_time) * 1000
        
        return {
            "session_id": request.session_id,
            "timestamp": request.timestamp,
            "processing_time_ms": processing_time,
            "speech_detected": speech_analysis.text_detected,
            "confidence": speech_analysis.confidence,
            "speaker_count": speech_analysis.speaker_count,
            "word_count": speech_analysis.word_count
        }
        
    except Exception as e:
        logger.error(f"Speech detection error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Speech detection failed: {str(e)}"
        )

@app.get("/api/v1/stats")
async def get_stats():
    """Get service statistics."""
    uptime = time.time() - service_start_time
    
    return {
        "service": "AI Audio Service",
        "status": "operational", 
        "uptime_seconds": uptime,
        "processed_chunks": processed_chunks,
        "average_processing_time_ms": random.uniform(35, 75),
        "current_load": {
            "cpu_usage": random.uniform(10, 35),     # %
            "memory_usage": random.uniform(80, 130), # MB
            "active_sessions": random.randint(0, 5),
            "concurrent_streams": random.randint(0, 3)
        },
        "model_info": {
            "speech_recognition": "Whisper-small (mock)",
            "noise_detection": "Spectral Analysis v2.1",
            "speaker_identification": "PyAnnote Audio (mock)",
            "loaded": True,
            "accuracy": 0.91,
            "inference_time_ms": random.uniform(25, 60)
        },
        "audio_config": {
            "sample_rate": 44100,
            "chunk_size_ms": 1000,
            "supported_formats": ["wav", "mp3", "flac", "ogg"],
            "max_duration_minutes": 90
        }
    }

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc: HTTPException):
    """Handle HTTP exceptions."""
    logger.error(f"HTTP error: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": f"HTTP_{exc.status_code}",
                "message": exc.detail,
                "service": "ai-audio"
            },
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc: Exception):
    """Handle general exceptions."""
    logger.error(f"Unhandled error: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "Internal server error",
                "service": "ai-audio"
            },
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
        }
    )

# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    """Application startup."""
    logger.info("AI Audio Service (Mock) starting up...")
    logger.info(f"Service ready on port 5001")
    logger.info("Mock features: speech detection, noise analysis, multi-speaker detection")

if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=5001,
        log_level="info",
        reload=False
    )