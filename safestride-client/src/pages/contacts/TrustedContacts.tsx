/**
 * TrustedContacts.tsx — F-08
 * Full trusted contacts management screen.
 * Add up to 5 contacts, view status, delete, resend invites.
 */

import { useState, useEffect, FormEvent } from 'react';
import { getContacts, addContact, type TrustedContact } from '../../services/api/contacts.api';
import ContactCard from '../../components/contacts/ContactCard';
import Button      from '../../components/common/Button';
import Input       from '../../components/common/Input';

const MAX_CONTACTS = 5;

export default function TrustedContacts() {
  const [contacts,    setContacts]    = useState<TrustedContact[]>([]);
  const [isLoading,   setIsLoading]   = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [isAdding,    setIsAdding]    = useState(false);
  const [error,       setError]       = useState('');
  const [successMsg,  setSuccessMsg]  = useState('');

  // Form state
  const [name,         setName]         = useState('');
  const [phone,        setPhone]        = useState('');
  const [relationship, setRelationship] = useState('');

  useEffect(() => {
    fetchContacts();
  }, []);

  async function fetchContacts() {
    setIsLoading(true);
    try {
      const data = await getContacts();
      setContacts(data);
    } catch {
      setError('Failed to load contacts.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!name.trim()) { setError('Name is required'); return; }
    if (!/^\+[1-9]\d{6,14}$/.test(phone.trim())) {
      setError('Enter phone with country code e.g. +919876543210');
      return;
    }

    setIsAdding(true);
    try {
      const result = await addContact({
        contactName:  name.trim(),
        contactPhone: phone.trim(),
        relationship: relationship.trim() || undefined,
      });

      setContacts((prev) => [result.contact, ...prev]);
      setSuccessMsg(`Invitation sent to ${name}! They'll receive an SMS.`);
      setShowForm(false);
      setName(''); setPhone(''); setRelationship('');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Failed to add contact. Please try again.');
    } finally {
      setIsAdding(false);
    }
  }

  function handleDeleted(id: string) {
    setContacts((prev) => prev.filter((c) => c._id !== id));
  }

  const activeCount  = contacts.filter((c) => c.status !== 'revoked').length;
  const canAddMore   = activeCount < MAX_CONTACTS;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Trusted Contacts</h1>
        <p style={styles.subtitle}>
          These people will be alerted if you need help during a journey.
        </p>
      </div>

      {/* Success message */}
      {successMsg && (
        <div style={styles.successBanner}>
          ✅ {successMsg}
        </div>
      )}

      {/* Contact count */}
      <div style={styles.countRow}>
        <span style={styles.countText}>
          {activeCount} / {MAX_CONTACTS} contacts
        </span>
        {canAddMore && !showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            + Add Contact
          </Button>
        )}
        {!canAddMore && (
          <span style={styles.maxReached}>Maximum reached</span>
        )}
      </div>

      {/* Add contact form */}
      {showForm && (
        <form onSubmit={handleAdd} style={styles.form}>
          <h3 style={styles.formTitle}>Add trusted contact</h3>

          <Input
            label="Full name *"
            placeholder="e.g. Mom, Priya"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(''); }}
            disabled={isAdding}
          />

          <Input
            label="Phone number *"
            placeholder="+919876543210"
            type="tel"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); setError(''); }}
            disabled={isAdding}
            hint="Include country code"
          />

          <Input
            label="Relationship (optional)"
            placeholder="e.g. Mom, Sister, Friend"
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            disabled={isAdding}
          />

          {error && <p style={styles.error}>{error}</p>}

          <div style={styles.formActions}>
            <Button type="submit" loading={isAdding}>
              Send Invitation
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => { setShowForm(false); setError(''); }}
              disabled={isAdding}
            >
              Cancel
            </Button>
          </div>

          <p style={styles.formHint}>
            They'll receive an SMS with a link — no app needed.
          </p>
        </form>
      )}

      {/* Contacts list */}
      {isLoading ? (
        <div style={styles.loading}>Loading contacts…</div>
      ) : contacts.length === 0 ? (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>👥</div>
          <p style={styles.emptyTitle}>No trusted contacts yet</p>
          <p style={styles.emptySubtitle}>
            Add someone who can be alerted if you need help during a journey.
          </p>
          <Button onClick={() => setShowForm(true)}>Add First Contact</Button>
        </div>
      ) : (
        <div style={styles.list}>
          {contacts.map((contact) => (
            <ContactCard
              key={contact._id}
              contact={contact}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      )}

      {/* Info box */}
      <div style={styles.infoBox}>
        <p style={styles.infoText}>
          🔒 Contacts can only view your location during active journeys.
          They receive alerts via SMS — no app installation required.
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container:    { minHeight: '100dvh', display: 'flex', flexDirection: 'column', padding: '1.5rem', background: '#f9f9f9', fontFamily: "'Inter', system-ui, sans-serif", maxWidth: '480px', margin: '0 auto', gap: '1rem' },
  header:       { marginBottom: '0.5rem' },
  title:        { fontSize: '1.75rem', fontWeight: 700, color: '#1a1a1a', margin: '0 0 0.25rem', letterSpacing: '-0.02em' },
  subtitle:     { fontSize: '0.9rem', color: '#666', margin: 0, lineHeight: 1.5 },
  successBanner:{ background: '#D1FAE5', color: '#065F46', padding: '0.75rem 1rem', borderRadius: '12px', fontSize: '0.88rem', fontWeight: 500 },
  countRow:     { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  countText:    { fontSize: '0.85rem', color: '#888', fontWeight: 500 },
  maxReached:   { fontSize: '0.82rem', color: '#E91E8C', fontWeight: 600 },
  form:         { background: '#fff', border: '1px solid #f0f0f0', borderRadius: '16px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  formTitle:    { fontSize: '1rem', fontWeight: 700, color: '#1a1a1a', margin: 0 },
  formActions:  { display: 'flex', gap: '0.75rem' },
  formHint:     { fontSize: '0.78rem', color: '#aaa', margin: 0, textAlign: 'center' },
  error:        { fontSize: '0.82rem', color: '#E91E8C', margin: 0 },
  loading:      { textAlign: 'center', color: '#888', padding: '2rem', fontSize: '0.9rem' },
  empty:        { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '3rem 1rem', textAlign: 'center' },
  emptyIcon:    { fontSize: '3rem' },
  emptyTitle:   { fontSize: '1.1rem', fontWeight: 600, color: '#333', margin: 0 },
  emptySubtitle:{ fontSize: '0.88rem', color: '#888', margin: 0, lineHeight: 1.5 },
  list:         { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  infoBox:      { background: '#fff0f6', borderRadius: '12px', padding: '0.75rem 1rem', marginTop: 'auto' },
  infoText:     { fontSize: '0.8rem', color: '#B01067', margin: 0, lineHeight: 1.5 },
};