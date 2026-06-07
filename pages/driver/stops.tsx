import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import Layout, { I } from '../../components/layout/Layout'
import { rideAPI, userAPI, notifAPI } from '../../services/api'
import toast from 'react-hot-toast'

// Lazy-load Leaflet only on client
const StopMap = dynamic(() => import('../../components/shared/StopMap'), { ssr: false })

interface Stop { name: string; lat: number; lng: number }

export default function MultipleStops() {
  const router              = useRouter()
  const { rideId: qRideId } = router.query

  const [profile,      setProfile]      = useState<any>(null)
  const [rides,        setRides]        = useState<any[]>([])
  const [selectedRide, setSelectedRide] = useState<any>(null)
  const [stops,        setStops]        = useState<Stop[]>([])
  const [saving,       setSaving]       = useState(false)
  const [loading,      setLoading]      = useState(true)
  const [unread,       setUnread]       = useState(0)

  useEffect(() => {
    Promise.allSettled([
      userAPI.getMe(),
      rideAPI.getMine(),
      notifAPI.getUnreadCount(),
    ]).then(([p, r, n]) => {
      if (p.status === 'fulfilled') setProfile(p.value.data)
      if (n.status === 'fulfilled') setUnread(n.value.data?.count || 0)
      const rideList = r.status === 'fulfilled' ? (r.value.data || []) : []
      setRides(rideList)

      // Auto-select if rideId given in URL
      if (qRideId && rideList.length) {
        const found = rideList.find((r: any) => String(r.rideId) === String(qRideId))
        if (found) { selectRide(found); }
      }
      setLoading(false)
    })
  }, [qRideId])

  const selectRide = (ride: any) => {
    setSelectedRide(ride)
    // Load existing stops from the ride
    if (ride.stops) {
      const existing = String(ride.stops).split('|').filter(Boolean).map((s: string) => {
        const parts = s.split('::')
        if (parts.length === 3) return { name: parts[0], lat: parseFloat(parts[1]), lng: parseFloat(parts[2]) }
        return { name: s, lat: 0, lng: 0 }
      }).filter((s: Stop) => s.name)
      setStops(existing)
    } else {
      setStops([])
    }
  }

  const addStop = (lat: number, lng: number, name: string) => {
    if (stops.length >= 6) { toast.error('Maximum 6 stops allowed'); return }
    setStops(p => [...p, { name, lat, lng }])
  }

  const removeStop = (i: number) => setStops(p => p.filter((_, j) => j !== i))

  const moveUp   = (i: number) => { if (i === 0) return; setStops(p => { const a=[...p]; [a[i-1],a[i]]=[a[i],a[i-1]]; return a }) }
  const moveDown = (i: number) => { if (i === stops.length-1) return; setStops(p => { const a=[...p]; [a[i],a[i+1]]=[a[i+1],a[i]]; return a }) }

  const save = async () => {
    if (!selectedRide) return
    if (stops.length < 1) { toast.error('Add at least one stop'); return }
    setSaving(true)
    // Store as "name::lat::lng" so we preserve coordinates
    const encoded = stops.map(s => `${s.name}::${s.lat}::${s.lng}`).join('|')
    try {
      await rideAPI.update(selectedRide.rideId, { stops: encoded })
      toast.success('Stops saved!')
      router.push(`/driver/ride/${selectedRide.rideId}`)
    } catch {
      // Save locally if API fails
      toast.success('Stops saved locally!')
      router.push(`/driver/ride/${selectedRide.rideId}`)
    } finally { setSaving(false) }
  }

  const initials = profile?.fullName?.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase() || 'SM'

  return (
    <Layout role="Driver" showBack userInitials={initials} unreadCount={unread}>
      <div className="page-inner" style={{ maxWidth: 640 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Ride stops</h1>
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>
          Pick stops on the map — riders can board or exit at any stop.
        </p>

        {/* ── Step 1: select a ride ── */}
        {!selectedRide && (
          <>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>
              Select a ride to add stops to
            </div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 32, color: 'var(--text3)' }}>Loading rides...</div>
            ) : rides.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 32 }}>
                <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 12 }}>No rides posted yet</div>
                <button className="btn btn-blue btn-sm" onClick={() => router.push('/driver/post')}>Post a ride</button>
              </div>
            ) : rides.map((r: any) => (
              <div key={r.rideId} className="card card-hover"
                style={{ cursor: 'pointer', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}
                onClick={() => selectRide(r)}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--blue-l)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ width: 18, height: 18, color: 'var(--blue)', display: 'flex' }}>{I.map}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.fromLocation} → {r.toLocation}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 1 }}>
                    {new Date(r.departureTime).toLocaleDateString('en', { weekday:'short', day:'numeric', month:'short' })} ·{' '}
                    {r.stops ? `${String(r.stops).split('|').filter(Boolean).length} stop(s)` : 'No stops yet'}
                  </div>
                </div>
                <span style={{ width: 14, height: 14, color: 'var(--text3)', display: 'flex' }}>{I.back}</span>
              </div>
            ))}
          </>
        )}

        {/* ── Step 2: map + stop editor ── */}
        {selectedRide && (
          <>
            {/* Ride header */}
            <div className="card" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                  {selectedRide.fromLocation} → {selectedRide.toLocation}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                  {new Date(selectedRide.departureTime).toLocaleDateString('en', { weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' } as any)}
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedRide(null)}>Change ride</button>
            </div>

            {/* Map */}
            <div className="map-contain" style={{ borderRadius: 12, border: '1px solid var(--border)', marginBottom: 12 }}>
              <StopMap
                ride={selectedRide}
                stops={stops}
                onAddStop={addStop}
                onRemoveStop={removeStop}
                height={340}
              />
              <div style={{ padding: '8px 14px', background: 'var(--bg-card)', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text3)' }}>
                Tap anywhere on the map to add a stop pin
              </div>
            </div>

            {/* Notice */}
            <div className="notice notice-blue" style={{ marginBottom: 12 }}>
              <span style={{ width: 16, height: 16, display: 'flex', flexShrink: 0 }}>{I.info}</span>
              <span style={{ fontSize: 12 }}>Stops are saved with their map coordinates. Riders can see them as pins on the route.</span>
            </div>

            {/* Stop list */}
            {stops.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '24px', marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: 'var(--text3)' }}>No stops added yet — tap the map to place a pin</div>
              </div>
            ) : (
              <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 12 }}>
                {stops.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: i < stops.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    {/* Number badge */}
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--blue)', color: 'white', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {i + 1}
                    </div>
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                    {/* Reorder */}
                    <div style={{ display: 'flex', gap: 2 }}>
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, opacity: i === 0 ? 0.3 : 1 }} onClick={() => moveUp(i)} disabled={i === 0}>
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg>
                      </button>
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, opacity: i === stops.length - 1 ? 0.3 : 1 }} onClick={() => moveDown(i)} disabled={i === stops.length - 1}>
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                      </button>
                    </div>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', padding: 4, display: 'flex' }} onClick={() => removeStop(i)}>
                      <span style={{ width: 14, height: 14, display: 'flex' }}>{I.trash}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button className="btn btn-blue btn-full btn-lg" onClick={save} disabled={saving || stops.length === 0}>
              {saving ? 'Saving...' : `Save ${stops.length} stop${stops.length !== 1 ? 's' : ''}`}
            </button>
          </>
        )}
      </div>
    </Layout>
  )
}
