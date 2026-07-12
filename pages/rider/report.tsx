import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout, { I } from '../../components/layout/Layout'
import { userAPI, notifAPI, reportAPI, bookingAPI } from '../../services/api'
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
  const [drivers,  setDrivers]  = useState<any[]>([])   // { driverId, name, rideId, route }
  const [selected, setSelected] = useState<any>(null)   // the chosen driver

  useEffect(() => {
    // Build the driver list from rides the rider actually took (confirmed/completed
    // bookings). Each carries the driver id + ride id we need to LINK the report so
    // the admin can act on it.
    Promise.allSettled([userAPI.getMe(), notifAPI.getUnreadCount(), bookingAPI.getHistory()]).then(([p, n, h]) => {
      if (p.status === 'fulfilled') setProfile(p.value.data)
      if (n.status === 'fulfilled') setUnread(n.value.data?.count || 0)
      if (h.status === 'fulfilled') {
        const list = Array.isArray(h.value.data) ? h.value.data : []
        const seen = new Set<number>()
        const opts: any[] = []
        for (const b of list) {
          if (b.status !== 'Confirmed' && b.status !== 'Completed') continue
          const drv = b.ride?.driver
          const driverId = drv?.userId
          if (!driverId || seen.has(driverId)) continue
          seen.add(driverId)
          opts.push({ driverId, name: drv.fullName || 'Driver', rideId: b.rideId || b.ride?.rideId || 0, route: `${b.ride?.fromLocation || '?'} → ${b.ride?.toLocation || '?'}` })
        }
        setDrivers(opts)
      }
    })
  }, [])

  // If opened from an active ride, the driver arrives in the query — preselect it.
  useEffect(() => {
    if (!router.isReady) return
    const qId = Number(router.query.userId) || 0
    if (!qId) return
    setSelected((cur: any) => cur || drivers.find(d => d.driverId === qId) || {
      driverId: qId,
      name: typeof router.query.name === 'string' ? router.query.name : 'Driver',
      rideId: Number(router.query.rideId) || 0,
      route: '',
    })
  }, [router.isReady, router.query.userId, drivers])

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
    // reportedUser + rideId LINK the report to the real driver so the admin can act
    // on it (warn/suspend/ban). They come from the selected driver (or active-ride link).
    const reportedUser = selected?.driverId || Number(router.query.userId) || 0
    const rideId = selected?.rideId || Number(router.query.rideId) || 0
    if (drivers.length > 0 && !reportedUser) {
      toast.error('Select the driver you are reporting')
      return
    }
    const againstName = selected?.name || form.against.trim() || 'Unknown'

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
      against: againstName,
      reportedName: againstName,
      ride: form.ride.trim(),
      filedAt: now,
      createdAt: now,
      source: 'local-demo',
    }

    // Title is folded into the statement — the backend has no separate Title column.
    let backendOk = false
    try {
      await reportAPI.file({
        reportedUser,
        rideId: rideId || null,
        type: form.category,
        statement: `${form.title.trim()} — ${form.description.trim()}`,
      })
      backendOk = true
    } catch {
      // Backend offline — fall through to the local copy so the demo still works.
    }

    // Only keep a local copy when the backend didn't take it, to avoid a duplicate
    // sitting next to the real linked report in the admin list.
    if (!backendOk) saveLocalReport(localReport)

    toast.success(reportedUser ? 'Report submitted for admin review' : 'Report submitted')
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
              <div style={{fontSize:12,color:'var(--text3)',marginBottom:4}}>Driver *</div>
              {drivers.length > 0 ? (
                <select className="input" value={selected?.driverId || ''} onChange={e => {
                  const d = drivers.find(x => x.driverId === Number(e.target.value)) || null
                  setSelected(d)
                  if (d) setForm(p => ({ ...p, ride: d.route }))
                }}>
                  <option value="">Select a driver you rode with</option>
                  {drivers.map(d => <option key={d.driverId} value={d.driverId}>{d.name} · {d.route}</option>)}
                </select>
              ) : (
                <input className="input" value={form.against} onChange={e=>setForm(p=>({...p,against:e.target.value}))} placeholder="No completed rides yet" />
              )}
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
