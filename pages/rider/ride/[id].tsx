import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout, { I } from '../../../components/layout/Layout'
import { rideAPI, userAPI } from '../../../services/api'
import toast from 'react-hot-toast'
import UniversityBadge from '../../../components/shared/UniversityBadge'

const FAV_KEY       = 'otw_favourite_rides'
const FAV_RIDES_KEY = 'otw_favourite_ride_details'

function getFavs(): number[]   { try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]') } catch { return [] } }
function getFavRideDetails(): any[] { try { return JSON.parse(localStorage.getItem(FAV_RIDES_KEY) || '[]') } catch { return [] } }

export default function RideDetail() {
  const router = useRouter()
  const { id } = router.query

  const [ride,        setRide]        = useState<any>(null)
  const [profile,     setProfile]     = useState<any>(null)
  const [isFav,       setIsFav]       = useState(false)

  useEffect(() => {
    if (!id) return
    userAPI.getMe().then(r => setProfile(r.data)).catch(() => {})

    // SessionStorage first
    try {
      const cached = sessionStorage.getItem('otw_ride_preview')
      if (cached) {
        const data = JSON.parse(cached)
        if (String(data.rideId) === String(id)) setRide(data)
      }
    } catch {}

    // Fresh API data — guard against 0 / NaN ids
    const numId = Number(id)
    if (numId && !isNaN(numId)) {
      rideAPI.getById(numId)
        .then(r => { if (r.data) setRide(r.data) })
        .catch(() => {})
    }

    // Check local favorites
    setIsFav(getFavs().includes(Number(id)))
  }, [id])

  const toggleFav = async () => {
    const favs = getFavs()
    const rideId = Number(id)
    if (isFav) {
      const next = favs.filter(f => f !== rideId)
      localStorage.setItem(FAV_KEY, JSON.stringify(next))
      localStorage.setItem(FAV_RIDES_KEY, JSON.stringify(getFavRideDetails().filter((r: any) => Number(r.rideId || r.id) !== rideId)))
      setIsFav(false)
      toast('Removed from favourites')
    } else {
      const next = [...favs, rideId]
      localStorage.setItem(FAV_KEY, JSON.stringify(next))
      const details = getFavRideDetails()
      const summary = {
        rideId,
        fromLocation: ride?.fromLocation,
        toLocation: ride?.toLocation,
        departureTime: ride?.departureTime,
        pricePerSeat: ride?.pricePerSeat,
        availableSeats: ride?.availableSeats,
        totalSeats: ride?.totalSeats,
        driver: ride?.driver,
      }
      localStorage.setItem(FAV_RIDES_KEY, JSON.stringify([summary, ...details.filter((r: any) => Number(r.rideId || r.id) !== rideId)]))
      setIsFav(true)
      toast.success('Added to favourites!')
    }
  }

  const book = () => {
    try { sessionStorage.setItem('otw_ride_preview', JSON.stringify(ride)) } catch {}
    router.push(`/rider/booking/confirm?rideId=${id}`)
  }

  const messageDriver = () => {
    const driverId = ride?.driver?.userId || ride?.driverId
    const driverName = ride?.driver?.fullName
    const query = driverId ? `?userId=${driverId}${driverName ? `&name=${encodeURIComponent(driverName)}` : ''}` : ''
    router.push(`/chat/${id}${query}`)
  }

  const initials = profile?.fullName?.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase() || 'AK'
  const isFull   = ride?.availableSeats === 0
  const estTime = (mins: any) => {
    const n = Number(mins)
    if (!n || Number.isNaN(n)) return ''
    if (n < 60) return `~${Math.round(n)} min driving`
    const h = Math.floor(n / 60)
    const m = Math.round(n % 60)
    return m ? `~${h}h ${m}m driving` : `~${h}h driving`
  }
  const distanceText = Number(ride?.distanceKm ?? ride?.DistanceKm) > 0 ? `${Number(ride.distanceKm ?? ride.DistanceKm).toFixed(1)} km` : ''
  const durationText = estTime(ride?.durationMin ?? ride?.DurationMin)

  if (!ride) return (
    <Layout role="Rider" showBack>
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>
        <div style={{ fontSize: 14, marginBottom: 8 }}>Loading ride details...</div>
        <div style={{ fontSize: 12, opacity: .6 }}>If this takes too long, go back and try again.</div>
      </div>
    </Layout>
  )

  const seats = Array.from({ length: ride.totalSeats || 4 }, (_, i) => i)

  return (
    <Layout role="Rider" showBack userInitials={initials}>
      <div className="page-inner" style={{ maxWidth: 520 }}>

        {/* Top actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 12 }}>
          <button
            className="btn-icon btn-secondary"
            aria-label="Favourite"
            onClick={toggleFav}
            style={{ color: isFav ? '#EF4444' : undefined, background: isFav ? '#FEF2F2' : undefined }}>
            <span style={{ width: 16, height: 16, display: 'flex', color: isFav ? '#EF4444' : undefined }}>
              {isFav ? (
                <svg viewBox="0 0 24 24" fill="#EF4444" stroke="#EF4444" strokeWidth="1"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
              ) : I.heart}
            </span>
          </button>
        </div>

        {/* Full badge */}
        {isFull && (
          <div className="notice notice-amber" style={{ marginBottom: 12 }}>
            <span style={{ width: 16, height: 16, display: 'flex', flexShrink: 0 }}>{I.users}</span>
            <div><div style={{ fontWeight: 600 }}>This ride is full</div><div>Request a ride on this route instead — matching drivers will be notified.</div></div>
          </div>
        )}

        {/* Driver card */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div className="av av-lg">{ride.driver?.initials || ride.driver?.fullName?.slice(0, 2).toUpperCase()}</div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>{ride.driver?.fullName}</span>
                {ride.driver?.isVerified && <span className="badge badge-green" style={{ fontSize: 11 }}>Verified</span>}
                <UniversityBadge code={ride.driver?.university} campusName={ride.driver?.campusName} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#F59E0B', marginTop: 2 }}>
                <span style={{ width: 13, height: 13, display: 'flex' }}>{I.starF}</span>
                {ride.driver?.averageRating} · {ride.driver?.tripCount} trips
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 1 }}>{ride.driver?.faculty}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
            <button className="btn btn-secondary btn-full"
              style={{ fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              onClick={messageDriver}>
              <span style={{ width: 15, height: 15, display: 'flex' }}>{I.msg}</span> Message
            </button>
          </div>
        </div>

        {/* Route */}
        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 14 }}>Route details</div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <div className="rdot-g" />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{ride.fromLocation}</span>
            </div>
            {ride.fromNote && <div className="rsub">{ride.fromNote}</div>}
            {(() => {
              // Stops: RideStop objects from the API, names array from search
              // preview, or legacy '|'-string — render whichever shape arrives.
              const names: string[] = Array.isArray(ride.stops)
                ? [...ride.stops].sort((a: any, b: any) => (a?.stopOrder ?? 0) - (b?.stopOrder ?? 0)).map((s: any) => typeof s === 'string' ? s : s?.stopName).filter(Boolean)
                : ride.stops ? String(ride.stops).split('|').filter(Boolean) : []
              return names.length > 0 ? (
                <div style={{ marginLeft: 4, borderLeft: '1.5px dashed var(--border2)', paddingLeft: 12, margin: '4px 0 4px 4px' }}>
                  {names.map((n, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: 'var(--text2)' }}>Stop {i + 1} · {n}</span>
                    </div>
                  ))}
                </div>
              ) : <div className="rconn" style={{ marginBottom: 3 }} />
            })()}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <div className="rdot-r" />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{ride.toLocation}</span>
            </div>
            {ride.toNote && <div className="rsub">{ride.toNote}</div>}
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text3)', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 14, height: 14, display: 'flex' }}>{I.clock}</span>
              {new Date(ride.departureTime).toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 14, height: 14, display: 'flex' }}>{I.clock}</span>
              {new Date(ride.departureTime).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          {(distanceText || durationText) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--green)', fontSize: 13, fontWeight: 600, marginTop: 8 }}>
              <span style={{ width: 14, height: 14, display: 'flex' }}>{I.nav}</span>
              {[distanceText, durationText].filter(Boolean).join(' - ')}
            </div>
          )}
        </div>

        {/* Vehicle */}
        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>Vehicle</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, background: 'var(--blue-l)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ width: 22, height: 22, color: 'var(--blue)', display: 'flex' }}>{I.car}</span>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{ride.car?.model}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>{ride.car?.colour} · {ride.car?.plateNumber}</div>
            </div>
          </div>
        </div>

        {/* Seats */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text2)' }}>
              <span style={{ width: 15, height: 15, display: 'flex' }}>{I.users}</span>
              {ride.availableSeats} of {ride.totalSeats} seats available
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--green)' }}>${ride.pricePerSeat}<span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 400 }}> per seat</span></span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {seats.map(i => (
              <div key={i} style={{ width: 28, height: 28, borderRadius: 4, background: i < (ride.totalSeats - ride.availableSeats) ? 'var(--border2)' : 'var(--green-l)', border: '1px solid', borderColor: i < (ride.totalSeats - ride.availableSeats) ? 'var(--border2)' : 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ width: 14, height: 14, color: i < (ride.totalSeats - ride.availableSeats) ? 'var(--text4)' : 'var(--green)', display: 'flex' }}>{I.user}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Notes + Rules */}
        {ride.notes && (
          <div className="card">
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Driver notes</div>
            <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{ride.notes}</p>
          </div>
        )}
        {ride.rules?.length > 0 && (
          <div className="notice notice-amber" style={{ borderRadius: 12 }}>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Ride rules</div>
              {ride.rules.map((r: string) => (
                <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, fontSize: 12 }}>
                  <span style={{ width: 14, height: 14, display: 'flex', opacity: .7 }}>{I.x}</span> {r}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Primary action: Book OR Request a ride when full */}
        {isFull ? (
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button
              className="btn btn-secondary btn-full btn-lg"
              onClick={toggleFav}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: isFav ? '#EF4444' : undefined }}>
              <span style={{ width: 16, height: 16, display: 'flex' }}>{I.heart}</span>
              {isFav ? 'Saved' : 'Favourite'}
            </button>
            <button
              className="btn btn-primary btn-full btn-lg"
              onClick={() => router.push('/rider/request')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <span style={{ width: 16, height: 16, display: 'flex' }}>{I.send}</span>
              Request a ride
            </button>
          </div>
        ) : (
          <button className="btn btn-primary btn-full btn-lg" onClick={book} style={{ marginTop: 8 }}>
            Send request to book - ${ride.pricePerSeat}
          </button>
        )}
      </div>
    </Layout>
  )
}
