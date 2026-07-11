/**
 * ETADisplay.tsx — F-12
 * Shows ETA countdown + remaining distance during active journey.
 */

import { useJourneyStore } from '../../store/journeyStore';

export default function ETADisplay() {
  const eta             = useJourneyStore((s) => s.eta);
  const remainingMeters = useJourneyStore((s) => s.remainingMeters);
  const remainingMinutes = useJourneyStore((s) => s.remainingMinutes);
  const activeJourney   = useJourneyStore((s) => s.activeJourney);

  const etaTime = eta
    ? new Date(eta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : activeJourney?.estimatedArrival
    ? new Date(activeJourney.estimatedArrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '--:--';

  const distance =
    remainingMeters !== null
      ? remainingMeters >= 1000
        ? `${(remainingMeters / 1000).toFixed(1)} km`
        : `${remainingMeters} m`
      : '—';

  const minutes = remainingMinutes ?? activeJourney?.plannedDurationMinutes ?? '—';

  return (
    <div style={styles.container}>
      <div style={styles.item}>
        <span style={styles.value}>{etaTime}</span>
        <span style={styles.label}>Arrival</span>
      </div>
      <div style={styles.divider} />
      <div style={styles.item}>
        <span style={styles.value}>{minutes} min</span>
        <span style={styles.label}>Remaining</span>
      </div>
      <div style={styles.divider} />
      <div style={styles.item}>
        <span style={styles.value}>{distance}</span>
        <span style={styles.label}>Distance</span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', alignItems: 'center', justifyContent: 'space-around', background: '#fff', borderRadius: '16px', padding: '0.75rem 1rem', boxShadow: '0 2px 12px rgba(0,0,0,0.1)' },
  item:      { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' },
  value:     { fontSize: '1.1rem', fontWeight: 700, color: '#1a1a1a' },
  label:     { fontSize: '0.72rem', color: '#999', textTransform: 'uppercase', letterSpacing: '0.04em' },
  divider:   { width: '1px', height: '32px', background: '#f0f0f0' },
};