import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Layout, { I } from '../../components/layout/Layout'
import { rideAPI, bookingAPI, userAPI, notifAPI } from '../../services/api'
import Cookies from 'js-cookie'
import { jwtDecode } from 'jwt-decode'

export default function DriverDashboard() {
  const router = useRouter()
  const [profile,  setProfile]  = useState<any>(null)
  const [stats,    setStats]    = useState<any>({ totalRides:0, thisWeek:0, rating:0, earnings:0 })
  const [upcoming, setUpcoming] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [schedule, setSchedule] = useState<any[]>([])
  const [unread,   setUnread]   = useState(0)
  const [loading,  setLoading]  = useState(true)

  const normalizeStats = (raw: any = {}) => ({
    totalRides: raw.totalRides ?? raw.driverBookedRides ?? raw.driverCompletedRides ?? raw.completedRides ?? 0,
    thisWeek: raw.thisWeek ?? raw.weekRides ?? raw.ridesThisWeek ?? 0,
    rating: raw.rating ?? raw.averageRating ?? 0,
    earnings: raw.earnings ?? 0,
  })

  const bookedSeats = (ride: any) => {
    if (!ride) return 0
    if (typeof ride.bookedSeats === 'number') return ride.bookedSeats
    if (typeof ride.totalSeats === 'number' && typeof ride.availableSeats === 'number') {
      return Math.max(0, ride.totalSeats - ride.availableSeats)
    }
    return 0
  }

  useEffect(() => {
    const token = Cookies.get('otw_token')
    if (!token) { router.push('/auth/login'); return }
    try { const d:any = jwtDecode(token); if (d.role !== 'Driver') { router.push('/auth/login'); return } } catch { router.push('/auth/login'); return }

    Promise.allSettled([
      userAPI.getMe(),
      userAPI.getStats(),
      rideAPI.getMine('upcoming'),
      bookingAPI.getRequests(),
      notifAPI.getUnreadCount(),
    ]).then(([p, s, r, req, n]) => {
      if (p.status === 'fulfilled') setProfile(p.value.data)
      setStats(s.status === 'fulfilled' ? normalizeStats(s.value.data) : normalizeStats())
      if (r.status === 'fulfilled') {
        const rides = r.value.data || []
        setUpcoming(rides.slice(0,3))
        setSchedule(rides.slice(0,2).map((ride:any) => ({
          time: new Date(ride.departureTime).toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit',hour12:false}).split(':')[0],
          mins: new Date(ride.departureTime).toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit',hour12:false}).split(':')[1],
          period: new Date(ride.departureTime).getHours() < 12 ? 'AM' : 'PM',
          label: ride.fromLocation + ' → ' + ride.toLocation,
          route: ride.fromLocation + ' → ' + ride.toLocation,
          booked: `${bookedSeats(ride)}/${ride.totalSeats}`,
          rideId: ride.rideId,
        })))
      } else {
        setSchedule([])
      }
      if (req.status === 'fulfilled') setRequests((req.value.data || []).slice(0,3))
      if (n.status === 'fulfilled') setUnread(n.value.data?.count || 0)
      setLoading(false)
    })
  }, [])

  const acceptRequest = async (bookingId:number) => {
    try { await bookingAPI.accept(bookingId) } catch {}
    setRequests(p => p.filter(r => r.bookingId !== bookingId))
  }
  const declineRequest = async (bookingId:number) => {
    try { await bookingAPI.decline(bookingId) } catch {}
    setRequests(p => p.filter(r => r.bookingId !== bookingId))
  }

  const initials  = profile?.fullName?.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase() || 'SM'
  const firstName = profile?.fullName?.split(' ')[0] || 'Sarah'

  return (
    <Layout role="Driver" userInitials={initials} userName={profile?.fullName} unreadCount={unread}>
      <div className="page-inner">

        {/* Header */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
          <div>
            <h1 style={{fontSize:22,fontWeight:700,color:'var(--text)'}}>Welcome back, {firstName}!</h1>
            <p style={{fontSize:13,color:'var(--text3)',marginTop:2}}>Ready to drive today?</p>
          </div>
        </div>

        {/* 4 stat cards */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:14}}>
          {[
            {icon:I.car,      bg:'#EFF6FF', color:'#3B82F6', val:stats.totalRides,        label:'Total Rides',  badge:'+12%'},
            {icon:I.trending, bg:'#ECFDF5', color:'#10B981', val:stats.thisWeek,           label:'This Week',   badge:null},
            {icon:I.starF,    bg:'#FFFBEB', color:'#F59E0B', val:stats.rating,             label:'Rating',      badge:null},
            {icon:I.dollar,   bg:'#F5F3FF', color:'#8B5CF6', val:`$${stats.earnings||0}`,label:'Earnings',   badge:null},
          ].map((s,i) => (
            <div key={i} className="stat-card">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                <div style={{width:32,height:32,borderRadius:8,background:s.bg,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <span style={{width:17,height:17,color:s.color,display:'flex'}}>{s.icon}</span>
                </div>
                {s.badge && <span style={{fontSize:10,fontWeight:600,color:'var(--green)'}}>{s.badge}</span>}
              </div>
              <div style={{fontSize:20,fontWeight:700,color:'var(--text)'}}>{s.val}</div>
              <div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:20}}>
          {[
            {icon:I.plus,    label:'Post Trip',      href:'/driver/post'},
            {icon:I.car,     label:'Manage Rides',   href:'/driver/rides'},
            {icon:I.ticket,  label:'Requests',       href:'/driver/requests'},
            {icon:I.earnings,label:'Earnings',       href:'/driver/earnings'},
          ].map(q => (
            <Link key={q.label} href={q.href} style={{textDecoration:'none'}}>
              <div className="card" style={{textAlign:'center',padding:'14px 8px',margin:0,cursor:'pointer'}}>
                <span style={{width:22,height:22,color:'var(--blue)',display:'flex',margin:'0 auto 6px'}}>{q.icon}</span>
                <div style={{fontSize:12,color:'var(--text2)',fontWeight:500}}>{q.label}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* Pending requests */}
        {requests.length > 0 && (
          <>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <h2 style={{fontSize:16,fontWeight:600,color:'var(--text)'}}>Pending requests</h2>
              <Link href="/driver/requests" style={{fontSize:13,color:'var(--blue)',fontWeight:500}}>View all</Link>
            </div>
            {requests.map(r => (
              <div key={r.bookingId} className="card" style={{marginBottom:10}}>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                  <div className="av">{r.rider?.fullName?.slice(0,2).toUpperCase()||'AK'}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>{r.rider?.fullName||'Rider'}</div>
                    <div style={{fontSize:12,color:'var(--text3)'}}>{r.ride?.fromLocation} → {r.ride?.toLocation}</div>
                  </div>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button className="btn btn-primary btn-sm" style={{flex:1}} onClick={()=>acceptRequest(r.bookingId)}>Accept</button>
                  <button className="btn btn-secondary btn-sm" style={{flex:1}} onClick={()=>declineRequest(r.bookingId)}>Decline</button>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Upcoming rides */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
          <h2 style={{fontSize:16,fontWeight:600,color:'var(--text)'}}>Upcoming Rides</h2>
          <Link href="/driver/rides" style={{fontSize:13,color:'var(--blue)',fontWeight:500}}>View All</Link>
        </div>
        {loading ? (
          <div className="card" style={{textAlign:'center',padding:'20px',color:'var(--text3)',fontSize:13}}>Loading...</div>
        ) : upcoming.length === 0 ? (
          <div className="card" style={{textAlign:'center',padding:'28px',marginBottom:16}}>
            <span style={{width:36,height:36,color:'var(--text4)',display:'flex',margin:'0 auto 10px',opacity:.4}}>{I.car}</span>
            <div style={{fontSize:14,fontWeight:500,color:'var(--text2)'}}>No upcoming rides</div>
            <div style={{fontSize:12,color:'var(--text3)',marginTop:4}}>Post a trip now</div>
            <Link href="/driver/post"><button className="btn btn-blue btn-sm" style={{marginTop:12}}>+ Post a trip</button></Link>
          </div>
        ) : upcoming.map((r:any) => (
          <div key={r.rideId} className="card card-hover" style={{marginBottom:10,cursor:'pointer'}} onClick={()=>router.push(`/driver/ride/${r.rideId}`)}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
              <div className="rdot-g"/>
              <span style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>{r.fromLocation}</span>
              <span style={{color:'var(--text3)'}}>→</span>
              <span style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>{r.toLocation}</span>
              <span className="badge badge-green" style={{marginLeft:'auto'}}>{r.status||'Upcoming'}</span>
            </div>
            <div style={{display:'flex',gap:14,fontSize:12,color:'var(--text3)'}}>
              <span style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:12,height:12,display:'flex'}}>{I.clock}</span>{new Date(r.departureTime).toLocaleDateString('en',{weekday:'short',day:'numeric',month:'short'})} · {new Date(r.departureTime).toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit'})}</span>
              <span style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:12,height:12,display:'flex'}}>{I.users}</span>{bookedSeats(r)}/{r.totalSeats} booked</span>
            </div>
          </div>
        ))}

        {/* Today's schedule */}
        <div style={{fontSize:16,fontWeight:600,color:'var(--text)',marginBottom:10}}>Today's Schedule</div>
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          {schedule.length === 0 ? (
            <div style={{padding:'20px',textAlign:'center',fontSize:13,color:'var(--text3)'}}>No rides scheduled today</div>
          ) : schedule.map((s,i) => (
            <div key={i} style={{display:'flex',alignItems:'center',gap:14,padding:'14px 16px',borderBottom:i<schedule.length-1?'1px solid var(--border)':'none',cursor:'pointer'}} onClick={()=>s.rideId&&router.push(`/driver/ride/${s.rideId}`)}>
              <div style={{textAlign:'center',minWidth:44}}>
                <div style={{fontSize:15,fontWeight:700,color:'var(--text)'}}>{s.time}</div>
                <div style={{fontSize:10,color:'var(--text3)'}}>{s.period}</div>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:500,color:'var(--text)'}}>{s.label}</div>
                <div style={{fontSize:12,color:'var(--text3)',marginTop:1,display:'flex',alignItems:'center',gap:4}}><span style={{width:11,height:11,display:'flex'}}>{I.pin}</span>{s.route}</div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:4,fontSize:12,color:'var(--text3)'}}>
                <span style={{width:13,height:13,display:'flex'}}>{I.users}</span>{s.booked}
              </div>
            </div>
          ))}
        </div>

      </div>
    </Layout>
  )
}
