import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout, { I } from '../../../components/layout/Layout'
import { rideAPI, userAPI, notifAPI } from '../../../services/api'

export default function PassengerList() {
  const router = useRouter()
  const { id } = router.query
  const [profile,    setProfile]    = useState<any>(null)
  const [passengers, setPassengers] = useState<any[]>([])
  const [loading,    setLoading]    = useState(true)
  const [unread,     setUnread]     = useState(0)

  useEffect(() => {
    if (!router.isReady) return
    const rideId = Number(id)
    Promise.allSettled([
      userAPI.getMe(),
      rideId ? rideAPI.getPassengers(rideId) : Promise.reject(),
      notifAPI.getUnreadCount(),
    ]).then(([p, pas, n]) => {
      if (p.status === 'fulfilled') setProfile(p.value.data)
      const pasData = pas.status === 'fulfilled' ? (pas.value.data || []) : []
      setPassengers(pasData)
      if (n.status === 'fulfilled') setUnread(n.value.data?.count || 0)
      setLoading(false)
    })
  }, [id, router.isReady])

  const initials = profile?.fullName?.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase() || 'SM'
  const rideId = Number(id)
  const riderOf = (p: any) => p.rider || p.Rider || {}
  const passengerName = (p: any) => riderOf(p).fullName || riderOf(p).FullName || p.fullName || p.FullName || 'Passenger'
  const passengerInitials = (p: any) => passengerName(p).split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
  const passengerNote = (p: any) => p.note || p.Note || p.pickupNote || p.pickupLocation || ''
  const chatHref = (p: any) => {
    const rider = riderOf(p)
    const userId = rider.userId || rider.UserId || p.riderId || p.userId
    const name = passengerName(p)
    return `/chat/${rideId}?userId=${userId}${name ? `&name=${encodeURIComponent(name)}` : ''}`
  }
  const callPassenger = (p: any) => {
    const rider = riderOf(p)
    const phone = rider.phone || rider.Phone || p.phone || p.Phone
    if (!phone) {
      alert('No phone number available for this passenger.')
      return
    }
    window.location.href = `tel:${phone}`
  }

  return (
    <Layout role="Driver" showBack userInitials={initials} unreadCount={unread}>
      <div className="page-inner">
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Passenger list</h1>
        <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>Ride #{id} · {passengers.length} confirmed</div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text3)', fontSize: 13 }}>Loading...</div>
        ) : !rideId ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text3)', fontSize: 13 }}>Select a valid ride first.</div>
        ) : passengers.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '32px', color: 'var(--text3)', fontSize: 13 }}>
            No confirmed passengers for this ride yet.
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {passengers.map((p, i) => (
              <div key={p.bookingId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: i < passengers.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div className="av">{passengerInitials(p)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{passengerName(p)}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 1 }}>Note: {passengerNote(p) || 'No note added'}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-icon btn-secondary" onClick={() => router.push(chatHref(p))} aria-label="Message">
                    <span style={{ width: 15, height: 15, display: 'flex' }}>{I.msg}</span>
                  </button>
                  <button className="btn-icon btn-secondary" onClick={() => callPassenger(p)} aria-label="Call" disabled={!(riderOf(p).phone || riderOf(p).Phone || p.phone || p.Phone)}>
                    <span style={{ width: 15, height: 15, display: 'flex' }}>{I.phone}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
