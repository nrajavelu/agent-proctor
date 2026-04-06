"""Mock AI Vision Service for Demo Environment"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Dict, Any
import uvicorn
import time
import base64
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
    title="AI Vision Service (Demo Mock)",
    description="Mock computer vision service for proctoring demo",
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
class AnalysisRequest(BaseModel):
    session_id: str
    image: str  # base64 encoded
    timestamp: str
    participant_id: str = "candidate-123"
    session_config: Dict[str, Any] = {}

class Detection(BaseModel):
    type: str
    confidence: float
    bbox: List[float]  # [x, y, width, height]
    details: Dict[str, Any] = {}

class Violation(BaseModel):
    type: str
    severity: str  # info, warning, critical
    confidence: float
    description: str
    timestamp: str
    source: str = "ai_vision"
    metadata: Dict[str, Any] = {}

class AnalysisResponse(BaseModel):
    session_id: str
    frame_id: str
    timestamp: str
    processing_time_ms: float
    detections: List[Detection]
    violations: List[Violation]
    face_detected: bool
    face_confidence: float
    eye_tracking: Dict[str, Any]
    head_pose: Dict[str, float]
    environment_score: float
    risk_level: str

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    model_loaded: bool
    uptime: float
    memory_usage: Dict[str, Any]

# Mock analysis data generators
def generate_mock_detections() -> List[Detection]:
    """Generate realistic mock detections."""
    detections = []
    
    # Always detect at least one face for realism
    face_confidence = 0.88 + random.random() * 0.12
    detections.append(Detection(
        type="person",
        confidence=face_confidence,
        bbox=[0.25, 0.15, 0.5, 0.7],  # centered face
        details={
            "face_landmarks": 68,
            "age_estimate": 22 + random.randint(0, 8),
            "gender_confidence": 0.85 + random.random() * 0.15
        }
    ))
    
    # Sometimes detect additional objects
    if random.random() < 0.3:  # 30% chance
        objects = ["laptop", "book", "pen", "phone"]
        for obj in random.sample(objects, random.randint(1, 2)):
            detections.append(Detection(
                type=obj,
                confidence=0.65 + random.random() * 0.25,
                bbox=[
                    random.random() * 0.6,
                    random.random() * 0.6,
                    0.1 + random.random() * 0.3,
                    0.1 + random.random() * 0.3
                ],
                details={"context": "desk_environment"}
            ))
    
    return detections

def generate_mock_violations(session_duration_minutes: int) -> List[Violation]:
    """Generate mock violations based on session duration."""
    violations = []
    current_time = time.time()
    
    # Simulate violation patterns over time
    base_violation_chance = 0.15  # 15% base chance
    
    # Add time-based factors (people get tired, more violations later)
    time_factor = min(1.5, 1.0 + (session_duration_minutes / 60) * 0.5)
    violation_chance = base_violation_chance * time_factor
    
    if random.random() < violation_chance:
        violation_types = [
            {
                "type": "face_not_detected",
                "severity": "warning",
                "description": "Candidate face not clearly visible for 3.2 seconds",
                "base_confidence": 0.92
            },
            {
                "type": "multiple_faces",
                "severity": "critical", 
                "description": "Multiple faces detected in frame",
                "base_confidence": 0.95
            },
            {
                "type": "looking_away_extended",
                "severity": "warning",
                "description": "Eye gaze away from screen for extended period (8.1 seconds)",
                "base_confidence": 0.78
            },
            {
                "type": "suspicious_object",
                "severity": "info",
                "description": "Mobile phone detected in examination area",
                "base_confidence": 0.84
            },
            {
                "type": "pose_anomaly",
                "severity": "info",
                "description": "Unusual head position detected",
                "base_confidence": 0.71
            }
        ]
        
        violation = random.choice(violation_types)
        violations.append(Violation(
            type=violation["type"],
            severity=violation["severity"],
            confidence=violation["base_confidence"] + random.random() * 0.1 - 0.05,
            description=violation["description"],
            timestamp=time.strftime("%Y-%m-%dT%H:%M:%S.%fZ", time.gmtime(current_time)),
            metadata={
                "frame_analysis_id": f"frame_{int(current_time * 1000)}",
                "detection_algorithm": "YOLOv8_mock",
                "processing_node": "vision_node_01"
            }
        ))
    
    return violations

def generate_eye_tracking() -> Dict[str, Any]:
    """Generate mock eye tracking data."""
    # Simulate gaze coordinates (0,0 = top-left, 1,1 = bottom-right)
    gaze_x = 0.4 + random.random() * 0.2  # Generally looking at center
    gaze_y = 0.3 + random.random() * 0.4  # Generally looking at screen area
    
    return {
        "gaze_point": {"x": gaze_x, "y": gaze_y},
        "fixation_duration": random.uniform(0.8, 3.2),  # seconds
        "saccade_velocity": random.uniform(200, 500),  # degrees/second
        "blink_rate": random.uniform(12, 20),  # blinks per minute
        "pupil_diameter": random.uniform(3.2, 6.8),  # mm
        "gaze_confidence": 0.82 + random.random() * 0.15,
        "calibration_quality": "good"
    }

def generate_head_pose() -> Dict[str, float]:
    """Generate mock head pose estimation."""
    return {
        "yaw": random.uniform(-15, 15),      # left/right rotation
        "pitch": random.uniform(-10, 20),   # up/down rotation  
        "roll": random.uniform(-5, 5),      # tilt
        "confidence": 0.87 + random.random() * 0.12,
        "stability": random.uniform(0.75, 0.95)
    }

# Service state
service_start_time = time.time()
processed_frames = 0

@app.get("/", response_model=Dict[str, Any])
async def root():
    """Root endpoint with service information."""
    return {
        "service": "AI Vision Service",
        "version": "1.0.0",
        "status": "operational",
        "type": "mock-demo",
        "description": "Mock computer vision service for proctoring demo",
        "capabilities": [
            "Face detection and tracking",
            "Eye gaze analysis", 
            "Head pose estimation",
            "Object detection",
            "Violation detection",
            "Environment analysis"
        ],
        "endpoints": {
            "health": "GET /health",
            "analyze": "POST /api/v1/analyze/frame",
            "detect": "POST /api/v1/detect",
            "stats": "GET /api/v1/stats"
        },
        "mock_features": {
            "realistic_violations": True,
            "time_based_variation": True,
            "configurable_sensitivity": True,
            "demo_safe": True
        }
    }

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint for monitoring."""
    uptime = time.time() - service_start_time
    
    # Mock memory usage
    memory_usage = {
        "rss": random.randint(120, 180) * 1024 * 1024,  # 120-180 MB
        "heap_used": random.randint(80, 120) * 1024 * 1024,  # 80-120 MB
        "external": random.randint(15, 25) * 1024 * 1024   # 15-25 MB
    }
    
    return HealthResponse(
        status="healthy",
        service="AI Vision Service",
        version="1.0.0",
        model_loaded=True,
        uptime=uptime,
        memory_usage=memory_usage
    )

