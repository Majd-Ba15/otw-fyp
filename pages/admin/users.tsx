import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout, { I } from '../../components/layout/Layout'
import { adminAPI, userAPI, notifAPI } from '../../services/api'

export default function UserManagement() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [users,   setUsers]   = useState<any[]>([])
  const [stats,   setStats]   = useState({ total:0, drivers:0, riders:0, banned:0 })
  const [search,  setSearch]  = useState('')
  const [tab,     setTab]     = useState('All')
  const [loading, setLoading] = useState(true)
  const [unread,  setUnread]  = useState(0)

  useEffect(() => {
    Promise.allSettled([
      userAPI.getMe(),
      adminAPI.getUsers(),
      notifAPI.getUnreadCount(),
    ]).then(([p, u, n]) => {
      if (p.status === 'fulfilled') setProfile(p.value.data)
      const data = u.status === 'fulfilled' ? (u.value.data || []) : []
      setUsers(data)
      setStats({ total:data.length, drivers:data.filter((x:any)=>x.role==='Driver').length, riders:data.filter((x:any)=>x.role==='Rider').length, banned:data.filter((x:any)=>x.status==='Banned').length })
      if (n.status === 'fulfilled') setUnread(n.value.data?.count || 0)
      setLoading(false)
    })
  }, [])

  const initials = profile?.fullName?.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase() || 'AD'
  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    if (q && !u.fullName?.toLowerCase().includes(q) && !u.email?.toLowerCase().includes(q)) return false
    if (tab === 'Drivers' && u.role !== 'Driver') return false
    if (tab === 'Riders'  && u.role !== 'Rider')  return false
    if (tab === 'Banned'  && u.status !== 'Banned') return false
    return true
  })
  const getInitials = (name:string) => name?.split(' ').map((n:string)=>n[0]).join('').slice(0,1).toUpperCase() || '?'
  const avatarColor = (role:string) => role==='Driver'?{bg:'#EFF6FF',color:'#3B82F6'}:role==='Admin'?{bg:'var(--amber-l)',color:'var(--amber)'}:{bg:'var(--green-l)',color:'var(--green-dd)'}

  return (
    <Layout role="Admin" userInitials={initials} unreadCount={unread}>
      <div className="page-inner">
        <h1 style={{fontSize:22,fontWeight:700,color:'var(--text)',marginBottom:2}}>User Management</h1>
        <p style={{fontSize:13,color:'var(--text3)',marginBottom:16}}>Manage all platform users</p>

        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16}}>
          {[{val:stats.total,label:'Total',color:'var(--text)'},{val:stats.drivers,label:'Drivers',color:'var(--green)'},{val:stats.riders,label:'Riders',color:'var(--blue)'},{val:stats.banned,label:'Banned',color:'var(--red)'}].map((s,i)=>(
            <div key={i} className="stat-card" style={{textAlign:'center'}}>
              <div style={{fontSize:22,fontWeight:700,color:s.color}}>{s.val}</div>
              <div className="stat-label" style={{textAlign:'center'}}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{display:'flex',gap:10,marginBottom:12}}>
          <div style={{position:'relative',flex:1}}>
            <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',width:15,height:15,color:'var(--text3)',display:'flex'}}>{I.search}</span>
            <input className="input" style={{paddingLeft:34}} placeholder="Search users..." value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <button className="btn btn-secondary btn-sm" style={{display:'flex',alignItems:'center',gap:5}}>
            <span style={{width:13,height:13,display:'flex'}}>{I.settings}</span> Filter
          </button>
        </div>

        <div style={{display:'flex',gap:8,marginBottom:14}}>
          {['Drivers','Riders','Banned'].map(t=>(
            <button key={t} className={`chip ${tab===t?'active':''}`} onClick={()=>setTab(p=>p===t?'All':t)}>
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{textAlign:'center',padding:'40px',color:'var(--text3)',fontSize:13}}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="card" style={{textAlign:'center',padding:'48px'}}>
            <div style={{fontSize:15,fontWeight:600,color:'var(--text)',marginBottom:4}}>
              {users.length === 0 ? 'No users found' : 'No matching users'}
            </div>
            <div style={{fontSize:13,color:'var(--text3)'}}>
              {users.length === 0 ? 'Registered users will appear here' : 'Try a different search or filter'}
            </div>
          </div>
        ) : (
          <div className="card" style={{padding:0,overflow:'hidden'}}>
            {filtered.map((u,i)=>{
              const av = avatarColor(u.role)
              return (
                <div key={u.userId} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',borderBottom:i<filtered.length-1?'1px solid var(--border)':'none',cursor:'pointer'}} onClick={()=>router.push(`/admin/users/${u.userId}`)}>
                  <div style={{width:38,height:38,borderRadius:'50%',background:av.bg,color:av.color,fontSize:14,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{getInitials(u.fullName)}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <span style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>{u.fullName}</span>
                      <span style={{width:14,height:14,color:'var(--text4)',display:'flex'}}>{I.checkC}</span>
                    </div>
                    <div style={{fontSize:12,color:'var(--text3)',marginTop:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.email}</div>
                    <div style={{display:'flex',gap:5,marginTop:4}}>
                      <span className={`badge ${u.role==='Driver'?'badge-blue':u.role==='Admin'?'badge-amber':'badge-gray'}`}>{u.role}</span>
                      <span className="badge badge-green">{u.status}</span>
                      {u.isVerified && <span className="badge badge-green">Verified</span>}
                    </div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:3,fontSize:12,color:'#F59E0B'}}>
                      <span style={{width:12,height:12,display:'flex'}}>{I.starF}</span>{u.averageRating||'—'}
                    </div>
                    <button style={{background:'none',border:'none',cursor:'pointer',color:'var(--text3)',width:16,height:16,display:'flex'}}>{I.eye}</button>
                    <button style={{background:'none',border:'none',cursor:'pointer',color:'var(--text3)',width:16,height:16,display:'flex'}}>{I.more}</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
