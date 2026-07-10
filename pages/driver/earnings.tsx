import { useState, useEffect } from 'react'
import Layout, { I } from '../../components/layout/Layout'
import { userAPI, notifAPI } from '../../services/api'

// Earnings are computed by the backend from Confirmed + Completed bookings on
// this driver's rides (seats × price per seat) — no static numbers.
export default function Earnings() {
  const [profile, setProfile] = useState<any>(null)
  const [stats,   setStats]   = useState<any>(null)
  const [unread,  setUnread]  = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([
      userAPI.getMe(),
      userAPI.getStats(),
      notifAPI.getUnreadCount(),
    ]).then(([p, s, n]) => {
      if (p.status === 'fulfilled') setProfile(p.value.data)
      if (s.status === 'fulfilled') setStats(s.value.data)
      if (n.status === 'fulfilled') setUnread(n.value.data?.count || 0)
      setLoading(false)
    })
  }, [])

  const initials     = profile?.fullName?.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase() || 'SM'
  const paidStatuses = ['Confirmed', 'Completed']
  const transactions = (stats?.transactions || []).filter((t: any) => paidStatuses.includes(t.status))
  const transactionTotal = transactions.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0)
  const transactionWeek = transactions
    .filter((t: any) => {
      const time = new Date(t.time).getTime()
      return time && !Number.isNaN(time) && Date.now() - time <= 7 * 24 * 60 * 60 * 1000
    })
    .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0)
  const total        = transactions.length ? transactionTotal : Number(stats?.earnings || 0)
  const week         = transactions.length ? transactionWeek : Number(stats?.weekEarnings || 0)

  const fmtTime = (iso: string) => {
    try { return new Date(iso).toLocaleString('en', { weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) }
    catch { return '' }
  }

  return (
    <Layout role="Driver" userInitials={initials} unreadCount={unread}>
      <div className="page-inner">
        <div style={{marginBottom:16}}>
          <h1 style={{fontSize:22,fontWeight:700,color:'var(--text)'}}>Earnings</h1>
          <p style={{fontSize:13,color:'var(--text3)',marginTop:2}}>Cash received from confirmed bookings</p>
        </div>

        {/* Total earned */}
        <div className="card" style={{background:'linear-gradient(135deg,var(--blue) 0%,#1e3a8a 100%)',border:'none',marginBottom:12,color:'white'}}>
          <div style={{fontSize:34,fontWeight:800,marginBottom:4}}>${total.toFixed(2)}</div>
          <div style={{fontSize:13,color:'rgba(255,255,255,0.75)'}}>Total earned · confirmed & completed bookings</div>
        </div>

        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
          {[
            {val:`$${week.toFixed(2)}`,               label:'This week'},
            {val:stats?.totalRides ?? 0,              label:'Rides confirmed'},
            {val:transactions.length,                 label:'Confirmed bookings'},
          ].map((s,i) => (
            <div key={i} className="stat-card" style={{textAlign:'center'}}>
              <div style={{fontSize:18,fontWeight:700,color:'var(--text)'}}>{s.val}</div>
              <div className="stat-label" style={{textAlign:'center'}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Transactions */}
        <div style={{fontSize:15,fontWeight:600,color:'var(--text)',marginBottom:10}}>Recent bookings</div>
        {loading ? (
          <div style={{textAlign:'center',padding:'24px',color:'var(--text3)',fontSize:13}}>Loading...</div>
        ) : transactions.length === 0 ? (
          <div className="card" style={{textAlign:'center',padding:'32px'}}>
            <div style={{fontSize:13,color:'var(--text3)'}}>No earnings yet — accept booking requests on your rides to earn.</div>
          </div>
        ) : (
          <div className="card" style={{padding:0,overflow:'hidden',marginBottom:12}}>
            {transactions.map((t:any, i:number) => (
              <div key={t.bookingId} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',borderBottom:i<transactions.length-1?'1px solid var(--border)':'none'}}>
                <div style={{width:34,height:34,borderRadius:8,background:'var(--green-l)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <span style={{width:16,height:16,color:'var(--green)',display:'flex'}}>{I.nav}</span>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:500,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.label}</div>
                  <div style={{fontSize:12,color:'var(--text3)',marginTop:1}}>{t.passenger} · {t.seats} seat{t.seats>1?'s':''} · {fmtTime(t.time)}</div>
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{fontSize:14,fontWeight:700,color:'var(--green)'}}>+${Number(t.amount).toFixed(2)}</div>
                  <span className={`badge ${t.status==='Completed'?'badge-green':'badge-amber'}`} style={{fontSize:10,marginTop:2}}>{t.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
