import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout, { I } from '../../components/layout/Layout'
import { userAPI, notifAPI } from '../../services/api'
import toast from 'react-hot-toast'

export default function Favourites() {
  const router = useRouter()
  const [profile,  setProfile]  = useState<any>(null)
  const [drivers,  setDrivers]  = useState<any[]>([])
  const [routes,   setRoutes]   = useState<any[]>([])
  const [unread,   setUnread]   = useState(0)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    Promise.allSettled([
      userAPI.getMe(),
      userAPI.getFavourites(),
      notifAPI.getUnreadCount(),
    ]).then(([p, f, n]) => {
      if (p.status === 'fulfilled') setProfile(p.value.data)
      if (f.status === 'fulfilled') {
        setDrivers(f.value.data?.drivers || [])
        setRoutes(f.value.data?.routes || [])
      } else {
        setDrivers([
          { id:1, fullName:'Sarah Tan',   initials:'ST', averageRating:4.9, tripCount:156, routes:['UTM → KL Sentral','UTM → Paradigm Mall'] },
          { id:2, fullName:'Ahmad Rizal', initials:'AR', averageRating:4.7, tripCount:89,  routes:['UTM → JB Sentral'] },
          { id:3, fullName:'Nurul Izzah', initials:'NI', averageRating:4.8, tripCount:234, routes:['UTM → AEON Tebrau','UTM → City Square'] },
        ])
        setRoutes([
          { id:1, fromLocation:'UTM Main Gate',       toLocation:'KL Sentral',    usedCount:12 },
          { id:2, fromLocation:'Faculty of Computing', toLocation:'Paradigm Mall', usedCount:8 },
        ])
      }
      if (n.status === 'fulfilled') setUnread(n.value.data?.count || 0)
      setLoading(false)
    })
  }, [])

  const removeFav = async (id:number) => {
    try { await userAPI.deleteFavourite(id); setDrivers(p=>p.filter(d=>d.id!==id)); toast.success('Removed') }
    catch { setDrivers(p=>p.filter(d=>d.id!==id)); toast.success('Removed') }
  }

  const initials = profile?.fullName?.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase() || 'AK'

  return (
    <Layout title="Favourites" role="Rider" userInitials={initials} unreadCount={unread}>
      <div className="page-inner">
        {/* Favourite drivers */}
        <div style={{fontSize:15,fontWeight:600,color:'var(--text)',marginBottom:12}}>Favourite drivers</div>
        {loading ? (
          <div style={{textAlign:'center',padding:'24px',color:'var(--text3)',fontSize:13}}>Loading...</div>
        ) : drivers.length === 0 ? (
          <div className="card" style={{textAlign:'center',padding:'28px',marginBottom:16}}>
            <span style={{width:36,height:36,display:'flex',margin:'0 auto 10px',color:'var(--text4)',opacity:.4}}>{I.heart}</span>
            <div style={{fontSize:14,color:'var(--text3)'}}>No favourite drivers yet</div>
          </div>
        ) : drivers.map(d => (
          <div key={d.id} className="card" style={{marginBottom:10}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
              <div className="av">{d.initials||d.fullName?.slice(0,2).toUpperCase()}</div>
              <div style={{flex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:5}}>
                  <span style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>{d.fullName}</span>
                  <span style={{width:13,height:13,color:'var(--green)',display:'flex'}}>{I.checkC}</span>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:5,fontSize:12,color:'var(--text3)'}}>
                  <span style={{color:'#F59E0B',width:12,height:12,display:'flex'}}>{I.starF}</span>{d.averageRating} · {d.tripCount} trips
                </div>
              </div>
              <button onClick={()=>removeFav(d.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--red)',width:18,height:18,display:'flex'}}>{I.trash}</button>
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:10}}>
              {(d.routes||[]).map((r:string)=><span key={r} style={{background:'var(--bg2)',padding:'3px 10px',borderRadius:20,fontSize:11,color:'var(--text3)'}}>{r}</span>)}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <button className="btn btn-secondary btn-full btn-sm" style={{height:36}} onClick={()=>router.push('/rider/search')}>View rides</button>
              <button className="btn btn-primary btn-full btn-sm" style={{height:36}} onClick={()=>router.push(`/chat/${d.id}`)}>Message</button>
            </div>
          </div>
        ))}

        {/* Saved routes */}
        <div style={{fontSize:15,fontWeight:600,color:'var(--text)',marginBottom:12,marginTop:8}}>Saved routes</div>
        {routes.length === 0 ? (
          <div className="card" style={{textAlign:'center',padding:'24px'}}>
            <div style={{fontSize:14,color:'var(--text3)'}}>No saved routes yet</div>
          </div>
        ) : routes.map(r => (
          <div key={r.id} className="card" style={{marginBottom:8}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
              <div className="rdot-g"/>
              <span style={{fontSize:13,fontWeight:500,color:'var(--text)'}}>{r.fromLocation}</span>
              <span style={{color:'var(--text3)'}}>→</span>
              <span style={{fontSize:13,fontWeight:500,color:'var(--text)'}}>{r.toLocation}</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{display:'flex',alignItems:'center',gap:4,fontSize:12,color:'var(--text3)'}}>
                <span style={{width:12,height:12,display:'flex'}}>{I.history}</span> Used {r.usedCount} times
              </span>
              <button className="btn btn-ghost btn-sm" onClick={()=>router.push(`/rider/search?from=${encodeURIComponent(r.fromLocation)}&to=${encodeURIComponent(r.toLocation)}`)}>Search</button>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  )
}
