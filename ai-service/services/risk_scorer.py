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

    The ML model determines the final risk score.
    The factor breakdown explains the environmental/contextual
    conditions that contributed to the route assessment.
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

    # ─────────────────────────────────────────────────────────────
    # 1. TIME OF DAY
    # ─────────────────────────────────────────────────────────────

    if req.hour_of_day in {22, 23, 0, 1, 2, 3, 4, 5}:
        factors.append({
            "factor": "Late-night travel",
            "score": 30,
            "max": 30,
            "description": (
                f"Travel is planned at {req.hour_of_day:02d}:00, "
                "when late-night conditions may increase risk."
            ),
            "severity": "high",
        })

    elif req.hour_of_day in {18, 19, 20, 21}:
        factors.append({
            "factor": "Evening travel",
            "score": 15,
            "max": 15,
            "description": (
                f"Travel is planned at {req.hour_of_day:02d}:00. "
                "Visibility and pedestrian activity may be lower."
            ),
            "severity": "moderate",
        })

    else:
        factors.append({
            "factor": "Daytime travel",
            "score": 0,
            "max": 30,
            "description": (
                f"Travel is planned at {req.hour_of_day:02d}:00, "
                "which is generally a lower-risk travel period."
            ),
            "severity": "low",
        })

    # ─────────────────────────────────────────────────────────────
    # 2. COMMUNITY DANGER SPOTS
    # ─────────────────────────────────────────────────────────────

    danger_score = min(req.danger_spot_count * 6, 25)

    if req.danger_spot_count > 0:
        danger_severity = (
            "high" if req.danger_spot_count >= 4
            else "moderate"
        )

        factors.append({
            "factor": "Community danger spots",
            "score": round(danger_score, 1),
            "max": 25,
            "description": (
                f"{req.danger_spot_count} reported danger spot(s) "
                "were detected near the route."
            ),
            "severity": danger_severity,
        })

    else:
        factors.append({
            "factor": "Community danger spots",
            "score": 0,
            "max": 25,
            "description": (
                "No active community-reported danger spots "
                "were detected near the route."
            ),
            "severity": "low",
        })

    # ─────────────────────────────────────────────────────────────
    # 3. LIGHTING
    # ─────────────────────────────────────────────────────────────

    lighting_risk = round((1 - req.lighting_score) * 15, 1)

    if req.lighting_score < 0.4:
        lighting_severity = "high"
    elif req.lighting_score < 0.7:
        lighting_severity = "moderate"
    else:
        lighting_severity = "low"

    factors.append({
        "factor": "Lighting conditions",
        "score": lighting_risk,
        "max": 15,
        "description": (
            f"Lighting safety estimate: "
            f"{round(req.lighting_score * 100)}%."
        ),
        "severity": lighting_severity,
    })

    # ─────────────────────────────────────────────────────────────
    # 4. PEDESTRIAN / CROWD ACTIVITY
    # ─────────────────────────────────────────────────────────────

    crowd_risk = round((1 - req.crowd_density) * 10, 1)

    if req.crowd_density < 0.3:
        crowd_severity = "high"
        crowd_description = (
            "Expected pedestrian activity is low, "
            "which may reduce natural surveillance."
        )
    elif req.crowd_density < 0.7:
        crowd_severity = "moderate"
        crowd_description = (
            "Expected pedestrian activity is moderate."
        )
    else:
        crowd_severity = "low"
        crowd_description = (
            "Expected pedestrian activity is relatively high."
        )

    factors.append({
        "factor": "Pedestrian activity",
        "score": crowd_risk,
        "max": 10,
        "description": crowd_description,
        "severity": crowd_severity,
    })

    # ─────────────────────────────────────────────────────────────
    # 5. HISTORICAL INCIDENTS
    # ─────────────────────────────────────────────────────────────

    historical_risk = round(
        req.historical_incident_density * 30,
        1
    )

    if req.historical_incident_density > 0.6:
        historical_severity = "high"
        historical_description = (
            "The surrounding area has elevated "
            "historical incident density."
        )
    elif req.historical_incident_density > 0.3:
        historical_severity = "moderate"
        historical_description = (
            "The surrounding area has moderate "
            "historical incident density."
        )
    else:
        historical_severity = "low"
        historical_description = (
            "No elevated historical incident density "
            "was detected in the available data."
        )

    factors.append({
        "factor": "Historical incident risk",
        "score": historical_risk,
        "max": 30,
        "description": historical_description,
        "severity": historical_severity,
    })

    # ─────────────────────────────────────────────────────────────
    # 6. ROUTE LENGTH
    # ─────────────────────────────────────────────────────────────

    route_risk = min(
        req.route_length_meters / 1000 * 1.5,
        10
    )

    route_km = req.route_length_meters / 1000

    if route_km >= 10:
        route_severity = "high"
    elif route_km >= 5:
        route_severity = "moderate"
    else:
        route_severity = "low"

    factors.append({
    "factor": "Long route",
    "score": round(route_risk, 1),
    "max": 10,
    "severity": (
        "high"
        if req.route_length_meters >= 15000
        else "medium"
        if req.route_length_meters >= 7000
        else "low"
    ),
    "value": round(req.route_length_meters / 1000, 1),
    "unit": "km",
    "description": (
        "Longer routes can increase total exposure time "
        "and the number of areas encountered."
    ),
    "impact": (
        f"The planned route is approximately "
        f"{req.route_length_meters / 1000:.1f} km."
    ),
    "recommendation": (
        "If a similarly safe shorter route is available, "
        "consider using it."
    ),
})

    # ─────────────────────────────────────────────────────────────
    # 7. TRANSPORT MODE
    # ─────────────────────────────────────────────────────────────

    mode_labels = {
        "walking": "Walking",
        "auto": "Auto",
        "cab": "Cab",
        "bus": "Bus",
        "mixed": "Mixed transport",
    }

    factors.append({
        "factor": "Travel mode",
        "score": 0,
        "max": 1,
        "description": (
            f"Route evaluated using {mode_labels.get(req.transport_mode, req.transport_mode)}."
        ),
        "severity": "info",
    })

    # ─────────────────────────────────────────────────────────────
    # FINAL FALLBACK MESSAGE
    # ─────────────────────────────────────────────────────────────

    recommendation = get_recommendation(level)

    if is_fallback:
        recommendation += (
            " ML model unavailable; fallback scoring was used."
        )

    return RouteScoreResponse(
        risk_score=final_score,
        risk_level=level,
        factors=factors,
        recommendation=recommendation,
    )

