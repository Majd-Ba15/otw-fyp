import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout, { I } from '../../components/layout/Layout'
import { userAPI, notifAPI } from '../../services/api'
import toast from 'react-hot-toast'

const WAITLIST_KEY = 'otw_waitlist'

interface WLEntry {
  id:           string
  rideId?:      number
  fromLocation: string
  toLocation:   string
  date:         string
  seats:        number
  driver?:      string
  addedAt:      string
  status:       'Searching' | 'Match found'
}

function loadWL(): WLEntry[] {
  try { return JSON.parse(localStorage.getItem(WAITLIST_KEY) || '[]') } catch { return [] }
}
function saveWL(items: WLEntry[]) {
  try { localStorage.setItem(WAITLIST_KEY, JSON.stringify(items)) } catch {}
}

export default function Waitlist() {
  const router = useRouter()
  const [profile,   setProfile]   = useState<any>(null)
  const [items,     setItems]     = useState<WLEntry[]>([])
  const [unread,    setUnread]    = useState(0)
  const [loading,   setLoading]   = useState(true)
  const [showForm,  setShowForm]  = useState(false)
  const [form,      setForm]      = useState({ from: '', to: '', date: '', seats: 1 })
  const [saving,    setSaving]    = useState(false)

  useEffect(() => {
    Promise.allSettled([
      userAPI.getMe(),
      notifAPI.getUnreadCount(),
    ]).then(([p, n]) => {
      if (p.status === 'fulfilled') setProfile(p.value.data)
      if (n.status === 'fulfilled') setUnread(n.value.data?.count || 0)
      setItems(loadWL())
      setLoading(false)
    })
  }, [])

  const addTrip = async () => {
    if (!form.from.trim() || !form.to.trim()) { toast.error('Enter from and to locations'); return }
    setSaving(true)
    const entry: WLEntry = {
      id:           `wl_${Date.now()}`,
      fromLocation: form.from,
      toLocation:   form.to,
      date:         form.date,
      seats:        form.seats,
      addedAt:      new Date().toISOString(),
      status:       'Searching',
    }
    const next = [...items, entry]
    setItems(next)
    saveWL(next)
    setShowForm(false)
    setForm({ from: '', to: '', date: '', seats: 1 })
    setSaving(false)
    toast.success('Added to waitlist! We\'ll notify you when a trip matches.')
  }

  const remove = (id: string) => {
    const next = items.filter(i => i.id !== id)
    setItems(next)
    saveWL(next)
    toast.success('Removed from waitlist')
  }

  const initials = profile?.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'AK'
  const fmtDate  = (iso: string) => {
    try { return new Date(iso).toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' }) } catch { return iso }
  }
  const fmtAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    if (diff < 3600000) return `${Math.round(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.round(diff / 3600000)}h ago`
    return `${Math.round(diff / 86400000)}d ago`
  }

  return (
    <Layout title="Waitlist" role="Rider" userInitials={initials} unreadCount={unread}>
      <div className="page-inner">

        <div className="notice notice-blue" style={{ marginBottom: 16 }}>
          <span style={{ width: 16, height: 16, display: 'flex', flexShrink: 0 }}>{I.bell}</span>
          <div>
            <div style={{ fontWeight: 600 }}>Can't find a trip?</div>
            <div style={{ fontSize: 12, marginTop: 2 }}>Add your trip to the waitlist and get notified when a matching trip becomes available.</div>
          </div>
        </div>

        <button className="btn btn-primary btn-full btn-lg" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          onClick={() => setShowForm(o => !o)}>
          <span style={{ width: 15, height: 15, display: 'flex' }}>{showForm ? I.x : I.plus}</span>
          {showForm ? 'Cancel' : 'Add trip to waitlist'}
        </button>

        {/* Add trip form */}
        {showForm && (
          <div className="card" style={{ marginBottom: 16, border: '1.5px solid var(--green)' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 14 }}>New waitlist entry</div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>From *</div>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--green)', display: 'flex' }}>{I.pin}</span>
                <input className="input" style={{ paddingLeft: 32 }} placeholder="Pickup location"
                  value={form.from} onChange={e => setForm(p => ({ ...p, from: e.target.value }))} />
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>To *</div>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#EF4444', display: 'flex' }}>{I.pin}</span>
                <input className="input" style={{ paddingLeft: 32 }} placeholder="Destination"
                  value={form.to} onChange={e => setForm(p => ({ ...p, to: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>Date</div>
                <input type="date" className="input" value={form.date}
                  onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>Seats needed</div>
                <select className="input" value={form.seats} onChange={e => setForm(p => ({ ...p, seats: parseInt(e.target.value) }))}>
                  {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n} seat{n > 1 ? 's' : ''}</option>)}
                </select>
              </div>
            </div>
            <button className="btn btn-primary btn-full" onClick={addTrip} disabled={saving}>
              {saving ? 'Adding...' : 'Add to waitlist'}
            </button>
          </div>
        )}

        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>
          Your waitlist ({items.length})
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text3)', fontSize: 13 }}>Loading...</div>
        ) : items.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '36px' }}>
            <span style={{ width: 36, height: 36, display: 'flex', margin: '0 auto 10px', color: 'var(--text4)', opacity: .4 }}>{I.clock}</span>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>No waitlist entries yet</div>
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>Add a trip above to be notified when a matching trip becomes available</div>
          </div>
        ) : items.map(item => (
          <div key={item.id} className="card" style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <span className={`badge ${item.status === 'Match found' ? 'badge-green' : 'badge-amber'}`}>{item.status}</span>
              <button onClick={() => remove(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', width: 18, height: 18, display: 'flex', color: 'var(--text3)' }}>{I.x}</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div className="rdot-g" />
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{item.fromLocation}</span>
              <span style={{ color: 'var(--text3)' }}>→</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{item.toLocation}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>
              {item.date && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <span style={{ width: 12, height: 12, display: 'flex' }}>{I.clock}</span>
                  {fmtDate(item.date)}
                </span>
              )}
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ width: 12, height: 12, display: 'flex' }}>{I.users}</span>
                {item.seats} seat{item.seats > 1 ? 's' : ''}
              </span>
              {item.driver && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <span style={{ width: 12, height: 12, display: 'flex' }}>{I.car}</span>
                  {item.driver}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text4)' }}>Added {fmtAgo(item.addedAt)}</span>
              <button className="btn btn-primary btn-sm"
                onClick={() => router.push(`/rider/search?from=${encodeURIComponent(item.fromLocation)}&to=${encodeURIComponent(item.toLocation)}`)}>
                Search trips
              </button>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  )
}
