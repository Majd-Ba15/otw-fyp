import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout, { I } from '../../../components/layout/Layout'
import { rideAPI, bookingAPI, userAPI } from '../../../services/api'
import toast from 'react-hot-toast'

export default function ConfirmBooking() {
  const router = useRouter()
  const { rideId } = router.query
  const [ride, setRide] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [seats, setSeats] = useState(1)
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    userAPI.getMe().then(r=>setProfile(r.data)).catch(()=>{})
    if (!rideId) return

    // Load from sessionStorage immediately (set when user clicked the ride)
    try {
      const cached = sessionStorage.getItem('otw_ride_preview')
      if (cached) {
        const data = JSON.parse(cached)
        if (String(data.rideId) === String(rideId)) setRide(data)
      }
    } catch {}

    // Fetch fresh data from API — guard against 0 / NaN ids
    const numId = Number(rideId)
    if (numId && !isNaN(numId)) {
      rideAPI.getById(numId)
        .then(r => { if (r.data) setRide(r.data) })
        .catch(() => {})
    }
  },[rideId])
  const confirm = async () => {
    setLoading(true)
    try {
      await bookingAPI.book({ rideId:Number(rideId), seatsBooked:seats })
      toast.success('Booking request sent. Waiting for driver approval.')
      router.push('/rider/dashboard')
    } catch(e:any) { toast.error(e.response?.data?.message||'Could not send booking request') }
    finally { setLoading(false) }
  }
  const initials = profile?.fullName?.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase()||'AK'
  const total = (ride?.pricePerSeat||0)*seats
  return (
    <Layout role="Rider" showBack userInitials={initials}>
      <div className="page-inner" style={{maxWidth:520}}>
        <h1 style={{fontSize:20,fontWeight:700,color:'var(--text)',marginBottom:16}}>Request to book</h1>
        {ride && (
          <>
            <div className="notice notice-blue">
              <span style={{width:16,height:16,display:'flex'}}>{I.info}</span>
              <div><div style={{fontWeight:600}}>Pending driver approval</div><div>Your request is sent to the driver first. The trip is confirmed only after the driver accepts it.</div></div>
            </div>
            <div className="card">
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
                <div className="av">{ride.driver?.initials}</div>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>{ride.driver?.fullName}</div>
                  <div style={{fontSize:12,color:'var(--text3)'}}>{ride.car?.model} · {ride.car?.colour} · {ride.car?.plateNumber}</div>
                </div>
              </div>
              <div style={{marginBottom:10}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                  <div className="rdot-g"/>
                  <div>
                    <div style={{fontSize:10,color:'var(--text3)',textTransform:'uppercase',letterSpacing:.05}}>From</div>
                    <div style={{fontSize:13,fontWeight:500}}>{ride.fromLocation}</div>
                  </div>
                </div>
                <div className="rconn"/>
                <div style={{display:'flex',alignItems:'center',gap:8,marginTop:4}}>
                  <div className="rdot-r"/>
                  <div>
                    <div style={{fontSize:10,color:'var(--text3)',textTransform:'uppercase',letterSpacing:.05}}>To</div>
                    <div style={{fontSize:13,fontWeight:500}}>{ride.toLocation}</div>
                  </div>
                </div>
              </div>
              <div style={{display:'flex',gap:16,fontSize:12,color:'var(--text3)',borderTop:'1px solid var(--border)',paddingTop:10}}>
                <span style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:12,height:12,display:'flex'}}>{I.clock}</span>{new Date(ride.departureTime).toLocaleDateString('en',{weekday:'short',day:'numeric',month:'short',year:'numeric'})}</span>
                <span style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:12,height:12,display:'flex'}}>{I.clock}</span>{new Date(ride.departureTime).toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit'})}</span>
              </div>
            </div>
            <div className="card">
              <div style={{fontSize:14,fontWeight:600,color:'var(--text)',marginBottom:12}}>Seats to request</div>
              <div style={{position:'relative'}}>
                <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',width:15,height:15,color:'var(--text3)',display:'flex'}}>{I.users}</span>
                <select className="input" style={{paddingLeft:32}} value={seats} onChange={e=>setSeats(parseInt(e.target.value))}>
                  {Array.from({length:ride.availableSeats},(_, i)=><option key={i+1} value={i+1}>{i+1} seat</option>)}
                </select>
              </div>
              <div style={{fontSize:12,color:'var(--text3)',marginTop:6}}>{ride.availableSeats} seats available</div>
            </div>
            <div className="card">
              <div style={{fontSize:14,fontWeight:600,color:'var(--text)',marginBottom:12}}>Price summary</div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:13,color:'var(--text2)',marginBottom:8}}>
                <span>Trip fare ({seats} seat × ${ride.pricePerSeat})</span>
                <span>${ride.pricePerSeat*seats}</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:14,fontWeight:700,color:'var(--text)',borderTop:'1px solid var(--border)',paddingTop:10}}>
                <span>Total</span>
                <span style={{color:'var(--green)'}}>${total}</span>
              </div>
            </div>
            <div className="notice notice-amber">
              <span style={{width:16,height:16,display:'flex'}}>{I.info}</span>
              <div><div style={{fontWeight:600}}>Pay cash to driver</div><div>Payment is made directly to the driver at pickup or drop-off.</div></div>
            </div>
            <button className="btn btn-primary btn-full btn-lg" onClick={confirm} disabled={loading}>
              {loading ? 'Sending request...' : `Send request to book - $${total}`}
            </button>
          </>
        )}
      </div>
    </Layout>
  )
}
