/**
 * RoutePlanner.tsx
 *
 * Route safety analysis screen.
 * Displays detailed AI risk factors returned by /api/v1/risk/score-route.
 */

import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  scoreRoute,
  type RouteRiskScore,
  type RiskFactor,
} from '../../services/api/risk.api';
import RiskBadge from '../../components/journey/RiskBadge';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

const TRANSPORT_MODES = [
  { value: 'walking', label: '🚶 Walking' },
  { value: 'auto', label: '🛺 Auto' },
  { value: 'cab', label: '🚗 Cab' },
  { value: 'bus', label: '🚌 Bus' },
];

export default function RoutePlanner() {
  const navigate = useNavigate();

  const [originLat, setOriginLat] = useState('');
  const [originLng, setOriginLng] = useState('');
  const [destName, setDestName] = useState('');
  const [destLat, setDestLat] = useState('');
  const [destLng, setDestLng] = useState('');

  const [transport, setTransport] = useState('walking');

  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const [error, setError] = useState('');
  const [result, setResult] = useState<RouteRiskScore | null>(null);

  // ───────────────────────────────────────────────────────────────────────────
  // Current GPS location
  // ───────────────────────────────────────────────────────────────────────────

  function useCurrentLocation() {
    if (!('geolocation' in navigator)) {
      setError("Your browser doesn't support GPS.");
      return;
    }

    setIsLocating(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setOriginLat(position.coords.latitude.toFixed(6));
        setOriginLng(position.coords.longitude.toFixed(6));
        setIsLocating(false);
      },
      (err) => {
        console.error(err);
        setIsLocating(false);

        if (err.code === 1) {
          setError(
            'Location access denied. Please allow GPS in your browser settings.'
          );
        } else if (err.code === 2) {
          setError(
            'Unable to determine your location. Please try again.'
          );
        } else {
          setError(
            'GPS timed out. Try moving near a window or refreshing.'
          );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Destination search using Nominatim
  // ───────────────────────────────────────────────────────────────────────────

  async function searchDestination(name: string) {
    if (!name || name.trim().length < 3) return;

    setIsSearching(true);
    setError('');

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          name
        )}&limit=1`
      );

      if (!res.ok) {
        throw new Error('Destination search failed');
      }

      const data = await res.json();

      if (data && data[0]) {
        setDestLat(parseFloat(data[0].lat).toFixed(6));
        setDestLng(parseFloat(data[0].lon).toFixed(6));
        setError('');
      } else {
        setError(
          'Could not find that location. Try a different name.'
        );
      }
    } catch (err) {
      console.error('Search failed:', err);
      setError('Destination search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Score route
  // ───────────────────────────────────────────────────────────────────────────

  async function handleScore(e: FormEvent) {
    e.preventDefault();

    setError('');
    setResult(null);

    const oLat = parseFloat(originLat);
    const oLng = parseFloat(originLng);
    const dLat = parseFloat(destLat);
    const dLng = parseFloat(destLng);

    if (
      isNaN(oLat) ||
      isNaN(oLng) ||
      isNaN(dLat) ||
      isNaN(dLng)
    ) {
      setError(
        'Please provide valid coordinates for both starting point and destination.'
      );
      return;
    }

    setIsLoading(true);

    try {
      const score = await scoreRoute({
        origin: {
          lat: oLat,
          lng: oLng,
        },
        destination: {
          lat: dLat,
          lng: dLng,
        },
        transportMode: transport,
      });

      setResult(score);
    } catch (err) {
      console.error('Route scoring failed:', err);
      setError(
        'Failed to score route. AI service might be offline.'
      );
    } finally {
      setIsLoading(false);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Helpers
  // ───────────────────────────────────────────────────────────────────────────

  function getSeverity(
    factor: RiskFactor,
    percentage: number
  ): 'high' | 'moderate' | 'low' | 'info' {
    if (factor.severity) {
      return factor.severity;
    }

    if (percentage >= 70) return 'high';
    if (percentage >= 35) return 'moderate';

    return 'low';
  }

  function getSeverityLabel(
    severity: 'high' | 'moderate' | 'low' | 'info'
  ) {
    switch (severity) {
      case 'high':
        return 'High';

      case 'moderate':
        return 'Moderate';

      case 'info':
        return 'Info';

      default:
        return 'Low';
    }
  }

  function getSeverityStyle(
    severity: 'high' | 'moderate' | 'low' | 'info'
  ) {
    switch (severity) {
      case 'high':
        return {
          ...styles.severityBadge,
          ...styles.severityHigh,
        };

      case 'moderate':
        return {
          ...styles.severityBadge,
          ...styles.severityModerate,
        };

      case 'info':
        return {
          ...styles.severityBadge,
          ...styles.severityInfo,
        };

      default:
        return {
          ...styles.severityBadge,
          ...styles.severityLow,
        };
    }
  }

  function getProgressColor(
    severity: 'high' | 'moderate' | 'low' | 'info'
  ) {
    switch (severity) {
      case 'high':
        return '#EF4444';

      case 'moderate':
        return '#F59E0B';

      case 'info':
        return '#3B82F6';

      default:
        return '#22C55E';
    }
  }

  function formatDistance(meters?: number) {
    if (typeof meters !== 'number') return null;

    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }

    return `${Math.round(meters)} m`;
  }

  function getTransportLabel() {
    const mode = TRANSPORT_MODES.find(
      (item) => item.value === transport
    );

    return mode?.label || transport;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // UI
  // ───────────────────────────────────────────────────────────────────────────

  return (
    <div style={styles.container}>
      {/* Back */}
      <button
        style={styles.back}
        onClick={() => navigate('/')}
      >
        ← Back
      </button>

      {/* Header */}
      <div style={styles.pageHeader}>
        <div style={styles.titleRow}>
          <div style={styles.titleIcon}>🛡️</div>

          <div>
            <h1 style={styles.title}>
              Route Safety Check
            </h1>

            <p style={styles.subtitle}>
              Plan your route with AI-powered safety analysis.
            </p>
          </div>
        </div>
      </div>

      {/* ───────────────── FORM ───────────────── */}

      <form
        onSubmit={handleScore}
        style={styles.form}
      >
        {/* Origin */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionLabel}>
              📍 Starting Point
            </span>

            <button
              type="button"
              style={{
                ...styles.locationBtn,
                opacity: isLocating ? 0.5 : 1,
              }}
              onClick={useCurrentLocation}
              disabled={isLocating}
            >
              {isLocating ? 'Locating...' : 'Use My GPS'}
            </button>
          </div>

          <div style={styles.coordRow}>
            <Input
              label="Latitude"
              value={originLat}
              onChange={(e) =>
                setOriginLat(e.target.value)
              }
            />

            <Input
              label="Longitude"
              value={originLng}
              onChange={(e) =>
                setOriginLng(e.target.value)
              }
            />
          </div>
        </div>

        {/* Destination */}
        <div style={styles.section}>
          <span style={styles.sectionLabel}>
            🏁 Destination
          </span>

          <Input
            placeholder="e.g. Pune Station, Home, College"
            value={destName}
            onChange={(e) =>
              setDestName(e.target.value)
            }
            onBlur={() =>
              searchDestination(destName)
            }
          />

          {isSearching && (
            <p style={styles.searchingText}>
              Searching destination...
            </p>
          )}

          <div style={styles.coordRow}>
            <Input
              label="Latitude"
              value={destLat}
              onChange={(e) =>
                setDestLat(e.target.value)
              }
            />

            <Input
              label="Longitude"
              value={destLng}
              onChange={(e) =>
                setDestLng(e.target.value)
              }
            />
          </div>
        </div>

        {/* Transport */}
        <div style={styles.transportSection}>
          <span style={styles.sectionLabel}>
            🚗 Travel Mode
          </span>

          <div style={styles.modeRow}>
            {TRANSPORT_MODES.map((mode) => {
              const selected =
                transport === mode.value;

              return (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() =>
                    setTransport(mode.value)
                  }
                  style={{
                    ...styles.modeBtn,
                    ...(selected
                      ? styles.modeBtnSelected
                      : styles.modeBtnDefault),
                  }}
                >
                  {mode.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={styles.errorBox}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Submit */}
        <Button
          type="submit"
          fullWidth
          loading={isLoading}
        >
          🔍 Check Route Safety
        </Button>
      </form>

      {/* ───────────────── RESULT ───────────────── */}

      {result && (
        <div style={styles.resultCard}>
          {/* Result heading */}
          <div style={styles.resultHeading}>
            <div>
              <span style={styles.resultEyebrow}>
                ROUTE SAFETY RESULT
              </span>

              <h2 style={styles.resultTitle}>
                AI Risk Assessment
              </h2>
            </div>
          </div>

          {/* Risk badge */}
          <div style={styles.riskBadgeContainer}>
            <RiskBadge
              riskLevel={result.riskLevel}
              riskScore={result.riskScore}
              size="lg"
            />
          </div>

          {/* Score explanation */}
          <div style={styles.scoreSummary}>
            <div style={styles.scoreNumber}>
              {Math.round(result.riskScore)}
            </div>

            <div style={styles.scoreOutOf}>
              / 100
            </div>

            <div style={styles.scoreLabel}>
              Overall Risk Score
            </div>
          </div>

          {/* Recommendation */}
          <div style={styles.recommendationBox}>
            <div style={styles.recommendationIcon}>
              💡
            </div>

            <div>
              <div style={styles.recommendationTitle}>
                Safety Recommendation
              </div>

              <p style={styles.recommendation}>
                {result.recommendation}
              </p>
            </div>
          </div>

          {/* Route summary */}
          <div style={styles.summaryGrid}>
            <div style={styles.summaryItem}>
              <span style={styles.summaryIcon}>
                🛣️
              </span>

              <div>
                <span style={styles.summaryLabel}>
                  Route Distance
                </span>

                <strong style={styles.summaryValue}>
                  {formatDistance(
                    result.route?.distanceMeters
                  ) || 'Calculated'}
                </strong>
              </div>
            </div>

            <div style={styles.summaryItem}>
              <span style={styles.summaryIcon}>
                🚗
              </span>

              <div>
                <span style={styles.summaryLabel}>
                  Travel Mode
                </span>

                <strong style={styles.summaryValue}>
                  {getTransportLabel()}
                </strong>
              </div>
            </div>

            <div style={styles.summaryItem}>
              <span style={styles.summaryIcon}>
                ⚠️
              </span>

              <div>
                <span style={styles.summaryLabel}>
                  Danger Spots
                </span>

                <strong style={styles.summaryValue}>
                  {result.dangerSpotCount} detected
                </strong>
              </div>
            </div>
          </div>

          {/* Danger spots */}
          {result.dangerSpotCount > 0 ? (
            <div style={styles.spotsWarning}>
              <div style={styles.spotsWarningTitle}>
                ⚠️ Community Risk Alert
              </div>

              <div style={styles.spotsWarningText}>
                {result.dangerSpotCount}{' '}
                community-reported danger zone
                {result.dangerSpotCount !== 1
                  ? 's'
                  : ''}{' '}
                were detected near this route.
                Exercise additional caution.
              </div>
            </div>
          ) : (
            <div style={styles.spotsSafe}>
              <span style={styles.spotsSafeIcon}>
                ✓
              </span>

              <div>
                <strong style={styles.spotsSafeTitle}>
                  No community danger spots detected
                </strong>

                <div style={styles.spotsSafeText}>
                  No active reported danger zones were
                  found near this route.
                </div>
              </div>
            </div>
          )}

          {/* Risk analysis */}
          <div style={styles.analysisHeader}>
            <div>
              <div style={styles.analysisTitle}>
                Risk Analysis Breakdown
              </div>

              <div style={styles.analysisSubtitle}>
                See exactly what influenced the AI score
              </div>
            </div>

            <div style={styles.factorCount}>
              {result.factors.length} factors
            </div>
          </div>

          {/* Factor cards */}
          <div style={styles.factorList}>
            {result.factors.map((factor, index) => {
              const hasScore =
                typeof factor.score === 'number' &&
                typeof factor.max === 'number' &&
                factor.max > 0;

              const percentage = hasScore
                ? Math.min(
                    100,
                    Math.max(
                      0,
                      (factor.score! /
                        factor.max!) *
                        100
                    )
                  )
                : 0;

              const severity = getSeverity(
                factor,
                percentage
              );

              const severityLabel =
                getSeverityLabel(severity);

              const progressColor =
                getProgressColor(severity);

              return (
                <div
                  key={`${factor.factor}-${index}`}
                  style={{
                    ...styles.detailedFactorCard,
                    borderLeft: `4px solid ${progressColor}`,
                  }}
                >
                  {/* Top */}
                  <div style={styles.factorTopRow}>
                    <div style={styles.factorInfo}>
                      <div style={styles.factorNameRow}>
                        <span
                          style={styles.factorName}
                        >
                          {factor.factor}
                        </span>

                        <span
                          style={getSeverityStyle(
                            severity
                          )}
                        >
                          {severityLabel}
                        </span>
                      </div>

                      <p style={styles.factorDesc}>
                        {factor.description}
                      </p>
                    </div>

                    {hasScore && (
                      <div style={styles.factorScore}>
                        <strong>
                          {Number(
                            factor.score
                          ).toFixed(
                            Number.isInteger(
                              factor.score
                            )
                              ? 0
                              : 1
                          )}
                        </strong>

                        <span>
                          {' '}
                          / {factor.max}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Progress bar */}
                  {hasScore && (
                    <div style={styles.progressSection}>
                      <div
                        style={
                          styles.progressTrack
                        }
                      >
                        <div
                          style={{
                            ...styles.progressFill,
                            width: `${percentage}%`,
                            background:
                              progressColor,
                          }}
                        />
                      </div>

                      <span
                        style={
                          styles.progressPercentage
                        }
                      >
                        {percentage.toFixed(0)}%
                      </span>
                    </div>
                  )}

                  {/* Additional value */}
                  {typeof factor.value ===
                    'number' &&
                    factor.unit && (
                      <div style={styles.valueBox}>
                        <span style={styles.valueLabel}>
                          Measured value
                        </span>

                        <strong style={styles.value}>
                          {factor.value}
                          {factor.unit}
                        </strong>
                      </div>
                    )}

                  {/* Impact */}
                  {factor.impact && (
                    <div style={styles.impactBox}>
                      <span style={styles.impactIcon}>
                        📌
                      </span>

                      <div>
                        <strong
                          style={
                            styles.impactLabel
                          }
                        >
                          Impact
                        </strong>

                        <p
                          style={
                            styles.impactText
                          }
                        >
                          {factor.impact}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Factor recommendation */}
                  {factor.recommendation && (
                    <div
                      style={
                        styles.factorRecommendation
                      }
                    >
                      <span>💡</span>

                      <span>
                        {factor.recommendation}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Final recommendation */}
          <div style={styles.finalRecommendation}>
            <div style={styles.finalRecommendationIcon}>
              🛡️
            </div>

            <div>
              <strong
                style={styles.finalRecommendationTitle}
              >
                Before you start
              </strong>

              <p
                style={
                  styles.finalRecommendationText
                }
              >
                {result.recommendation}
              </p>
            </div>
          </div>

          {/* Start Journey */}
          <Button
            fullWidth
            onClick={() =>
              navigate('/journey/start')
            }
            style={{
              marginTop: '0.25rem',
            }}
          >
            Start Journey Now →
          </Button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100dvh',
    padding: '1.5rem',
    paddingBottom: '3rem',
    background: '#f7f8fa',
    fontFamily:
      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    maxWidth: '520px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },

  back: {
    background: 'none',
    border: 'none',
    color: '#777',
    fontSize: '0.9rem',
    cursor: 'pointer',
    padding: '0.4rem 0',
    alignSelf: 'flex-start',
  },

  pageHeader: {
    marginBottom: '0.25rem',
  },

  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.8rem',
  },

  titleIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '13px',
    background: '#fce7f3',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.35rem',
    flexShrink: 0,
  },

  title: {
    fontSize: '1.55rem',
    fontWeight: 750,
    color: '#18181b',
    margin: 0,
    letterSpacing: '-0.025em',
  },

  subtitle: {
    fontSize: '0.82rem',
    color: '#71717a',
    margin: '0.25rem 0 0',
    lineHeight: 1.4,
  },

  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.15rem',
  },

  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.55rem',
  },

  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  sectionLabel: {
    fontSize: '0.84rem',
    fontWeight: 650,
    color: '#27272a',
  },

  locationBtn: {
    background: '#fce7f3',
    border: 'none',
    borderRadius: '8px',
    color: '#db2777',
    padding: '0.4rem 0.65rem',
    fontSize: '0.76rem',
    fontWeight: 650,
    cursor: 'pointer',
  },

  coordRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.7rem',
  },

  searchingText: {
    fontSize: '0.75rem',
    color: '#db2777',
    margin: 0,
  },

  transportSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.55rem',
  },

  modeRow: {
    display: 'flex',
    gap: '0.45rem',
    flexWrap: 'wrap',
  },

  modeBtn: {
    padding: '0.55rem 0.75rem',
    borderRadius: '10px',
    fontSize: '0.78rem',
    fontWeight: 550,
    cursor: 'pointer',
    transition:
      'all 0.2s ease',
  },

  modeBtnSelected: {
    background: '#E91E8C',
    color: '#fff',
    border: '1px solid #E91E8C',
    boxShadow:
      '0 2px 8px rgba(233, 30, 140, 0.2)',
  },

  modeBtnDefault: {
    background: '#fff',
    color: '#3f3f46',
    border: '1px solid #e4e4e7',
  },

  errorBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.55rem',
    padding: '0.75rem',
    background: '#fff1f2',
    border: '1px solid #fecdd3',
    borderRadius: '10px',
    color: '#be123c',
    fontSize: '0.8rem',
    lineHeight: 1.4,
  },

  // ───────────────── Result ─────────────────

  resultCard: {
    background: '#fff',
    borderRadius: '20px',
    padding: '1.15rem',
    boxShadow:
      '0 4px 24px rgba(0, 0, 0, 0.07)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.9rem',
    border: '1px solid #f0f0f2',
  },

  resultHeading: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  resultEyebrow: {
    display: 'block',
    fontSize: '0.65rem',
    fontWeight: 750,
    letterSpacing: '0.09em',
    color: '#a1a1aa',
    marginBottom: '0.2rem',
  },

  resultTitle: {
    margin: 0,
    fontSize: '1.05rem',
    fontWeight: 700,
    color: '#18181b',
  },

  riskBadgeContainer: {
    display: 'flex',
    justifyContent: 'center',
    padding:
      '0.25rem 0 0',
  },

  scoreSummary: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'center',
    flexWrap: 'wrap',
    columnGap: '0.2rem',
    paddingBottom: '0.2rem',
  },

  scoreNumber: {
    fontSize: '2.5rem',
    lineHeight: 1,
    fontWeight: 800,
    color: '#18181b',
    letterSpacing: '-0.05em',
  },

  scoreOutOf: {
    fontSize: '0.95rem',
    color: '#a1a1aa',
    fontWeight: 600,
  },

  scoreLabel: {
    width: '100%',
    textAlign: 'center',
    marginTop: '0.35rem',
    fontSize: '0.7rem',
    color: '#a1a1aa',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontWeight: 650,
  },

  recommendationBox: {
    display: 'flex',
    gap: '0.7rem',
    alignItems: 'flex-start',
    padding: '0.85rem',
    borderRadius: '12px',
    background: '#fff7ed',
    border: '1px solid #fed7aa',
  },

  recommendationIcon: {
    fontSize: '1rem',
    lineHeight: 1.2,
  },

  recommendationTitle: {
    fontSize: '0.76rem',
    fontWeight: 700,
    color: '#9a3412',
    marginBottom: '0.2rem',
  },

  recommendation: {
    fontSize: '0.79rem',
    color: '#7c2d12',
    textAlign: 'left',
    margin: 0,
    lineHeight: 1.5,
  },

  // ───────────────── Summary ─────────────────

  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '0.55rem',
  },

  summaryItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
    padding: '0.7rem',
    background: '#fafafa',
    borderRadius: '11px',
    border: '1px solid #f0f0f0',
  },

  summaryIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '9px',
    background: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.95rem',
    border: '1px solid #eeeeee',
    flexShrink: 0,
  },

  summaryLabel: {
    display: 'block',
    fontSize: '0.65rem',
    color: '#a1a1aa',
    marginBottom: '0.1rem',
  },

  summaryValue: {
    display: 'block',
    fontSize: '0.8rem',
    color: '#27272a',
    fontWeight: 650,
  },

  // ───────────────── Danger spots ─────────────────

  spotsWarning: {
    background: '#fff7ed',
    border: '1px solid #fed7aa',
    borderRadius: '12px',
    padding: '0.8rem',
  },

  spotsWarningTitle: {
    color: '#9a3412',
    fontSize: '0.8rem',
    fontWeight: 700,
    marginBottom: '0.2rem',
  },

  spotsWarningText: {
    color: '#7c2d12',
    fontSize: '0.74rem',
    lineHeight: 1.45,
  },

  spotsSafe: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '12px',
    padding: '0.75rem',
  },

  spotsSafeIcon: {
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    background: '#dcfce7',
    color: '#16a34a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    flexShrink: 0,
  },

  spotsSafeTitle: {
    display: 'block',
    color: '#166534',
    fontSize: '0.77rem',
    marginBottom: '0.12rem',
  },

  spotsSafeText: {
    color: '#15803d',
    fontSize: '0.7rem',
    lineHeight: 1.4,
  },

  // ───────────────── Analysis ─────────────────

  analysisHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: '0.5rem',
    marginTop: '0.15rem',
  },

  analysisTitle: {
    fontSize: '0.86rem',
    fontWeight: 750,
    color: '#27272a',
  },

  analysisSubtitle: {
    fontSize: '0.68rem',
    color: '#a1a1aa',
    marginTop: '0.15rem',
  },

  factorCount: {
    flexShrink: 0,
    fontSize: '0.65rem',
    color: '#71717a',
    background: '#f4f4f5',
    borderRadius: '20px',
    padding: '0.3rem 0.5rem',
  },

  factorList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.65rem',
  },

  detailedFactorCard: {
    background: '#fafafa',
    borderRadius: '12px',
    padding: '0.8rem',
    borderTop: '1px solid #f0f0f0',
    borderRight: '1px solid #f0f0f0',
    borderBottom: '1px solid #f0f0f0',
  },

  factorTopRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '0.65rem',
  },

  factorInfo: {
    flex: 1,
    minWidth: 0,
  },

  factorNameRow: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '0.4rem',
  },

  factorName: {
    fontSize: '0.82rem',
    fontWeight: 700,
    color: '#18181b',
  },

  severityBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.16rem 0.4rem',
    borderRadius: '20px',
    fontSize: '0.58rem',
    fontWeight: 750,
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  },

  severityHigh: {
    background: '#fee2e2',
    color: '#b91c1c',
  },

  severityModerate: {
    background: '#fef3c7',
    color: '#a16207',
  },

  severityLow: {
    background: '#dcfce7',
    color: '#15803d',
  },

  severityInfo: {
    background: '#dbeafe',
    color: '#1d4ed8',
  },

  factorDesc: {
    margin: '0.35rem 0 0',
    fontSize: '0.71rem',
    color: '#71717a',
    lineHeight: 1.45,
  },

  factorScore: {
    flexShrink: 0,
    color: '#71717a',
    fontSize: '0.68rem',
    whiteSpace: 'nowrap',
    paddingTop: '0.05rem',
  },

  progressSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginTop: '0.65rem',
  },

  progressTrack: {
    flex: 1,
    height: '7px',
    background: '#e4e4e7',
    borderRadius: '10px',
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    borderRadius: '10px',
    transition:
      'width 0.5s ease',
    minWidth: '2px',
  },

  progressPercentage: {
    width: '30px',
    textAlign: 'right',
    fontSize: '0.62rem',
    color: '#71717a',
    fontWeight: 650,
  },

  // ───────────────── Factor details ─────────────────

  valueBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '0.6rem',
    padding:
      '0.5rem 0.6rem',
    background: '#fff',
    borderRadius: '8px',
    border: '1px solid #eeeeee',
  },

  valueLabel: {
    fontSize: '0.64rem',
    color: '#a1a1aa',
  },

  value: {
    fontSize: '0.76rem',
    color: '#27272a',
  },

  impactBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.45rem',
    marginTop: '0.6rem',
    padding: '0.55rem 0.6rem',
    background: '#fff',
    borderRadius: '8px',
    border: '1px solid #eeeeee',
  },

  impactIcon: {
    fontSize: '0.7rem',
    lineHeight: 1.4,
  },

  impactLabel: {
    display: 'block',
    fontSize: '0.62rem',
    color: '#52525b',
    marginBottom: '0.1rem',
  },

  impactText: {
    margin: 0,
    fontSize: '0.68rem',
    color: '#71717a',
    lineHeight: 1.4,
  },

  factorRecommendation: {
    display: 'flex',
    gap: '0.4rem',
    alignItems: 'flex-start',
    marginTop: '0.6rem',
    padding:
      '0.55rem 0.6rem',
    background: '#fdf2f8',
    color: '#9d174d',
    borderRadius: '8px',
    fontSize: '0.68rem',
    lineHeight: 1.4,
  },

  // ───────────────── Final recommendation ─────────────────

  finalRecommendation: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.65rem',
    padding: '0.8rem',
    background: '#fdf2f8',
    border: '1px solid #fbcfe8',
    borderRadius: '12px',
  },

  finalRecommendationIcon: {
    width: '30px',
    height: '30px',
    borderRadius: '9px',
    background: '#fce7f3',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    fontSize: '0.9rem',
  },

  finalRecommendationTitle: {
    display: 'block',
    fontSize: '0.75rem',
    color: '#9d174d',
    marginBottom: '0.15rem',
  },

  finalRecommendationText: {
    margin: 0,
    fontSize: '0.7rem',
    color: '#831843',
    lineHeight: 1.45,
  },
};