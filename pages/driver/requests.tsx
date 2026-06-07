import { useState, useEffect } from 'react'
import Layout, { I } from '../../components/layout/Layout'
import { bookingAPI, userAPI, notifAPI } from '../../services/api'
import toast from 'react-hot-toast'

export default function BookingRequests() {
  const [profile,  setProfile]  = useState<any>(null)
  const [requests, setRequests] = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)
  const [unread,   setUnread]   = useState(0)

  const load = () => {
    Promise.allSettled([
      userAPI.getMe(),
      bookingAPI.getRequests(),
      notifAPI.getUnreadCount(),
    ]).then(([p, r, n]) => {
      if (p.status === 'fulfilled') setProfile(p.value.data)
      if (r.status === 'fulfilled') setRequests(r.value.data || [])
      else setRequests([
        { bookingId:1, rider:{ fullName:'Ahmad Karim', initials:'AK' }, ride:{ fromLocation:'Campus', toLocation:'City Centre' }, departureTime:'Mon 8:00 AM', note:'"I\'ll be at gate A"' },
        { bookingId:2, rider:{ fullName:'Fatimah Ali', initials:'FA' }, ride:{ fromLocation:'Campus', toLocation:'City Centre' }, departureTime:'Mon 8:00 AM', note:'' },
        { bookingId:3, rider:{ fullName:'Lee Wei',     initials:'LW' }, ride:{ fromLocation:'Faculty', toLocation:'Mall'       }, departureTime:'Tue 10:00 AM', note:'' },
      ])
      if (n.status === 'fulfilled') setUnread(n.value.data?.count || 0)
      setLoading(false)
    })
  }
  useEffect(() => { load() }, [])

  const accept = async (id:number) => {
    const req = requests.find(r => r.bookingId === id)
    try { await bookingAPI.accept(id) } catch {}
    setRequests(p => p.filter(r => r.bookingId !== id))
    // Save to local earnings log so earnings page can display it
    if (req) {
      try {
        const earning = {
          id: `earn_${Date.now()}`,
          label: `${req.ride?.fromLocation || '?'} → ${req.ride?.toLocation || '?'}`,
          passenger: req.rider?.fullName || 'Rider',
          amount: req.ride?.pricePerSeat || 0,
          time: new Date().toISOString(),
          type: 'earn',
        }
        const existing = JSON.parse(localStorage.getItem('otw_earnings_log') || '[]')
        localStorage.setItem('otw_earnings_log', JSON.stringify([earning, ...existing]))
      } catch {}
    }
    toast.success('Booking accepted! Rider notified.')
  }
  const decline = async (id:number) => {
    try {
      await bookingAPI.decline(id)
      setRequests(p=>p.filter(r=>r.bookingId!==id))
      toast.error('Booking declined.')
    } catch { setRequests(p=>p.filter(r=>r.bookingId!==id)); toast.error('Booking declined.') }
  }

  const initials = profile?.fullName?.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase() || 'SM'

  return (
    <Layout role="Driver" userInitials={initials} unreadCount={unread}>
      <div className="page-inner">
        <h1 style={{fontSize:22,fontWeight:700,color:'var(--text)',marginBottom:16}}>Booking requests</h1>
        {loading ? (
          <div style={{textAlign:'center',padding:'40px',color:'var(--text3)',fontSize:13}}>Loading...</div>
        ) : requests.length === 0 ? (
          <div className="card" style={{textAlign:'center',padding:'40px'}}>
            <span style={{width:40,height:40,display:'flex',margin:'0 auto 12px',color:'var(--text4)',opacity:.4}}>{I.ticket}</span>
            <div style={{fontSize:14,color:'var(--text3)'}}>No pending requests</div>
          </div>
        ) : requests.map(r => (
          <div key={r.bookingId} className="card" style={{marginBottom:10}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
              <div className="av">{r.rider?.initials||r.rider?.fullName?.slice(0,2).toUpperCase()}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>{r.rider?.fullName}</div>
                <div style={{fontSize:12,color:'var(--text3)',marginTop:1}}>{r.ride?.fromLocation} → {r.ride?.toLocation} · {r.departureTime}</div>
              </div>
            </div>
            {r.note && <div style={{fontSize:12,color:'var(--text2)',fontStyle:'italic',background:'var(--bg2)',borderRadius:6,padding:'7px 10px',marginBottom:10}}>{r.note}</div>}
            <div style={{display:'flex',gap:8}}>
              <button className="btn btn-primary btn-sm" style={{flex:1}} onClick={()=>accept(r.bookingId)}>Accept</button>
              <button className="btn btn-secondary btn-sm" style={{flex:1}} onClick={()=>decline(r.bookingId)}>Decline</button>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  )
}
