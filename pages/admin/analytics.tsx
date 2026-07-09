import { useState, useEffect, useCallback } from 'react'
import Layout, { I } from '../../components/layout/Layout'
import { adminAPI, userAPI, notifAPI } from '../../services/api'

// % delta vs previous period, rendered as ↑/↓ badge
function delta(cur: number, prev: number): { text: string; up: boolean } | null {
  if (!prev && !cur) return null
  if (!prev) return { text: 'new', up: true }
  const pct = Math.round(((cur - prev) / prev) * 100)
  return { text: `${pct >= 0 ? '↑' : '↓'} ${Math.abs(pct)}%`, up: pct >= 0 }
}

export default function Analytics() {
  const [profile,   setProfile]   = useState<any>(null)
  const [raw,       setRaw]       = useState<any>(null)
  const [ai,        setAi]        = useState<any>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [loading,   setLoading]   = useState(true)
  const [unread,    setUnread]    = useState(0)
  const [days,      setDays]      = useState(7)
  const [isDemo,    setIsDemo]    = useState(false)

  const loadAiSummary = async (analyticsData: any) => {
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai/analytics-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: analyticsData }),
      })
      setAi(await res.json())
    } catch { setAi(null) }
    finally { setAiLoading(false) }
  }

  const load = useCallback(async (d: number) => {
    setLoading(true)
    try {
      const res = await adminAPI.getAnalytics(d)
      setRaw(res.data)
      setIsDemo(false)
      loadAiSummary(res.data)
    } catch {
      setRaw(null)
      setAi(null)
      setIsDemo(true)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    userAPI.getMe().then(r => setProfile(r.data)).catch(() => {})
    notifAPI.getUnreadCount().then(r => setUnread(r.data?.count || 0)).catch(() => {})
  }, [])

  useEffect(() => { load(days) }, [days, load])

  const initials = profile?.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'AD'

  // ── CSV export of the key tables ──
  const exportCsv = () => {
    if (!raw) return
    const lines: string[] = []
    const add = (title: string, header: string[], rows: any[][]) => {
      lines.push(title); lines.push(header.join(','))
      rows.forEach(r => lines.push(r.join(','))); lines.push('')
    }
    add('KPIs', ['metric', 'value'], [
      ['Total users', raw.totalUsers], ['Total rides', raw.totalRides],
      [`New users (${raw.days}d)`, raw.newUsers], [`Rides (${raw.days}d)`, raw.ridesWindow],
      ['Seat utilization %', raw.utilization], ['Open requests', raw.openRequests],
    ])
    add('Top routes', ['from', 'to', 'count'], (raw.topRoutes || []).map((r: any) => [r.fromLocation, r.toLocation, r.count]))
    add('Booking funnel', ['status', 'count'], (raw.funnel || []).map((f: any) => [f.status, f.count]))
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `otw-analytics-${raw.days}d.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  // ── Derived view values ──
  const funnelOrder = ['Pending', 'Confirmed', 'Completed', 'Declined', 'Cancelled']
  const funnel = funnelOrder.map(s => ({ status: s, count: (raw?.funnel || []).find((f: any) => f.status === s)?.count || 0 }))
  const funnelMax = Math.max(...funnel.map(f => f.count), 1)
  const statusColors: Record<string, string> = { Upcoming: '#3B82F6', Active: '#16a36b', Completed: '#10B981', Full: '#F59E0B', Cancelled: '#EF4444', Expired: '#9CA3AF' }
  const statusTotal = (raw?.statusBreakdown || []).reduce((s: number, x: any) => s + x.count, 0) || 1
  const ratingsMax = Math.max(...(raw?.ratings || []).map((r: any) => r.count), 1)

  const kpis = raw ? [
    { label: 'Total users',      val: raw.totalUsers?.toLocaleString(),        d: delta(raw.newUsers, raw.newUsersPrev),        sub: `+${raw.newUsers} in ${raw.days}d`,  icon: I.users,    c: { bg: '#EFF6FF', color: '#3B82F6' } },
    { label: 'Seat utilization', val: `${raw.utilization}%`,                    d: delta(raw.utilization, raw.utilizationPrev),  sub: 'of offered seats filled',           icon: I.car,      c: { bg: '#ECFDF5', color: '#10B981' } },
    { label: `Rides (${raw.days}d)`, val: raw.ridesWindow?.toLocaleString(),    d: delta(raw.ridesWindow, raw.ridesPrev),        sub: `${raw.totalRides?.toLocaleString()} all time`, icon: I.trending, c: { bg: '#FEF3E2', color: '#F59E0B' } },
  ] : []

  return (
    <Layout role="Admin" userInitials={initials} unreadCount={unread}>
      <div className="page-inner">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>Analytics</h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {[7, 30, 90].map(d => (
              <button key={d} className={`chip ${days === d ? 'active' : ''}`} onClick={() => setDays(d)}>{d}d</button>
            ))}
            <button className="btn btn-secondary btn-sm" onClick={exportCsv}>Export CSV</button>
          </div>
        </div>

        {isDemo && (
          <div className="notice notice-amber" style={{ marginBottom: 12 }}>
            <span style={{ width: 16, height: 16, display: 'flex', flexShrink: 0 }}>{I.info}</span>
            <span style={{ fontSize: 12 }}>Live analytics could not be loaded. Start the backend and refresh to see real data.</span>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text3)', fontSize: 13 }}>Loading...</div>
        ) : raw && (
          <>
            <div className="card" style={{ marginBottom: 16, border: '1px solid var(--blue)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ width: 17, height: 17, color: 'var(--blue)', display: 'flex' }}>{I.robot}</span>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>AI analytics summary</div>
                {aiLoading && <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 'auto' }}>Thinking...</span>}
              </div>
              {ai ? (
                <>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--blue)', marginBottom: 8 }}>{ai.headline}</div>
                  {(ai.insights || []).map((item: string, i: number) => (
                    <div key={i} style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 5 }}>- {item}</div>
                  ))}
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 8 }}>Recommended action: {ai.action}</div>
                </>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--text3)' }}>AI summary will appear here when analytics data is ready.</div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
              {kpis.map((k: any, i: number) => (
                <div key={i} className="stat-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: k.c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ width: 17, height: 17, color: k.c.color, display: 'flex' }}>{k.icon}</span>
                    </div>
                    {k.d && <span style={{ fontSize: 10, fontWeight: 600, color: k.d.up ? 'var(--green)' : '#EF4444' }}>{k.d.text}</span>}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>{k.val}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{k.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 1 }}>{k.sub}</div>
                </div>
              ))}
            </div>
            <div className="card" style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>Booking funnel ({raw.days}d)</div>
                {funnel.map(f => {
                  const isLoss = f.status === 'Declined' || f.status === 'Cancelled'
                  return (
                    <div key={f.status} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                        <span style={{ color: isLoss ? '#EF4444' : 'var(--text2)' }}>{f.status}</span>
                        <span style={{ fontWeight: 600, color: 'var(--text)' }}>{f.count}</span>
                      </div>
                      <div style={{ height: 8, background: 'var(--bg3)', borderRadius: 4 }}>
                        <div style={{ height: '100%', width: `${(f.count / funnelMax) * 100}%`, background: isLoss ? '#FCA5A5' : '#16a36b', borderRadius: 4, opacity: isLoss ? 0.9 : 1 }} />
                      </div>
                    </div>
                  )
                })}
            </div>

            <div className="card" style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>Ride status</div>
              <div style={{ display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden', marginBottom: 10 }}>
                {(raw.statusBreakdown || []).map((s: any) => (
                  <div key={s.status} title={`${s.status}: ${s.count}`}
                    style={{ width: `${(s.count / statusTotal) * 100}%`, background: statusColors[s.status] || '#9CA3AF' }} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 11, color: 'var(--text3)' }}>
                {(raw.statusBreakdown || []).map((s: any) => (
                  <span key={s.status} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: statusColors[s.status] || '#9CA3AF', display: 'inline-block' }} />
                    {s.status} - <strong style={{ color: 'var(--text)' }}>{s.count}</strong>
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div className="card" style={{ margin: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>Top routes ({raw.days}d)</div>
                {(raw.topRoutes || []).length === 0 && <div style={{ fontSize: 12, color: 'var(--text3)' }}>No rides in this period</div>}
                {(raw.topRoutes || []).map((r: any, i: number) => (
                  <div key={i} className="row">
                    <span style={{ fontSize: 13, color: 'var(--text2)' }}>{r.fromLocation} to {r.toLocation}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{r.count?.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="card" style={{ margin: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>Ratings ({raw.days}d) - avg {raw.avgRating}</div>
                {[5, 4, 3, 2, 1].map(s => {
                  const c = (raw.ratings || []).find((r: any) => r.stars === s)?.count || 0
                  return (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: 'var(--text3)', width: 24 }}>{s}</span>
                      <div style={{ flex: 1, height: 8, background: 'var(--bg3)', borderRadius: 4 }}>
                        <div style={{ height: '100%', width: `${(c / ratingsMax) * 100}%`, background: '#F59E0B', borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', width: 26, textAlign: 'right' }}>{c}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="card" style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>Safety reports</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: raw.reports?.open > 0 ? '#EF4444' : 'var(--green)' }}>{raw.reports?.open ?? 0}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>Open</div>
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{raw.reports?.resolved ?? 0}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>Resolved</div>
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{raw.reports?.avgResolutionHours ?? 0}h</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>Avg time to resolve</div>
                </div>
              </div>
              {(raw.reports?.byType || []).length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(raw.reports.byType).map((t: any, i: number) => (
                    <span key={i} className="chip" style={{ fontSize: 11 }}>{t.type} - {t.count}</span>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
