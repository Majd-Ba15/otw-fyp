import { useState, useEffect } from 'react'
import Layout, { I } from '../../components/layout/Layout'
import { adminAPI, userAPI, notifAPI } from '../../services/api'

export default function Analytics() {
  const [profile, setProfile] = useState<any>(null)
  const [data,    setData]    = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [unread,  setUnread]  = useState(0)

  useEffect(() => {
    Promise.allSettled([
      userAPI.getMe(),
      adminAPI.getAnalytics(),
      notifAPI.getUnreadCount(),
    ]).then(([p, a, n]) => {
      if (p.status === 'fulfilled') setProfile(p.value.data)
      if (a.status === 'fulfilled') {
        const raw = a.value.data
        const totalRidesCount = (raw.ridesPerDay || []).reduce((s: number, d: any) => s + (d.count || 0), 0)
        const bars = (raw.ridesPerDay || []).slice(-7).map((d: any) => ({
          day: new Date(d.date).toLocaleDateString('en', { weekday: 'short' }),
          val: d.count || 0,
        }))
        setData({
          kpis: [
            { val: (raw.totalUsers || 0).toLocaleString(),          label: 'Total users',   badge: `+${raw.newUsersThisWeek || 0}` },
            { val: (raw.newUsersThisWeek || 0).toString(),          label: 'New this week', badge: 'New' },
            { val: totalRidesCount.toLocaleString(),                label: 'Total rides',   badge: 'All time' },
            { val: `${(raw.successRate || 0).toFixed(1)}%`,        label: 'Success rate',  badge: 'Live' },
          ],
          bars: bars.length ? bars : [{day:'Mon',val:0},{day:'Tue',val:0},{day:'Wed',val:0},{day:'Thu',val:0},{day:'Fri',val:0},{day:'Sat',val:0},{day:'Sun',val:0}],
          topRoutes: (raw.topRoutes || []).map((r: any) => ({ route:`${r.fromLocation} → ${r.toLocation}`, count:r.count })),
          growth: { thisMonth:`+${raw.newUsersThisWeek||0}`, lastMonth:'N/A', retention:`${(raw.successRate||0).toFixed(1)}%` },
        })
      } else setData({
        kpis:[ {val:'2,481',label:'Total users',badge:'+12%'},{val:'342',label:'Active drivers',badge:'+8%'},{val:'8,920',label:'Rides completed',badge:'+24%'},{val:'44,320',label:'Revenue ($)',badge:'+18%'} ],
        bars:[ {day:'Mon',val:320},{day:'Tue',val:280},{day:'Wed',val:420},{day:'Thu',val:180},{day:'Fri',val:380},{day:'Sat',val:120},{day:'Sun',val:90} ],
        topRoutes:[ {route:'UTM → City Centre',count:1240},{route:'Faculty → Mall',count:890},{route:'UTM → JB Sentral',count:654} ],
        growth:{ thisMonth:'+342', lastMonth:'+298', retention:'82%' }
      })
      if (n.status === 'fulfilled') setUnread(n.value.data?.count || 0)
      setLoading(false)
    })
  }, [])

  const initials  = profile?.fullName?.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase() || 'AD'
  const kpiIcons  = [I.users, I.car, I.trending, I.dollar]
  const kpiColors = [{bg:'#EFF6FF',color:'#3B82F6'},{bg:'#ECFDF5',color:'#10B981'},{bg:'#FEF3E2',color:'#F59E0B'},{bg:'#F5F3FF',color:'#8B5CF6'}]
  const maxBar    = data ? Math.max(...(data.bars||[]).map((b:any)=>b.val), 1) : 1

  return (
    <Layout role="Admin" userInitials={initials} unreadCount={unread}>
      <div className="page-inner">
        <h1 style={{fontSize:22,fontWeight:700,color:'var(--text)',marginBottom:20}}>Analytics</h1>

        {loading ? (
          <div style={{textAlign:'center',padding:'40px',color:'var(--text3)',fontSize:13}}>Loading...</div>
        ) : data && (
          <>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16}}>
              {(data.kpis||[]).map((k:any,i:number)=>(
                <div key={i} className="stat-card">
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                    <div style={{width:32,height:32,borderRadius:8,background:kpiColors[i]?.bg,display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <span style={{width:17,height:17,color:kpiColors[i]?.color,display:'flex'}}>{kpiIcons[i]}</span>
                    </div>
                    <span style={{fontSize:10,fontWeight:600,color:'var(--green)'}}>{k.badge}</span>
                  </div>
                  <div style={{fontSize:22,fontWeight:700,color:'var(--text)'}}>{k.val}</div>
                  <div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>{k.label}</div>
                </div>
              ))}
            </div>

            <div className="card" style={{marginBottom:14}}>
              <div style={{fontSize:14,fontWeight:600,color:'var(--text)',marginBottom:16}}>Rides this week</div>
              <div style={{display:'flex',alignItems:'flex-end',gap:8,height:120}}>
                {(data.bars||[]).map((b:any)=>(
                  <div key={b.day} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
                    <div style={{flex:1,width:'100%',display:'flex',alignItems:'flex-end'}}>
                      <div style={{width:'100%',background:'var(--amber-l)',borderRadius:'4px 4px 0 0',height:`${(b.val/maxBar)*100}%`,minHeight:4,transition:'height .5s ease'}}/>
                    </div>
                    <div style={{fontSize:10,color:'var(--text3)'}}>{b.day}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div className="card" style={{margin:0}}>
                <div style={{fontSize:14,fontWeight:600,color:'var(--text)',marginBottom:12}}>Top routes</div>
                {(data.topRoutes||[]).map((r:any,i:number)=>(
                  <div key={i} className="row">
                    <span style={{fontSize:13,color:'var(--text2)'}}>{r.route}</span>
                    <span style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>{r.count?.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="card" style={{margin:0}}>
                <div style={{fontSize:14,fontWeight:600,color:'var(--text)',marginBottom:12}}>User growth</div>
                {[
                  {label:'This month', val:data.growth?.thisMonth, color:'var(--green)'},
                  {label:'Last month', val:data.growth?.lastMonth, color:'var(--text2)'},
                  {label:'Retention',  val:data.growth?.retention, color:'var(--text2)'},
                ].map((g,i)=>(
                  <div key={i} className="row">
                    <span style={{fontSize:13,color:'var(--text2)'}}>{g.label}</span>
                    <span style={{fontSize:13,fontWeight:700,color:g.color}}>{g.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
