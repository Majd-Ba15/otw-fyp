import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout, { I } from '../../../components/layout/Layout'
import { adminAPI, userAPI, notifAPI } from '../../../services/api'
import toast from 'react-hot-toast'

export default function UserDetail() {
  const router = useRouter()
  const { id } = router.query
  const [profile, setProfile] = useState<any>(null)
  const [user,    setUser]    = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [unread,  setUnread]  = useState(0)

  useEffect(() => {
    Promise.allSettled([
      userAPI.getMe(),
      id ? adminAPI.getUser(Number(id)) : Promise.reject(),
      notifAPI.getUnreadCount(),
    ]).then(([p, u, n]) => {
      if (p.status === 'fulfilled') setProfile(p.value.data)
      if (u.status === 'fulfilled') {
        const data = u.value.data || {}
        const liveUser = data.user || data
        setUser({
          ...liveUser,
          totalRides: data.rideCount ?? liveUser.totalRides ?? 0,
          reportCount: data.reportCount ?? liveUser.reportCount ?? 0,
          recentRides: data.recentRides || [],
        })
      } else setUser(null)
      if (n.status === 'fulfilled') setUnread(n.value.data?.count || 0)
      setLoading(false)
    })
  }, [id])

  const doAction = async (action: string) => {
    try {
      if (action === 'warn')    await adminAPI.warn(Number(id), { reason: 'Admin warning' })
      if (action === 'suspend') await adminAPI.suspend(Number(id))
      if (action === 'ban')     await adminAPI.ban(Number(id))
      toast.success(`User ${action}ned successfully`)
      router.push('/admin/users')
    } catch (e: any) { toast.error(e.response?.data?.message || `Failed to ${action} user`) }
  }

  const initials     = profile?.fullName?.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase() || 'AD'
  const userInitials = user?.fullName?.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase() || '??'

  return (
    <Layout role="Admin" showBack userInitials={initials} unreadCount={unread}>
      <div className="page-inner" style={{ maxWidth: 680 }}>
        {loading ? <div style={{ textAlign:'center',padding:'40px',color:'var(--text3)',fontSize:13 }}>Loading...</div> : !user ? (
          <div className="card" style={{ textAlign:'center',padding:'28px',color:'var(--text3)',fontSize:13 }}>Could not load live user details.</div>
        ) : (
          <>
            <div className="card" style={{ textAlign:'center', marginBottom:12 }}>
              <div className="av av-xl" style={{ margin:'0 auto 12px' }}>{userInitials}</div>
              <div style={{ fontSize:18,fontWeight:700,color:'var(--text)' }}>{user.fullName}</div>
              <div style={{ fontSize:13,color:'var(--text3)',marginTop:2 }}>{user.email}</div>
              <div style={{ display:'flex', justifyContent:'center', gap:6, marginTop:8 }}>
                <span className={`badge ${user.role==='Driver'?'badge-blue':user.role==='Admin'?'badge-amber':'badge-gray'}`}>{user.role}</span>
                <span className={`badge ${user.status==='Active'?'badge-green':'badge-red'}`}>{user.status}</span>
                {user.isVerified && <span className="badge badge-green">Verified</span>}
              </div>            </div>

            <div className="card" style={{ marginBottom:12 }}>
              <div style={{ fontSize:13,fontWeight:600,color:'var(--text)',marginBottom:10 }}>Personal Info</div>
              {[
                ['Student ID',user.studentId],
                ['Faculty',user.faculty],
                ['Phone',user.phone],
                ['Gender',user.gender],
                ['University',user.university],
                ['Campus',user.campusName],
                ['Since',user.createdAt ? new Date(user.createdAt).toLocaleDateString('en',{month:'long',year:'numeric'}) : null],
              ].map(([k,v]) => (
                <div key={k} className="row">
                  <span style={{ fontSize:12,color:'var(--text3)' }}>{k}</span>
                  <span style={{ fontSize:12,fontWeight:500,color:'var(--text)' }}>{v||'-'}</span>
                </div>
              ))}
            </div>

            <div style={{ display:'flex', gap:8 }}>
              <button className="btn btn-ghost" style={{ flex:1,borderColor:'var(--amber)',color:'var(--amber)' }} onClick={() => doAction('warn')}>⚠ Warn</button>
              <button className="btn btn-ghost-blue" style={{ flex:1 }} onClick={() => doAction('suspend')}>Suspend</button>
              <button className="btn btn-danger" style={{ flex:1 }} onClick={() => doAction('ban')}>Ban</button>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
