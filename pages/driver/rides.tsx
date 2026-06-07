import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout, { I } from '../../components/layout/Layout'
import { rideAPI, userAPI, notifAPI } from '../../services/api'

export default function MyRides() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [rides,   setRides]   = useState<any[]>([])
  const [tab,     setTab]     = useState('All')
  const [loading, setLoading] = useState(true)
  const [unread,  setUnread]  = useState(0)

  useEffect(() => {
    Promise.allSettled([
      userAPI.getMe(),
      rideAPI.getMine(),
      notifAPI.getUnreadCount(),
    ]).then(([p, r, n]) => {
      if (p.status === 'fulfilled') setProfile(p.value.data)
      setRides(r.status === 'fulfilled' ? (r.value.data || []) : [])
      if (n.status === 'fulfilled') setUnread(n.value.data?.count || 0)
      setLoading(false)
    })
  }, [])

  const initials  = profile?.fullName?.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase() || 'SM'
  const filtered  = tab === 'All' ? rides : rides.filter(r => r.status === tab || (tab==='Full'&&r.status==='Full'))
  const statusBadge = (s:string) => s==='Full'?'badge-amber':s==='Cancelled'?'badge-red':'badge-green'

  return (
    <Layout role="Driver" userInitials={initials} unreadCount={unread}>
      <div className="page-inner">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <h1 style={{fontSize:22,fontWeight:700,color:'var(--text)'}}>My rides</h1>
          <button className="btn btn-blue btn-sm" style={{display:'flex',alignItems:'center',gap:5}} onClick={()=>router.push('/driver/post')}>
            <span style={{width:14,height:14,display:'flex'}}>{I.plus}</span> Post a ride
          </button>
        </div>

        <div style={{display:'flex',gap:0,background:'var(--bg2)',borderRadius:8,padding:3,marginBottom:14}}>
          {['All','Active','Upcoming','Full','Cancelled'].map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:'6px 0',border:'none',borderRadius:6,background:tab===t?'var(--bg-card)':'transparent',fontWeight:tab===t?600:400,fontSize:12,color:tab===t?'var(--text)':'var(--text3)',cursor:'pointer',boxShadow:tab===t?'var(--shadow-sm)':'none',transition:'all .15s'}}>{t}</button>
          ))}
        </div>

        {loading ? (
          <div style={{textAlign:'center',padding:'40px',color:'var(--text3)',fontSize:13}}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="card" style={{textAlign:'center',padding:'32px'}}>
            <span style={{width:36,height:36,display:'flex',margin:'0 auto 10px',color:'var(--text4)',opacity:.4}}>{I.car}</span>
            <div style={{fontSize:14,color:'var(--text3)'}}>No rides in this category</div>
            <button className="btn btn-blue btn-sm" style={{marginTop:12}} onClick={()=>router.push('/driver/post')}>Post a ride</button>
          </div>
        ) : filtered.map(r => (
          <div key={r.rideId} className="card card-hover" style={{cursor:'pointer',marginBottom:10}} onClick={()=>{ try { sessionStorage.setItem('otw_ride_preview', JSON.stringify(r)) } catch {}; router.push(`/driver/ride/${r.rideId}`) }}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
              <div className="rdot-g"/>
              <span style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>{r.fromLocation}</span>
              <span style={{color:'var(--text3)'}}>→</span>
              <span style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>{r.toLocation}</span>
              <span className={`badge ${statusBadge(r.status)}`} style={{marginLeft:'auto'}}>{r.status}</span>
            </div>
            <div style={{display:'flex',gap:16,fontSize:12,color:'var(--text3)'}}>
              <span style={{display:'flex',alignItems:'center',gap:4}}>
                <span style={{width:12,height:12,display:'flex'}}>{I.clock}</span>
                {new Date(r.departureTime).toLocaleDateString('en',{weekday:'short',day:'numeric',month:'short'})} · {new Date(r.departureTime).toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit'})}
              </span>
              <span style={{display:'flex',alignItems:'center',gap:4}}>
                <span style={{width:12,height:12,display:'flex'}}>{I.users}</span>
                {r.bookedSeats}/{r.totalSeats} booked
              </span>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  )
}
