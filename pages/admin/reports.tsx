import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout, { I } from '../../components/layout/Layout'
import { adminAPI, userAPI, notifAPI } from '../../services/api'

const LOCAL_REPORTS_KEY = 'otw_local_reports'

export default function Reports() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [unread,  setUnread]  = useState(0)
  const [filter,  setFilter]  = useState('all')
  const [search,  setSearch]  = useState('')

  useEffect(() => {
    Promise.allSettled([
      userAPI.getMe(),
      adminAPI.getReports(),
      notifAPI.getUnreadCount(),
    ]).then(([p, r, n]) => {
      if (p.status === 'fulfilled') setProfile(p.value.data)
      let localReports: any[] = []
      try { localReports = JSON.parse(localStorage.getItem(LOCAL_REPORTS_KEY) || '[]') } catch {}
      const backendReports = r.status === 'fulfilled' ? (r.value.data || []) : []
      const backendIds = new Set(backendReports.map((item: any) => String(item.reportId || item.id)))
      setReports([...localReports.filter(item => !backendIds.has(String(item.reportId || item.id))), ...backendReports])
      if (n.status === 'fulfilled') setUnread(n.value.data?.count || 0)
      setLoading(false)
    })
  }, [])

  const initials    = profile?.fullName?.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase() || 'AD'
  const statusBadge = (s:string) => s==='open'?'badge-red':s==='investigating'?'badge-amber':'badge-green'

  const filtered = reports.filter(r => {
    const status = (r.status || 'open').toLowerCase()
    if (filter !== 'all' && status !== filter) return false
    const q = search.toLowerCase()
    if (q && !(r.title||r.description||'').toLowerCase().includes(q) && !(r.filedBy||r.reporterName||r.reporter?.fullName||'').toLowerCase().includes(q)) return false
    return true
  })

  const counts = {
    all:           reports.length,
    open:          reports.filter(r => (r.status || 'open').toLowerCase() === 'open').length,
    investigating: reports.filter(r => (r.status || '').toLowerCase() === 'investigating').length,
    resolved:      reports.filter(r => (r.status || '').toLowerCase() === 'resolved').length,
  }

  return (
    <Layout role="Admin" userInitials={initials} unreadCount={unread}>
      <div className="page-inner">
        <h1 style={{fontSize:22,fontWeight:700,color:'var(--text)',marginBottom:4}}>
          Reports
          {counts.open > 0 && <span className="badge badge-red" style={{marginLeft:10,verticalAlign:'middle'}}>{counts.open} open</span>}
        </h1>
        <p style={{fontSize:13,color:'var(--text3)',marginBottom:16}}>Review and resolve user-submitted reports</p>

        <div style={{position:'relative',marginBottom:12}}>
          <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',width:15,height:15,color:'var(--text3)',display:'flex'}}>{I.search}</span>
          <input className="input" style={{paddingLeft:34}} placeholder="Search by title or user..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>

        <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
          {(['all','open','investigating','resolved'] as const).map(val=>(
            <button key={val} className={`chip ${filter===val?'active':''}`} onClick={()=>setFilter(val)}>
              {val.charAt(0).toUpperCase()+val.slice(1)}
              {counts[val] > 0 && <span style={{marginLeft:4,opacity:.7}}>({counts[val]})</span>}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{textAlign:'center',padding:'40px',color:'var(--text3)',fontSize:13}}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="card" style={{textAlign:'center',padding:'48px'}}>
            <span style={{width:40,height:40,display:'flex',margin:'0 auto 12px',color:'var(--green)',opacity:.6}}>{I.checkC}</span>
            <div style={{fontSize:15,fontWeight:600,color:'var(--text)',marginBottom:4}}>
              {reports.length === 0 ? 'No reports yet' : 'No matching reports'}
            </div>
            <div style={{fontSize:13,color:'var(--text3)'}}>
              {reports.length === 0 ? 'User-submitted reports will appear here' : 'Try a different filter or search term'}
            </div>
          </div>
        ) : (
          <div className="card" style={{padding:0,overflow:'hidden'}}>
            {filtered.map((r,i)=>(
              <div
                key={r.reportId||r.id||i}
                style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',borderBottom:i<filtered.length-1?'1px solid var(--border)':'none',cursor:'pointer'}}
                onClick={()=>router.push(`/admin/reports/${r.reportId||r.id||i}`)}
              >
                <div style={{width:34,height:34,borderRadius:8,background:'var(--red-l)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <span style={{width:16,height:16,color:'var(--red)',display:'flex'}}>{I.alert}</span>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {r.title||r.description||'Report'}
                  </div>
                  <div style={{fontSize:12,color:'var(--text3)',marginTop:1}}>
                    #{r.reportId||r.id} · by {r.filedBy||r.reporterName||r.reporter?.fullName||'Unknown'} ·{' '}
                    {r.date||(r.createdAt ? new Date(r.createdAt).toLocaleDateString('en',{day:'numeric',month:'short'}) : '')}
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
                  <span className={`badge ${statusBadge((r.status || 'open').toLowerCase())}`}>{r.status || 'open'}</span>
                  <span style={{width:14,height:14,color:'var(--text3)',display:'flex'}}>{I.back}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
