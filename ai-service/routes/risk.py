"""
routes/risk.py — F-22
POST /risk/score-route endpoint.
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Optional
from services.risk_scorer import RouteScoreRequest, score_route
from datetime import datetime

router = APIRouter()


class ScoreRouteRequest(BaseModel):
    origin_lat:           float = Field(..., ge=-90,   le=90)
    origin_lng:           float = Field(..., ge=-180,  le=180)
    dest_lat:             float = Field(..., ge=-90,   le=90)
    dest_lng:             float = Field(..., ge=-180,  le=180)
    hour_of_day:          Optional[int]   = None   # defaults to current hour
    day_of_week:          Optional[int]   = None   # defaults to current day
    transport_mode:       Optional[str]   = "walking"
    route_length_meters:  Optional[float] = 1000.0
    danger_spot_count:    Optional[int]   = 0
    crowd_density:        Optional[float] = 0.5


@router.post("/score-route")
def score_route_endpoint(req: ScoreRouteRequest):
    now = datetime.now()

    request = RouteScoreRequest(
        origin_lat=          req.origin_lat,
        origin_lng=          req.origin_lng,
        dest_lat=            req.dest_lat,
        dest_lng=            req.dest_lng,
        hour_of_day=         req.hour_of_day  if req.hour_of_day  is not None else now.hour,
        day_of_week=         req.day_of_week  if req.day_of_week  is not None else now.weekday(),
        transport_mode=      req.transport_mode or "walking",
        route_length_meters= req.route_length_meters or 1000.0,
        danger_spot_count=   req.danger_spot_count or 0,
        crowd_density=       req.crowd_density or 0.5,
    )

    result = score_route(request)

    return {
        "risk_score":      result.risk_score,
        "risk_level":      result.risk_level,
        "factors":         result.factors,
        "recommendation":  result.recommendation,
    }