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
    Promise.allSettled([
      userAPI.getMe(),
      id ? rideAPI.getPassengers(Number(id)) : Promise.reject(),
      notifAPI.getUnreadCount(),
    ]).then(([p, pas, n]) => {
      if (p.status === 'fulfilled') setProfile(p.value.data)
      const pasData = pas.status === 'fulfilled' ? (pas.value.data || []) : []
      setPassengers(pasData.length > 0 ? pasData : [
        { bookingId:1, rider:{ fullName:'Ahmad Karim', initials:'AK' }, pickupNote:'Gate A' },
        { bookingId:2, rider:{ fullName:'Fatimah Ali', initials:'FA' }, pickupNote:'Gate B' },
        { bookingId:3, rider:{ fullName:'Lee Wei Ming', initials:'LW' }, pickupNote:'Faculty Lobby' },
      ])
      if (n.status === 'fulfilled') setUnread(n.value.data?.count || 0)
      setLoading(false)
    })
  }, [id])

  const initials = profile?.fullName?.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase() || 'SM'

  return (
    <Layout role="Driver" showBack userInitials={initials} unreadCount={unread}>
      <div className="page-inner">
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Passenger list</h1>
        <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>Ride #{id} · {passengers.length} confirmed</div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text3)', fontSize: 13 }}>Loading...</div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {passengers.map((p, i) => (
              <div key={p.bookingId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: i < passengers.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div className="av">{p.rider?.initials || p.rider?.fullName?.slice(0,2).toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{p.rider?.fullName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 1 }}>Pickup: {p.pickupNote || p.pickupLocation || '—'}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-icon btn-secondary" onClick={() => router.push(`/chat/${id}`)} aria-label="Message">
                    <span style={{ width: 15, height: 15, display: 'flex' }}>{I.msg}</span>
                  </button>
                  <button className="btn-icon btn-secondary" aria-label="Call">
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
