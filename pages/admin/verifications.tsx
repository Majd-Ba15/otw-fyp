import { useState, useEffect } from 'react'
import Layout, { I } from '../../components/layout/Layout'
import { adminAPI, userAPI, notifAPI } from '../../services/api'
import toast from 'react-hot-toast'

export default function Verifications() {
  const [profile,      setProfile]      = useState<any>(null)
  const [pending,      setPending]      = useState<any[]>([])
  const [loading,      setLoading]      = useState(true)
  const [unread,       setUnread]       = useState(0)
  const [actionId,     setActionId]     = useState<number|null>(null)
  const [rejectTarget, setRejectTarget] = useState<any>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejecting,    setRejecting]    = useState(false)

  const load = () => {
    Promise.allSettled([
      userAPI.getMe(),
      adminAPI.getPending(),
      notifAPI.getUnreadCount(),
    ]).then(([p, v, n]) => {
      if (p.status === 'fulfilled') setProfile(p.value.data)
      // Only show real data from API - no mock data fallback
      if (v.status === 'fulfilled') {
        // Handle both array and object response formats
        const data = v.value.data
        const pendingList = Array.isArray(data) ? data : (data?.pending || [])
        setPending(pendingList)
      } else {
        setPending([])
      }
      if (n.status === 'fulfilled') setUnread(n.value.data?.count || 0)
      setLoading(false)
    })
  }
  useEffect(() => { load() }, [])

  const fmtAgo = (iso: string) => {
    if (!iso) return ''
    const diff = Date.now() - new Date(iso).getTime()
    if (diff < 3600000)  return `${Math.round(diff/60000)} min ago`
    if (diff < 86400000) return `${Math.round(diff/3600000)} hours ago`
    return `${Math.round(diff/86400000)} days ago`
  }

  const approve = async (u: any) => {
    setActionId(u.userId)
    try {
      await adminAPI.approve(u.userId)
      setPending(p => p.filter(x => x.userId !== u.userId))
      toast.success(`${u.fullName} approved! Email sent to driver.`)
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to approve. Please try again.')
    } finally { setActionId(null) }
  }

  const openReject = (u: any) => {
    setRejectTarget(u)
    setRejectReason('')
  }

  const confirmReject = async () => {
    if (!rejectTarget) return
    if (!rejectReason.trim()) { toast.error('Please enter a rejection reason'); return }
    setRejecting(true)
    try {
      await adminAPI.reject(rejectTarget.userId, { reason: rejectReason.trim() })
      setPending(p => p.filter(x => x.userId !== rejectTarget.userId))
      toast.success(`${rejectTarget.fullName} rejected. Notification email sent.`)
      setRejectTarget(null)
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to reject. Please try again.')
    } finally { setRejecting(false) }
  }

  const viewDoc = (url: string | undefined, label: string) => {
    if (!url) { toast.error(`${label} not uploaded yet`); return }
    window.open(url, '_blank')
  }

  const initials    = profile?.fullName?.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase() || 'AD'
  const getInitials = (name:string) => name?.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase() || '??'

  return (
    <Layout role="Admin" userInitials={initials} unreadCount={unread}>
      <div className="page-inner">
        <h1 style={{fontSize:22,fontWeight:700,color:'var(--text)',marginBottom:4}}>
          Verifications
          {pending.length > 0 && <span className="badge badge-amber" style={{marginLeft:10,verticalAlign:'middle'}}>{pending.length} pending</span>}
        </h1>
        <p style={{fontSize:13,color:'var(--text3)',marginBottom:20}}>Review student ID and driving licence submissions</p>

        {loading ? (
          <div style={{textAlign:'center',padding:'40px',color:'var(--text3)',fontSize:13}}>Loading...</div>
        ) : pending.length === 0 ? (
          <div className="card" style={{textAlign:'center',padding:'48px'}}>
            <span style={{width:40,height:40,display:'flex',margin:'0 auto 12px',color:'var(--green)',opacity:.6}}>{I.checkC}</span>
            <div style={{fontSize:15,fontWeight:600,color:'var(--text)',marginBottom:4}}>All caught up!</div>
            <div style={{fontSize:13,color:'var(--text3)'}}>No pending verifications at the moment.</div>
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {pending.map(u => (
              <div key={u.userId} className="card" style={{marginBottom:0}}>

                {/* User info row */}
                <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
                  <div className="av" style={{background: u.role==='Driver' ? 'var(--blue-l)' : 'var(--green-l)', color: u.role==='Driver' ? 'var(--blue-d)' : 'var(--green-dd)'}}>
                    {getInitials(u.fullName)}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:700,color:'var(--text)'}}>{u.fullName}</div>
                    <div style={{fontSize:12,color:'var(--text3)'}}>{u.email}</div>
                    <div style={{fontSize:12,color:'var(--text3)',marginTop:2}}>
                      {u.studentId && <span>{u.studentId}</span>}
                      {u.faculty && <span> · {u.faculty}</span>}
                    </div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <span className={`badge ${u.role==='Driver' ? 'badge-blue' : 'badge-gray'}`}>{u.role}</span>
                    <div style={{fontSize:11,color:'var(--text3)',marginTop:4}}>
                      {fmtAgo(u.createdAt || u.submittedAt || u.submittedAgo)}
                    </div>
                  </div>
                </div>

                {/* Car info (drivers) */}
                {u.role === 'Driver' && (u.carModel || u.plateNumber) && (
                  <div style={{background:'var(--bg2)',borderRadius:8,padding:'10px 12px',marginBottom:12,fontSize:12,color:'var(--text2)',display:'flex',gap:16}}>
                    {u.carModel && <span><strong>Car:</strong> {u.carModel}</span>}
                    {u.plateNumber && <span><strong>Plate:</strong> {u.plateNumber}</span>}
                    {u.colour && <span><strong>Colour:</strong> {u.colour}</span>}
                  </div>
                )}

                {/* Document view buttons */}
                <div style={{display:'flex',gap:8,marginBottom:12}}>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{display:'flex',alignItems:'center',gap:5}}
                    onClick={() => viewDoc(u.studentIdPhotoUrl || u.idPhotoUrl || u.studentIdPhoto, 'Student ID')}
                  >
                    <span style={{width:13,height:13,display:'flex'}}>{I.file}</span>
                    View Student ID
                  </button>
                  {u.role === 'Driver' && (
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{display:'flex',alignItems:'center',gap:5}}
                      onClick={() => viewDoc(u.licencePhotoUrl || u.licencePhoto || u.drivingLicenceUrl, 'Driving licence')}
                    >
                      <span style={{width:13,height:13,display:'flex'}}>{I.file}</span>
                      View Licence
                    </button>
                  )}
                </div>

                {/* Action buttons */}
                <div style={{display:'flex',gap:8}}>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:5}}
                    onClick={() => approve(u)}
                    disabled={actionId === u.userId}
                  >
                    <span style={{width:13,height:13,display:'flex'}}>{I.check}</span>
                    {actionId === u.userId ? 'Approving...' : 'Approve'}
                  </button>
                  <button
                    className="btn btn-danger-ghost btn-sm"
                    style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:5}}
                    onClick={() => openReject(u)}
                    disabled={actionId === u.userId}
                  >
                    <span style={{width:13,height:13,display:'flex'}}>{I.x}</span>
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reject reason modal */}
      {rejectTarget && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999,padding:16}}>
          <div style={{background:'var(--bg-card)',borderRadius:16,padding:24,width:'100%',maxWidth:420,boxShadow:'var(--shadow)'}}>
            <div style={{fontSize:16,fontWeight:700,color:'var(--text)',marginBottom:4}}>Reject verification</div>
            <div style={{fontSize:13,color:'var(--text3)',marginBottom:16}}>
              Rejecting <strong style={{color:'var(--text)'}}>{rejectTarget.fullName}</strong>. They will receive an email with your reason.
            </div>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:12,fontWeight:600,color:'var(--text2)',display:'block',marginBottom:6}}>Reason for rejection *</label>
              <textarea
                className="input"
                style={{height:90,resize:'none'}}
                placeholder="e.g. Driving licence photo is not clear. Please resubmit a clear front-facing photo."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
              />
            </div>
            <div style={{display:'flex',gap:10}}>
              <button className="btn btn-secondary btn-sm" style={{flex:1}} onClick={() => setRejectTarget(null)} disabled={rejecting}>
                Cancel
              </button>
              <button
                className="btn btn-sm"
                style={{flex:1,background:'var(--red,#EF4444)',color:'white',border:'none'}}
                onClick={confirmReject}
                disabled={rejecting || !rejectReason.trim()}
              >
                {rejecting ? 'Sending...' : 'Confirm reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
