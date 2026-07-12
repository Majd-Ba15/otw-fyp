import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Layout, { I } from '../../components/layout/Layout'
import { messageAPI, userAPI, notifAPI, rideAPI } from '../../services/api'
import Cookies from 'js-cookie'
import { jwtDecode } from 'jwt-decode'

export default function Chat() {
  const router  = useRouter()
  const { id, userId: queryUserId, name: queryName } = router.query
  const rideId  = Number(id)

  const [profile,    setProfile]    = useState<any>(null)
  const [role,       setRole]       = useState<'Rider'|'Driver'>('Rider')
  const [ride,       setRide]       = useState<any>(null)
  const [messages,   setMessages]   = useState<any[]>([])
  const [msg,        setMsg]        = useState('')
  const [loading,    setLoading]    = useState(false)
  const [unread,     setUnread]     = useState(0)
  const [myUserId,   setMyUserId]   = useState<number>(0)
  const [passengers, setPassengers] = useState<any[]>([])
  const [selectedPassenger, setSelectedPassenger] = useState<any>(null)
  const [showBroadcast, setShowBroadcast] = useState(false)
  const [broadcasting,  setBroadcasting] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const token = Cookies.get('otw_token')
    if (token) {
      try {
        const d: any = jwtDecode(token)
        setRole(d.role)
        setMyUserId(d.userId || d.sub || 0)
      } catch {}
    }
  }, [])

  useEffect(() => {
    if (!rideId) return
    Promise.allSettled([
      userAPI.getMe(),
      messageAPI.getMessages(rideId),
      rideAPI.getById(rideId),
      rideAPI.getPassengers(rideId),
      notifAPI.getUnreadCount(),
    ]).then(([p, m, r, pas, n]) => {
      if (p.status === 'fulfilled') {
        setProfile(p.value.data)
        setMyUserId(p.value.data?.userId || p.value.data?.id || 0)
      }
      if (m.status === 'fulfilled') {
        setMessages(m.value.data || [])
      } else {
        setMessages([])
      }
      if (r.status === 'fulfilled') setRide(r.value.data)
      if (pas.status === 'fulfilled') {
        const list = pas.value.data || []
        setPassengers(list)
        const queryId = typeof queryUserId === 'string' ? Number(queryUserId) : 0
        const picked = list.find((x: any) => (x.rider?.userId || x.riderId || x.userId) === queryId) || list[0] || null
        setSelectedPassenger(picked)
      }
      if (n.status === 'fulfilled') setUnread(n.value.data?.count || 0)
    })
  }, [rideId, queryUserId])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const getReceiverId = () => {
    if (role === 'Rider') return ride?.driver?.userId || ride?.driver?.id || ride?.driverId || 0
    const selectedId = selectedPassenger?.rider?.userId || selectedPassenger?.riderId || selectedPassenger?.userId || 0
    if (selectedId) return selectedId
    const fromQuery = typeof queryUserId === 'string' ? Number(queryUserId) : 0
    if (fromQuery) return fromQuery
    return 0
  }

  const send = async () => {
    if (!msg.trim() || loading) return
    const text = msg.trim()
    const receiverId = getReceiverId()
    if (!receiverId) {
      alert('Choose a real contact before sending a private message.')
      return
    }
    setMsg('')
    setLoading(true)
    try {
      await messageAPI.send({ rideId, content: text, receiverId })
      const sent = { messageId: Date.now(), senderId: myUserId || 0, isMe: true, content: text, createdAt: new Date().toISOString() }
      setMessages(p => [...p, sent])
    } catch (e: any) {
      setMsg(text)
      alert(e.response?.data?.message || 'Message could not be sent. Please make sure this contact belongs to the ride.')
    }
    finally { setLoading(false) }
  }

  const sendBroadcast = async () => {
    if (!msg.trim() || broadcasting) return
    setBroadcasting(true)
    try {
      await messageAPI.broadcast({ rideId, content: msg })
      setMsg('')
      setShowBroadcast(false)
      const broadcastNotif = { messageId: Date.now(), senderId: myUserId, isMe: true, content: `[Broadcast] ${msg}`, createdAt: new Date().toISOString() }
      setMessages(p => [...p, broadcastNotif])
    } catch { alert('Broadcast failed. Try again.') }
    finally { setBroadcasting(false) }
  }

  const isMe = (m: any) => m.isMe || m.senderId === myUserId || m.senderId === 0
  const dayKey = (value: any) => new Date(value || Date.now()).toDateString()
  const dayLabel = (value: any) => {
    const date = new Date(value || Date.now())
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)
    if (date.toDateString() === today.toDateString()) return 'Today'
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return date.toLocaleDateString('en', { weekday: 'long' })
  }
  const normalizeMessage = (m: any) => ({
    ...m,
    senderId: m.senderId ?? m.sender?.userId,
    receiverId: m.receiverId,
    senderName: m.senderName || m.sender?.fullName,
    createdAt: m.createdAt || m.sentAt,
  })

  const normalizedMessages = messages.map(normalizeMessage)
  const visibleMessages = normalizedMessages.filter((m: any) => {
    if (m.isBroadcast) return true
    if (role !== 'Driver') return true
    const selectedId = selectedPassenger?.rider?.userId || selectedPassenger?.riderId || selectedPassenger?.userId || 0
    if (!selectedId) return false
    return m.senderId === selectedId || m.receiverId === selectedId
  })

  const selectedPassengerName = selectedPassenger?.rider?.fullName || selectedPassenger?.fullName
  // Resolve the other person's REAL name. Prefer the confirmed passenger / ride's
  // driver, then fall back to the sender name carried on the actual messages — so a
  // pending rider (not in getPassengers) still shows their name, never "Passenger".
  const otherId = role === 'Rider'
    ? (ride?.driver?.userId || ride?.driverId || 0)
    : (selectedPassenger?.rider?.userId || selectedPassenger?.riderId || selectedPassenger?.userId || 0)
  const otherFromMessages = (otherId && normalizedMessages.find((m: any) => m.senderId === otherId)?.senderName)
    || normalizedMessages.find((m: any) => m.senderId && m.senderId !== myUserId)?.senderName
  const otherName     = selectedPassengerName
    || (role === 'Rider' ? ride?.driver?.fullName : '')
    || otherFromMessages
    || ride?.driverName || ride?.otherUserName
    || (typeof queryName === 'string' ? queryName : '')
    || (role === 'Rider' ? 'Your driver' : 'Passenger')
  const otherInitials = ride?.driverInitials || (otherName.split(' ').map((n:string) => n[0]).join('').slice(0,2).toUpperCase())
  const route         = ride ? `${ride.fromLocation} → ${ride.toLocation}` : ''
  const accentColor   = role === 'Driver' ? 'var(--blue)' : 'var(--green)'
  const myBubble      = role === 'Driver' ? 'bubble bubble-driver-me' : 'bubble bubble-me'
  const initials      = profile?.fullName?.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase() || 'ME'
  const receiverId    = getReceiverId()

  return (
    <Layout role={role} showBack userInitials={initials} unreadCount={unread}>
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)' }}>

        {/* Chat header */}
        <div style={{ padding: '12px 20px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="av" style={{ background: role === 'Rider' ? 'var(--green-l)' : 'var(--blue-l)', color: role === 'Rider' ? 'var(--green-dd)' : 'var(--blue-d)' }}>
            {otherInitials}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{otherName}</div>
            {route && <div style={{ fontSize: 12, color: 'var(--text3)' }}>{route}</div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--green)' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)' }} />
            Online
          </div>
          {role === 'Driver' && (
            <button
              onClick={() => setShowBroadcast(b => !b)}
              style={{ background: showBroadcast ? 'var(--blue-l)' : 'var(--bg2)', border: `1px solid ${showBroadcast ? 'var(--blue)' : 'var(--border)'}`, borderRadius: 8, padding: '5px 10px', fontSize: 12, fontWeight: 600, color: showBroadcast ? 'var(--blue-d)' : 'var(--text2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
              title="Send to all passengers"
            >
              <span style={{ width: 13, height: 13, display: 'flex' }}>{I.send}</span>
              Broadcast
            </button>
          )}
        </div>

        {role === 'Driver' && passengers.length > 0 && (
          <div style={{ padding: '10px 20px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, overflowX: 'auto' }}>
            {passengers.map((p: any) => {
              const riderId = p.rider?.userId || p.riderId || p.userId
              const name = p.rider?.fullName || p.fullName || 'Passenger'
              const active = riderId === receiverId
              return (
                <button key={riderId || p.bookingId}
                  onClick={() => {
                    setSelectedPassenger(p)
                    router.replace(`/chat/${rideId}?userId=${riderId}&name=${encodeURIComponent(name)}`, undefined, { shallow: true })
                  }}
                  style={{ border: `1px solid ${active ? 'var(--blue)' : 'var(--border)'}`, background: active ? 'var(--blue-l)' : 'var(--bg2)', color: active ? 'var(--blue-d)' : 'var(--text2)', borderRadius: 20, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {name}
                </button>
              )
            })}
          </div>
        )}

        {/* Broadcast banner */}
        {showBroadcast && role === 'Driver' && (
          <div style={{ padding: '10px 20px', background: 'var(--blue-l)', borderBottom: `2px solid var(--blue)`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 14, height: 14, color: 'var(--blue)', display: 'flex', flexShrink: 0 }}>{I.send}</span>
            <span style={{ fontSize: 12, color: 'var(--blue-d)', fontWeight: 600, flex: 1 }}>
              Broadcast mode — message will be sent to ALL passengers on this ride
            </span>
            <button onClick={() => setShowBroadcast(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--blue-d)', display: 'flex' }}>
              <span style={{ width: 14, height: 14, display: 'flex' }}>{I.x}</span>
            </button>
          </div>
        )}

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 700, margin: '0 auto', width: '100%' }}>
          {visibleMessages.map((m, index) => {
            const showDay = index === 0 || dayKey(m.createdAt) !== dayKey(visibleMessages[index - 1]?.createdAt)
            return (
              <div key={m.messageId || index}>
                {showDay && (
                  <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 12px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 999, padding: '4px 10px' }}>
                      {dayLabel(m.createdAt)}
                    </span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: isMe(m) ? 'flex-end' : 'flex-start', flexDirection: 'column', alignItems: isMe(m) ? 'flex-end' : 'flex-start' }}>
                  {!isMe(m) && <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2, paddingLeft: 4 }}>{m.senderName}</div>}
                  <div className={isMe(m) ? myBubble : 'bubble bubble-them'}
                    style={m.content?.startsWith('[Broadcast]') ? { background: 'var(--blue)', color: 'white', borderRadius: 14 } : undefined}>
                    {m.content?.replace('[Broadcast] ', '')}
                    {m.content?.startsWith('[Broadcast]') && (
                      <div style={{ fontSize: 10, opacity: 0.8, marginTop: 3 }}>📢 Sent to all passengers</div>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 3 }}>
                    {new Date(m.createdAt || Date.now()).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '12px 20px', background: 'var(--bg-card)', borderTop: `1px solid ${showBroadcast ? 'var(--blue)' : 'var(--border)'}`, maxWidth: 700, margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'var(--bg2)', borderRadius: 24, padding: '6px 6px 6px 16px' }}>
            <input
              style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 14, color: 'var(--text)', fontFamily: 'inherit' }}
              placeholder={showBroadcast ? 'Broadcast to all passengers...' : receiverId ? 'Type a message...' : 'Choose a real contact to send...'}
              value={msg}
              onChange={e => setMsg(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (showBroadcast ? sendBroadcast() : send())}
            />
            <button
              onClick={showBroadcast ? sendBroadcast : send}
              disabled={!msg.trim() || loading || broadcasting || (!showBroadcast && !receiverId)}
              style={{ width: 36, height: 36, borderRadius: '50%', background: accentColor, border: 'none', cursor: 'pointer', opacity: (!msg.trim() || (!showBroadcast && !receiverId)) ? .5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              <span style={{ width: 16, height: 16, color: 'white', display: 'flex' }}>{I.send}</span>
            </button>
          </div>
          {showBroadcast && (
            <div style={{ fontSize: 11, color: 'var(--blue-d)', marginTop: 5, textAlign: 'center' }}>
              Press Enter or tap send to broadcast to all passengers
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

