"""
routes/anomaly.py — F-22
POST /anomaly/detect endpoint.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from services.anomaly_detector import LocationPing, detect_anomaly

router = APIRouter()


class PingInput(BaseModel):
    lat:       float
    lng:       float
    speed:     Optional[float] = None
    accuracy:  Optional[float] = None
    battery:   Optional[float] = None
    timestamp: Optional[int]   = None


class DetectAnomalyRequest(BaseModel):
    pings: List[PingInput]


@router.post("/detect")
def detect_anomaly_endpoint(req: DetectAnomalyRequest):
    pings = [
        LocationPing(
            lat=       p.lat,
            lng=       p.lng,
            speed=     p.speed,
            accuracy=  p.accuracy,
            battery=   p.battery,
            timestamp= p.timestamp or 0,
        )
        for p in req.pings
    ]

    result = detect_anomaly(pings)

    return {
        "is_anomaly":   result.is_anomaly,
        "anomaly_type": result.anomaly_type,
        "confidence":   result.confidence,
        "description":  result.description,
    }