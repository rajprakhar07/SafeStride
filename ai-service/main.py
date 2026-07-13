"""
SafeStride AI Microservice — F-22
FastAPI service for route risk scoring and journey anomaly detection.

Run: uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(
    title="SafeStride AI Service",
    description="Route risk scoring and journey anomaly detection",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("BACKEND_URL", "http://localhost:5000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "safestride-ai",
        "version": "1.0.0",
        "model_loaded": True,
    }


# Register routes
from routes.risk    import router as risk_router
from routes.anomaly import router as anomaly_router

app.include_router(risk_router,    prefix="/risk",    tags=["risk"])
app.include_router(anomaly_router, prefix="/anomaly", tags=["anomaly"])