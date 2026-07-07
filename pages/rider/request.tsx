import { useEffect, useState } from 'react'
import Layout, { I } from '../../components/layout/Layout'
import { demandAPI, userAPI } from '../../services/api'

const emptyForm = {
  fromLocation: '',
  toLocation: '',
  desiredTime: '',
  earliestTime: '',
  latestTime: '',
  seatsNeeded: 1,
  maxPrice: '',
  genderPreference: 'Any',
  note: '',
}

export default function RiderRequestRide() {
  const [profile, setProfile] = useState<any>(null)
  const [form, setForm] = useState<any>(emptyForm)
  const [requests, setRequests] = useState<any[]>([])
  const [matches, setMatches] = useState<Record<number, any[]>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const [p, r] = await Promise.allSettled([userAPI.getMe(), demandAPI.getMyRequests()])
    if (p.status === 'fulfilled') setProfile(p.value.data)
    if (r.status === 'fulfilled') setRequests(r.value.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const submit = async () => {
    if (!form.fromLocation || !form.toLocation || !form.desiredTime) return
    setSaving(true)
    try {
      await demandAPI.createRequest({
        ...form,
        maxPrice: form.maxPrice ? Number(form.maxPrice) : null,
        desiredTime: new Date(form.desiredTime).toISOString(),
        earliestTime: form.earliestTime ? new Date(form.earliestTime).toISOString() : null,
        latestTime: form.latestTime ? new Date(form.latestTime).toISOString() : null,
      })
      setForm(emptyForm)
      await load()
    } finally {
      setSaving(false)
    }
  }

  const loadMatches = async (id: number) => {
    const res = await demandAPI.getMatches(id)
    setMatches(p => ({ ...p, [id]: res.data || [] }))
  }

  const closeRequest = async (id: number) => {
    await demandAPI.closeRequest(id)
    await load()
  }

  const initials = profile?.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'RD'

  return (
    <Layout title="Request ride" role="Rider" userInitials={initials} userName={profile?.fullName}>
      <div className="page-inner">
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ width: 18, height: 18, color: 'var(--green)', display: 'flex' }}>{I.send}</span>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Create ride request</h1>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <input className="input" placeholder="From" value={form.fromLocation} onChange={e => setForm((p: any) => ({ ...p, fromLocation: e.target.value }))} />
            <input className="input" placeholder="To" value={form.toLocation} onChange={e => setForm((p: any) => ({ ...p, toLocation: e.target.value }))} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>When do you need the ride? *</div>
            <input className="input" type="datetime-local" value={form.desiredTime} onChange={e => setForm((p: any) => ({ ...p, desiredTime: e.target.value }))} />
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
              Drivers available within ±30 minutes of this time will be matched automatically.
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
            <select className="input" value={form.seatsNeeded} onChange={e => setForm((p: any) => ({ ...p, seatsNeeded: Number(e.target.value) }))}>
              {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n} seat{n > 1 ? 's' : ''}</option>)}
            </select>
            <input className="input" type="number" min="0" placeholder="Max price" value={form.maxPrice} onChange={e => setForm((p: any) => ({ ...p, maxPrice: e.target.value }))} />
            <select className="input" value={form.genderPreference} onChange={e => setForm((p: any) => ({ ...p, genderPreference: e.target.value }))}>
              {['Any', 'Male', 'Female'].map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <textarea className="input" style={{ minHeight: 72, marginBottom: 12 }} placeholder="Note for drivers" value={form.note} onChange={e => setForm((p: any) => ({ ...p, note: e.target.value }))} />
          <button className="btn btn-primary btn-lg" onClick={submit} disabled={saving}>
            <span style={{ width: 16, height: 16, display: 'flex' }}>{I.send}</span>
            {saving ? 'Saving...' : 'Request ride'}
          </button>
        </div>

        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>My requests</h2>
        {loading ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--text3)' }}>Loading...</div>
        ) : requests.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--text3)' }}>No ride requests yet</div>
        ) : requests.map((r: any) => (
          <div key={r.rideRequestId} className="card" style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{r.fromLocation} to {r.toLocation}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>{new Date(r.desiredTime).toLocaleString()} - {r.seatsNeeded} seat{r.seatsNeeded > 1 ? 's' : ''}</div>
              </div>
              <span className="badge badge-green">{r.status}</span>
            </div>
            {r.matchedDriver && <div style={{ fontSize: 13, color: 'var(--green)', marginBottom: 8 }}>Driver interested: {r.matchedDriver.fullName}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => loadMatches(r.rideRequestId)}>View free drivers</button>
              {r.status !== 'Closed' && <button className="btn btn-secondary btn-sm" onClick={() => closeRequest(r.rideRequestId)}>Close</button>}
            </div>
            {(matches[r.rideRequestId] || []).map((m: any) => (
              <div key={m.driverAvailabilityId} style={{ marginTop: 10, padding: 10, border: '1px solid var(--border)', borderRadius: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{m.driver?.fullName || 'Driver'} - {m.fromLocation} to {m.toLocation}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>{new Date(m.availableFrom).toLocaleString()} to {new Date(m.availableTo).toLocaleTimeString()}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Layout>
  )
}
