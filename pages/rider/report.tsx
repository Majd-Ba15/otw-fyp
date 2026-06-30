import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout, { I } from '../../components/layout/Layout'
import { userAPI, notifAPI, reportAPI } from '../../services/api'
import toast from 'react-hot-toast'

const LOCAL_REPORTS_KEY = 'otw_local_reports'

export default function RiderReport() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: '',
    category: 'Safety',
    against: '',
    ride: '',
    description: '',
  })

  useEffect(() => {
    Promise.allSettled([userAPI.getMe(), notifAPI.getUnreadCount()]).then(([p, n]) => {
      if (p.status === 'fulfilled') setProfile(p.value.data)
      if (n.status === 'fulfilled') setUnread(n.value.data?.count || 0)
    })
  }, [])

  const initials = profile?.fullName?.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase() || 'AK'

  const saveLocalReport = (payload: any) => {
    try {
      const existing = JSON.parse(localStorage.getItem(LOCAL_REPORTS_KEY) || '[]')
      localStorage.setItem(LOCAL_REPORTS_KEY, JSON.stringify([payload, ...existing]))
    } catch {}
  }

  const submit = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      toast.error('Add a title and report details')
      return
    }

    setLoading(true)
    const now = new Date().toISOString()
    const localReport = {
      reportId: Date.now(),
      id: Date.now(),
      title: form.title.trim(),
      category: form.category,
      description: form.description.trim(),
      statement: form.description.trim(),
      status: 'open',
      filedBy: profile?.fullName || 'Rider',
      reporterName: profile?.fullName || 'Rider',
      against: form.against.trim() || 'Unknown',
      reportedName: form.against.trim() || 'Unknown',
      ride: form.ride.trim(),
      filedAt: now,
      createdAt: now,
      source: 'local-demo',
    }

    try {
      await reportAPI.file({
        title: localReport.title,
        category: localReport.category,
        description: localReport.description,
        reportedName: localReport.reportedName,
        ride: localReport.ride,
      })
    } catch {
      // Keep the demo flow working even when the backend is offline.
    }

    saveLocalReport(localReport)
    toast.success('Report submitted')
    setLoading(false)
    router.push('/rider/dashboard')
  }

  return (
    <Layout title="Report issue" role="Rider" showBack userInitials={initials} unreadCount={unread}>
      <div className="page-inner" style={{maxWidth:620}}>
        <h1 style={{fontSize:22,fontWeight:700,color:'var(--text)',marginBottom:6}}>Report an issue</h1>
        <p style={{fontSize:13,color:'var(--text3)',marginBottom:16}}>Submit safety, behavior, payment, or ride problems for admin review.</p>

        <div className="card" style={{marginBottom:14}}>
          <div style={{fontSize:12,color:'var(--text3)',marginBottom:4}}>Title *</div>
          <input className="input" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="e.g. Driver was speeding" style={{marginBottom:10}} />

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
            <div>
              <div style={{fontSize:12,color:'var(--text3)',marginBottom:4}}>Category</div>
              <select className="input" value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}>
                {['Safety','Behavior','Payment','Late pickup','Vehicle','Other'].map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <div style={{fontSize:12,color:'var(--text3)',marginBottom:4}}>Against</div>
              <input className="input" value={form.against} onChange={e=>setForm(p=>({...p,against:e.target.value}))} placeholder="Driver or rider name" />
            </div>
          </div>

          <div style={{fontSize:12,color:'var(--text3)',marginBottom:4}}>Ride / route</div>
          <input className="input" value={form.ride} onChange={e=>setForm(p=>({...p,ride:e.target.value}))} placeholder="e.g. UTM to City Centre" style={{marginBottom:10}} />

          <div style={{fontSize:12,color:'var(--text3)',marginBottom:4}}>Details *</div>
          <textarea className="input" rows={5} value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="Explain what happened..." />
        </div>

        <button className="btn btn-danger btn-full btn-lg" onClick={submit} disabled={loading}>
          <span style={{width:16,height:16,display:'flex'}}>{I.alert}</span>
          {loading ? 'Submitting...' : 'Submit report'}
        </button>
      </div>
    </Layout>
  )
}
