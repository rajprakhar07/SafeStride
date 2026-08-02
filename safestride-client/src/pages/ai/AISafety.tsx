import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJourneyStore } from '../../store/journeyStore';
import { analyzeJourneySafety, type SafetyAnalysis } from '../../services/api/ai.api';
import SafetyScoreCard      from '../../components/ai/SafetyScoreCard';
import AISummary            from '../../components/ai/AISummary';
import RecommendationsList  from '../../components/ai/RecommendationsList';
import ChatAssistant        from '../../components/ai/ChatAssistant';

export default function AISafety() {
  const navigate = useNavigate();
  const activeJourney = useJourneyStore((s) => s.activeJourney);

  const [analysis, setAnalysis] = useState<SafetyAnalysis | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    if (!activeJourney) { setLoading(false); return; }

    let cancelled = false;
    (async () => {
      try {
        const result = await analyzeJourneySafety({ journeyId: activeJourney._id });
        if (!cancelled) setAnalysis(result);
      } catch {
        if (!cancelled) setError('AI Safety Analysis is temporarily unavailable.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [activeJourney]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>←</button>
        <h2 style={styles.title}>AI Safety Assistant</h2>
      </div>

      <div style={styles.content}>
        {!activeJourney && (
          <div style={styles.emptyState}>Start a journey to get AI-powered safety analysis.</div>
        )}

        {activeJourney && loading && (
          <div style={styles.emptyState}>Analyzing your route…</div>
        )}

        {activeJourney && !loading && (error || analysis?.unavailable) && (
          <div style={styles.unavailableBanner}>
            ⚠️ {analysis?.message || error || 'AI Safety Analysis is temporarily unavailable.'}
          </div>
        )}

        {activeJourney && !loading && analysis && (
          <>
            <SafetyScoreCard score={analysis.safetyScore} riskLevel={analysis.riskLevel} />
            {!analysis.unavailable && <AISummary summary={analysis.summary} />}
            {!analysis.unavailable && (
              <RecommendationsList
                recommendations={analysis.recommendations}
                concerns={analysis.concerns}
                precautions={analysis.precautions}
              />
            )}
            {analysis.emergencyTips && analysis.emergencyTips.length > 0 && (
              <RecommendationsList recommendations={analysis.emergencyTips} />
            )}
          </>
        )}

        <ChatAssistant journeyId={activeJourney?._id} />

        {analysis?.disclaimer && <p style={styles.disclaimer}>{analysis.disclaimer}</p>}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container:          { minHeight: '100dvh', background: '#FAFAFA', fontFamily: "'Inter', system-ui, sans-serif" },
  header:             { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
  backBtn:            { background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#1a1a1a' },
  title:              { fontSize: '1.05rem', fontWeight: 700, color: '#E91E8C', margin: 0 },
  content:            { padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' },
  emptyState:         { textAlign: 'center', color: '#aaa', fontSize: '0.9rem', padding: '2rem 0' },
  unavailableBanner:  { background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: '12px', padding: '0.85rem 1rem', fontSize: '0.85rem', color: '#92400E' },
  disclaimer:         { fontSize: '0.72rem', color: '#aaa', textAlign: 'center', margin: '0.5rem 0 0' },
};