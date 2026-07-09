/**
 * ContactCard.tsx — F-08
 * Card for a single trusted contact with actions.
 */

import { useState } from 'react';
import type { TrustedContact } from '../../services/api/contacts.api';
import { deleteContact, resendInvite } from '../../services/api/contacts.api';
import ContactStatus from './ContactStatus';

const RELATIONSHIP_ICONS: Record<string, string> = {
  Mother: '👩', Mom: '👩', Father: '👨', Dad: '👨',
  Sister: '👧', Brother: '👦', Friend: '👫',
  Husband: '💑', Wife: '💑', default: '👤',
};

interface Props {
  contact:   TrustedContact;
  onDeleted: (id: string) => void;
}

export default function ContactCard({ contact, onDeleted }: Props) {
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [isDeleting,   setIsDeleting]   = useState(false);
  const [isResending,  setIsResending]  = useState(false);
  const [resendDone,   setResendDone]   = useState(false);
  const [error,        setError]        = useState('');

  const icon = RELATIONSHIP_ICONS[contact.relationship || ''] || RELATIONSHIP_ICONS.default;

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteContact(contact._id);
      onDeleted(contact._id);
    } catch {
      setError('Failed to remove contact. Try again.');
      setIsDeleting(false);
      setShowConfirm(false);
    }
  }

  async function handleResend() {
    setIsResending(true);
    setError('');
    try {
      await resendInvite(contact._id);
      setResendDone(true);
      setTimeout(() => setResendDone(false), 3000);
    } catch {
      setError('Failed to resend invite.');
    } finally {
      setIsResending(false);
    }
  }

  return (
    <div style={styles.card}>
      {/* Avatar + Info */}
      <div style={styles.row}>
        <div style={styles.avatar}>{icon}</div>
        <div style={styles.info}>
          <div style={styles.name}>{contact.contactName}</div>
          <div style={styles.phone}>{contact.contactPhone}</div>
          {contact.relationship && (
            <div style={styles.relationship}>{contact.relationship}</div>
          )}
        </div>
        <ContactStatus status={contact.status} />
      </div>

      {/* Error */}
      {error && <p style={styles.error}>{error}</p>}

      {/* Actions */}
      <div style={styles.actions}>
        {contact.status === 'pending' && (
          <button
            style={styles.resendBtn}
            onClick={handleResend}
            disabled={isResending}
          >
            {isResending ? 'Sending…' : resendDone ? '✔ Sent!' : '↩ Resend invite'}
          </button>
        )}

        {!showConfirm ? (
          <button style={styles.deleteBtn} onClick={() => setShowConfirm(true)}>
            Remove
          </button>
        ) : (
          <div style={styles.confirmRow}>
            <span style={styles.confirmText}>Remove {contact.contactName}?</span>
            <button
              style={styles.confirmYes}
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Removing…' : 'Yes, remove'}
            </button>
            <button style={styles.confirmNo} onClick={() => setShowConfirm(false)}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card:        { background: '#fff', border: '1px solid #f0f0f0', borderRadius: '16px', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  row:         { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  avatar:      { width: '44px', height: '44px', borderRadius: '50%', background: '#fff0f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 },
  info:        { flex: 1, minWidth: 0 },
  name:        { fontWeight: 600, fontSize: '0.95rem', color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  phone:       { fontSize: '0.82rem', color: '#888', marginTop: '1px' },
  relationship:{ fontSize: '0.78rem', color: '#aaa', marginTop: '1px' },
  actions:     { display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' },
  resendBtn:   { background: 'none', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '0.3rem 0.75rem', fontSize: '0.8rem', color: '#555', cursor: 'pointer' },
  deleteBtn:   { background: 'none', border: 'none', color: '#E91E8C', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', marginLeft: 'auto', padding: '0.3rem 0' },
  confirmRow:  { display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto', flexWrap: 'wrap' },
  confirmText: { fontSize: '0.82rem', color: '#555' },
  confirmYes:  { background: '#E91E8C', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.3rem 0.75rem', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 },
  confirmNo:   { background: '#f5f5f5', color: '#555', border: 'none', borderRadius: '8px', padding: '0.3rem 0.75rem', fontSize: '0.8rem', cursor: 'pointer' },
  error:       { fontSize: '0.8rem', color: '#E91E8C', margin: 0 },
};