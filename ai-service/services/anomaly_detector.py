"""
anomaly_detector.py — F-22
Journey anomaly detection service.

Detects 5 anomaly types from PROJECT_CONTEXT.md §18:
  1. stopped_unexpectedly — speed=0 for > 3 pings in a row
  2. speed_spike          — sudden jump from walking to vehicle speed
  3. route_deviation      — handled by deviation.service.js (not here)
  4. ping_silence         — handled by dead man's switch (not here)
  5. battery_critical     — battery < 5%
"""

from dataclasses import dataclass
from typing import List, Optional


@dataclass
class LocationPing:
    lat:          float
    lng:          float
    speed:        Optional[float]   # m/s
    accuracy:     Optional[float]   # meters
    battery:      Optional[float]   # 0-100
    timestamp:    int               # Unix ms


@dataclass
class AnomalyResult:
    is_anomaly:    bool
    anomaly_type:  Optional[str]    # anomaly type string
    confidence:    float            # 0-1
    description:   str


# ─── Constants ────────────────────────────────────────────────────────────────
STOPPED_SPEED_THRESHOLD   = 0.3    # m/s — below this = stationary
STOPPED_MIN_PINGS         = 3      # consecutive stationary pings to flag
SPEED_SPIKE_LOW           = 2.0    # m/s — normal walking max
SPEED_SPIKE_HIGH          = 8.0    # m/s — min vehicle speed
BATTERY_CRITICAL          = 5.0    # %


def detect_anomaly(pings: List[LocationPing]) -> AnomalyResult:
    """
    Detect anomalies in a sequence of location pings.
    Analyzes the last N pings for patterns.

    @param pings: List of recent pings (newest last)
    @returns: AnomalyResult with anomaly type and confidence
    """
    if not pings or len(pings) < 2:
        return AnomalyResult(
            is_anomaly=False,
            anomaly_type=None,
            confidence=0.0,
            description="Insufficient data for anomaly detection",
        )

    latest = pings[-1]

    # ── Check 1: Battery critical ─────────────────────────────────────────────
    if latest.battery is not None and latest.battery <= BATTERY_CRITICAL:
        return AnomalyResult(
            is_anomaly=True,
            anomaly_type="battery_critical",
            confidence=1.0,
            description=f"Battery critically low: {latest.battery:.0f}%. App may stop tracking soon.",
        )

    # ── Check 2: Speed spike (possible forced vehicle pickup) ─────────────────
    if len(pings) >= 2:
        prev    = pings[-2]
        curr    = latest
        p_speed = prev.speed or 0
        c_speed = curr.speed or 0

        if p_speed < SPEED_SPIKE_LOW and c_speed > SPEED_SPIKE_HIGH:
            confidence = min(1.0, (c_speed - SPEED_SPIKE_HIGH) / 10)
            return AnomalyResult(
                is_anomaly=True,
                anomaly_type="speed_spike",
                confidence=round(confidence, 2),
                description=f"Sudden speed change from {p_speed:.1f}m/s to {c_speed:.1f}m/s — possible vehicle pickup",
            )

    # ── Check 3: Stopped unexpectedly ────────────────────────────────────────
    recent = pings[-STOPPED_MIN_PINGS:] if len(pings) >= STOPPED_MIN_PINGS else pings
    stationary_count = sum(
        1 for p in recent
        if (p.speed is not None and p.speed < STOPPED_SPEED_THRESHOLD)
    )

    if len(recent) >= STOPPED_MIN_PINGS and stationary_count >= STOPPED_MIN_PINGS:
        duration_estimate = len(recent) * 10  # ~10s per ping
        return AnomalyResult(
            is_anomaly=True,
            anomaly_type="stopped_unexpectedly",
            confidence=0.7,
            description=f"User has been stationary for ~{duration_estimate}+ seconds unexpectedly",
        )

    # ── No anomaly detected ────────────────────────────────────────────────────
    return AnomalyResult(
        is_anomaly=False,
        anomaly_type=None,
        confidence=0.0,
        description="No anomaly detected",
    )