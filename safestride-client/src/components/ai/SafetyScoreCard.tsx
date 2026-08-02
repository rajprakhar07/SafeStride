import RiskLevelBadge from './RiskLevelBadge';

interface Props { score: number | null; riskLevel: string | null; }

function scoreColor(score: number | null): string {
  if (score == null) return '#aaa';
  if (score >= 70) return '#22C55E';
  if (score >= 40) return '#F59E0B';
  return '#EF4444';
}

export default function SafetyScoreCard({ score, riskLevel }: Props) {
  return (
    <div style={styles.card}>
      <div style={styles.left}>
        <div style={{ ...styles.scoreCircle, borderColor: scoreColor(score) }}>
          <span style={{ ...styles.scoreNumber, color: scoreColor(score) }}>
            {score ?? '—'}
          </span>
          <span style={styles.scoreOutOf}>/100</span>
        </div>
      </div>
      <div style={styles.right}>
        <div style={styles.title}>Safety Score</div>
        <RiskLevelBadge level={riskLevel} />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card:        { display: 'flex', alignItems: 'center', gap: '1.25rem', background: '#fff', borderRadius: '16px', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', fontFamily: "'Inter', system-ui, sans-serif" },
  left:        { flexShrink: 0 },
  scoreCircle: { width: '72px', height: '72px', borderRadius: '50%', border: '4px solid', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  scoreNumber: { fontSize: '1.4rem', fontWeight: 800, lineHeight: 1 },
  scoreOutOf:  { fontSize: '0.65rem', color: '#aaa' },
  right:       { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  title:       { fontSize: '0.85rem', color: '#666', fontWeight: 600 },
};