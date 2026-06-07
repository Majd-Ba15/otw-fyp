import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Layout, { I } from '../../components/layout/Layout'
import { rideAPI, bookingAPI, userAPI, notifAPI } from '../../services/api'
import Cookies from 'js-cookie'
import { jwtDecode } from 'jwt-decode'

export default function RiderDashboard() {
  const router = useRouter()
  const [profile,   setProfile]   = useState<any>(null)
  const [bookings,  setBookings]  = useState<any[]>([])
  const [suggested, setSuggested] = useState<any[]>([])
  const [unread,    setUnread]    = useState(0)
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    const token = Cookies.get('otw_token')
    if (!token) { router.push('/auth/login'); return }
    try { const d:any = jwtDecode(token); if (d.role !== 'Rider') { router.push('/auth/login'); return } } catch { router.push('/auth/login'); return }

    Promise.allSettled([
      userAPI.getMe(),
      bookingAPI.getUpcoming(),
      rideAPI.search({ limit: 3 }),
      notifAPI.getUnreadCount(),
    ]).then(([p, b, s, n]) => {
      if (p.status === 'fulfilled') setProfile(p.value.data)
      if (b.status === 'fulfilled') setBookings(b.value.data || [])
      else setBookings([
        { bookingId:1, status:'Confirmed', ride:{ rideId:1, fromLocation:'UTM Main Gate', toLocation:'KL Sentral', departureTime:new Date(Date.now()+2*3600000).toISOString(), pricePerSeat:8, availableSeats:2 }, driver:{ fullName:'Sarah Tan', initials:'ST' } },
        { bookingId:2, status:'Pending',   ride:{ rideId:2, fromLocation:'Faculty of Computing', toLocation:'Paradigm Mall', departureTime:new Date(Date.now()+26*3600000).toISOString(), pricePerSeat:5, availableSeats:3 }, driver:{ fullName:'Ahmad Rizal', initials:'AR' } },
      ])
      if (s.status === 'fulfilled') setSuggested((s.value.data || []).slice(0, 3))
      else setSuggested([
        { rideId:10, fromLocation:'UTM Skudai', toLocation:'JB Sentral', departureTime:'2024-01-16T18:00:00', pricePerSeat:10, availableSeats:3, driver:{ fullName:'Nurul Izzah', initials:'NI', averageRating:4.8 } },
      ])
      if (n.status === 'fulfilled') setUnread(n.value.data?.count || 0)
      setLoading(false)
    })
  }, [])

  const initials  = profile?.fullName?.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase() || 'AK'
  const firstName = profile?.fullName?.split(' ')[0] || 'Ahmad'

  const fmtTime = (iso:string) => {
    const d = new Date(iso), now = new Date()
    const diff = d.getDate() - now.getDate()
    const t = d.toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit'})
    if (diff===0) return `Today · ${t}`
    if (diff===1) return `Tomorrow · ${t}`
    return `${d.toLocaleDateString('en',{weekday:'short',day:'numeric',month:'short'})} · ${t}`
  }

  return (
    <Layout role="Rider" userInitials={initials} userName={profile?.fullName} unreadCount={unread}>
      <div className="page-inner">
        {/* Header */}
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20}}>
          <div>
            <h1 style={{fontSize:24,fontWeight:700,color:'var(--text)'}}>Hi {firstName}!</h1>
            <p style={{fontSize:13,color:'var(--text3)',marginTop:2}}>Where are you heading today?</p>
          </div>
          {profile?.isVerified && (
            <span className="badge badge-green" style={{marginTop:4}}>
              <span style={{width:12,height:12,display:'flex'}}>{I.checkC}</span> Verified
            </span>
          )}
        </div>

        {/* Search bar */}
        <Link href="/rider/search" style={{textDecoration:'none',display:'block',marginBottom:14}}>
          <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:12,padding:'14px 16px',display:'flex',alignItems:'center',gap:12,boxShadow:'var(--shadow-sm)'}}>
            <div style={{width:36,height:36,background:'var(--green-l)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <span style={{width:18,height:18,color:'var(--green)',display:'flex'}}>{I.search}</span>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:500,color:'var(--text)'}}>Search for a ride</div>
              <div style={{fontSize:12,color:'var(--text3)',marginTop:1}}>Where do you want to go?</div>
            </div>
            <span style={{width:16,height:16,color:'var(--text3)',display:'flex',transform:'rotate(180deg)'}}>{I.back}</span>
          </div>
        </Link>

        {/* Quick nav */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:20}}>
          {[
            {icon:I.search,label:'Search',    href:'/rider/search'},
            {icon:I.heart, label:'Favourites',href:'/rider/favourites'},
            {icon:I.clock, label:'Waitlist',  href:'/rider/waitlist'},
            {icon:I.robot, label:'AI help',   href:'/rider/chat-ai'},
          ].map(q => (
            <Link key={q.label} href={q.href} style={{textDecoration:'none'}}>
              <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:10,padding:'14px 8px',textAlign:'center',boxShadow:'var(--shadow-sm)'}}>
                <span style={{width:22,height:22,color:'var(--green)',display:'flex',margin:'0 auto 6px'}}>{q.icon}</span>
                <div style={{fontSize:12,color:'var(--text2)',fontWeight:500}}>{q.label}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* Upcoming rides */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
          <h2 style={{fontSize:16,fontWeight:600,color:'var(--text)'}}>Upcoming rides</h2>
          <Link href="/rider/history" style={{fontSize:13,color:'var(--green)',fontWeight:500}}>View all</Link>
        </div>
        {loading ? (
          <div className="card" style={{textAlign:'center',padding:'24px',color:'var(--text3)',fontSize:13}}>Loading...</div>
        ) : bookings.length === 0 ? (
          <div className="card" style={{textAlign:'center',padding:'28px'}}>
            <span style={{width:36,height:36,display:'flex',margin:'0 auto 10px',color:'var(--text4)',opacity:.4}}>{I.car}</span>
            <div style={{fontSize:14,color:'var(--text3)'}}>No upcoming rides</div>
            <Link href="/rider/search"><button className="btn btn-primary btn-sm" style={{marginTop:12}}>Find a ride</button></Link>
          </div>
        ) : bookings.map((b:any) => (
          <div key={b.bookingId} className="card card-hover" style={{marginBottom:10,cursor:'pointer'}} onClick={()=>router.push(`/rider/ride/${b.ride?.rideId||1}`)}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
              <div className="av">{b.driver?.initials||b.driver?.fullName?.slice(0,2).toUpperCase()}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>{b.driver?.fullName}</div>
                <div style={{fontSize:11,color:'var(--text3)'}}>{fmtTime(b.ride?.departureTime)}</div>
              </div>
              <span className={`badge ${b.status==='Confirmed'?'badge-green':'badge-amber'}`}>{b.status}</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'var(--text3)',marginBottom:6}}>
              <span style={{width:12,height:12,display:'flex'}}>{I.pin}</span>
              {b.ride?.fromLocation} <span style={{color:'var(--text4)'}}>→</span> {b.ride?.toLocation}
            </div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{display:'flex',alignItems:'center',gap:5,fontSize:12,color:'var(--text3)'}}>
                <span style={{width:12,height:12,display:'flex'}}>{I.users}</span>{b.ride?.availableSeats} seats left
              </span>
              <span style={{fontSize:14,fontWeight:700,color:'var(--green)'}}>${b.ride?.pricePerSeat}</span>
            </div>
          </div>
        ))}

        {/* Suggested */}
        {suggested.length > 0 && (
          <>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10,marginTop:8}}>
              <h2 style={{fontSize:16,fontWeight:600,color:'var(--text)'}}>Suggested for you</h2>
              <Link href="/rider/search" style={{fontSize:13,color:'var(--green)',fontWeight:500}}>See more</Link>
            </div>
            {suggested.map((r:any) => (
              <div key={r.rideId} className="card card-hover" style={{cursor:'pointer',marginBottom:10}} onClick={()=>router.push(`/rider/ride/${r.rideId}`)}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                  <div style={{display:'flex',gap:10,alignItems:'center'}}>
                    <div className="av">{r.driver?.initials||r.driver?.fullName?.slice(0,2).toUpperCase()}</div>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>{r.driver?.fullName}</div>
                      <div style={{display:'flex',alignItems:'center',gap:4,fontSize:12,color:'#F59E0B'}}>
                        <span style={{width:12,height:12,display:'flex'}}>{I.starF}</span>{r.driver?.averageRating}
                      </div>
                    </div>
                  </div>
                  <span style={{fontSize:14,fontWeight:700,color:'var(--green)'}}>${r.pricePerSeat}</span>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'var(--text3)',margin:'8px 0'}}>
                  <span style={{width:12,height:12,display:'flex'}}>{I.pin}</span>
                  {r.fromLocation} <span style={{color:'var(--text4)'}}>→</span> {r.toLocation}
                </div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'var(--text3)'}}>
                  <span style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:12,height:12,display:'flex'}}>{I.clock}</span>{new Date(r.departureTime).toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit'})}</span>
                  <span style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:12,height:12,display:'flex'}}>{I.users}</span>{r.availableSeats} seats left</span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </Layout>
  )
}
