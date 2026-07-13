"""
risk_scorer.py — F-22
Route risk scoring service.

Risk score 0-100 based on:
  - hour_of_day (0-23)
  - day_of_week (0-6)
  - transport_mode multiplier
  - area_danger_spots (community markers nearby)
  - route_length_meters
  - darkness_score (estimated from hour)

In production: replace rule-based scoring with trained XGBoost model.
For F-22: uses interpretable rule-based scoring (no training data needed).
"""

from dataclasses import dataclass
from typing import List, Optional
import math


@dataclass
class RouteScoreRequest:
    origin_lat:           float
    origin_lng:           float
    dest_lat:             float
    dest_lng:             float
    hour_of_day:          int          # 0-23
    day_of_week:          int          # 0=Monday, 6=Sunday
    transport_mode:       str          # walking|auto|cab|bus|mixed
    route_length_meters:  float
    danger_spot_count:    int = 0      # community markers within 500m of route
    crowd_density:        float = 0.5  # 0-1 estimate


@dataclass
class RouteScoreResponse:
    risk_score:   float        # 0-100
    risk_level:   str          # safe|moderate|high
    factors:      List[dict]   # contributing factors with scores
    recommendation: str


# ─── Scoring constants ────────────────────────────────────────────────────────

# High-risk hours (late night / early morning)
HIGH_RISK_HOURS  = {22, 23, 0, 1, 2, 3, 4, 5}
# Moderate risk hours (evening)
MOD_RISK_HOURS   = {18, 19, 20, 21}

# Transport mode risk multipliers
TRANSPORT_RISK = {
    "walking": 1.5,   # most vulnerable
    "auto":    1.0,
    "cab":     0.7,   # relatively safe (tracked)
    "bus":     0.9,
    "mixed":   1.2,
}

# Weekend evenings are higher risk
WEEKEND_DAYS = {5, 6}  # Saturday, Sunday


def calculate_darkness_score(hour: int) -> float:
    """
    Estimate darkness based on hour (0=fully dark, 1=fully lit).
    Returns a risk contribution 0-1.
    """
    if hour in HIGH_RISK_HOURS:
        return 1.0
    elif hour in MOD_RISK_HOURS:
        return 0.5
    elif 6 <= hour <= 17:
        return 0.0  # daytime
    return 0.3


def score_route(req: RouteScoreRequest) -> RouteScoreResponse:
    """
    Calculate risk score for a route using rule-based scoring.
    Returns score 0-100 and contributing factors.
    """
    factors = []
    total_score = 0.0

    # ── Factor 1: Time of day (0-40 points) ──────────────────────────────────
    darkness = calculate_darkness_score(req.hour_of_day)
    time_score = darkness * 40
    factors.append({
        "factor":      "Time of day",
        "score":       round(time_score, 1),
        "max":         40,
        "description": f"{'Night time' if darkness > 0.7 else 'Evening' if darkness > 0.3 else 'Daytime'} ({req.hour_of_day:02d}:00)",
    })
    total_score += time_score

    # ── Factor 2: Transport mode (0-20 points) ────────────────────────────────
    mode_multiplier = TRANSPORT_RISK.get(req.transport_mode, 1.0)
    mode_score = (mode_multiplier - 0.7) / 0.8 * 20  # normalize to 0-20
    mode_score = max(0, min(20, mode_score))
    factors.append({
        "factor":      "Transport mode",
        "score":       round(mode_score, 1),
        "max":         20,
        "description": f"{req.transport_mode.capitalize()} — {'higher' if mode_multiplier > 1.0 else 'lower'} risk mode",
    })
    total_score += mode_score

    # ── Factor 3: Community danger spots (0-25 points) ────────────────────────
    spots_score = min(25, req.danger_spot_count * 8)
    factors.append({
        "factor":      "Danger spots nearby",
        "score":       round(spots_score, 1),
        "max":         25,
        "description": f"{req.danger_spot_count} community-reported unsafe spot(s) near route",
    })
    total_score += spots_score

    # ── Factor 4: Route length (0-10 points) ──────────────────────────────────
    # Longer walks = more exposure
    length_km    = req.route_length_meters / 1000
    length_score = min(10, length_km * 2)
    factors.append({
        "factor":      "Route length",
        "score":       round(length_score, 1),
        "max":         10,
        "description": f"{length_km:.1f} km route",
    })
    total_score += length_score

    # ── Factor 5: Weekend evening bonus (0-5 points) ──────────────────────────
    weekend_bonus = 0.0
    if req.day_of_week in WEEKEND_DAYS and req.hour_of_day in MOD_RISK_HOURS | HIGH_RISK_HOURS:
        weekend_bonus = 5.0
    factors.append({
        "factor":      "Day/time context",
        "score":       round(weekend_bonus, 1),
        "max":         5,
        "description": "Weekend evening — higher activity" if weekend_bonus > 0 else "Normal day",
    })
    total_score += weekend_bonus

    # ── Normalize to 0-100 ────────────────────────────────────────────────────
    final_score = round(min(100, max(0, total_score)), 1)

    # ── Risk level ────────────────────────────────────────────────────────────
    if final_score < 40:
        level = "safe"
        recommendation = "This route looks safe. Stay aware of your surroundings."
    elif final_score < 70:
        level = "moderate"
        recommendation = "Exercise caution. Share your live location before leaving."
    else:
        level = "high"
        recommendation = "Consider a safer alternative. Travel with a companion if possible, or take a cab."

    return RouteScoreResponse(
        risk_score=final_score,
        risk_level=level,
        factors=factors,
        recommendation=recommendation,
    )