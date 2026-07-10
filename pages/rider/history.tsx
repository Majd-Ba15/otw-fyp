import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout, { I } from '../../components/layout/Layout'
import { bookingAPI, userAPI, notifAPI } from '../../services/api'

export default function RiderHistory() {
  const router = useRouter()
  const [profile,  setProfile]  = useState<any>(null)
  const [bookings, setBookings] = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState('All')
  const [unread,   setUnread]   = useState(0)

  useEffect(() => {
    Promise.allSettled([
      userAPI.getMe(),
      bookingAPI.getHistory(),
      notifAPI.getUnreadCount(),
    ]).then(([p, b, n]) => {
      if (p.status === 'fulfilled') setProfile(p.value.data)
      if (b.status === 'fulfilled') setBookings(b.value.data || [])
      else setBookings([
        { bookingId:1, status:'Completed', totalPaid:8,  ride:{ fromLocation:'UTM Main Gate',       toLocation:'KL Sentral',    departureTime:'2024-01-10T17:30:00' }, driver:{ fullName:'Sarah Tan',  initials:'ST', averageRating:4.9 }, myRating:5 },
        { bookingId:2, status:'Completed', totalPaid:5,  ride:{ fromLocation:'Faculty of Computing', toLocation:'Paradigm Mall', departureTime:'2024-01-08T14:00:00' }, driver:{ fullName:'Ahmad Rizal',initials:'AR', averageRating:4.7 }, myRating:4 },
        { bookingId:3, status:'Cancelled', totalPaid:6,  ride:{ fromLocation:'UTM Skudai',           toLocation:'AEON Tebrau',   departureTime:'2024-01-05T11:00:00' }, driver:{ fullName:'Lee Wei Ming',initials:'LW', averageRating:4.6 }, myRating:null },
        { bookingId:4, status:'Completed', totalPaid:10, ride:{ fromLocation:'Kolej Tun Hussein Onn',toLocation:'JB Sentral',    departureTime:'2024-01-02T09:00:00' }, driver:{ fullName:'Nurul Izzah', initials:'NI', averageRating:4.8 }, myRating:5 },
      ])
      if (n.status === 'fulfilled') setUnread(n.value.data?.count || 0)
      setLoading(false)
    })
  }, [])

  const initials    = profile?.fullName?.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase() || 'AK'
  const filtered    = tab === 'All' ? bookings : bookings.filter(b => b.status === tab)
  const isPaidBooking = (b: any) => b.status === 'Completed' || b.status === 'Confirmed'
  const bookingAmount = (b: any) => isPaidBooking(b) ? (b.seatsBooked || 1) * (b.ride?.pricePerSeat || 0) : 0
  const totalSpent  = bookings.reduce((s:number,b:any)=>s + bookingAmount(b),0)
  const completedCt = bookings.filter(isPaidBooking).length

  const stars = (n:number) => Array.from({length:5},(_,i)=>(
    <span key={i} style={{width:13,height:13,color:i<n?'#F59E0B':'var(--border2)',display:'inline-flex'}}>{i<n?I.starF:I.star}</span>
  ))

  return (
    <Layout title="History" role="Rider" userInitials={initials} unreadCount={unread}>
      <div className="page-inner">
        {/* Summary */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
          <div className="stat-card" style={{textAlign:'center'}}>
            <div style={{fontSize:28,fontWeight:700,color:'var(--green)'}}>{completedCt}</div>
            <div className="stat-label" style={{textAlign:'center'}}>Rides taken</div>
          </div>
          <div className="stat-card" style={{textAlign:'center'}}>
            <div style={{fontSize:28,fontWeight:700,color:'var(--green)'}}>${totalSpent}</div>
            <div className="stat-label" style={{textAlign:'center'}}>Total spent</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{display:'flex',gap:0,background:'var(--bg2)',borderRadius:8,padding:3,marginBottom:14}}>
          {['All','Completed','Confirmed','Cancelled'].map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:'7px 0',border:'none',borderRadius:6,background:tab===t?'var(--bg-card)':'transparent',fontWeight:tab===t?600:400,fontSize:13,color:tab===t?'var(--text)':'var(--text3)',cursor:'pointer',boxShadow:tab===t?'var(--shadow-sm)':'none',transition:'all .15s'}}>{t}</button>
          ))}
        </div>

        {loading ? (
          <div style={{textAlign:'center',padding:'40px',color:'var(--text3)',fontSize:13}}>Loading...</div>
        ) : filtered.map((b:any) => (
          <div key={b.bookingId} className="card card-hover" style={{cursor:(b.status==='Completed'||b.status==='Confirmed')&&!b.myRating?'pointer':'default',marginBottom:10}} onClick={()=>(b.status==='Completed'||b.status==='Confirmed')&&!b.myRating&&router.push(`/rider/rate/${b.bookingId}`)}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
              <div className="av">{b.ride?.driver?.initials||b.ride?.driver?.fullName?.slice(0,2).toUpperCase()||'DR'}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>
                  {b.ride?.driver?.fullName || 'Driver'}
                  {(b.status==='Completed'||b.status==='Confirmed')&&!b.myRating && (
                    <span style={{fontSize:11,marginLeft:6,color:'var(--blue)',fontWeight:500}}>Rate driver</span>
                  )}
                </div>
                <div style={{display:'flex',alignItems:'center',gap:4,fontSize:12,color:'#F59E0B'}}>
                  <span style={{width:12,height:12,display:'flex'}}>{I.starF}</span>{b.ride?.driver?.averageRating||'N/A'}
                </div>
              </div>
              <span className={`badge ${b.status==='Completed'?'badge-green':b.status==='Cancelled'?'badge-red':'badge-amber'}`}>{b.status}</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'var(--text3)',marginBottom:6}}>
              <span style={{width:12,height:12,display:'flex'}}>{I.pin}</span>
              {b.ride?.fromLocation} <span>→</span> {b.ride?.toLocation}
            </div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:12,color:'var(--text3)'}}>
              <div style={{display:'flex',gap:10}}>
                <span style={{display:'flex',alignItems:'center',gap:3}}><span style={{width:11,height:11,display:'flex'}}>{I.clock}</span>{new Date(b.ride?.departureTime).toLocaleDateString('en',{day:'numeric',month:'short',year:'numeric'})}</span>
                <span style={{display:'flex',alignItems:'center',gap:3}}><span style={{width:11,height:11,display:'flex'}}>{I.clock}</span>{new Date(b.ride?.departureTime).toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit'})}</span>
              </div>
              <span style={{fontSize:13,fontWeight:600,color:isPaidBooking(b)?'var(--green)':'var(--text3)'}}>
                {isPaidBooking(b) ? `$${bookingAmount(b).toFixed(2)}` : 'No charge'}
              </span>
            </div>
            {b.myRating && (
              <div style={{marginTop:8,display:'flex',alignItems:'center',gap:4,fontSize:12,color:'var(--text3)'}}>
                Your rating: {stars(b.myRating)}
              </div>
            )}
          </div>
        ))}
      </div>
    </Layout>
  )
}
