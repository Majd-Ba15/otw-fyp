import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout, { I } from '../components/layout/Layout'
import { userAPI, bookingAPI, notifAPI, sosAPI } from '../services/api'
import Cookies from 'js-cookie'
import { jwtDecode } from 'jwt-decode'
import toast from 'react-hot-toast'

export default function SOS() {
  const router   = useRouter()
  const [profile,   setProfile]   = useState<any>(null)
  const [role,      setRole]      = useState<'Rider'|'Driver'>('Rider')
  const [booking,   setBooking]   = useState<any>(null)
  const [contacts,  setContacts]  = useState<{name:string;phone:string;email?:string}[]>([])
  const [holding,   setHolding]   = useState(false)
  const [progress,  setProgress]  = useState(0)
  const [activated, setActivated] = useState(false)
  const [unread,    setUnread]    = useState(0)
  let holdTimer: any

  useEffect(() => {
    const token = Cookies.get('otw_token')
    if (token) { try { const d:any=jwtDecode(token); setRole(d.role) } catch {} }

    // Load contacts from localStorage immediately (no wait for API)
    const LOCAL_KEY = 'otw_emergency_contacts'
    const localContacts = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]')
    if (localContacts.length > 0) setContacts(localContacts)

    Promise.allSettled([
      userAPI.getMe(),
      bookingAPI.getActive(),
      notifAPI.getUnreadCount(),
    ]).then(([p, b, n]) => {
      if (p.status === 'fulfilled') {
        setProfile(p.value.data)
        const apiContacts = p.value.data.emergencyContacts || []
        // Prefer API contacts; if empty, keep localStorage ones
        if (apiContacts.length > 0) {
          setContacts(apiContacts)
          localStorage.setItem(LOCAL_KEY, JSON.stringify(apiContacts))
        }
      }
      if (b.status === 'fulfilled') setBooking(b.value.data)
      if (n.status === 'fulfilled') setUnread(n.value.data?.count || 0)
    })
    return () => clearInterval(holdTimer)
  }, [])

  // Email every trusted contact that has an email address. mapsUrl is null when
  // we couldn't get GPS — the backend then sends a "need help, in danger" message.
  const dispatchAlerts = async (mapsUrl: string | null) => {
    const recipients = contacts.filter(c => c.email)
    if (recipients.length === 0) {
      toast.error('Add an email to a trusted contact so they can be alerted (tap Edit below).')
      return
    }
    const fromName = profile?.fullName || 'An OTW user'
    const t = toast.loading('Sending emergency alert…')
    try {
      await Promise.all(recipients.map(c =>
        sosAPI.sendAlert({ toEmail: c.email!, toName: c.name, fromName, mapsUrl })
      ))
      toast.dismiss(t)
      toast.success(
        mapsUrl
          ? `Live location emailed to ${recipients.length} contact${recipients.length > 1 ? 's' : ''}`
          : `Alert emailed: “I need help — I'm in danger”`,
        { duration: 6000 }
      )
    } catch {
      toast.dismiss(t)
      toast.error('Could not send the email alert. Please call your contacts directly.', { duration: 6000 })
    }
  }

  // Get GPS, then email the alert. Falls back to no-location if GPS is denied/unavailable.
  const sendLocationAlert = () => {
    const finish = (mapsUrl: string | null) => dispatchAlerts(mapsUrl)
    if (typeof navigator === 'undefined' || !navigator.geolocation) { finish(null); return }
    navigator.geolocation.getCurrentPosition(
      pos => finish(`https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`),
      ()  => finish(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  const startHold = () => {
    if (activated) return
    setHolding(true)
    let p = 0
    holdTimer = setInterval(() => {
      p += 3.33
      setProgress(p)
      if (p >= 100) {
        clearInterval(holdTimer)
        setActivated(true)
        setHolding(false)
        sendLocationAlert()
      }
    }, 100)
  }
  const stopHold = () => {
    clearInterval(holdTimer)
    if (!activated) { setHolding(false); setProgress(0) }
  }

  const initials = profile?.fullName?.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase() || 'AK'

  const quickActions = [
    { icon:I.phone, number:'112', title:'Police Emergency',       desc:'Lebanese Internal Security Forces — dial in any emergency', bg:'#FEE2E2', color:'#DC2626', onClick: undefined as (undefined | (() => void)) },
    { icon:I.phone, number:'140', title:'Lebanese Red Cross',     desc:'Medical emergencies & ambulance service across Lebanon',    bg:'#FEE2E2', color:'#DC2626', onClick: undefined as (undefined | (() => void)) },
    { icon:I.share, number:null,  title:'Share live location',    desc:'Email your GPS location to all trusted contacts right now', bg:'#EFF6FF', color:'#2563EB', onClick: sendLocationAlert },
    { icon:I.pin,   number:null,  title:'Nearest safe place',     desc:'Find police stations, hospitals & Red Cross centres nearby',bg:'#F0FDF4', color:'#16A34A', onClick: undefined as (undefined | (() => void)) },
  ]

  return (
    <Layout title="SOS" role={role} userInitials={initials} unreadCount={unread}>
      <div style={{maxWidth:700,margin:'0 auto',padding:'24px 20px'}}>

        {/* Main SOS card */}
        <div style={{background:'#FEE2E2',border:'1px solid #FECACA',borderRadius:16,padding:28,marginBottom:16,textAlign:'center'}}>
          <div style={{width:56,height:56,background:'#DC2626',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}>
            <span style={{width:28,height:28,color:'white',display:'flex'}}>{I.sos}</span>
          </div>
          <div style={{fontSize:22,fontWeight:700,color:'#991B1B',marginBottom:8}}>SOS Emergency</div>
          <div style={{fontSize:13,color:'#B91C1C',lineHeight:1.6,marginBottom:24,maxWidth:380,margin:'0 auto 24px'}}>
            Hold the button to alert emergency services and your trusted contacts with your live location.
          </div>

          {/* Hold button */}
          <button
            onMouseDown={startHold} onMouseUp={stopHold}
            onTouchStart={startHold} onTouchEnd={stopHold}
            disabled={activated}
            style={{width:'100%',padding:'18px 24px',background:activated?'#991B1B':holding?'#B91C1C':'#DC2626',color:'white',border:'none',borderRadius:8,fontSize:15,fontWeight:700,cursor:activated?'default':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:10,letterSpacing:1,position:'relative',overflow:'hidden',userSelect:'none'}}>
            {holding && <div style={{position:'absolute',left:0,top:0,height:'100%',width:`${progress}%`,background:'rgba(255,255,255,0.2)',transition:'width .1s linear'}}/>}
            <span style={{width:20,height:20,display:'flex',position:'relative',zIndex:1}}>{I.sos}</span>
            <span style={{position:'relative',zIndex:1}}>{activated?'SOS ACTIVATED':holding?`HOLD... ${Math.round(progress)}%`:'HOLD TO ACTIVATE'}</span>
          </button>
        </div>

        {/* Quick actions */}
        <div className="card" style={{marginBottom:16}}>
          <div style={{fontSize:15,fontWeight:600,color:'var(--text)',marginBottom:14}}>Emergency numbers & actions</div>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {quickActions.map((a,i) => (
              <div key={i} onClick={a.onClick}
                role={a.onClick ? 'button' : undefined} tabIndex={a.onClick ? 0 : undefined}
                onKeyDown={a.onClick ? (e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); a.onClick!() } }) : undefined}
                style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',borderRadius:10,background:a.bg,cursor:a.onClick?'pointer':'default'}}>
                <div style={{width:42,height:42,borderRadius:10,background:a.color,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <span style={{width:18,height:18,color:'white',display:'flex'}}>{a.icon}</span>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2}}>
                    {a.number && (
                      <span style={{fontSize:15,fontWeight:800,color:a.color,letterSpacing:.5}}>{a.number}</span>
                    )}
                    <span style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>{a.title}</span>
                  </div>
                  <div style={{fontSize:12,color:'var(--text3)',lineHeight:1.4}}>{a.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Current ride info */}
        {booking && (
          <div className="card" style={{marginBottom:12}}>
            <div style={{fontSize:14,fontWeight:600,color:'var(--text)',marginBottom:10}}>Current ride</div>
            <div className="row"><span style={{fontSize:13,color:'var(--text3)'}}>Driver</span><span style={{fontSize:13,fontWeight:500,color:'var(--text)'}}>{booking.driver?.fullName||'—'}</span></div>
            <div className="row"><span style={{fontSize:13,color:'var(--text3)'}}>Plate</span><span style={{fontSize:13,fontWeight:500,color:'var(--text)'}}>{booking.driver?.car?.plateNumber||'—'}</span></div>
            <div className="row"><span style={{fontSize:13,color:'var(--text3)'}}>Route</span><span style={{fontSize:13,color:'var(--text)'}}>{booking.ride?.fromLocation} → {booking.ride?.toLocation}</span></div>
          </div>
        )}

        {/* Trusted contacts */}
        <div className="card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <div style={{fontSize:15,fontWeight:600,color:'var(--text)'}}>Trusted contacts</div>
            <button style={{background:'none',border:'none',cursor:'pointer',fontSize:13,color:'var(--blue)',fontWeight:600,display:'flex',alignItems:'center',gap:4}}
              onClick={()=>router.push(`/${role.toLowerCase()}/emergency`)}>
              <span style={{width:13,height:13,display:'flex'}}>{I.edit}</span> Edit
            </button>
          </div>
          {contacts.length === 0 ? (
            <div style={{textAlign:'center',padding:'16px 0'}}>
              <div style={{fontSize:13,color:'var(--text3)',marginBottom:12}}>No emergency contacts added yet</div>
              <button className="btn btn-primary btn-sm" style={{display:'inline-flex',alignItems:'center',gap:5}}
                onClick={()=>router.push(`/${role.toLowerCase()}/emergency`)}>
                <span style={{width:13,height:13,display:'flex'}}>{I.plus}</span> Add contacts
              </button>
            </div>
          ) : contacts.map((c,i) => (
            <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:i<contacts.length-1?'1px solid var(--border)':'none'}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:32,height:32,borderRadius:'50%',background:'var(--red-l)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <span style={{fontSize:11,fontWeight:700,color:'var(--red)'}}>{c.name.slice(0,2).toUpperCase()}</span>
                </div>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:500,color:'var(--text)'}}>{c.name}</div>
                  <div style={{fontSize:12,color:'var(--text3)'}}>{c.phone}</div>
                </div>
              </div>
              {c.email
                ? <span style={{fontSize:12,color:'var(--text3)',display:'flex',alignItems:'center',gap:5,maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    <span style={{width:14,height:14,color:'var(--text4)',display:'flex',flexShrink:0}}>{I.mail}</span>{c.email}
                  </span>
                : <span style={{fontSize:11,color:'var(--amber)'}}>No email</span>}
            </div>
          ))}
        </div>

      </div>
    </Layout>
  )
}
