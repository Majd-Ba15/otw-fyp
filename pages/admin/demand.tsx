import { useEffect, useState } from 'react'
import Layout from '../../components/layout/Layout'
import { demandAPI, notifAPI, userAPI } from '../../services/api'
import toast from 'react-hot-toast'

// "20 min ago" / "2 hours ago" / "3 days ago" from an ISO timestamp
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60000)     return 'just now'
  if (diff < 3600000)   return `${Math.round(diff / 60000)} min ago`
  if (diff < 86400000)  return `${Math.round(diff / 3600000)} hour${Math.round(diff / 3600000) > 1 ? 's' : ''} ago`
  return `${Math.round(diff / 86400000)} day${Math.round(diff / 86400000) > 1 ? 's' : ''} ago`
}

export default function AdminDemandPlanning() {
  const [profile, setProfile] = useState<any>(null)
  const [requests, setRequests] = useState<any[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(true)
  // Request ids in their 60s post-notify cooldown (button disabled)
  const [cooldown, setCooldown] = useState<Record<number, boolean>>({})

  const load = async () => {
    const [p, d, n] = await Promise.allSettled([
      userAPI.getMe(),
      demandAPI.getOpenDemand(),
      notifAPI.getUnreadCount(),
    ])
    if (p.status === 'fulfilled') setProfile(p.value.data)
    if (d.status === 'fulfilled') setRequests(d.value.data || [])
    if (n.status === 'fulfilled') setUnread(n.value.data?.count || 0)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const notify = async (r: any) => {
    const id = r.requestId
    const count = r.availableDriverCount || 0
    if (count === 0 || cooldown[id]) return
    setCooldown(c => ({ ...c, [id]: true }))
    try {
      await demandAPI.notifyDrivers(id)
      toast.success(`Notified ${count} driver${count > 1 ? 's' : ''}`)
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not notify drivers')
      setCooldown(c => ({ ...c, [id]: false }))   // failed — let admin retry immediately
      return
    }
    // Keep the button disabled for 60s to avoid spamming the same drivers
    setTimeout(() => setCooldown(c => ({ ...c, [id]: false })), 60000)
  }

  const initials = profile?.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'AD'
  const withDrivers = requests.filter((r: any) => (r.availableDriverCount || 0) > 0).length

  return (
    <Layout title="Demand planning" role="Admin" userInitials={initials} userName={profile?.fullName} unreadCount={unread}>
      <div className="page-inner">
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Unmet demand</h1>
        <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>
          Rider requests no driver has accepted yet. Notify available drivers to fill the gap.
        </div>

        {loading ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--text3)' }}>Loading...</div>
        ) : requests.length === 0 ? (
          <div className="card" style={{ color: 'var(--text3)' }}>No open requests right now — every rider request has a driver.</div>
        ) : (
          <>
            <div className="card" style={{ marginBottom: 12, fontSize: 13, color: 'var(--text2)' }}>
              <strong style={{ color: 'var(--text)' }}>{requests.length}</strong> open request{requests.length > 1 ? 's' : ''} waiting
              {' · '}<strong style={{ color: 'var(--text)' }}>{withDrivers}</strong> have available drivers nearby
            </div>

            {requests.map((r: any) => {
              const count = r.availableDriverCount || 0
              const disabled = count === 0 || !!cooldown[r.requestId]
              return (
                <div key={r.requestId} className="card" style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{r.fromLocation} → {r.toLocation}</div>
                      <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>
                        {new Date(r.requestedTime).toLocaleString('en', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                        {' · '}{r.seatsNeeded} seat{r.seatsNeeded > 1 ? 's' : ''}
                        {' · '}requested {timeAgo(r.createdAt)}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, marginTop: 6, color: count > 0 ? 'var(--green,#16a36b)' : 'var(--red,#EF4444)' }}>
                        ● {count > 0
                          ? `${count} driver${count > 1 ? 's' : ''} available around that time`
                          : 'No drivers available at that time'}
                      </div>
                    </div>
                    <button
                      className="btn btn-primary"
                      disabled={disabled}
                      onClick={() => notify(r)}
                      style={{ whiteSpace: 'nowrap', opacity: disabled ? 0.5 : 1 }}>
                      {count > 0 ? `Notify ${count} driver${count > 1 ? 's' : ''}` : 'No drivers to notify'}
                    </button>
                  </div>
                </div>
              )
            })}

            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 12, lineHeight: 1.6 }}>
              When you tap Notify, only drivers whose availability overlaps that route and time are messaged — never all
              drivers. Rows with no available driver are an honest supply gap.
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
