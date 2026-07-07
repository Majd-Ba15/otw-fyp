import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import Layout, { I } from '../../../components/layout/Layout'
import { rideAPI, userAPI, locationAPI, notifAPI } from '../../../services/api'
import toast from 'react-hot-toast'

const MapLive = dynamic(() => import('../../../components/shared/MapLive'), { ssr: false })

type RideStatus = 'in_progress' | 'paused' | 'completed'

export default function DriverActiveRide() {
  const router = useRouter()

  const [profile,    setProfile]    = useState<any>(null)
  const [ride,       setRide]       = useState<any>(null)
  const [activeRides,setActiveRides]= useState<any[]>([])
  const [unread,     setUnread]     = useState(0)
  const [gpsLat,     setGpsLat]     = useState<number | null>(null)
  const [gpsLng,     setGpsLng]     = useState<number | null>(null)
  const [status,     setStatus]     = useState<RideStatus>('in_progress')
  const [progress,   setProgress]   = useState(0)
  const [completing, setCompleting] = useState(false)

  const watchRef    = useRef<number | null>(null)
  const progressRef = useRef<any>(null)

  useEffect(() => {
    Promise.allSettled([
      userAPI.getMe(),
      rideAPI.getActiveRide(),
      rideAPI.getMine('Active'),
      notifAPI.getUnreadCount(),
    ]).then(([p, r, all, n]) => {
      if (p.status === 'fulfilled') setProfile(p.value.data)
      if (n.status === 'fulfilled') setUnread(n.value.data?.count || 0)

      const activeRide = r.status === 'fulfilled' ? r.value.data : null
      const allActive  = all.status === 'fulfilled' ? (all.value.data || []) : []
      setActiveRides(allActive)

      // Auto-select the single active ride, or the first one if multiple
      if (activeRide) setRide(activeRide)
      else if (allActive.length > 0) setRide(allActive[0])
    })

    startGps()
    startProgress()

    return () => {
      stopGps()
      clearInterval(progressRef.current)
    }
  }, [])

  const startGps = () => {
    if (!navigator.geolocation) return
    watchRef.current = navigator.geolocation.watchPosition(
      pos => {
        setGpsLat(pos.coords.latitude)
        setGpsLng(pos.coords.longitude)
        locationAPI.update({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }).catch(() => {})
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 3000 }
    )
  }

  const stopGps = () => {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current)
      watchRef.current = null
    }
  }

  const startProgress = () => {
    clearInterval(progressRef.current)
    progressRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 99) { clearInterval(progressRef.current); return 100 }
        return p + 0.5
      })
    }, 3000)
  }

  const pause = async () => {
    setStatus('paused')
    stopGps()
    clearInterval(progressRef.current)
    try { await rideAPI.update(ride?.rideId, { status: 'Paused' }) } catch {}
    toast('Ride paused — tap Resume when ready to continue')
  }

  const resume = async () => {
    setStatus('in_progress')
    startGps()
    startProgress()
    try { await rideAPI.update(ride?.rideId, { status: 'Active' }) } catch {}
    toast.success('Ride resumed!')
  }

  const complete = async () => {
    if (completing) return
    setCompleting(true)
    setStatus('completed')
    stopGps()
    clearInterval(progressRef.current)
    setProgress(100)
    try { await rideAPI.endRide(ride?.rideId) } catch {}
    toast.success('Ride completed! Great job.')
    setTimeout(() => router.push(`/driver/rate/${ride?.rideId}`), 1200)
  }

  const initials = profile?.fullName?.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase() || 'SM'

  const statusColor = status === 'paused' ? '#F59E0B' : status === 'completed' ? '#16a36b' : '#2563EB'
  const statusLabel = status === 'paused' ? 'Paused' : status === 'completed' ? 'Completed' : 'In Progress'
  const statusBg    = status === 'paused' ? '#FEF3C7' : status === 'completed' ? '#D1FAE5' : '#EFF6FF'

  if (!ride && status !== 'completed') return (
    <Layout title="Active ride" role="Driver" userInitials={initials} unreadCount={unread}>
      <div className="page-inner" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <span style={{ width: 48, height: 48, display: 'flex', margin: '0 auto 16px', color: 'var(--text4)', opacity: .4 }}>{I.car}</span>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>No active ride</div>
        <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>Start a ride from your rides list to see it here.</div>
        <button className="btn btn-blue btn-sm" onClick={() => router.push('/driver/rides')}>Go to my rides</button>
      </div>
    </Layout>
  )

  return (
    <Layout title="Active ride" role="Driver" userInitials={initials} unreadCount={unread}>

      {/* Ride selector — shown when driver has multiple active rides */}
      {activeRides.length > 1 && (
        <div style={{ padding: '10px 16px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--text3)', whiteSpace: 'nowrap' }}>Tracking:</span>
          <select
            className="input"
            style={{ flex: 1, height: 34, fontSize: 12 }}
            value={ride?.rideId || ''}
            onChange={e => {
              const selected = activeRides.find(r => String(r.rideId) === e.target.value)
              if (selected) { setRide(selected); setProgress(0); setStatus('in_progress') }
            }}>
            {activeRides.map(r => (
              <option key={r.rideId} value={r.rideId}>
                {r.fromLocation} → {r.toLocation}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Live map */}
      <div className="map-contain" style={{ height: 300, borderBottom: '1px solid var(--border)' }}>
        {gpsLat ? (
          <MapLive
            driverLat={gpsLat} driverLng={gpsLng!}
            toLat={ride?.toLat || gpsLat + 0.02}
            toLng={ride?.toLng || gpsLng! + 0.02}
            height={300}
          />
        ) : (
          <div style={{ height: 300, background: 'var(--bg2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{ width: 36, height: 36, color: 'var(--text4)', display: 'flex', opacity: .4 }}>{I.nav}</span>
            <span style={{ fontSize: 13, color: 'var(--text3)' }}>Enable location for live map</span>
            <span style={{ fontSize: 12, color: 'var(--text4)' }}>{ride?.fromLocation} → {ride?.toLocation}</span>
          </div>
        )}
      </div>

      <div className="page-inner">

        {/* Status banner */}
        <div style={{ background: statusBg, border: `1px solid ${statusColor}30`, borderRadius: 12, padding: '12px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: statusColor, flexShrink: 0, boxShadow: status === 'in_progress' ? `0 0 0 3px ${statusColor}30` : 'none' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: statusColor }}>{statusLabel}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 1 }}>
              {status === 'in_progress' && `${ride?.fromLocation} → ${ride?.toLocation}`}
              {status === 'paused' && 'Ride is paused — tap Resume to continue'}
              {status === 'completed' && 'All done! Redirecting to rate riders…'}
            </div>
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: statusColor, background: `${statusColor}15`, padding: '3px 10px', borderRadius: 20 }}>
            {Math.round(progress)}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="bar-track" style={{ marginBottom: 16, height: 8, borderRadius: 4, background: 'var(--bg2)' }}>
          <div style={{ height: '100%', borderRadius: 4, background: statusColor, width: `${progress}%`, transition: 'width 2s ease, background 0.3s' }} />
        </div>

        {/* Route */}
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div className="rdot-g" />
            <div>
              <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: .05 }}>FROM</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{ride?.fromLocation}</div>
            </div>
          </div>
          <div className="rconn" style={{ marginBottom: 4 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="rdot-r" />
            <div>
              <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: .05 }}>TO</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{ride?.toLocation}</div>
            </div>
          </div>
        </div>

        {/* Passengers */}
        {ride?.passengers?.length > 0 && (
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>
              Passengers ({ride.passengers.length})
            </div>
            {ride.passengers.map((p: any) => (
              <div key={p.bookingId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div className="av" style={{ width: 32, height: 32, fontSize: 11 }}>{(p.rider?.fullName || 'PA').slice(0,2).toUpperCase()}</div>
                <span style={{ flex: 1, fontSize: 13, color: 'var(--text)' }}>{p.rider?.fullName}</span>
                <button className="btn btn-secondary btn-sm" onClick={() => router.push(`/chat/${ride.rideId}`)}>Chat</button>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { val: ride?.bookedSeats || 0, label: 'Passengers' },
            { val: `$${((ride?.bookedSeats||0)*(ride?.pricePerSeat||0)).toFixed(0)}`, label: 'Earnings' },
            { val: status === 'paused' ? '⏸ Paused' : status === 'completed' ? '✓ Done' : '▶ Live', label: 'Status' },
          ].map((s, i) => (
            <div key={i} className="stat-card" style={{ textAlign: 'center', padding: '12px 8px' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{s.val}</div>
              <div className="stat-label" style={{ textAlign: 'center' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        {status !== 'completed' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {status === 'in_progress' ? (
              <button
                className="btn btn-full btn-lg"
                style={{ background: '#F59E0B', color: 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52 }}
                onClick={pause}>
                <span style={{ width: 18, height: 18, display: 'flex' }}>{I.pause}</span>
                Pause ride
              </button>
            ) : (
              <button
                className="btn btn-full btn-lg"
                style={{ background: '#16a36b', color: 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52 }}
                onClick={resume}>
                <span style={{ width: 18, height: 18, display: 'flex' }}>{I.play}</span>
                Resume ride
              </button>
            )}

            <button
              className="btn btn-primary btn-full btn-lg"
              onClick={complete}
              disabled={completing}
              style={{ height: 52, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span style={{ width: 18, height: 18, display: 'flex' }}>{I.check}</span>
              {completing ? 'Completing...' : 'Complete ride'}
            </button>
          </div>
        )}
      </div>
    </Layout>
  )
}
