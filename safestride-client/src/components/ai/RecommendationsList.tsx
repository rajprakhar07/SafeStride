interface Props {
  recommendations?: string[];
  concerns?: string[];
  precautions?: string[];
}

function Section({ title, icon, items }: { title: string; icon: string; items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ marginBottom: '0.9rem' }}>
      <div style={styles.sectionTitle}>{icon} {title}</div>
      <ul style={styles.list}>
        {items.map((item, i) => <li key={i} style={styles.listItem}>{item}</li>)}
      </ul>
    </div>
  );
}

export default function RecommendationsList({ recommendations, concerns, precautions }: Props) {
  const hasAny = (recommendations?.length || 0) + (concerns?.length || 0) + (precautions?.length || 0) > 0;
  if (!hasAny) return null;

  return (
    <div style={styles.card}>
      <Section title="Recommendations" icon="✔" items={recommendations} />
      <Section title="Potential Concerns" icon="⚠️" items={concerns} />
      <Section title="Precautions" icon="🛡️" items={precautions} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card:         { background: '#fff', borderRadius: '16px', padding: '1.1rem 1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', fontFamily: "'Inter', system-ui, sans-serif" },
  sectionTitle: { fontSize: '0.8rem', fontWeight: 700, color: '#1a1a1a', marginBottom: '0.4rem' },
  list:         { margin: 0, paddingLeft: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' },
  listItem:     { fontSize: '0.85rem', color: '#444', lineHeight: 1.4 },
};