import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout, { I } from '../components/layout/Layout'
import { userAPI, notifAPI } from '../services/api'
import Cookies from 'js-cookie'
import { jwtDecode } from 'jwt-decode'

const TYPE_META: Record<string, { icon: any; color: string; label: string }> = {
  booking:     { icon: null, color: 'var(--green)',  label: 'Booking' },
  message:     { icon: null, color: 'var(--blue)',   label: 'Message' },
  reminder:    { icon: null, color: 'var(--blue)',   label: 'Reminder' },
  rating:      { icon: null, color: '#F59E0B',       label: 'Rating' },
  system:      { icon: null, color: 'var(--text3)',  label: 'System' },
  verification:{ icon: null, color: 'var(--green)',  label: 'Verification' },
  request:     { icon: null, color: 'var(--blue)',   label: 'Request' },
  cancelled:   { icon: null, color: 'var(--red)',    label: 'Cancelled' },
}

const RIDER_TRIGGER = [
  { icon: '✅', color: 'var(--green)', text: 'Driver accepted booking' },
  { icon: '❌', color: 'var(--red)',   text: 'Driver declined booking' },
  { icon: '🕐', color: 'var(--blue)',  text: 'Ride starting in 1 hour' },
  { icon: '💬', color: 'var(--blue)',  text: 'New message from driver' },
  { icon: '⭐', color: '#F59E0B',      text: 'Rate your completed ride' },
]
const DRIVER_TRIGGER = [
  { icon: '🙋', color: 'var(--blue)',  text: 'Now booking request' },
  { icon: '🕐', color: 'var(--blue)',  text: 'Ride starting in 1 hour' },
  { icon: '💬', color: 'var(--blue)',  text: 'Now message from rider' },
  { icon: '⭐', color: '#F59E0B',      text: 'Now rating received' },
  { icon: '🛡️', color: 'var(--green)', text: 'Verification approved/rejected' },
]

const RIDER_FALLBACK = [
  { notificationId:1, type:'booking',   title:'Booking confirmed!',         body:'Sarah Tan accepted your booking for UTM → KL Sentral', createdAt: new Date(Date.now()-2*60000).toISOString(),   isRead:false },
  { notificationId:2, type:'message',   title:'New message',                body:"Sarah Tan: \"I'm 5 minutes away\"",                    createdAt: new Date(Date.now()-8*60000).toISOString(),   isRead:false },
  { notificationId:3, type:'reminder',  title:'Ride in 1 hour',             body:'UTM Main Gate → KL Sentral at 5:30 PM',               createdAt: new Date(Date.now()-30*60000).toISOString(),  isRead:false },
  { notificationId:4, type:'cancelled', title:'Booking declined',           body:'Ahmad Rizal declined your request. Yesterday',        createdAt: new Date(Date.now()-86400000).toISOString(),  isRead:true },
  { notificationId:5, type:'rating',    title:'Rate your ride',             body:'How was your ride with Sarah Tan?',                   createdAt: new Date(Date.now()-2*86400000).toISOString(), isRead:true },
]
const DRIVER_FALLBACK = [
  { notificationId:1, type:'request',   title:'New booking request',        body:'Ahmad Karim wants to join your ride — UTM → KL Sentral', createdAt: new Date(Date.now()-2*60000).toISOString(),   isRead:false },
  { notificationId:2, type:'request',   title:'New booking request',        body:'Fatimah Ali wants to join same ride',                    createdAt: new Date(Date.now()-5*60000).toISOString(),   isRead:false },
  { notificationId:3, type:'rating',    title:'New rating received',        body:'Ahmad gave you 5 stars ⭐ Yesterday',                    createdAt: new Date(Date.now()-86400000).toISOString(),  isRead:true },
  { notificationId:4, type:'verification', title:'Verification approved',   body:'Your student ID is now verified. 3 days ago',           createdAt: new Date(Date.now()-3*86400000).toISOString(), isRead:true },
]

