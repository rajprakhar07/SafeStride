interface Props { summary?: string; }

export default function AISummary({ summary }: Props) {
  if (!summary) return null;
  return (
    <div style={styles.card}>
      <div style={styles.label}>🧭 Route Summary</div>
      <p style={styles.text}>{summary}</p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card:  { background: '#fff', borderRadius: '16px', padding: '1.1rem 1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', fontFamily: "'Inter', system-ui, sans-serif" },
  label: { fontSize: '0.8rem', fontWeight: 700, color: '#E91E8C', marginBottom: '0.4rem' },
  text:  { fontSize: '0.88rem', color: '#333', lineHeight: 1.5, margin: 0 },
};