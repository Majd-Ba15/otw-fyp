import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Layout, { I } from '../../components/layout/Layout'
import { adminAPI, userAPI, notifAPI } from '../../services/api'
import Cookies from 'js-cookie'
import { jwtDecode } from 'jwt-decode'

export default function AdminDashboard() {
  const router  = useRouter()
  const [profile,  setProfile]  = useState<any>(null)
  const [stats,    setStats]    = useState({ totalUsers:0, activeRides:0, pendingVerifs:0, openReports:0, totalRides:0, totalBookings:0 })
  const [activity, setActivity] = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)
  const [unread,   setUnread]   = useState(0)

  useEffect(() => {
    const token = Cookies.get('otw_token')
    if (!token) { router.push('/auth/login'); return }
    try { const d:any=jwtDecode(token); if(d.role!=='Admin'){router.push('/auth/login');return} } catch { router.push('/auth/login'); return }

    Promise.allSettled([
      userAPI.getMe(),
      adminAPI.getStats(),
      adminAPI.getActivity(),
      notifAPI.getUnreadCount(),
    ]).then(([p, s, a, n]) => {
      if (p.status === 'fulfilled') setProfile(p.value.data)
      if (s.status === 'fulfilled') setStats(s.value.data)
      else setStats({ totalUsers:5, activeRides:0, pendingVerifs:2, openReports:1, totalRides:1256, totalBookings:2341 })
      if (a.status === 'fulfilled') {
        const raw = a.value.data
        const userItems = (raw.users || []).map((u: any) => ({
          icon: 'user', color: '#3B82F6', bg: '#EFF6FF',
          text: `New ${u.type || 'user'}: ${u.fullName}`,
          time: u.createdAt,
        }))
        const rideItems = (raw.rides || []).map((r: any) => ({
          icon: 'car', color: '#10B981', bg: '#ECFDF5',
          text: `New ride: ${r.fromLocation} → ${r.toLocation}`,
          time: r.createdAt,
        }))
        const all = [...userItems, ...rideItems].sort((x, y) => new Date(y.time).getTime() - new Date(x.time).getTime())
        setActivity(all.slice(0, 8))
      } else setActivity([
        { icon:'user',  color:'#3B82F6', bg:'#EFF6FF', text:'New driver registration: Ahmad Karim',     time:'5 mins ago' },
        { icon:'car',   color:'#10B981', bg:'#ECFDF5', text:'Ride completed: UTM → Larkin',              time:'12 mins ago' },
        { icon:'alert', color:'#EF4444', bg:'#FEE2E2', text:'New report submitted',                      time:'25 mins ago' },
        { icon:'check', color:'#10B981', bg:'#ECFDF5', text:'Driver verification approved: Nurul Huda', time:'1 hour ago' },
        { icon:'x',     color:'#F59E0B', bg:'#FEF3E2', text:'Ride cancelled by driver',                  time:'2 hours ago' },
      ])
      if (n.status === 'fulfilled') setUnread(n.value.data?.count || 0)
      setLoading(false)
    })
  }, [])

  const initials = profile?.fullName?.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase() || 'AD'
  const iconMap:Record<string,any> = { user:I.user, car:I.car, alert:I.alert, check:I.check, x:I.x, users:I.users }
  const fmtTime = (t: string) => {
    if (!t) return ''
    if (!t.includes('T') && !t.includes('-')) return t
    const diff = Date.now() - new Date(t).getTime()
    if (diff < 3600000)  return `${Math.round(diff/60000)} min ago`
    if (diff < 86400000) return `${Math.round(diff/3600000)} hours ago`
    return `${Math.round(diff/86400000)} days ago`
  }

  return (
    <Layout role="Admin" userInitials={initials} userName={profile?.fullName} unreadCount={unread}>
      <div className="page-inner">
        <h1 style={{fontSize:22,fontWeight:700,color:'var(--text)',marginBottom:2}}>Admin Dashboard</h1>
        <p style={{fontSize:13,color:'var(--text3)',marginBottom:20}}>Welcome back, Administrator</p>

        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:14}}>
          {[
            {icon:I.users,  bg:'#EFF6FF',color:'#3B82F6',val:stats.totalUsers,    label:'Total Users',      badge:'+12%'},
            {icon:I.shield, bg:'#FEF3E2',color:'#F59E0B',val:stats.pendingVerifs, label:'Pending Verifs',   badge:'Review'},
            {icon:I.car,    bg:'#ECFDF5',color:'#10B981',val:stats.activeRides,   label:'Active Rides',     badge:'Live'},
            {icon:I.alert,  bg:'#FEE2E2',color:'#EF4444',val:stats.openReports,   label:'Open Reports',     badge:'New'},
          ].map((s,i)=>(
            <div key={i} className="stat-card">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                <div style={{width:32,height:32,borderRadius:8,background:s.bg,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <span style={{width:17,height:17,color:s.color,display:'flex'}}>{s.icon}</span>
                </div>
                <span style={{fontSize:10,fontWeight:600,color:'var(--green)'}}>{s.badge}</span>
              </div>
              <div style={{fontSize:22,fontWeight:700,color:'var(--text)'}}>{s.val}</div>
              <div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16}}>
          {[
            {icon:I.users,  label:'Verifications', href:'/admin/verifications'},
            {icon:I.car,    label:'All Rides',     href:'/admin/rides'},
            {icon:I.alert,  label:'Reports',       href:'/admin/reports'},
            {icon:I.chart,  label:'Analytics',     href:'/admin/analytics'},
          ].map(q=>(
            <Link key={q.label} href={q.href} style={{textDecoration:'none'}}>
              <div className="card" style={{textAlign:'center',padding:'16px 8px',margin:0,cursor:'pointer'}}>
                <span style={{width:24,height:24,color:'var(--text3)',display:'flex',margin:'0 auto 8px'}}>{q.icon}</span>
                <div style={{fontSize:12,color:'var(--text2)'}}>{q.label}</div>
              </div>
            </Link>
          ))}
        </div>

        <div className="card" style={{marginBottom:14}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
            <span style={{width:16,height:16,color:'var(--amber)',display:'flex'}}>{I.dollar}</span>
            <div style={{fontSize:15,fontWeight:600,color:'var(--text)'}}>Platform Overview</div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
            {[{val:stats.totalRides.toLocaleString(),label:'Total Rides'},{val:stats.totalBookings.toLocaleString(),label:'Total Bookings'},{val:stats.pendingVerifs,label:'Pending Verifs'}].map((s,i)=>(
              <div key={i} className="stat-card" style={{textAlign:'center',boxShadow:'none'}}>
                <div style={{fontSize:20,fontWeight:700,color:'var(--text)'}}>{s.val}</div>
                <div className="stat-label" style={{textAlign:'center'}}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
          <div style={{fontSize:15,fontWeight:600,color:'var(--text)'}}>Recent Activity</div>
          <button style={{background:'none',border:'none',cursor:'pointer',fontSize:13,color:'var(--amber)',fontWeight:500,display:'flex',alignItems:'center',gap:4}}>View All <span style={{width:12,height:12,display:'flex'}}>{I.back}</span></button>
        </div>
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          {activity.map((a:any,i:number)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderBottom:i<activity.length-1?'1px solid var(--border)':'none'}}>
              <div style={{width:32,height:32,borderRadius:8,background:a.bg||'var(--bg2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <span style={{width:15,height:15,color:a.color||'var(--text3)',display:'flex'}}>{iconMap[a.icon]||I.info}</span>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,color:'var(--text)'}}>{a.text||a.description}</div>
                <div style={{fontSize:11,color:'var(--text3)',marginTop:1}}>{fmtTime(a.time||a.createdAt)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
}
