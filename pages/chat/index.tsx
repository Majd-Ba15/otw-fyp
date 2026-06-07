import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout, { I } from '../../components/layout/Layout'
import { messageAPI, userAPI, notifAPI, rideAPI, bookingAPI } from '../../services/api'
import Cookies from 'js-cookie'
import { jwtDecode } from 'jwt-decode'

interface Conversation {
  rideId:            number
  otherUserId:       number
  otherUserName:     string
  otherUserInitials: string
  lastMessage:       string
  lastMessageAt:     string
  unreadCount:       number
  route:             string
}

interface Contact {
  userId:   number
  name:     string
  initials: string
  role:     string
  rideId:   number
  route:    string
  subtitle: string
}

// Mock contacts per role
const MOCK_RIDER_CONTACTS: Contact[] = [
  { userId:10, name:'Sarah Tan',   initials:'ST', role:'Driver', rideId:1, route:'UTM Main Gate → KL Sentral',   subtitle:'Driver · Upcoming ride' },
  { userId:11, name:'Ahmad Rizal', initials:'AR', role:'Driver', rideId:2, route:'Faculty → Paradigm Mall',      subtitle:'Driver · Tomorrow 9am' },
]
const MOCK_DRIVER_CONTACTS: Contact[] = [
  { userId:20, name:'Ahmad Karim', initials:'AK', role:'Rider', rideId:1, route:'UTM Main Gate → KL Sentral', subtitle:'Passenger · Seat 1' },
  { userId:21, name:'Fatimah Ali', initials:'FA', role:'Rider', rideId:1, route:'UTM Main Gate → KL Sentral', subtitle:'Passenger · Seat 2' },
  { userId:22, name:'Lee Wei Ming',initials:'LW', role:'Rider', rideId:2, route:'Faculty → Mid Valley',       subtitle:'Passenger · Seat 1' },
]

