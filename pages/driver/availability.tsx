import { useEffect, useState } from 'react'
import Layout, { I } from '../../components/layout/Layout'
import { demandAPI, userAPI } from '../../services/api'
import toast from 'react-hot-toast'

const emptyForm = {
  fromLocation: '',
  toLocation: '',
  date: '',        // one date for the slot
  timeFrom: '',    // start time on that date
  timeTo: '',      // end time on that date
  seats: 1,
  suggestedPrice: '',
  note: '',
}

export default function DriverAvailability() {
  const [profile, setProfile] = useState<any>(null)
  const [form, setForm] = useState<any>(emptyForm)
  const [slots, setSlots] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const [p, s, r] = await Promise.allSettled([
      userAPI.getMe(),
      demandAPI.getMyAvailability(),
      demandAPI.getOpenRequests(),
    ])
    if (p.status === 'fulfilled') setProfile(p.value.data)
    if (s.status === 'fulfilled') setSlots(s.value.data || [])
    if (r.status === 'fulfilled') setRequests(r.value.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const submit = async () => {
    if (!form.fromLocation || !form.toLocation) { toast.error('Add the From and To areas'); return }
    if (!form.date || !form.timeFrom || !form.timeTo) { toast.error('Pick the date and both times'); return }
    if (form.timeTo === form.timeFrom) { toast.error('Pick a longer time window'); return }

    const fromDt = new Date(`${form.date}T${form.timeFrom}`)
    const toDt   = new Date(`${form.date}T${form.timeTo}`)
    // End time earlier than start = the window crosses midnight (e.g. 22:00 → 01:00,
    // or "until 12:00 AM"). Roll the end to the next day instead of rejecting.
    const crossesMidnight = toDt <= fromDt
    if (crossesMidnight) toDt.setDate(toDt.getDate() + 1)

    setSaving(true)
    try {
      await demandAPI.createAvailability({
        fromLocation: form.fromLocation,
        toLocation: form.toLocation,
        seats: form.seats,
        note: form.note,
        suggestedPrice: form.suggestedPrice ? Number(form.suggestedPrice) : null,
        availableFrom: fromDt.toISOString(),
        availableTo: toDt.toISOString(),
      })
      toast.success(crossesMidnight ? 'Availability saved — this slot ends the next morning' : 'Availability saved')
      setForm(emptyForm)
      await load()
    } catch (e: any) {
      toast.error(e.response?.data?.message || `Could not save (${e.response?.status || 'network error'})`)
    } finally {
      setSaving(false)
    }
  }

  const accept = async (id: number) => {
    try {
      const res = await demandAPI.acceptRequest(id, {})
      toast.success(res.data?.message || 'Request accepted — ride created')
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not accept — it may already be taken')
    }
    await load()
  }

  const disable = async (id: number) => {
    try { await demandAPI.disableAvailability(id) }
    catch (e: any) { toast.error(e.response?.data?.message || 'Could not disable slot') }
    await load()
  }

  const initials = profile?.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'DR'

  return (
    <Layout title="Availability" role="Driver" userInitials={initials} userName={profile?.fullName}>
      <div className="page-inner">
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ width: 18, height: 18, color: 'var(--blue)', display: 'flex' }}>{I.clock}</span>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Add free driving time</h1>
          </div>
          <div className="availability-grid two" style={{ marginBottom: 10 }}>
            <input className="input" placeholder="From area" value={form.fromLocation} onChange={e => setForm((p: any) => ({ ...p, fromLocation: e.target.value }))} />
            <input className="input" placeholder="To area" value={form.toLocation} onChange={e => setForm((p: any) => ({ ...p, toLocation: e.target.value }))} />
          </div>
          <div className="availability-grid time" style={{ marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>Date *</div>
              <input className="input" type="date" value={form.date} onChange={e => setForm((p: any) => ({ ...p, date: e.target.value }))} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>Free from *</div>
              <input className="input" type="time" value={form.timeFrom} onChange={e => setForm((p: any) => ({ ...p, timeFrom: e.target.value }))} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>Until *</div>
              <input className="input" type="time" value={form.timeTo} onChange={e => setForm((p: any) => ({ ...p, timeTo: e.target.value }))} />
            </div>
          </div>
          <div className="availability-grid two" style={{ marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>Seats</div>
              <select className="input" value={form.seats} onChange={e => setForm((p: any) => ({ ...p, seats: Number(e.target.value) }))}>
                {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n} seat{n > 1 ? 's' : ''}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>Suggested price ($)</div>
              <input className="input" type="number" min="0" placeholder="e.g. 7" value={form.suggestedPrice} onChange={e => setForm((p: any) => ({ ...p, suggestedPrice: e.target.value }))} />
            </div>
          </div>
          <textarea className="input" style={{ minHeight: 70, marginBottom: 12 }} placeholder="Availability note" value={form.note} onChange={e => setForm((p: any) => ({ ...p, note: e.target.value }))} />
          <button className="btn btn-blue btn-lg" onClick={submit} disabled={saving}>
            <span style={{ width: 16, height: 16, display: 'flex' }}>{I.plus}</span>
            {saving ? 'Saving...' : 'Save availability'}
          </button>
        </div>

        <div className="availability-panels">
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>My free slots</h2>
            {loading ? <div className="card">Loading...</div> : slots.length === 0 ? (
              <div className="card" style={{ color: 'var(--text3)' }}>No availability added yet</div>
            ) : slots.map((s: any) => (
              <div key={s.driverAvailabilityId} className="card" style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{s.fromLocation} to {s.toLocation}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>{new Date(s.availableFrom).toLocaleString()} to {new Date(s.availableTo).toLocaleTimeString()}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>{s.seats} seat{s.seats > 1 ? 's' : ''} {s.suggestedPrice ? `- $${s.suggestedPrice}` : ''}</span>
                  {s.isActive && <button className="btn btn-secondary btn-sm" onClick={() => disable(s.driverAvailabilityId)}>Disable</button>}
                </div>
              </div>
            ))}
          </div>

          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>Matching rider requests</h2>
            {requests.length === 0 ? (
              <div className="card" style={{ color: 'var(--text3)' }}>No matching open requests</div>
            ) : requests.map((r: any) => (
              <div key={r.rideRequestId} className="card" style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{r.fromLocation} to {r.toLocation}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>{new Date(r.desiredTime).toLocaleString()} - {r.seatsNeeded} seat{r.seatsNeeded > 1 ? 's' : ''}</div>
                  </div>
                  <span className="badge badge-green">{r.status}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 8 }}>Rider: {r.rider?.fullName || 'Rider'}</div>
                <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }} onClick={() => accept(r.rideRequestId)}>Accept request</button>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style jsx>{`
        .availability-grid {
          display: grid;
          gap: 10px;
        }
        .availability-grid.two {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .availability-grid.time {
          grid-template-columns: minmax(130px, 1.2fr) minmax(110px, 1fr) minmax(110px, 1fr);
        }
        .availability-panels {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }
        @media (max-width: 720px) {
          .availability-grid.two,
          .availability-grid.time,
          .availability-panels {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </Layout>
  )
}
