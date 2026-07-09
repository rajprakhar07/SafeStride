/**
 * ContactStatus.tsx — F-08
 * Status badge component for trusted contacts.
 */

import type { TrustedContact } from '../../services/api/contacts.api';

interface Props {
  status: TrustedContact['status'];
}

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  bg: '#FFF3CD', color: '#856404', dot: '#F59E0B' },
  active:   { label: 'Active',   bg: '#D1FAE5', color: '#065F46', dot: '#10B981' },
  declined: { label: 'Declined', bg: '#FEE2E2', color: '#991B1B', dot: '#EF4444' },
  revoked:  { label: 'Removed',  bg: '#F3F4F6', color: '#6B7280', dot: '#9CA3AF' },
};

export default function ContactStatus({ status }: Props) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  return (
    <span style={{
      display:      'inline-flex',
      alignItems:   'center',
      gap:          '0.3rem',
      padding:      '0.2rem 0.6rem',
      borderRadius: '20px',
      background:   cfg.bg,
      color:        cfg.color,
      fontSize:     '0.75rem',
      fontWeight:   600,
    }}>
      <span style={{
        width:        '6px',
        height:       '6px',
        borderRadius: '50%',
        background:   cfg.dot,
        flexShrink:   0,
      }} />
      {cfg.label}
    </span>
  );
}