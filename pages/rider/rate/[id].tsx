import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout, { I } from '../../../components/layout/Layout'
import { ratingAPI, bookingAPI, userAPI } from '../../../services/api'
import toast from 'react-hot-toast'

const TAGS   = ['Punctual','Friendly','Clean car','Safe driver','Good conversation','Comfortable ride']
const LABELS = ['','Terrible','Poor','Fair','Good','Excellent']

export default function RateDriver() {
  const router  = useRouter()
  const { id }  = router.query

  const [profile,  setProfile]  = useState<any>(null)
  const [bookings, setBookings] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [rating,   setRating]   = useState(0)
  const [hovered,  setHovered]  = useState(0)
  const [tags,     setTags]     = useState<string[]>([])
  const [comment,  setComment]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [loadingB, setLoadingB] = useState(true)

  useEffect(() => {
    Promise.allSettled([
      userAPI.getMe(),
      bookingAPI.getHistory(),
    ]).then(([p, h]) => {
      if (p.status === 'fulfilled') setProfile(p.value.data)

      let list: any[] = h.status === 'fulfilled' ? (h.value.data || []) : []
      // Only show completed/confirmed bookings with valid ride and driver data
      const completedList = list.filter((b: any) => {
        if (b.status !== 'Completed' && b.status !== 'Confirmed') return false
        if (!b.ride || !b.ride.driver) return false
        if (!b.ride.driver.fullName) return false
        return true
      })
      setBookings(completedList)

      // Pre-select if id was provided in URL
      if (id && completedList.length > 0) {
        const found = completedList.find((b: any) => String(b.bookingId) === String(id) || String(b.id) === String(id))
        if (found) {
          setSelected({ ...found, driver: found.ride?.driver })
        }
      }
      setLoadingB(false)
    })
  }, [id])

  const select = (booking: any) => {
    // Always use ride.driver as the source of truth
    const selectedBooking = {
      ...booking,
      driver: booking.ride?.driver,
    }
    setSelected(selectedBooking)
    setRating(0)
    setHovered(0)
    setTags([])
    setComment('')
    // Scroll to rating form after a tick
    setTimeout(() => document.getElementById('rate-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }

  const submit = async () => {
    if (!selected) { toast.error('Please select a driver first'); return }
    if (!rating)   { toast.error('Please select a rating'); return }
    setLoading(true)
    try {
      const driverUserId = selected.ride?.driver?.userId
      if (!driverUserId) { toast.error('Driver information not available'); setLoading(false); return }

      const payload: any = {
        stars: rating,
        bookingId: selected.bookingId,
        ratedUserId: driverUserId,
      }
      if (comment) payload.comment = comment
      if (tags?.length > 0) payload.tags = tags.join(',')

      await ratingAPI.rate(payload)
      toast.success('Rating submitted! Thank you.')
      router.push('/rider/history')
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to submit rating')
    } finally { setLoading(false) }
  }

  const initials = profile?.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'AK'

  const fmtDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' }) }
    catch { return iso }
  }

  return (
    <Layout title="Rate driver" role="Rider" showBack userInitials={initials}>
      <div className="page-inner" style={{ maxWidth: 520 }}>

        {/* Step 1 — pick a driver */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Rate a driver</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 14 }}>Select a ride from your history to rate the driver.</div>

          {loadingB ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text3)', fontSize: 13 }}>Loading rides...</div>
          ) : bookings.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
              <div style={{ fontSize: 13, color: 'var(--text3)' }}>No completed rides to rate yet.</div>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {bookings.map((b: any, i: number) => {
                const isSelected = selected && (selected.bookingId || selected.id) === (b.bookingId || b.id)
                const driverName = b.ride?.driver?.fullName || 'Driver'
                const driverInit = (b.ride?.driver?.fullName || 'DR').slice(0, 2).toUpperCase()
                const from = b.ride?.fromLocation || ''
                const to   = b.ride?.toLocation   || ''
                const date = b.ride?.departureTime || ''
                return (
                  <div key={b.bookingId || b.id}
                    onClick={() => select(b)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '14px 16px',
                      borderBottom: i < bookings.length - 1 ? '1px solid var(--border)' : 'none',
                      cursor: 'pointer',
                      background: isSelected ? 'var(--blue-l)' : 'transparent',
                      transition: 'background .15s',
                    }}>
                    {/* Selection indicator */}
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                      border: `2px solid ${isSelected ? 'var(--blue)' : 'var(--border2)'}`,
                      background: isSelected ? 'var(--blue)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {isSelected && <span style={{ width: 10, height: 10, color: 'white', display: 'flex' }}>{I.check}</span>}
                    </div>

                    {/* Avatar */}
                    <div className="av" style={{ width: 40, height: 40, fontSize: 13, flexShrink: 0 }}>{driverInit}</div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{driverName}</div>
                      <div style={{ fontSize: 12, color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {from} → {to}
                      </div>
                      {date && <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 1 }}>{fmtDate(date)}</div>}
                    </div>

                    {/* Rating */}
                    {b.ride?.driver?.averageRating && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, color: '#F59E0B', flexShrink: 0 }}>
                        <span style={{ width: 12, height: 12, display: 'flex' }}>{I.starF}</span>
                        {b.ride?.driver?.averageRating}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Step 2 — rating form (appears when driver selected) */}
        {selected && (
          <div id="rate-form">
            <div style={{ height: 1, background: 'var(--border)', marginBottom: 20 }} />

            {/* Selected driver header */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div className="av av-xl" style={{ margin: '0 auto 12px' }}>
                {(selected.ride?.driver?.fullName || 'DR').slice(0, 2).toUpperCase()}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
                {selected.ride?.driver?.fullName || 'Driver'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 3 }}>
                {selected.ride?.fromLocation || selected.fromLocation} → {selected.ride?.toLocation || selected.toLocation}
              </div>
            </div>

            {/* Stars */}
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 12 }}>How was your ride?</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                    onMouseEnter={() => setHovered(n)} onMouseLeave={() => setHovered(0)}
                    onClick={() => setRating(n)}>
                    <span style={{ width: 36, height: 36, color: (hovered || rating) >= n ? '#F59E0B' : 'var(--border2)', display: 'flex', transition: 'color .1s' }}>
                      {(hovered || rating) >= n ? I.starF : I.star}
                    </span>
                  </button>
                ))}
              </div>
              {(hovered || rating) > 0 && (
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text3)' }}>{LABELS[hovered || rating]}</div>
              )}
            </div>

            {/* Tags */}
            <div className="card">
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>What did you like?</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {TAGS.map(t => (
                  <button key={t} className={`chip ${tags.includes(t) ? 'active' : ''}`}
                    onClick={() => setTags(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t])}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Comment */}
            <div className="card">
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Additional comments (optional)</div>
              <textarea className="input" rows={3} placeholder="Share more about your experience..."
                value={comment} onChange={e => setComment(e.target.value)} />
            </div>

            <button className="btn btn-primary btn-full btn-lg" onClick={submit} disabled={loading || !rating}>
              {loading ? 'Submitting...' : 'Submit rating'}
            </button>
            <button className="btn btn-secondary btn-full" style={{ marginTop: 8 }} onClick={() => router.push('/rider/history')}>
              Skip for now
            </button>
          </div>
        )}
      </div>
    </Layout>
  )
}
