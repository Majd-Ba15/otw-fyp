import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout, { I } from '../../../components/layout/Layout'
import { rideAPI, userAPI, notifAPI } from '../../../services/api'
import toast from 'react-hot-toast'

export default function ManageRide() {
  const router = useRouter()
  const { id } = router.query
  const [profile,  setProfile]  = useState<any>(null)
  const [ride,     setRide]     = useState<any>(null)
  const [loading,  setLoading]  = useState(true)
  const [unread,   setUnread]   = useState(0)

  useEffect(() => {
    Promise.allSettled([
      userAPI.getMe(),
      id ? rideAPI.getById(Number(id)) : Promise.reject(),
      notifAPI.getUnreadCount(),
    ]).then(([p, r, n]) => {
      if (p.status === 'fulfilled') setProfile(p.value.data)
      if (r.status === 'fulfilled') setRide(r.value.data)
      else {
        // Try sessionStorage cache before showing empty state
        try {
          const cached = sessionStorage.getItem('otw_ride_preview')
          if (cached) { const d = JSON.parse(cached); if (String(d.rideId) === String(id)) setRide(d) }
        } catch {}
      }
      if (n.status === 'fulfilled') setUnread(n.value.data?.count || 0)
      setLoading(false)
    })
  }, [id])

  const startRide = async () => {
    try { await rideAPI.startRide(Number(id)); toast.success('Ride started!'); router.push('/driver/ride/active') }
    catch (e: any) { toast.error(e.response?.data?.message || 'Failed to start ride') }
  }
  const cancelRide = async () => {
    try { await rideAPI.cancel(Number(id)); toast.success('Ride cancelled'); router.push('/driver/rides') }
    catch (e: any) { toast.error(e.response?.data?.message || 'Failed to cancel') }
  }

  const initials = profile?.fullName?.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase() || 'SM'
  const passengerChatHref = (p: any) => {
    const userId = p.rider?.userId || p.riderId || p.userId
    const name = p.rider?.fullName || p.fullName
    return `/chat/${id}${userId ? `?userId=${userId}${name ? `&name=${encodeURIComponent(name)}` : ''}` : ''}`
  }
  const callPassenger = (p: any) => {
    const phone = p.rider?.phone || p.phone
    if (!phone) {
      toast.error('No phone number available for this passenger')
      return
    }
    window.location.href = `tel:${phone}`
  }

  return (
    <Layout role="Driver" showBack userInitials={initials} unreadCount={unread}>
      <div className="page-inner">
        {loading ? <div style={{ textAlign:'center',padding:'40px',color:'var(--text3)',fontSize:13 }}>Loading...</div> : ride && (
          <>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <span className={`badge ${ride.status==='Active'?'badge-green':ride.status==='Cancelled'?'badge-red':'badge-blue'}`}>{ride.status}</span>
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn btn-secondary btn-sm" style={{ display:'flex',alignItems:'center',gap:5 }}
                  onClick={() => router.push(`/driver/stops?rideId=${id}`)}>
                  <span style={{ width:13,height:13,display:'flex' }}>{I.map}</span> Stops
                </button>
                <button className="btn btn-secondary btn-sm" style={{ display:'flex',alignItems:'center',gap:5 }}>
                  <span style={{ width:13,height:13,display:'flex' }}>{I.edit}</span> Edit
                </button>
                <button className="btn btn-danger btn-sm" style={{ display:'flex',alignItems:'center',gap:5 }} onClick={cancelRide}>
                  <span style={{ width:13,height:13,display:'flex' }}>{I.trash}</span> Cancel
                </button>
              </div>
            </div>

            <div className="card">
              <div style={{ fontSize:11,color:'var(--text3)',textTransform:'uppercase',letterSpacing:.05,marginBottom:4 }}>PICKUP</div>
              <div style={{ fontSize:13,fontWeight:600,color:'var(--text)',marginBottom:8 }}>{ride.fromLocation}</div>
              <div className="rconn" style={{ margin:'0 0 8px' }}/>
              <div style={{ display:'flex',alignItems:'center',gap:6,marginBottom:12 }}>
                <div className="rdot-g"/>
                <div style={{ fontSize:13,fontWeight:600,color:'var(--text)' }}>{ride.toLocation}</div>
              </div>
              <div style={{ display:'flex',gap:16,fontSize:12,color:'var(--text3)',borderTop:'1px solid var(--border)',paddingTop:10 }}>
                <span style={{ display:'flex',alignItems:'center',gap:4 }}><span style={{ width:12,height:12,display:'flex' }}>{I.clock}</span>{new Date(ride.departureTime).toLocaleDateString('en',{weekday:'short',day:'numeric',month:'short'})}</span>
                <span style={{ display:'flex',alignItems:'center',gap:4 }}><span style={{ width:12,height:12,display:'flex' }}>{I.clock}</span>{new Date(ride.departureTime).toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit'})}</span>
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:12 }}>
              {[
                { icon:I.users,  val:`${ride.bookedSeats||0}/${ride.totalSeats}`, label:'Passengers' },
                { icon:I.dollar, val:`$${ride.pricePerSeat}`,                   label:'Per Seat' },
                { icon:I.nav,    val:'—',                                          label:'Est. Time' },
              ].map((s,i) => (
                <div key={i} className="stat-card" style={{ textAlign:'center', padding:'12px 8px' }}>
                  <span style={{ width:20,height:20,color:'var(--text3)',display:'flex',margin:'0 auto 6px' }}>{s.icon}</span>
                  <div style={{ fontSize:15,fontWeight:700,color:'var(--text)' }}>{s.val}</div>
                  <div style={{ fontSize:11,color:'var(--text3)',marginTop:2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div className="card" style={{ marginBottom:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <div>
                  <div style={{ fontSize:12,color:'var(--text3)',marginBottom:4 }}>Estimated Earnings</div>
                  <div style={{ fontSize:22,fontWeight:700,color:'var(--text)' }}>${((ride.bookedSeats||0)*(ride.pricePerSeat||0)).toFixed(2)}</div>
                </div>
                <div style={{ textAlign:'right',fontSize:12,color:'var(--text3)' }}>
                  <div>{ride.bookedSeats||0} passengers</div>
                  <div>${ride.pricePerSeat} each</div>
                </div>
              </div>
            </div>

            <div style={{ fontSize:15,fontWeight:600,color:'var(--text)',marginBottom:10 }}>Passengers ({ride.bookedSeats||0})</div>
            {(!ride.passengers || ride.passengers.length === 0) ? (
              <div className="card" style={{ textAlign:'center', padding:'28px' }}>
                <span style={{ width:36,height:36,display:'flex',margin:'0 auto 10px',color:'var(--text4)',opacity:.4 }}>{I.users}</span>
                <div style={{ fontSize:13,color:'var(--text3)' }}>No passengers yet</div>
              </div>
            ) : ride.passengers.map((p:any) => (
              <div key={p.bookingId} className="card" style={{ marginBottom:8 }}>
                <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                  <div className="av">{p.rider?.fullName?.slice(0,2).toUpperCase()}</div>
                  <div style={{ flex:1 }}><div style={{ fontSize:13,fontWeight:500,color:'var(--text)' }}>{p.rider?.fullName}</div></div>
                  <button className="btn-icon btn-secondary" onClick={() => router.push(passengerChatHref(p))}><span style={{ width:15,height:15,display:'flex' }}>{I.msg}</span></button>
                  <button className="btn-icon btn-secondary" onClick={() => callPassenger(p)} disabled={!(p.rider?.phone || p.phone)}><span style={{ width:15,height:15,display:'flex' }}>{I.phone}</span></button>
                </div>
              </div>
            ))}

            {ride.status !== 'Cancelled' && ride.status !== 'Completed' && (
              <button className="btn btn-primary btn-full btn-lg" style={{ marginTop:8 }} onClick={startRide}>
                ▶ Start Ride
              </button>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
