/**
 * RiskBadge.tsx — F-23
 * Shows route safety score as a colored badge.
 */

interface RiskBadgeProps {
  riskLevel:  'safe' | 'moderate' | 'high';
  riskScore:  number;
  size?:      'sm' | 'md' | 'lg';
}

const RISK_CONFIG = {
  safe:     { color: '#065F46', bg: '#D1FAE5', border: '#6EE7B7', label: '✅ Safe',     emoji: '🟢' },
  moderate: { color: '#92400E', bg: '#FEF3C7', border: '#FCD34D', label: '⚠️ Caution', emoji: '🟡' },
  high:     { color: '#991B1B', bg: '#FEE2E2', border: '#FCA5A5', label: '🚨 Unsafe',  emoji: '🔴' },
};

export default function RiskBadge({ riskLevel, riskScore, size = 'md' }: RiskBadgeProps) {
  const cfg = RISK_CONFIG[riskLevel] || RISK_CONFIG.safe;

  const sizes = {
    sm: { padding: '0.2rem 0.5rem', fontSize: '0.72rem' },
    md: { padding: '0.3rem 0.75rem', fontSize: '0.82rem' },
    lg: { padding: '0.5rem 1rem', fontSize: '0.95rem' },
  };

  return (
    <span style={{
      display:      'inline-flex',
      alignItems:   'center',
      gap:          '0.3rem',
      borderRadius: '20px',
      fontWeight:   600,
      border:       `1px solid ${cfg.border}`,
      background:   cfg.bg,
      color:        cfg.color,
      ...sizes[size],
    }}>
      {cfg.emoji} {cfg.label} ({Math.round(riskScore)})
    </span>
  );
}