export default function ChatIndex() {
  const router = useRouter()
  const [profile,       setProfile]       = useState<any>(null)
  const [role,          setRole]          = useState<'Rider'|'Driver'>('Rider')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [contacts,      setContacts]      = useState<Contact[]>([])
  const [loading,       setLoading]       = useState(true)
  const [search,        setSearch]        = useState('')
  const [contactSearch, setContactSearch] = useState('')
  const [unread,        setUnread]        = useState(0)
  const [tab,           setTab]           = useState<'chats'|'new'>('chats')

  // Driver broadcast
  const [broadcastRide, setBroadcastRide] = useState<any>(null)
  const [broadcastMsg,  setBroadcastMsg]  = useState('')
  const [broadcasting,  setBroadcasting]  = useState(false)
  const [driverRides,   setDriverRides]   = useState<any[]>([])

  useEffect(() => {
    const token = Cookies.get('otw_token')
    let detectedRole: 'Rider'|'Driver' = 'Rider'
    if (token) { try { const d: any = jwtDecode(token); detectedRole = d.role; setRole(d.role) } catch {} }

    Promise.allSettled([
      userAPI.getMe(),
      messageAPI.getConversations(),
      notifAPI.getUnreadCount(),
      messageAPI.getContacts(),
      detectedRole === 'Driver' ? rideAPI.getMine('upcoming') : bookingAPI.getUpcoming(),
    ]).then(([p, c, n, ct, rb]) => {
      if (p.status === 'fulfilled') setProfile(p.value.data)
      if (n.status === 'fulfilled') setUnread(n.value.data?.count || 0)

      // Build contacts list from API or fall back to mocks
      let builtContacts: Contact[] = []
      if (ct.status === 'fulfilled' && ct.value.data?.length) {
        builtContacts = ct.value.data
      } else if (rb.status === 'fulfilled' && rb.value.data?.length) {
        const rbData = rb.value.data
        if (detectedRole === 'Driver') {
          // Each ride's passengers become contacts
          rbData.forEach((ride: any) => {
            (ride.passengers || []).forEach((p: any) => {
              builtContacts.push({
                userId:   p.rider?.userId || p.userId,
                name:     p.rider?.fullName || p.fullName || 'Passenger',
                initials: (p.rider?.fullName || p.fullName || 'PA').slice(0,2).toUpperCase(),
                role:     'Rider',
                rideId:   ride.rideId || ride.id,
                route:    `${ride.fromLocation} → ${ride.toLocation}`,
                subtitle: `Passenger · ${ride.fromLocation}`,
              })
            })
          })
          setDriverRides(rbData)
        } else {
          rbData.forEach((bk: any) => {
            builtContacts.push({
              userId:   bk.driver?.userId || bk.driverId || 0,
              name:     bk.driver?.fullName || bk.driverName || 'Your driver',
              initials: (bk.driver?.fullName || bk.driverName || 'DR').slice(0,2).toUpperCase(),
              role:     'Driver',
              rideId:   bk.rideId || bk.ride?.rideId,
              route:    bk.ride ? `${bk.ride.fromLocation} → ${bk.ride.toLocation}` : (bk.route || ''),
              subtitle: `Driver · ${bk.ride?.fromLocation || ''}`,
            })
          })
        }
      }
      setContacts(builtContacts.length ? builtContacts : detectedRole === 'Driver' ? MOCK_DRIVER_CONTACTS : MOCK_RIDER_CONTACTS)

      // Build conversations
      if (c.status === 'fulfilled' && c.value.data?.length) {
        setConversations(c.value.data)
      } else {
        // Derive conversations from contacts/rides
        const mock: Conversation[] = detectedRole === 'Driver' ? [
          { rideId:1, otherUserId:20, otherUserName:'Ahmad Karim', otherUserInitials:'AK', lastMessage:"I'll be at Gate A", lastMessageAt: new Date(Date.now()-4*60000).toISOString(), unreadCount:2, route:'UTM Main Gate → KL Sentral' },
          { rideId:2, otherUserId:21, otherUserName:'Fatimah Ali', otherUserInitials:'FA', lastMessage:'Ok, confirmed!',    lastMessageAt: new Date(Date.now()-86400000).toISOString(), unreadCount:0, route:'Faculty → Mid Valley' },
        ] : [
          { rideId:1, otherUserId:10, otherUserName:'Sarah Tan',   otherUserInitials:'ST', lastMessage:"I'm 5 minutes away!", lastMessageAt: new Date(Date.now()-4*60000).toISOString(), unreadCount:1, route:'UTM Main Gate → KL Sentral' },
          { rideId:2, otherUserId:11, otherUserName:'Ahmad Rizal', otherUserInitials:'AR', lastMessage:'Confirmed, see you at 5:30', lastMessageAt: new Date(Date.now()-86400000).toISOString(), unreadCount:0, route:'Faculty → Paradigm Mall' },
        ]
        setConversations(mock)
      }
      setLoading(false)
    })
  }, [])

  const sendBroadcast = async () => {
    if (!broadcastMsg.trim() || !broadcastRide || broadcasting) return
    setBroadcasting(true)
    try {
      await messageAPI.broadcast({ rideId: broadcastRide.rideId || broadcastRide.id, content: broadcastMsg })
      setBroadcastMsg('')
      setBroadcastRide(null)
      alert('Message sent to all passengers!')
    } catch { alert('Failed to send. Please try again.') }
    finally { setBroadcasting(false) }
  }

  const openChat = (contact: Contact) => {
    router.push(`/chat/${contact.rideId}?userId=${contact.userId}&name=${encodeURIComponent(contact.name)}`)
  }

  const fmtTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    if (diff < 3600000)  return `${Math.round(diff / 60000)}m`
    if (diff < 86400000) return `${Math.round(diff / 3600000)}h`
    return `${Math.round(diff / 86400000)}d`
  }

  const filteredConvs = conversations.filter(c =>
    c.otherUserName.toLowerCase().includes(search.toLowerCase()) ||
    c.route.toLowerCase().includes(search.toLowerCase())
  )
  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
    c.route.toLowerCase().includes(contactSearch.toLowerCase())
  )

  const initials   = profile?.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'ME'
  const accentColor = role === 'Driver' ? 'var(--blue)' : 'var(--green)'

  return (
    <Layout title="Messages" role={role} userInitials={initials} unreadCount={unread}>
      <div className="page-inner" style={{ maxWidth: 680 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>Messages</h1>
          <button
            className={`btn btn-sm ${role === 'Driver' ? 'btn-blue' : 'btn-primary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: 5 }}
            onClick={() => setTab(tab === 'new' ? 'chats' : 'new')}
          >
            <span style={{ width: 14, height: 14, display: 'flex' }}>{tab === 'new' ? I.x : I.plus}</span>
            {tab === 'new' ? 'Cancel' : 'New message'}
          </button>
        </div>

        {/* ── NEW MESSAGE panel ── */}
        {tab === 'new' && (
          <div className="card" style={{ marginBottom: 16, border: `1.5px solid ${accentColor}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <span style={{ width: 18, height: 18, color: accentColor, display: 'flex' }}>{I.msg}</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                {role === 'Driver' ? 'Message a passenger' : 'Message your driver'}
              </span>
            </div>

            {/* Contact search */}
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', width:14, height:14, color:'var(--text3)', display:'flex' }}>{I.search}</span>
              <input className="input" style={{ paddingLeft: 32 }} placeholder="Search by name or route…"
                value={contactSearch} onChange={e => setContactSearch(e.target.value)} />
            </div>

            {/* Contact list */}
            {filteredContacts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 13, color: 'var(--text3)' }}>
                No {role === 'Driver' ? 'passengers' : 'drivers'} found
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {filteredContacts.map(contact => (
                  <div key={`${contact.rideId}-${contact.userId}`}
                    onClick={() => openChat(contact)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 14px', borderRadius: 10,
                      border: '1px solid var(--border)',
                      background: 'var(--bg)',
                      cursor: 'pointer', transition: 'background .15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg)')}>

                    {/* Avatar */}
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                      background: contact.role === 'Driver' ? 'var(--green-l)' : 'var(--blue-l)',
                      color: contact.role === 'Driver' ? 'var(--green-dd)' : 'var(--blue-d)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 700,
                    }}>
                      {contact.initials}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{contact.name}</span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 20,
                          background: contact.role === 'Driver' ? 'var(--green-l)' : 'var(--blue-l)',
                          color: contact.role === 'Driver' ? 'var(--green)' : 'var(--blue)',
                        }}>{contact.role}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {contact.subtitle}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 1, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <span style={{ width: 10, height: 10, display: 'flex' }}>{I.pin}</span>
                        {contact.route}
                      </div>
                    </div>

                    <span style={{ width: 16, height: 16, color: accentColor, display: 'flex', flexShrink: 0 }}>{I.msg}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Driver-only: broadcast section */}
            {role === 'Driver' && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>Or broadcast to all passengers</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                  {(driverRides.length ? driverRides : [
                    { rideId:1, fromLocation:'UTM Main Gate', toLocation:'KL Sentral', departureTime: new Date(Date.now()+3600000).toISOString(), bookedPassengers:3 },
                    { rideId:2, fromLocation:'Faculty of Computing', toLocation:'Mid Valley', departureTime: new Date(Date.now()+7200000).toISOString(), bookedPassengers:2 },
                  ]).map((ride: any) => (
                    <div key={ride.rideId || ride.id}
                      onClick={() => setBroadcastRide(broadcastRide?.rideId === (ride.rideId || ride.id) ? null : ride)}
                      style={{
                        padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                        border: `1.5px solid ${broadcastRide?.rideId === (ride.rideId || ride.id) ? 'var(--blue)' : 'var(--border)'}`,
                        background: broadcastRide?.rideId === (ride.rideId || ride.id) ? 'var(--blue-l)' : 'var(--bg)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                          {ride.fromLocation} → {ride.toLocation}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                          {new Date(ride.departureTime).toLocaleString('en', { weekday:'short', hour:'2-digit', minute:'2-digit' })}
                        </div>
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--blue)', fontWeight: 600 }}>
                        {ride.bookedPassengers ?? 0} riders
                      </span>
                    </div>
                  ))}
                </div>
                <textarea className="input" style={{ height: 80, resize: 'none', marginBottom: 8 }}
                  placeholder="Type broadcast message…"
                  value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)} />
                <button className="btn btn-blue btn-full"
                  disabled={!broadcastMsg.trim() || !broadcastRide || broadcasting}
                  onClick={sendBroadcast}>
                  {broadcasting ? 'Sending…' : `Broadcast${broadcastRide ? ` (${broadcastRide.bookedPassengers ?? 0} passengers)` : ''}`}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── CHATS tab ── */}
        {tab === 'chats' && (
          <>
            {/* Search */}
            <div style={{ position: 'relative', marginBottom: 14 }}>
              <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', width:16, height:16, color:'var(--text3)', display:'flex' }}>{I.search}</span>
              <input className="input" style={{ paddingLeft: 36 }} placeholder="Search conversations…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)', fontSize: 13 }}>Loading…</div>
            ) : filteredConvs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <span style={{ width: 24, height: 24, color: 'var(--text3)', display: 'flex' }}>{I.msg}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>No conversations yet</div>
                <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 14 }}>Start a chat with your {role === 'Driver' ? 'passengers' : 'driver'}</div>
                <button className={`btn btn-sm ${role === 'Driver' ? 'btn-blue' : 'btn-primary'}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                  onClick={() => setTab('new')}>
                  <span style={{ width: 13, height: 13, display: 'flex' }}>{I.plus}</span> New message
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {filteredConvs.map(conv => (
                  <div key={conv.rideId}
                    onClick={() => router.push(`/chat/${conv.rideId}`)}
                    className="card"
                    style={{
                      cursor: 'pointer', padding: '14px 16px', marginBottom: 0,
                      display: 'flex', alignItems: 'center', gap: 14,
                      borderLeft: conv.unreadCount > 0 ? `3px solid ${accentColor}` : '3px solid transparent',
                    }}>
                    {/* Avatar */}
                    <div style={{
                      width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
                      background: role === 'Driver' ? 'var(--blue-l)' : 'var(--green-l)',
                      color: role === 'Driver' ? 'var(--blue-d)' : 'var(--green-dd)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 700,
                    }}>
                      {conv.otherUserInitials}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 }}>
                        <span style={{ fontSize: 14, fontWeight: conv.unreadCount > 0 ? 700 : 500, color: 'var(--text)' }}>
                          {conv.otherUserName}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text4)', flexShrink: 0, marginLeft: 8 }}>
                          {fmtTime(conv.lastMessageAt)}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: conv.unreadCount > 0 ? 'var(--text)' : 'var(--text3)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: conv.unreadCount > 0 ? 500 : 400 }}>
                        {conv.lastMessage}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text4)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 10, height: 10, display: 'flex' }}>{I.pin}</span>
                        {conv.route}
                      </div>
                    </div>

                    {/* Unread badge */}
                    {conv.unreadCount > 0 && (
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%', background: accentColor,
                        color: 'white', fontSize: 10, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