@app.post("/api/v1/analyze/frame", response_model=AnalysisResponse)
async def analyze_frame(request: AnalysisRequest):
    """Analyze a frame for violations - main proctoring endpoint."""
    global processed_frames
    processed_frames += 1
    
    start_time = time.time()
    
    logger.info(f"Analyzing frame for session {request.session_id}")
    
    try:
        # Simulate processing delay (20-80ms)
        processing_delay = random.uniform(0.02, 0.08)
        await asyncio.sleep(processing_delay) if "asyncio" in globals() else time.sleep(processing_delay)
        
        # Calculate session duration for realistic violations
        session_duration_minutes = random.randint(5, 90)  # Mock session duration
        
        # Generate mock analysis results
        detections = generate_mock_detections()
        violations = generate_mock_violations(session_duration_minutes)
        
        face_detected = len([d for d in detections if d.type == "person"]) > 0
        face_confidence = detections[0].confidence if face_detected else 0.0
        
        eye_tracking = generate_eye_tracking()
        head_pose = generate_head_pose()
        
        # Calculate environment score (0-100)
        base_score = 85
        violation_penalty = len(violations) * 5
        environment_score = max(60, base_score - violation_penalty + random.randint(-5, 5))
        
        # Determine risk level
        if environment_score >= 85:
            risk_level = "low"
        elif environment_score >= 70:
            risk_level = "medium"
        else:
            risk_level = "high"
        
        processing_time = (time.time() - start_time) * 1000
        frame_id = f"frame_{int(time.time() * 1000)}_{random.randint(1000, 9999)}"
        
        response = AnalysisResponse(
            session_id=request.session_id,
            frame_id=frame_id,
            timestamp=request.timestamp,
            processing_time_ms=processing_time,
            detections=detections,
            violations=violations,
            face_detected=face_detected,
            face_confidence=face_confidence,
            eye_tracking=eye_tracking,
            head_pose=head_pose,
            environment_score=environment_score,
            risk_level=risk_level
        )
        
        logger.info(
            f"Frame analysis complete: {len(violations)} violations, "
            f"score: {environment_score}, risk: {risk_level}, "
            f"processing: {processing_time:.1f}ms"
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Frame analysis error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Frame analysis failed: {str(e)}"
        )

@app.post("/api/v1/detect")
async def detect_objects(request: AnalysisRequest):
    """Simple object detection without violation mapping."""
    start_time = time.time()
    
    try:
        detections = generate_mock_detections()
        processing_time = (time.time() - start_time) * 1000
        
        return {
            "session_id": request.session_id,
            "timestamp": request.timestamp,
            "processing_time_ms": processing_time,
            "detections": detections,
            "object_count": len(detections)
        }
        
    except Exception as e:
        logger.error(f"Object detection error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Object detection failed: {str(e)}"
        )

@app.get("/api/v1/stats")
async def get_stats():
    """Get service statistics."""
    uptime = time.time() - service_start_time
    
    return {
        "service": "AI Vision Service",
        "status": "operational",
        "uptime_seconds": uptime,
        "processed_frames": processed_frames,
        "average_processing_time_ms": random.uniform(25, 65),
        "current_load": {
            "cpu_usage": random.uniform(15, 45),     # %
            "memory_usage": random.uniform(120, 180), # MB
            "gpu_usage": random.uniform(20, 60),     # % (mock GPU)
            "active_sessions": random.randint(0, 5)
        },
        "model_info": {
            "name": "YOLOv8n-face-detection (mock)",
            "version": "8.0.196",
            "loaded": True,
            "accuracy": 0.94,
            "inference_time_ms": random.uniform(20, 50)
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
                "service": "ai-vision"
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
                "service": "ai-vision"
            },
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
        }
    )

# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    """Application startup."""
    logger.info("AI Vision Service (Mock) starting up...")
    logger.info(f"Service ready on port 5000")
    logger.info("Mock features: realistic violations, time-based variation, demo-safe")

if __name__ == "__main__":
    import asyncio
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=5000,
        log_level="info",
        reload=False
    )