export default function Notifications() {
  const router  = useRouter()
  const [profile,  setProfile]  = useState<any>(null)
  const [role,     setRole]     = useState<'Rider'|'Driver'|'Admin'>('Rider')
  const [notifs,   setNotifs]   = useState<any[]>([])
  const [settings, setSettings] = useState({ bookings:true, messages:true, reminders:true })
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState<'all'|'unread'>('all')

  useEffect(() => {
    const token = Cookies.get('otw_token')
    let detectedRole: 'Rider'|'Driver'|'Admin' = 'Rider'
    if (token) { try { const d:any = jwtDecode(token); detectedRole = d.role; setRole(d.role) } catch {} }

    Promise.allSettled([
      userAPI.getMe(),
      notifAPI.getAll(),
    ]).then(([p, n]) => {
      if (p.status === 'fulfilled') setProfile(p.value.data)
      if (n.status === 'fulfilled' && n.value.data?.length) {
        setNotifs(n.value.data)
      } else {
        setNotifs(detectedRole === 'Driver' ? DRIVER_FALLBACK : RIDER_FALLBACK)
      }
      setLoading(false)
    })
  }, [])

  const markAll = async () => {
    try { await notifAPI.readAll() } catch {}
    setNotifs(p => p.map(n => ({ ...n, isRead: true })))
  }
  const markOne = async (id: number) => {
    try { await notifAPI.markRead(id) } catch {}
    setNotifs(p => p.map(n => n.notificationId === id ? { ...n, isRead: true } : n))
  }

  const notifColor = (type: string) => TYPE_META[type]?.color || 'var(--text3)'
  const notifIcon  = (type: string) => {
    const icons: Record<string,any> = { booking: I.checkC, request: I.bell, message: I.msg, reminder: I.clock, rating: I.star, system: I.info, verification: I.shield, cancelled: I.x }
    return icons[type] || I.bell
  }
  const fmtTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    if (diff < 3600000)  return `${Math.round(diff/60000)} min ago`
    if (diff < 86400000) return `${Math.round(diff/3600000)} hours ago`
    return `${Math.round(diff/86400000)} days ago`
  }

  const unread = notifs.filter(n => !n.isRead).length
  const displayed = filter === 'unread' ? notifs.filter(n => !n.isRead) : notifs
  const newNotifs    = displayed.filter(n => !n.isRead)
  const earlierNotifs = displayed.filter(n => n.isRead)
  const initials = profile?.fullName?.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase() || 'AK'
  const accentColor = role === 'Driver' ? 'var(--blue)' : role === 'Admin' ? 'var(--amber)' : 'var(--green)'
  const triggerList = role === 'Driver' ? DRIVER_TRIGGER : RIDER_TRIGGER

  const NotifCard = ({ n }: { n: any }) => (
    <div
      onClick={() => markOne(n.notificationId)}
      style={{
        display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 16px',
        background: 'var(--bg-card)', borderRadius: 12, marginBottom: 6, cursor: 'pointer',
        border: '1px solid var(--border)',
        borderLeft: `3px solid ${n.isRead ? 'var(--border)' : notifColor(n.type)}`,
        opacity: n.isRead ? 0.7 : 1,
        transition: 'opacity .15s',
      }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: n.isRead ? 'var(--bg2)' : `${notifColor(n.type)}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ width: 18, height: 18, color: n.isRead ? 'var(--text3)' : notifColor(n.type), display: 'flex' }}>
          {notifIcon(n.type)}
        </span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: n.isRead ? 500 : 700, color: 'var(--text)', marginBottom: 2 }}>{n.title}</div>
        <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5, marginBottom: 4 }}>{n.body}</div>
        <div style={{ fontSize: 11, color: 'var(--text4)' }}>{fmtTime(n.createdAt)}</div>
      </div>
      {!n.isRead && (
        <div style={{ width: 9, height: 9, borderRadius: '50%', background: notifColor(n.type), flexShrink: 0, marginTop: 6 }} />
      )}
    </div>
  )

  return (
    <Layout title="Notifications" role={role} userInitials={initials} unreadCount={unread}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '20px' }}>

        {/* Page header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>Notifications</h1>
            {unread > 0 && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{unread} unread</div>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ display: 'flex', background: 'var(--bg2)', borderRadius: 8, padding: 3, gap: 2 }}>
              {(['all','unread'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  padding: '5px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  background: filter === f ? 'var(--bg-card)' : 'transparent',
                  color: filter === f ? 'var(--text)' : 'var(--text3)',
                  boxShadow: filter === f ? 'var(--shadow-sm)' : 'none',
                }}>
                  {f === 'all' ? 'All' : `Unread${unread > 0 ? ` (${unread})` : ''}`}
                </button>
              ))}
            </div>
            {unread > 0 && (
              <button className="btn btn-secondary btn-sm" onClick={markAll}>Mark all read</button>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 20, alignItems: 'start' }}>

          {/* LEFT: notification list */}
          <div>
            {loading ? (
              <div style={{ textAlign:'center', padding:'40px', color:'var(--text3)', fontSize:13 }}>Loading…</div>
            ) : displayed.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px' }}>
                <div style={{ width:48, height:48, borderRadius:'50%', background:'var(--bg2)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}>
                  <span style={{ width:24, height:24, color:'var(--text3)', display:'flex' }}>{I.bell}</span>
                </div>
                <div style={{ fontSize:14, color:'var(--text3)' }}>No notifications</div>
              </div>
            ) : (
              <>
                {newNotifs.length > 0 && (
                  <>
                    <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:.08, marginBottom:8 }}>New</div>
                    {newNotifs.map(n => <NotifCard key={n.notificationId} n={n} />)}
                  </>
                )}
                {earlierNotifs.length > 0 && (
                  <>
                    <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:.08, margin:'14px 0 8px' }}>Earlier</div>
                    {earlierNotifs.map(n => <NotifCard key={n.notificationId} n={n} />)}
                  </>
                )}
              </>
            )}

            {/* Settings */}
            <div style={{ fontSize:14, fontWeight:700, color:'var(--text)', margin:'20px 0 10px' }}>Notification settings</div>
            <div className="card" style={{ padding:0, overflow:'hidden' }}>
              {(Object.entries(settings) as [keyof typeof settings, boolean][]).map(([key, val], i, arr) => (
                <div key={key} style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px', borderBottom: i < arr.length-1 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ flex:1, fontSize:13, color:'var(--text)' }}>
                    {key==='bookings' ? 'Booking confirmations' : key==='messages' ? 'New messages' : 'Ride reminders'}
                  </span>
                  <button className={`toggle ${val?'on':''}`} onClick={() => setSettings(p => ({...p,[key]:!val}))} aria-label={key} />
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: trigger guide */}
          <div>
            <div className="card" style={{ padding:'16px', marginBottom:12 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:12 }}>
                What triggers each notification
              </div>
              <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:.06, marginBottom:8 }}>
                {role === 'Driver' ? 'Driver' : 'Rider'} receives
              </div>
              {triggerList.map((t, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0', borderBottom: i < triggerList.length-1 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontSize:14 }}>{t.icon}</span>
                  <span style={{ fontSize:12, color:'var(--text2)' }}>{t.text}</span>
                </div>
              ))}
            </div>

            {/* Quick action */}
            <div className="card" style={{ padding:'16px' }}>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:10 }}>Quick actions</div>
              <button className={`btn btn-sm btn-full ${role==='Driver' ? 'btn-blue' : 'btn-primary'}`} style={{ marginBottom:8 }}
                onClick={() => router.push(role === 'Driver' ? '/driver/requests' : '/rider/search')}>
                {role === 'Driver' ? 'View booking requests' : 'Search rides'}
              </button>
              <button className="btn btn-sm btn-full btn-secondary"
                onClick={() => router.push('/chat')}>
                Open messages
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
