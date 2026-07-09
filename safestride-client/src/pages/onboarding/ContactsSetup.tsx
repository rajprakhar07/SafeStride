/**
 * ContactsSetup.tsx — updated in F-08
 * Onboarding Step 3: Now shows the real TrustedContacts UI inline.
 * User can add contacts or skip to home.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateProfile } from '../../services/api/user.api';
import { addContact, getContacts, type TrustedContact } from '../../services/api/contacts.api';
import ContactCard from '../../components/contacts/ContactCard';
import Button from '../../components/common/Button';
import Input  from '../../components/common/Input';

export default function ContactsSetup() {
  const navigate = useNavigate();

  const [contacts,    setContacts]    = useState<TrustedContact[]>([]);
  const [showForm,    setShowForm]    = useState(false);
  const [isAdding,    setIsAdding]    = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [error,       setError]       = useState('');
  const [name,        setName]        = useState('');
  const [phone,       setPhone]       = useState('');
  const [relationship,setRelationship]= useState('');

  async function handleAdd() {
    setError('');
    if (!name.trim()) { setError('Name is required'); return; }
    if (!/^\+[1-9]\d{6,14}$/.test(phone.trim())) {
      setError('Enter phone with country code e.g. +919876543210');
      return;
    }
    setIsAdding(true);
    try {
      const result = await addContact({
        contactName: name.trim(), contactPhone: phone.trim(),
        relationship: relationship.trim() || undefined,
      });
      setContacts((prev) => [result.contact, ...prev]);
      setShowForm(false);
      setName(''); setPhone(''); setRelationship('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Failed to add contact.');
    } finally {
      setIsAdding(false);
    }
  }

  async function handleFinish() {
    setIsFinishing(true);
    try { await updateProfile({ onboardingComplete: true }); } catch { /* non-critical */ }
    finally { setIsFinishing(false); navigate('/'); }
  }

  return (
    <div style={styles.container}>
      <div style={styles.progress}><div style={{ ...styles.fill, width: '100%' }} /></div>
      <p style={styles.step}>Step 3 of 3</p>

      <h1 style={styles.title}>Add trusted contacts</h1>
      <p style={styles.subtitle}>They'll be alerted if you need help. No app needed — works via SMS link.</p>

      {/* Contact list */}
      {contacts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
          {contacts.map((c) => (
            <ContactCard key={c._id} contact={c} onDeleted={(id) => setContacts((p) => p.filter((x) => x._id !== id))} />
          ))}
        </div>
      )}

      {/* Add form */}
      {showForm ? (
        <div style={styles.form}>
          <Input label="Full name *" placeholder="Mom, Priya..." value={name} onChange={(e) => setName(e.target.value)} disabled={isAdding} />
          <Input label="Phone *" placeholder="+919876543210" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={isAdding} hint="Include country code" />
          <Input label="Relationship (optional)" placeholder="Mom, Sister, Friend" value={relationship} onChange={(e) => setRelationship(e.target.value)} disabled={isAdding} />
          {error && <p style={styles.error}>{error}</p>}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Button loading={isAdding} onClick={handleAdd}>Send Invite</Button>
            <Button variant="ghost" onClick={() => { setShowForm(false); setError(''); }} disabled={isAdding}>Cancel</Button>
          </div>
        </div>
      ) : (
        contacts.length < 5 && (
          <button style={styles.addBtn} onClick={() => setShowForm(true)}>
            + Add a trusted contact
          </button>
        )
      )}

      <div style={{ marginTop: 'auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <Button fullWidth loading={isFinishing} onClick={handleFinish}>
          {contacts.length > 0 ? 'Get started →' : 'Skip for now →'}
        </Button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem', background: '#fff', fontFamily: "'Inter', system-ui, sans-serif", maxWidth: '480px', margin: '0 auto', gap: '1rem' },
  progress:  { width: '100%', height: '4px', background: '#f0f0f0', borderRadius: '2px' },
  fill:      { height: '100%', background: '#E91E8C', borderRadius: '2px' },
  step:      { fontSize: '0.8rem', color: '#aaa', alignSelf: 'flex-start', margin: 0 },
  title:     { fontSize: '1.75rem', fontWeight: 700, color: '#1a1a1a', margin: 0, alignSelf: 'flex-start', letterSpacing: '-0.02em' },
  subtitle:  { fontSize: '0.9rem', color: '#666', margin: 0, alignSelf: 'flex-start', lineHeight: 1.5 },
  form:      { width: '100%', background: '#f9f9f9', borderRadius: '16px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  addBtn:    { width: '100%', padding: '0.85rem', border: '1.5px dashed #E91E8C', borderRadius: '12px', background: '#fff0f6', color: '#E91E8C', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer' },
  error:     { fontSize: '0.82rem', color: '#E91E8C', margin: 0 },
};