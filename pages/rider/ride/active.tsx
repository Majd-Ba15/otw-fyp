import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import Layout, { I } from '../../../components/layout/Layout'
import { bookingAPI, userAPI, notifAPI } from '../../../services/api'
import toast from 'react-hot-toast'

const MapLive = dynamic(() => import('../../../components/shared/MapLive'), { ssr: false })

type RideStatus = 'in_progress' | 'paused' | 'completed'

export default function RiderActiveRide() {
  const router = useRouter()

  const [profile, setProfile] = useState<any>(null)
  const [booking, setBooking] = useState<any>(null)
  const [unread,  setUnread]  = useState(0)
  const [loading, setLoading] = useState(true)
  const [status,  setStatus]  = useState<RideStatus>('in_progress')

  useEffect(() => {
    Promise.allSettled([
      userAPI.getMe(),
      bookingAPI.getActive(),
      notifAPI.getUnreadCount(),
    ]).then(([p, b, n]) => {
      if (p.status === 'fulfilled') setProfile(p.value.data)
      setBooking(b.status === 'fulfilled' ? b.value.data : null)
      if (n.status === 'fulfilled') setUnread(n.value.data?.count || 0)
      setLoading(false)
    })
  }, [])

  const initials = profile?.fullName?.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase() || 'AK'

  const statusColor = status === 'paused' ? '#F59E0B' : status === 'completed' ? '#16a36b' : '#2563EB'
  const statusBg    = status === 'paused' ? '#FEF3C7' : status === 'completed' ? '#D1FAE5' : '#EFF6FF'
  const statusLabel = status === 'paused' ? 'Paused' : status === 'completed' ? 'Completed' : 'In Progress'

  return (
    <Layout title="Active ride" role="Rider" userInitials={initials} unreadCount={unread}>

      {/* Status bar */}
      <div style={{ background: statusBg, borderBottom: `1px solid ${statusColor}30`, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: statusColor }}>{statusLabel}</span>
        <span style={{ fontSize: 13, color: 'var(--text3)', marginLeft: 4 }}>
          {loading ? 'Loading...' : !booking ? 'No active ride' : status === 'paused' ? '— ride has been paused' : status === 'completed' ? '— ride finished!' : '— you are on your way'}
        </span>
      </div>

      <div className="page-inner">

        {/* Live map */}
        <div className="map-contain" style={{ borderRadius: 14, border: '1px solid var(--border)', marginBottom: 14, overflow: 'hidden' }}>
          {booking?.ride?.fromLat ? (
            <MapLive
              driverLat={booking.ride.fromLat} driverLng={booking.ride.fromLng}
              toLat={booking.ride.toLat}       toLng={booking.ride.toLng}
              height={280}
            />
          ) : (
            <div style={{ height: 280, background: 'var(--bg2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span style={{ width: 32, height: 32, display: 'flex', opacity: .4 }}>{I.nav}</span>
              <span style={{ fontSize: 13, color: 'var(--text3)' }}>
                {loading ? 'Loading...' : 'Live tracking map'}
              </span>
            </div>
          )}
        </div>

        {/* ETA + distance */}
        {booking && (
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
              <div style={{ borderRight: '1px solid var(--border)', paddingRight: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>Ride status</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: statusColor }}>{statusLabel}</div>
              </div>
              <div style={{ paddingLeft: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>Price paid</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
                  ${booking.ride?.pricePerSeat || '—'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Route */}
        {booking && (
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div className="rdot-g" />
              <div>
                <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: .05 }}>Pickup</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{booking.ride?.fromLocation}</div>
              </div>
              <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 'auto' }}>
                {booking.ride?.departureTime ? new Date(booking.ride.departureTime).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }) : ''}
              </span>
            </div>
            <div className="rconn" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <div className="rdot-r" />
              <div>
                <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: .05 }}>Drop-off</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{booking.ride?.toLocation}</div>
              </div>
            </div>
          </div>
        )}

        {/* Driver info */}
        {booking?.driver && (
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div className="av av-lg">
                {booking.driver.initials || booking.driver.fullName?.slice(0,2).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{booking.driver.fullName}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>{booking.driver.car?.model} · {booking.driver.car?.plateNumber}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>{booking.driver.car?.colour}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button className="btn btn-secondary btn-full"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 13 }}
                onClick={() => router.push(`/chat/${booking.bookingId}`)}>
                <span style={{ width: 15, height: 15, display: 'flex' }}>{I.msg}</span> Chat
              </button>
              <button className="btn btn-secondary btn-full"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 13 }}>
                <span style={{ width: 15, height: 15, display: 'flex' }}>{I.phone}</span> Call
              </button>
            </div>
          </div>
        )}

        {/* Ride status actions — shown when driver pauses or completes */}
        {status === 'paused' && (
          <div style={{ background: '#FEF3C7', border: '1px solid #F59E0B40', borderRadius: 12, padding: '14px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 20, height: 20, color: '#F59E0B', display: 'flex', flexShrink: 0 }}>{I.pause}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>Ride paused by driver</div>
              <div style={{ fontSize: 12, color: '#78350F' }}>The driver has temporarily stopped. Please wait.</div>
            </div>
          </div>
        )}

        {status === 'completed' && (
          <div style={{ background: '#D1FAE5', border: '1px solid #16a36b40', borderRadius: 12, padding: '14px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 20, height: 20, color: '#16a36b', display: 'flex', flexShrink: 0 }}>{I.checkC}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#065F46' }}>Ride completed!</div>
              <div style={{ fontSize: 12, color: '#047857' }}>You have arrived. Hope you had a great ride!</div>
            </div>
          </div>
        )}

        {/* Rate driver after completion */}
        {status === 'completed' && booking && (
          <button className="btn btn-primary btn-full btn-lg" style={{ marginBottom: 10 }}
            onClick={() => router.push(`/rider/rate/${booking.bookingId}`)}>
            <span style={{ width: 16, height: 16, display: 'flex' }}>{I.starF}</span>
            Rate your driver
          </button>
        )}

        {/* SOS — always visible */}
        {status !== 'completed' && (
          <button className="btn btn-full"
            onClick={() => router.push('/sos')}
            style={{ height: 46, background: 'transparent', border: '1.5px solid var(--red)', color: 'var(--red)', borderRadius: 8, fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{ width: 18, height: 18, display: 'flex' }}>{I.sos}</span> Emergency SOS
          </button>
        )}
      </div>
    </Layout>
  )
}
