import { useState, useEffect } from 'react'
import Layout, { I } from '../../components/layout/Layout'
import { userAPI } from '../../services/api'
import toast from 'react-hot-toast'

interface Contact { name: string; phone: string }

export default function RiderEmergency() {
  const [profile,     setProfile]     = useState<any>(null)
  const [contacts,    setContacts]    = useState<Contact[]>([])
  const [loading,     setLoading]     = useState(true)
  const [editingIdx,  setEditingIdx]  = useState<number | null>(null)
  const [editForm,    setEditForm]    = useState<Contact>({ name: '', phone: '' })
  const [addingNew,   setAddingNew]   = useState(false)
  const [newForm,     setNewForm]     = useState<Contact>({ name: '', phone: '' })
  const [saving,      setSaving]      = useState(false)

  const LOCAL_KEY = 'otw_emergency_contacts'

  useEffect(() => {
    userAPI.getMe().then(r => {
      setProfile(r.data)
      // Backend stores as single EmergencyContact + EmergencyPhone strings (not an array)
      const ec = r.data.emergencyContact || r.data.EmergencyContact
      const ep = r.data.emergencyPhone   || r.data.EmergencyPhone
      const apiContacts: Contact[] = ec ? [{ name: ec, phone: ep || '' }] : []
      const localContacts: Contact[] = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]')
      setContacts(apiContacts.length > 0 ? apiContacts : localContacts)
      setLoading(false)
    }).catch(() => {
      const localContacts: Contact[] = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]')
      setContacts(localContacts)
      setLoading(false)
    })
  }, [])

  const persistContacts = async (updated: Contact[]) => {
    setSaving(true)
    // Always save to localStorage immediately so SOS page can read it
    localStorage.setItem(LOCAL_KEY, JSON.stringify(updated))
    // Backend expects EmergencyContact (name) + EmergencyPhone — use the first contact
    try {
      await userAPI.updateMe({
        emergencyContact: updated[0]?.name  || '',
        emergencyPhone:   updated[0]?.phone || '',
      })
    } catch {
      // localStorage already saved — contacts still persist locally
    }
    setContacts(updated)
    setSaving(false)
    return true
  }

  const startEdit = (i: number) => {
    setEditingIdx(i)
    setEditForm({ ...contacts[i] })
    setAddingNew(false)
  }

  const cancelEdit = () => { setEditingIdx(null) }

  const saveEdit = async () => {
    if (!editForm.name.trim() || !editForm.phone.trim()) {
      toast.error('Name and phone are required')
      return
    }
    const updated = contacts.map((c, i) => i === editingIdx ? { ...editForm } : c)
    const ok = await persistContacts(updated)
    if (ok) { setEditingIdx(null); toast.success('Contact updated!') }
  }

  const deleteContact = async (i: number) => {
    const updated = contacts.filter((_, j) => j !== i)
    const ok = await persistContacts(updated)
    if (ok) { toast.success('Contact removed'); if (editingIdx === i) setEditingIdx(null) }
  }

  const saveNew = async () => {
    if (!newForm.name.trim() || !newForm.phone.trim()) {
      toast.error('Name and phone are required')
      return
    }
    if (contacts.length >= 3) { toast.error('Maximum 3 contacts allowed'); return }
    const updated = [...contacts, { ...newForm }]
    const ok = await persistContacts(updated)
    if (ok) { setAddingNew(false); setNewForm({ name: '', phone: '' }); toast.success('Contact added!') }
  }

  const initials = profile?.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'AK'

  return (
    <Layout title="Emergency Contacts" role="Rider" showBack userInitials={initials}>
      <div className="page-inner" style={{ maxWidth: 540 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Emergency Contacts</h1>
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>
          Notified with your live location when you activate SOS. Up to 3 contacts.
        </p>

        <div className="notice notice-amber" style={{ marginBottom: 20 }}>
          <span style={{ width: 16, height: 16, display: 'flex', flexShrink: 0 }}>{I.sos}</span>
          <span style={{ fontSize: 13 }}>These contacts receive an emergency alert with your GPS location.</span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text3)', fontSize: 13 }}>Loading...</div>
        ) : (
          <>
            {/* Existing contacts */}
            {contacts.length === 0 && !addingNew && (
              <div className="card" style={{ textAlign: 'center', padding: '36px 20px', marginBottom: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--red-l)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <span style={{ width: 24, height: 24, color: 'var(--red)', display: 'flex' }}>{I.phone}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>No emergency contacts</div>
                <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>Add someone who can be reached in an emergency</div>
                <button className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                  onClick={() => setAddingNew(true)}>
                  <span style={{ width: 13, height: 13, display: 'flex' }}>{I.plus}</span> Add first contact
                </button>
              </div>
            )}

            {contacts.map((c, i) => (
              <div key={i} className="card" style={{ marginBottom: 10 }}>
                {editingIdx === i ? (
                  /* Edit form */
                  <>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>Edit contact {i + 1}</div>
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>Name</div>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--text3)', display: 'flex' }}>{I.user}</span>
                        <input className="input" style={{ paddingLeft: 32 }} placeholder="e.g. Mum, Dad, Friend"
                          value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} autoFocus />
                      </div>
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>Phone number</div>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--text3)', display: 'flex' }}>{I.phone}</span>
                        <input className="input" style={{ paddingLeft: 32 }} placeholder="+961 XX XXX XXX" type="tel"
                          value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && saveEdit()} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={cancelEdit}>Cancel</button>
                      <button className="btn btn-primary btn-sm" style={{ flex: 2 }} onClick={saveEdit} disabled={saving}>
                        {saving ? 'Saving...' : 'Save changes'}
                      </button>
                    </div>
                  </>
                ) : (
                  /* View card */
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--red-l)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)' }}>{c.name.slice(0, 2).toUpperCase()}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{c.name}</div>
                      <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 1 }}>{c.phone}</div>
                    </div>
                    <a href={`tel:${c.phone}`} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--green-l)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                      onClick={e => e.stopPropagation()}>
                      <span style={{ width: 15, height: 15, color: 'var(--green)', display: 'flex' }}>{I.phone}</span>
                    </a>
                    <button style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                      onClick={() => startEdit(i)}>
                      <span style={{ width: 14, height: 14, color: 'var(--text3)', display: 'flex' }}>{I.edit}</span>
                    </button>
                    <button style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--red-l)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                      onClick={() => deleteContact(i)} disabled={saving}>
                      <span style={{ width: 14, height: 14, color: 'var(--red)', display: 'flex' }}>{I.trash}</span>
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* Add new contact form */}
            {addingNew && (
              <div className="card" style={{ marginBottom: 10, border: '1.5px dashed var(--green)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>New contact</div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>Name</div>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--text3)', display: 'flex' }}>{I.user}</span>
                    <input className="input" style={{ paddingLeft: 32 }} placeholder="e.g. Mum, Dad, Friend"
                      value={newForm.name} onChange={e => setNewForm(p => ({ ...p, name: e.target.value }))} autoFocus />
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>Phone number</div>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--text3)', display: 'flex' }}>{I.phone}</span>
                    <input className="input" style={{ paddingLeft: 32 }} placeholder="+961 XX XXX XXX" type="tel"
                      value={newForm.phone} onChange={e => setNewForm(p => ({ ...p, phone: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && saveNew()} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => { setAddingNew(false); setNewForm({ name: '', phone: '' }) }}>Cancel</button>
                  <button className="btn btn-primary btn-sm" style={{ flex: 2 }} onClick={saveNew} disabled={saving}>
                    {saving ? 'Saving...' : 'Add contact'}
                  </button>
                </div>
              </div>
            )}

            {/* Add button */}
            {contacts.length > 0 && contacts.length < 3 && !addingNew && (
              <button className="btn btn-secondary btn-full" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                onClick={() => { setAddingNew(true); setEditingIdx(null) }}>
                <span style={{ width: 14, height: 14, display: 'flex' }}>{I.plus}</span> Add another contact
              </button>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
