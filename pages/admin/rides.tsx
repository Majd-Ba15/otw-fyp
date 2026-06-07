import { useState, useEffect } from 'react'
import Layout, { I } from '../../components/layout/Layout'
import { adminAPI, userAPI, notifAPI } from '../../services/api'

export default function AllRides() {
  const [profile, setProfile] = useState<any>(null)
  const [rides,   setRides]   = useState<any[]>([])
  const [search,  setSearch]  = useState('')
  const [loading, setLoading] = useState(true)
  const [unread,  setUnread]  = useState(0)

  useEffect(() => {
    Promise.allSettled([
      userAPI.getMe(),
      adminAPI.getRides(),
      notifAPI.getUnreadCount(),
    ]).then(([p, r, n]) => {
      if (p.status === 'fulfilled') setProfile(p.value.data)
      setRides(r.status === 'fulfilled' ? (r.value.data || []) : [])
      if (n.status === 'fulfilled') setUnread(n.value.data?.count || 0)
      setLoading(false)
    })
  }, [])

  const initials   = profile?.fullName?.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase() || 'AD'
  const filtered   = rides.filter(r => !search || r.driverName?.toLowerCase().includes(search.toLowerCase()) || `${r.fromLocation} ${r.toLocation}`.toLowerCase().includes(search.toLowerCase()))
  const statusBadge = (s:string) => s==='Completed'?'badge-green':s==='Active'?'badge-blue':'badge-red'

  return (
    <Layout role="Admin" userInitials={initials} unreadCount={unread}>
      <div className="page-inner">
        <h1 style={{fontSize:22,fontWeight:700,color:'var(--text)',marginBottom:16}}>All rides</h1>
        <div style={{position:'relative',marginBottom:14}}>
          <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',width:15,height:15,color:'var(--text3)',display:'flex'}}>{I.search}</span>
          <input className="input" style={{paddingLeft:34}} placeholder="Search rides..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        {loading ? (
          <div style={{textAlign:'center',padding:'40px',color:'var(--text3)',fontSize:13}}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="card" style={{textAlign:'center',padding:'48px'}}>
            <div style={{fontSize:15,fontWeight:600,color:'var(--text)',marginBottom:4}}>
              {rides.length === 0 ? 'No rides yet' : 'No matching rides'}
            </div>
            <div style={{fontSize:13,color:'var(--text3)'}}>
              {rides.length === 0 ? 'All platform rides will appear here' : 'Try a different search term'}
            </div>
          </div>
        ) : (
          <div className="card" style={{padding:0,overflow:'hidden'}}>
            <table className="data-table">
              <thead>
                <tr><th>Ride ID</th><th>Driver</th><th>Route</th><th>Date</th><th>Status</th></tr>
              </thead>
              <tbody>
                {filtered.map(r=>(
                  <tr key={r.rideId||r.id} style={{cursor:'pointer'}}>
                    <td style={{color:'var(--text3)',fontFamily:'monospace',fontSize:12}}>{r.rideId||r.id}</td>
                    <td style={{fontWeight:500,color:'var(--text)'}}>{r.driverName||r.driver?.fullName}</td>
                    <td style={{color:'var(--text2)'}}>{r.fromLocation} → {r.toLocation}</td>
                    <td style={{color:'var(--text3)'}}>{r.departureDate||(r.departureTime ? new Date(r.departureTime).toLocaleDateString('en',{weekday:'short',day:'numeric',month:'short'}) : '')}</td>
                    <td><span className={`badge ${statusBadge(r.status)}`}>{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  )
}
