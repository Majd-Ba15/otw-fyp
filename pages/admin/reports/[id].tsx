import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout, { I } from '../../../components/layout/Layout'
import { adminAPI, userAPI, notifAPI } from '../../../services/api'
import toast from 'react-hot-toast'

const LOCAL_REPORTS_KEY = 'otw_local_reports'

export default function ReportDetail() {
  const router = useRouter()
  const { id } = router.query
  const [profile, setProfile] = useState<any>(null)
  const [report,  setReport]  = useState<any>(null)
  const [note,    setNote]    = useState('')
  const [loading, setLoading] = useState(true)
  const [unread,  setUnread]  = useState(0)
  const [error,   setError]   = useState(false)
  const [ai,      setAi]      = useState<any>(null)
  const [aiLoading, setAiLoading] = useState(false)

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
        const parsedReport = {
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
          // Id of the reported user — needed so Warn/Suspend/Ban can act on the
          // real account, not just mark the report resolved.
          reportedUserId: raw.report?.reportedUser ?? raw.reported?.userId ?? raw.reportedUser ?? null,
        }
        setReport(parsedReport)
        loadAiSummary(parsedReport)
      } else {
        let localReport = null
        try {
          const localReports = JSON.parse(localStorage.getItem(LOCAL_REPORTS_KEY) || '[]')
          localReport = localReports.find((item: any) => String(item.reportId || item.id) === String(id))
        } catch {}
        if (localReport) {
          setReport({
            reportId:  localReport.reportId || localReport.id || id,
            title:     localReport.title || localReport.description || 'Report',
            status:    localReport.status || 'open',
            filedBy:   localReport.filedBy || localReport.reporterName || 'Unknown',
            against:   localReport.against || localReport.reportedName || 'Unknown',
            ride:      localReport.ride || null,
            filedAt:   localReport.filedAt || localReport.createdAt,
            statement: localReport.statement || localReport.description || '',
            reporter:  { fullName: localReport.filedBy || localReport.reporterName || 'Unknown', totalRides: '—', averageRating: '—', reportCount: 0 },
            reported:  { fullName: localReport.against || localReport.reportedName || 'Unknown', totalRides: '—', averageRating: '—', reportCount: 1 },
          })
          loadAiSummary(localReport)
        } else {
          setError(true)
        }
      }
      if (n.status === 'fulfilled') setUnread(n.value.data?.count || 0)
      setLoading(false)
    })
  }, [id])

  // Label recorded on the report (backend stores it as ActionTaken).
  const ACTION_LABELS: Record<string, string> = {
    no_action: 'No action',
    warning:   'Warning issued',
    suspend:   'User suspended',
    ban:       'User banned',
  }

  const resolve = async (action: string) => {
    const reportId = Number(id)
    const targetUserId = report?.reportedUserId
    // Warn/Suspend/Ban act on a real account. Block them for reports not linked
    // to a backend user (e.g. locally-stored reports) so nothing silently no-ops.
    if (action !== 'no_action' && !targetUserId) {
      toast.error('This report is not linked to a user account, so this action cannot be applied.')
      return
    }
    // Confirm destructive actions before touching the account.
    if ((action === 'suspend' || action === 'ban') &&
        !window.confirm(`${action === 'ban' ? 'Ban' : 'Suspend'} ${report?.against || 'this user'}? This ${action === 'ban' ? 'blocks and unverifies' : 'deactivates'} their account.`)) {
      return
    }
    try {
      // 1) Apply the moderation action to the reported user.
      if (action === 'warning')      await adminAPI.warn(targetUserId, { note: note?.trim() || 'You have received a warning following a report about your conduct on OTW.' })
      else if (action === 'suspend') await adminAPI.suspend(targetUserId)
      else if (action === 'ban')     await adminAPI.ban(targetUserId)
      // 2) Close the report and record which action was taken.
      await adminAPI.resolveReport(reportId, { note, reason: ACTION_LABELS[action] || action })
      toast.success(action === 'no_action' ? 'Report resolved' : `${ACTION_LABELS[action]} — report resolved`)
      router.push('/admin/reports')
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to apply action')
    }
  }

  const initials = profile?.fullName?.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase() || 'AD'

  const loadAiSummary = async (reportData: any) => {
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai/report-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: reportData.title,
          statement: reportData.statement || reportData.description,
          filedBy: reportData.filedBy || reportData.reporterName,
          against: reportData.against || reportData.reportedName,
        }),
      })
      setAi(await res.json())
    } catch {
      setAi(null)
    } finally {
      setAiLoading(false)
    }
  }

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

            <div className="card" style={{ marginBottom:12, border:'1px solid var(--blue)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <span style={{ width:16, height:16, color:'var(--blue)', display:'flex' }}>{I.robot}</span>
                <div style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>AI report summary</div>
                {aiLoading && <span style={{ fontSize:12, color:'var(--text3)', marginLeft:'auto' }}>Thinking...</span>}
              </div>
              {ai ? (
                <>
                  <div style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6, marginBottom:8 }}>{ai.summary}</div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                    <span className={`badge ${ai.priority === 'High' ? 'badge-red' : ai.priority === 'Medium' ? 'badge-amber' : 'badge-green'}`}>{ai.priority} priority</span>
                    <span style={{ fontSize:12, color:'var(--text3)' }}>{ai.suggestedAction}</span>
                  </div>
                </>
              ) : (
                <div style={{ fontSize:13, color:'var(--text3)' }}>AI summary will appear here.</div>
              )}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              {[{label:'Reporter',data:report.reporter},{label:'Reported',data:report.reported}].map(({label,data}) => (
                <div key={label} className="card" style={{ margin:0 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:.06, marginBottom:8 }}>{label}</div>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', marginBottom:4 }}>{data?.fullName || '—'}</div>
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
