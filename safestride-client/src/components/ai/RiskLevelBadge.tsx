interface Props { level: string | null; }

const LEVEL_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  low:      { bg: '#DCFCE7', color: '#166534', label: 'Low Risk' },
  safe:     { bg: '#DCFCE7', color: '#166534', label: 'Low Risk' },
  moderate: { bg: '#FEF3C7', color: '#92400E', label: 'Moderate Risk' },
  high:     { bg: '#FEE2E2', color: '#991B1B', label: 'High Risk' },
};

export default function RiskLevelBadge({ level }: Props) {
  const key = (level || '').toLowerCase();
  const style = LEVEL_STYLES[key] || { bg: '#F3F4F6', color: '#666', label: 'Unknown' };

  return (
    <span style={{
      display: 'inline-block', padding: '0.3rem 0.8rem', borderRadius: '999px',
      background: style.bg, color: style.color, fontSize: '0.8rem', fontWeight: 700,
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {style.label}
    </span>
  );
}