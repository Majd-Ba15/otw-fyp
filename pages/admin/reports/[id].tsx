import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout, { I } from '../../../components/layout/Layout'
import { adminAPI, userAPI, notifAPI } from '../../../services/api'
import toast from 'react-hot-toast'

export default function ReportDetail() {
  const router = useRouter()
  const { id } = router.query
  const [profile, setProfile] = useState<any>(null)
  const [report,  setReport]  = useState<any>(null)
  const [note,    setNote]    = useState('')
  const [loading, setLoading] = useState(true)
  const [unread,  setUnread]  = useState(0)
  const [error,   setError]   = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.allSettled([
      userAPI.getMe(),
      adminAPI.getReport(Number(id)),
      notifAPI.getUnreadCount(),
    ]).then(([p, r, n]) => {
      if (p.status === 'fulfilled') setProfile(p.value.data)
      if (r.status === 'fulfilled') {
        const raw = r.value.data
        setReport({
          reportId:  raw.reportId || raw.id || id,
          title:     raw.title || raw.description || 'Report',
          status:    raw.status || 'open',
          filedBy:   raw.filedBy || raw.reporterName || raw.reporter?.fullName || 'Unknown',
          against:   raw.against || raw.reportedName || raw.reported?.fullName || 'Unknown',
          ride:      raw.ride || (raw.fromLocation && raw.toLocation ? `${raw.fromLocation} → ${raw.toLocation}` : null),
          filedAt:   raw.filedAt || raw.createdAt,
          statement: raw.statement || raw.description || raw.body || '',
          reporter:  raw.reporter  || { fullName: raw.reporterName, totalRides: raw.reporterRides, averageRating: raw.reporterRating, reportCount: raw.reporterReportCount || 0 },
          reported:  raw.reported  || { fullName: raw.reportedName, totalRides: raw.reportedRides, averageRating: raw.reportedRating, reportCount: raw.reportedReportCount || 0 },
        })
      } else {
        setError(true)
      }
      if (n.status === 'fulfilled') setUnread(n.value.data?.count || 0)
      setLoading(false)
    })
  }, [id])

  const resolve = async (action: string) => {
    try {
      await adminAPI.resolveReport(Number(id), { action, note })
      toast.success(`Action "${action}" applied`)
      router.push('/admin/reports')
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed to resolve report') }
  }

  const initials = profile?.fullName?.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase() || 'AD'

  const fmtDate = (v: string) => {
    if (!v) return ''
    try { return new Date(v).toLocaleDateString('en', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) } catch { return v }
  }

  return (
    <Layout role="Admin" showBack userInitials={initials} unreadCount={unread}>
      <div className="page-inner" style={{ maxWidth: 700 }}>
        {loading ? (
          <div style={{ textAlign:'center', padding:'40px', color:'var(--text3)', fontSize:13 }}>Loading...</div>
        ) : error ? (
          <div className="card" style={{ textAlign:'center', padding:'48px' }}>
            <span style={{ width:40, height:40, display:'flex', margin:'0 auto 12px', color:'var(--red)', opacity:.6 }}>{I.alert}</span>
            <div style={{ fontSize:15, fontWeight:600, color:'var(--text)', marginBottom:4 }}>Report not found</div>
            <div style={{ fontSize:13, color:'var(--text3)', marginBottom:16 }}>This report may have been deleted or does not exist.</div>
            <button className="btn btn-secondary btn-sm" onClick={() => router.push('/admin/reports')}>Back to reports</button>
          </div>
        ) : report && (
          <>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h1 style={{ fontSize:20, fontWeight:700, color:'var(--text)' }}>{report.title}</h1>
              <span className={`badge ${report.status==='open'?'badge-red':report.status==='investigating'?'badge-amber':'badge-green'}`}>{report.status}</span>
            </div>

            <div className="card" style={{ marginBottom:12 }}>
              {([
                ['Filed by', report.filedBy],
                ['Against',  report.against],
                report.ride ? ['Ride', report.ride] : null,
                ['Filed at', fmtDate(report.filedAt)],
              ] as [string,string][]).filter(Boolean).map(([k,v]) => (
                <div key={k} className="row">
                  <span style={{ fontSize:13, color:'var(--text3)', minWidth:80 }}>{k}</span>
                  <span style={{ fontSize:13, color:'var(--text)', fontWeight:500, textAlign:'right' }}>{v}</span>
                </div>
              ))}
            </div>

            {report.statement && (
              <div className="card" style={{ marginBottom:12 }}>
                <div style={{ fontSize:14, fontWeight:600, color:'var(--text)', marginBottom:10 }}>Statement</div>
                <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.7 }}>{report.statement}</p>
              </div>
            )}

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              {[{label:'Reporter',data:report.reporter},{label:'Reported',data:report.reported}].map(({label,data}) => (
                <div key={label} className="card" style={{ margin:0 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:.06, marginBottom:8 }}>{label}</div>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', marginBottom:4 }}>{data?.fullName || '—'}</div>
                  <div style={{ fontSize:12, color:'var(--text3)' }}>{data?.totalRides ?? '—'} rides · {data?.averageRating ?? '—'}★</div>
                  <div style={{ fontSize:12, color:data?.reportCount>0?'var(--red)':'var(--green)', marginTop:2 }}>{data?.reportCount||0} previous report{data?.reportCount!==1?'s':''}</div>
                </div>
              ))}
            </div>

            <div className="card" style={{ marginBottom:14 }}>
              <div style={{ fontSize:14, fontWeight:600, color:'var(--text)', marginBottom:8 }}>Admin note (internal)</div>
              <textarea className="input" rows={3} placeholder="Add your notes about this report..." value={note} onChange={e => setNote(e.target.value)} />
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
              <button className="btn btn-secondary" onClick={() => resolve('no_action')}>No action</button>
              <button className="btn btn-ghost" style={{ borderColor:'var(--amber)', color:'var(--amber)' }} onClick={() => resolve('warning')}>Warning</button>
              <button className="btn btn-ghost-blue" onClick={() => resolve('suspend')}>Suspend</button>
              <button className="btn btn-danger" onClick={() => resolve('ban')}>Ban user</button>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
