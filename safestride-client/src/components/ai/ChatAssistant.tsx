import { useState, useRef, useEffect } from 'react';
import { askSafetyAssistant } from '../../services/api/ai.api';

interface Message { role: 'user' | 'assistant'; text: string; }

interface Props { journeyId?: string; }

const SUGGESTIONS = ['Is this route safe?', 'What should I do if I feel unsafe?', 'Should I travel at night?'];

export default function ChatAssistant({ journeyId }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setMessages((m) => [...m, { role: 'user', text: trimmed }]);
    setInput('');
    setLoading(true);

    try {
      const res = await askSafetyAssistant(trimmed, journeyId);
      setMessages((m) => [...m, {
        role: 'assistant',
        text: res.unavailable ? (res.message || 'AI Safety Analysis is temporarily unavailable.') : (res.reply || ''),
      }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', text: 'AI Safety Analysis is temporarily unavailable.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.card}>
      <div style={styles.header}>💬 Ask the Safety Assistant</div>

      {messages.length === 0 && (
        <div style={styles.suggestions}>
          {SUGGESTIONS.map((s) => (
            <button key={s} style={styles.suggestionBtn} onClick={() => send(s)}>{s}</button>
          ))}
        </div>
      )}

      {messages.length > 0 && (
        <div style={styles.messages}>
          {messages.map((m, i) => (
            <div key={i} style={{ ...styles.bubble, ...(m.role === 'user' ? styles.userBubble : styles.assistantBubble) }}>
              {m.text}
            </div>
          ))}
          {loading && <div style={{ ...styles.bubble, ...styles.assistantBubble }}>Thinking…</div>}
          <div ref={bottomRef} />
        </div>
      )}

      <div style={styles.inputRow}>
        <input
          style={styles.input}
          value={input}
          placeholder="Type a question…"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send(input); }}
        />
        <button style={styles.sendBtn} onClick={() => send(input)} disabled={loading}>➤</button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card:            { background: '#fff', borderRadius: '16px', padding: '1.1rem 1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', fontFamily: "'Inter', system-ui, sans-serif", display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  header:          { fontSize: '0.85rem', fontWeight: 700, color: '#1a1a1a' },
  suggestions:     { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  suggestionBtn:   { textAlign: 'left', background: '#FDF2F8', border: '1px solid #FBCFE8', borderRadius: '10px', padding: '0.6rem 0.8rem', fontSize: '0.82rem', color: '#9D174D', cursor: 'pointer' },
  messages:        { display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '260px', overflowY: 'auto' },
  bubble:          { padding: '0.6rem 0.85rem', borderRadius: '12px', fontSize: '0.85rem', lineHeight: 1.4, maxWidth: '85%' },
  userBubble:      { alignSelf: 'flex-end', background: '#E91E8C', color: '#fff' },
  assistantBubble: { alignSelf: 'flex-start', background: '#F3F4F6', color: '#333' },
  inputRow:        { display: 'flex', gap: '0.5rem' },
  input:           { flex: 1, padding: '0.6rem 0.8rem', borderRadius: '10px', border: '1px solid #eee', fontSize: '0.85rem', fontFamily: "'Inter', system-ui, sans-serif" },
  sendBtn:         { background: '#E91E8C', color: '#fff', border: 'none', borderRadius: '10px', width: '40px', fontSize: '1rem', cursor: 'pointer' },
};