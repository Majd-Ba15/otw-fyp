import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout, { I } from '../../../components/layout/Layout'
import { rideAPI, ratingAPI, userAPI, notifAPI } from '../../../services/api'
import toast from 'react-hot-toast'

export default function RateRiders() {
  const router = useRouter()
  const { id } = router.query
  const [profile,    setProfile]    = useState<any>(null)
  const [passengers, setPassengers] = useState<any[]>([])
  const [ratings,    setRatings]    = useState<Record<number,{rating:number,comment:string}>>({})
  const [loading,    setLoading]    = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [unread,     setUnread]     = useState(0)

  useEffect(() => {
    Promise.allSettled([
      userAPI.getMe(),
      id ? rideAPI.getPassengers(Number(id)) : Promise.reject(),
      notifAPI.getUnreadCount(),
    ]).then(([p, pas, n]) => {
      if (p.status === 'fulfilled') setProfile(p.value.data)

      // Only show confirmed/completed bookings with valid rider data
      const pasData = pas.status === 'fulfilled' ? (pas.value.data || []) : []
      const realPassengers = pasData.filter((p: any) => {
        if (!p.rider || !p.rider.fullName) return false
        if (p.status !== 'Confirmed' && p.status !== 'Completed') return false
        return true
      })

      setPassengers(realPassengers.length > 0 ? realPassengers : [])
      if (n.status === 'fulfilled') setUnread(n.value.data?.count || 0)
      setLoading(false)
    })
  }, [id])

  const setRating  = (pid:number, val:number) => setRatings(p => ({ ...p, [pid]:{ ...p[pid], rating:val, comment:p[pid]?.comment||'' } }))
  const setComment = (pid:number, val:string) => setRatings(p => ({ ...p, [pid]:{ ...p[pid], rating:p[pid]?.rating||0, comment:val } }))

  const submit = async () => {
    setSubmitting(true)
    try {
      await Promise.all(passengers.map(p => {
        const r = ratings[p.bookingId]
        if (r?.rating) {
          const payload: any = {
            bookingId: p.bookingId,
            stars: r.rating,
            ratedUserId: p.rider?.userId,
          }
          if (r.comment) payload.comment = r.comment
          return ratingAPI.rate(payload)
        }
        return Promise.resolve()
      }))
      toast.success('Ratings submitted! Thank you.')
      router.push('/driver/history')
    } catch { toast.error('Failed to submit some ratings') }
    finally { setSubmitting(false) }
  }

  const initials = profile?.fullName?.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase() || 'SM'
  const allRated = passengers.every(p => ratings[p.bookingId]?.rating > 0)

  return (
    <Layout role="Driver" showBack userInitials={initials} unreadCount={unread}>
      <div className="page-inner">
        <h1 style={{fontSize:20,fontWeight:700,color:'var(--text)',marginBottom:4}}>Rate your riders</h1>
        <p style={{fontSize:13,color:'var(--text3)',marginBottom:16}}>Ride #{id}</p>

        {loading ? (
          <div style={{textAlign:'center',padding:'40px',color:'var(--text3)',fontSize:13}}>Loading passengers...</div>
        ) : passengers.length === 0 ? (
          <div className="card" style={{textAlign:'center',padding:'40px'}}>
            <div style={{fontSize:13,color:'var(--text3)'}}>No confirmed riders to rate yet.</div>
          </div>
        ) : passengers.map(p => (
          <div key={p.bookingId} className="card" style={{marginBottom:10}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
              <div className="av">{p.rider?.initials||p.rider?.fullName?.slice(0,2).toUpperCase()}</div>
              <div style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>{p.rider?.fullName}</div>
            </div>
            {/* Stars */}
            <div style={{display:'flex',gap:4,marginBottom:10}}>
              {[1,2,3,4,5].map(n => (
                <button key={n} style={{background:'none',border:'none',cursor:'pointer',padding:2}} onClick={()=>setRating(p.bookingId,n)}>
                  <span style={{width:26,height:26,color:(ratings[p.bookingId]?.rating||0)>=n?'#F59E0B':'var(--border2)',display:'flex',transition:'color .1s'}}>
                    {(ratings[p.bookingId]?.rating||0)>=n ? I.starF : I.star}
                  </span>
                </button>
              ))}
              {ratings[p.bookingId]?.rating > 0 && (
                <span style={{fontSize:12,color:'var(--text3)',alignSelf:'center',marginLeft:6}}>
                  {['','Terrible','Poor','Fair','Good','Excellent'][ratings[p.bookingId].rating]}
                </span>
              )}
            </div>
            <textarea className="input" rows={2} placeholder="Optional comment.."
              value={ratings[p.bookingId]?.comment||''} onChange={e=>setComment(p.bookingId,e.target.value)}/>
          </div>
        ))}

        {passengers.length > 0 && (
          <button className="btn btn-blue btn-full btn-lg" onClick={submit} disabled={submitting}>
            {submitting ? 'Submitting...' : allRated ? 'Submit ratings' : 'Submit ratings (partial)'}
          </button>
        )}
      </div>
    </Layout>
  )
}
