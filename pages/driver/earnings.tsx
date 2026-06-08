import { useState, useEffect } from 'react'
import Layout, { I } from '../../components/layout/Layout'
import { userAPI, notifAPI } from '../../services/api'

// Since backend earnings endpoint is /api/users/stats, we pull from there
export default function Earnings() {
  const [profile,      setProfile]      = useState<any>(null)
  const [stats,        setStats]        = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [period,       setPeriod]       = useState('This Week')
  const [unread,       setUnread]       = useState(0)
  const [loading,      setLoading]      = useState(true)
  const [realEarnings, setRealEarnings] = useState(0)

  useEffect(() => {
    // Calculate real earnings from localStorage (client-side only)
    if (typeof window !== 'undefined') {
      const localLog = JSON.parse(localStorage.getItem('otw_earnings_log') || '[]')
      const totalEarnings = localLog.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0)
      setRealEarnings(totalEarnings)
    }

    Promise.allSettled([
      userAPI.getMe(),
      userAPI.getStats(),
      notifAPI.getUnreadCount(),
    ]).then(([p, s, n]) => {
      if (p.status === 'fulfilled') setProfile(p.value.data)

      // Use real earnings from localStorage
      const localLog = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('otw_earnings_log') || '[]') : []
      const totalEarnings = localLog.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0)

      if (s.status === 'fulfilled') {
        // Use API stats but override earnings with real calculated value
        setStats({ ...s.value.data, earnings: totalEarnings })
        const apiTx = s.value.data?.recentTransactions || []
        const merged = [
          ...localLog.map((e: any, i: number) => ({
            id: e.id || i,
            label: `${e.label} · ${e.passenger}`,
            time: new Date(e.time).toLocaleString('en', { weekday:'short', hour:'2-digit', minute:'2-digit' }),
            amount: `+$${Number(e.amount).toFixed(2)}`,
            type: 'earn',
          })),
          ...apiTx,
        ]
        setTransactions(merged)
      } else {
        // No API data - use localStorage only
        setStats({ totalRides: localLog.length, thisWeek: localLog.length, earnings: totalEarnings, growth: 0 })
        const merged = localLog.map((e: any, i: number) => ({
          id: e.id || i,
          label: `${e.label} · ${e.passenger}`,
          time: new Date(e.time).toLocaleString('en', { weekday:'short', hour:'2-digit', minute:'2-digit' }),
          amount: `+$${Number(e.amount).toFixed(2)}`,
          type: 'earn',
        }))
        setTransactions(merged)
      }
      if (n.status === 'fulfilled') setUnread(n.value.data?.count || 0)
      setLoading(false)
    })
  }, [])

  const initials = profile?.fullName?.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase() || 'SM'
  const periodStats: Record<string,{earned:string,rides:number,growth:string}> = {
    'This Week':  { earned: `${realEarnings.toFixed(2)}`, rides: stats?.thisWeek||0,  growth: `+${stats?.growth||0}%` },
    'This Month': { earned: `${realEarnings.toFixed(2)}`, rides: stats?.thisWeek||0, growth: `+${stats?.growth||0}%` },
    'This Year':  { earned: `${realEarnings.toFixed(2)}`, rides: stats?.totalRides||0, growth: `+${stats?.growth||0}%` },
  }
  const cur = periodStats[period]

  return (
    <Layout role="Driver" userInitials={initials} unreadCount={unread}>
      <div className="page-inner">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
          <div>
            <h1 style={{fontSize:22,fontWeight:700,color:'var(--text)'}}>Earnings</h1>
            <p style={{fontSize:13,color:'var(--text3)',marginTop:2}}>Track your income</p>
          </div>
          <button className="btn btn-secondary btn-sm" style={{display:'flex',alignItems:'center',gap:5}}>
            <span style={{width:13,height:13,display:'flex'}}>{I.download}</span> Export
          </button>
        </div>

        {/* Big gradient card */}
        <div className="card" style={{background:'linear-gradient(135deg,var(--blue) 0%,#1e3a8a 100%)',border:'none',marginBottom:12,color:'white'}}>
          <div style={{fontSize:34,fontWeight:800,marginBottom:4}}>${realEarnings.toFixed(2)}</div>
          <div style={{fontSize:13,color:'rgba(255,255,255,0.75)'}}>Total earned (confirmed bookings)</div>
          <div style={{height:4,background:'rgba(255,255,255,0.2)',borderRadius:2,marginTop:16,overflow:'hidden'}}>
            <div style={{height:'100%',width:'68%',background:'rgba(255,255,255,0.6)',borderRadius:2}}/>
          </div>
        </div>

        {/* Period tabs */}
        <div style={{display:'flex',gap:0,background:'var(--bg2)',borderRadius:8,padding:3,marginBottom:14}}>
          {['This Week','This Month','This Year'].map(p => (
            <button key={p} onClick={()=>setPeriod(p)} style={{flex:1,padding:'7px 0',border:'none',borderRadius:6,background:period===p?'var(--bg-card)':'transparent',fontWeight:period===p?600:400,fontSize:12,color:period===p?'var(--text)':'var(--text3)',cursor:'pointer',boxShadow:period===p?'var(--shadow-sm)':'none',transition:'all .15s'}}>{p}</button>
          ))}
        </div>

        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
          {[{val:`$${cur.earned}`,label:'Total Earned'},{val:cur.rides,label:'Rides'},{val:cur.growth,label:'Growth',green:true}].map((s,i) => (
            <div key={i} className="stat-card" style={{textAlign:'center'}}>
              <div style={{fontSize:18,fontWeight:700,color:i===2?'var(--green)':'var(--text)'}}>{s.val}</div>
              <div className="stat-label" style={{textAlign:'center'}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Transactions */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
          <div style={{fontSize:15,fontWeight:600,color:'var(--text)'}}>Recent Transactions</div>
          <button style={{background:'none',border:'none',cursor:'pointer',fontSize:13,color:'var(--blue)',fontWeight:500,display:'flex',alignItems:'center',gap:4}}>View All <span style={{width:12,height:12,display:'flex',transform:'rotate(180deg)'}}>{I.back}</span></button>
        </div>
        {loading ? (
          <div style={{textAlign:'center',padding:'24px',color:'var(--text3)',fontSize:13}}>Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <div className="card" style={{textAlign:'center',padding:'32px'}}>
            <div style={{fontSize:13,color:'var(--text3)'}}>No earnings yet. Accept confirmed bookings to earn!</div>
          </div>
        ) : (
          <div className="card" style={{padding:0,overflow:'hidden',marginBottom:12}}>
            {transactions.map((t,i) => (
              <div key={t.id} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',borderBottom:i<transactions.length-1?'1px solid var(--border)':'none'}}>
                <div style={{width:34,height:34,borderRadius:8,background:t.type==='transfer'?'#FEF3E2':'var(--green-l)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <span style={{width:16,height:16,color:t.type==='transfer'?'var(--amber)':'var(--green)',display:'flex'}}>{t.type==='transfer'?I.dollar:I.nav}</span>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:500,color:'var(--text)'}}>{t.label}</div>
                  <div style={{fontSize:12,color:'var(--text3)',marginTop:1}}>{t.time}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:14,fontWeight:700,color:t.type==='transfer'?'var(--amber)':'var(--green)'}}>{t.amount}</div>
                  {t.passengers>0 && <div style={{fontSize:11,color:'var(--text3)',marginTop:1}}>{t.passengers} passengers</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bank account */}
        <div className="card" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <span style={{width:20,height:20,color:'var(--text3)',display:'flex'}}>{I.id}</span>
            <div>
              <div style={{fontSize:13,fontWeight:500,color:'var(--text)'}}>Maybank</div>
              <div style={{fontSize:12,color:'var(--text3)'}}>{profile?.bankAccount || '****1234'}</div>
            </div>
          </div>
          <button style={{background:'none',border:'none',cursor:'pointer',fontSize:13,color:'var(--blue)',fontWeight:500}}>Change</button>
        </div>
      </div>
    </Layout>
  )
}
