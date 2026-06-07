import { useState, useEffect } from 'react'
import Layout, { I } from '../../components/layout/Layout'
import { rideAPI, userAPI, notifAPI } from '../../services/api'

export default function DriverHistory() {
  const [profile, setProfile] = useState<any>(null)
  const [rides,   setRides]   = useState<any[]>([])
  const [tab,     setTab]     = useState('All')
  const [loading, setLoading] = useState(true)
  const [unread,  setUnread]  = useState(0)

  useEffect(() => {
    Promise.allSettled([
      userAPI.getMe(),
      rideAPI.getMine('completed'),
      notifAPI.getUnreadCount(),
    ]).then(([p, r, n]) => {
      if (p.status === 'fulfilled') setProfile(p.value.data)
      if (r.status === 'fulfilled') setRides(r.value.data || [])
      else setRides([
        { rideId:1, fromLocation:'UTM Main Gate', toLocation:'City Centre',   departureTime:'2024-01-09T08:00:00', passengerCount:0, totalEarnings:0, averageRating:4.8, status:'Completed' },
      ])
      if (n.status === 'fulfilled') setUnread(n.value.data?.count || 0)
      setLoading(false)
    })
  }, [])

  const initials      = profile?.fullName?.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase() || 'SM'
  const filtered      = tab === 'All' ? rides : rides.filter(r=>r.status===tab)
  const totalEarnings = rides.filter(r=>r.status==='Completed').reduce((s:number,r:any)=>s+(r.totalEarnings||0),0)

  return (
    <Layout role="Driver" userInitials={initials} unreadCount={unread}>
      <div className="page-inner">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
          <div>
            <h1 style={{fontSize:22,fontWeight:700,color:'var(--text)'}}>Ride History</h1>
            <p style={{fontSize:13,color:'var(--text3)',marginTop:2}}>View your past rides</p>
          </div>
          <button className="btn btn-secondary btn-sm" style={{display:'flex',alignItems:'center',gap:5}}>
            <span style={{width:13,height:13,display:'flex'}}>{I.download}</span> Export
          </button>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
          <div className="stat-card">
            <div style={{fontSize:28,fontWeight:700,color:'var(--text)'}}>{rides.filter(r=>r.status==='Completed').length}</div>
            <div className="stat-label">Completed Rides</div>
          </div>
          <div className="stat-card">
            <div style={{fontSize:28,fontWeight:700,color:'var(--green)'}}>${totalEarnings.toFixed(2)}</div>
            <div className="stat-label">Total Earnings</div>
          </div>
        </div>

        <div style={{display:'flex',gap:0,background:'var(--bg2)',borderRadius:8,padding:3,marginBottom:14}}>
          {['All','Completed','Cancelled'].map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:'7px 0',border:'none',borderRadius:6,background:tab===t?'var(--bg-card)':'transparent',fontWeight:tab===t?600:400,fontSize:13,color:tab===t?'var(--text)':'var(--text3)',cursor:'pointer',boxShadow:tab===t?'var(--shadow-sm)':'none',transition:'all .15s'}}>{t}</button>
          ))}
        </div>

        {loading ? (
          <div style={{textAlign:'center',padding:'40px',color:'var(--text3)',fontSize:13}}>Loading...</div>
        ) : filtered.map(r => (
          <div key={r.rideId} className="card" style={{marginBottom:10}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
              <span className={`badge ${r.status==='Completed'?'badge-green':'badge-red'}`}>{r.status}</span>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:14,fontWeight:700,color:'var(--green)'}}>${(r.totalEarnings||0).toFixed(2)}</div>
                <div style={{fontSize:12,color:'var(--text3)'}}>{r.passengerCount||0} passengers</div>
              </div>
            </div>
            <div style={{marginBottom:8}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}><div className="rdot-g"/><span style={{fontSize:13,color:'var(--text)'}}>{r.fromLocation}</span></div>
              <div className="rconn"/>
              <div style={{display:'flex',alignItems:'center',gap:8,marginTop:4}}><div className="rdot-r"/><span style={{fontSize:13,color:'var(--text)'}}>{r.toLocation}</span></div>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'var(--text3)',borderTop:'1px solid var(--border)',paddingTop:8}}>
              <span style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:11,height:11,display:'flex'}}>{I.clock}</span>{new Date(r.departureTime).toLocaleDateString('en',{weekday:'short',day:'numeric',month:'short'})} · {new Date(r.departureTime).toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit'})}</span>
              {r.averageRating && <span style={{display:'flex',alignItems:'center',gap:3,color:'#F59E0B'}}><span style={{width:11,height:11,display:'flex'}}>{I.starF}</span>{r.averageRating}</span>}
            </div>
          </div>
        ))}
      </div>
    </Layout>
  )
}
