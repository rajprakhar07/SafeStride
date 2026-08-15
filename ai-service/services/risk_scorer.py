"""
risk_scorer.py — F-22/F-23

ML-based route risk scoring service.

Uses the trained Random Forest model:
    models/risk_model.joblib

Falls back to a rule-based score if the model cannot be loaded.
"""

from dataclasses import dataclass
from typing import List, Optional
from pathlib import Path

import joblib
import pandas as pd


# ─── Paths ────────────────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "models" / "risk_model.joblib"


# ─── Data structures ──────────────────────────────────────────────────────────

@dataclass
class RouteScoreRequest:
    origin_lat: float
    origin_lng: float
    dest_lat: float
    dest_lng: float
    hour_of_day: int
    day_of_week: int
    transport_mode: str
    route_length_meters: float
    danger_spot_count: int = 0
    crowd_density: float = 0.5
    historical_incident_density: float = 0.5
    lighting_score: float = 0.5


@dataclass
class RouteScoreResponse:
    risk_score: float
    risk_level: str
    factors: List[dict]
    recommendation: str


# ─── Load trained model ───────────────────────────────────────────────────────

MODEL = None

try:
    if MODEL_PATH.exists():
        MODEL = joblib.load(MODEL_PATH)
        print(f"✓ ML risk model loaded: {MODEL_PATH}")
    else:
        print(f"⚠ ML model not found: {MODEL_PATH}")
except Exception as exc:
    print(f"⚠ Failed to load ML model: {exc}")
    MODEL = None


# ─── Risk level ───────────────────────────────────────────────────────────────

def get_risk_level(score: float) -> str:
    if score < 40:
        return "safe"
    elif score < 70:
        return "moderate"
    return "high"


def get_recommendation(level: str) -> str:
    if level == "safe":
        return (
            "This route currently shows relatively low risk. "
            "Continue to follow normal safety precautions."
        )

    if level == "moderate":
        return (
            "Exercise caution. Prefer well-lit and populated roads "
            "and share your live location before leaving."
        )

    return (
        "Consider a safer alternative. Prefer well-lit main roads "
        "and consider travelling with a trusted person."
    )


# ─── ML scoring ──────────────────────────────────────────────────────────────

def score_with_model(req: RouteScoreRequest) -> float:
    """
    Generate a risk score using the trained Random Forest pipeline.
    """

    if MODEL is None:
        raise RuntimeError("ML risk model is not loaded")

    features = pd.DataFrame([{
        "hour_of_day": req.hour_of_day,
        "day_of_week": req.day_of_week,
        "transport_mode": req.transport_mode,
        "route_length_meters": req.route_length_meters,
        "danger_spot_count": req.danger_spot_count,
        "crowd_density": req.crowd_density,
        "historical_incident_density": req.historical_incident_density,
        "lighting_score": req.lighting_score,
    }])

    prediction = MODEL.predict(features)[0]

    return round(float(max(0, min(100, prediction))), 1)


# ─── Rule-based fallback ─────────────────────────────────────────────────────

def score_fallback(req: RouteScoreRequest) -> float:
    """
    Simple fallback if the ML model is unavailable.
    """

    score = 0.0

    # Night-time risk
    if req.hour_of_day in {22, 23, 0, 1, 2, 3, 4, 5}:
        score += 30
    elif req.hour_of_day in {18, 19, 20, 21}:
        score += 15

    # Historical incidents
    score += req.historical_incident_density * 30

    # Community danger spots
    score += min(req.danger_spot_count * 6, 25)

    # Poor lighting
    score += (1 - req.lighting_score) * 15

    # Low crowd density
    score += (1 - req.crowd_density) * 10

    # Route length
    score += min(req.route_length_meters / 1000 * 1.5, 10)

    # Transport
    multipliers = {
        "walking": 1.2,
        "mixed": 1.1,
        "bus": 0.95,
        "auto": 0.9,
        "cab": 0.75,
    }

    score *= multipliers.get(req.transport_mode, 1.0)

    return round(max(0, min(100, score)), 1)


# ─── Main scoring function ───────────────────────────────────────────────────

def score_route(req: RouteScoreRequest) -> RouteScoreResponse:
    """
    Score a route using the trained ML model.

    If the ML model is unavailable, automatically falls back
    to the rule-based scoring system.
    """

    is_fallback = False

    try:
        final_score = score_with_model(req)
    except Exception as exc:
        print(f"⚠ ML scoring failed: {exc}")
        print("→ Using rule-based fallback.")
        final_score = score_fallback(req)
        is_fallback = True

    level = get_risk_level(final_score)

    factors = []

    # Time factor
    if req.hour_of_day in {22, 23, 0, 1, 2, 3, 4, 5}:
        factors.append({
            "factor": "Late-night travel",
            "description": f"Travel time is {req.hour_of_day:02d}:00",
        })
    elif req.hour_of_day in {18, 19, 20, 21}:
        factors.append({
            "factor": "Evening travel",
            "description": f"Travel time is {req.hour_of_day:02d}:00",
        })

    # Danger spots
    if req.danger_spot_count > 0:
        factors.append({
            "factor": "Community danger spots",
            "description": (
                f"{req.danger_spot_count} reported danger spot(s) "
                "near the route"
            ),
        })

    # Lighting
    if req.lighting_score < 0.4:
        factors.append({
            "factor": "Poor lighting",
            "description": "Route area has relatively low lighting",
        })

    # Crowd
    if req.crowd_density < 0.3:
        factors.append({
            "factor": "Low pedestrian activity",
            "description": "Expected pedestrian activity is low",
        })

    # Historical incidents
    if req.historical_incident_density > 0.6:
        factors.append({
            "factor": "Historical incident density",
            "description": "Area has elevated historical incident density",
        })

    if not factors:
        factors.append({
            "factor": "No significant risk factors",
            "description": "No major risk indicators detected",
        })

    recommendation = get_recommendation(level)

    if is_fallback:
        recommendation += " ML model unavailable; fallback scoring was used."

    return RouteScoreResponse(
        risk_score=final_score,
        risk_level=level,
        factors=factors,
        recommendation=recommendation,
    )
