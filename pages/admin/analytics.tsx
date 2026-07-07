import { useState, useEffect, useCallback, Fragment } from 'react'
import dynamic from 'next/dynamic'
import Layout, { I } from '../../components/layout/Layout'
import { adminAPI, userAPI, notifAPI } from '../../services/api'

const MapDensity = dynamic(() => import('../../components/shared/MapDensity'), { ssr: false })

const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

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
      setRaw(res.data); setIsDemo(false)
      loadAiSummary(res.data)
    } catch {
      // Demo data (API unreachable) — clearly watermarked in the UI
      const demo = {
        days: d, totalUsers: 2481, totalRides: 8920, newUsers: 42, newUsersPrev: 35,
        ridesWindow: 214, ridesPrev: 189, successRate: 78.4,
        utilization: 58.2, utilizationPrev: 51.7, volume: 1240, volumePrev: 1010,
        openRequests: 6, fulfilledRequests: 11, requestsWindow: 19,
        ridesPerDay: Array.from({ length: 7 }, (_, i) => ({ date: new Date(Date.now() - (6 - i) * 86400000).toISOString(), count: [32, 28, 42, 18, 38, 12, 9][i] })),
        topRoutes: [{ fromLocation: 'Beirut', toLocation: 'Tripoli', count: 124 }, { fromLocation: 'Hamra', toLocation: 'Baabda', count: 89 }, { fromLocation: 'Sidon', toLocation: 'Beirut', count: 65 }],
        waitlistDemand: [{ fromLocation: 'Beirut', toLocation: 'Zahle', waiting: 14 }, { fromLocation: 'Hamra', toLocation: 'Jounieh', waiting: 8 }],
        funnel: [{ status: 'Pending', count: 24 }, { status: 'Confirmed', count: 61 }, { status: 'Completed', count: 48 }, { status: 'Declined', count: 12 }, { status: 'Cancelled', count: 9 }],
        slots: [
          { dow: 4, hour: 18, supply: 2, demand: 12, gap: 10 }, { dow: 4, hour: 20, supply: 14, demand: 4, gap: -10 },
          { dow: 1, hour: 8, supply: 6, demand: 5, gap: -1 },  { dow: 2, hour: 8, supply: 3, demand: 7, gap: 4 },
          { dow: 3, hour: 17, supply: 1, demand: 5, gap: 4 },
        ],
        heat: [], statusBreakdown: [{ status: 'Upcoming', count: 34 }, { status: 'Active', count: 3 }, { status: 'Completed', count: 148 }, { status: 'Cancelled', count: 12 }, { status: 'Expired', count: 17 }],
        topDrivers: [{ fullName: 'Sarah Tan', averageRating: 4.9, rides: 21, seats: 58 }, { fullName: 'Ahmad Rizal', averageRating: 4.7, rides: 17, seats: 41 }],
        ratings: [{ stars: 5, count: 84 }, { stars: 4, count: 31 }, { stars: 3, count: 9 }, { stars: 2, count: 3 }, { stars: 1, count: 2 }],
        avgRating: 4.5,
        reports: { open: 2, resolved: 15, byType: [{ type: 'Behaviour', count: 7 }, { type: 'Safety', count: 5 }], avgResolutionHours: 18.5 },
        geoPoints: [], sharedKm: 4210.5, co2Kg: 631.6,
      }
      setRaw(demo); setIsDemo(true)
      loadAiSummary(demo)
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
      ['Seat utilization %', raw.utilization], ['Volume $', raw.volume],
      ['Success rate %', raw.successRate], ['Open requests', raw.openRequests],
      ['Shared km', raw.sharedKm], ['CO2 saved kg', raw.co2Kg],
    ])
    add('Rides per day', ['date', 'count'], (raw.ridesPerDay || []).map((d: any) => [new Date(d.date).toISOString().slice(0, 10), d.count]))
    add('Top routes', ['from', 'to', 'count'], (raw.topRoutes || []).map((r: any) => [r.fromLocation, r.toLocation, r.count]))
    add('Waitlist demand', ['from', 'to', 'waiting'], (raw.waitlistDemand || []).map((r: any) => [r.fromLocation, r.toLocation, r.waiting]))
    add('Supply vs demand (day x hour)', ['day', 'hour', 'supply', 'demand', 'gap'], (raw.slots || []).map((s: any) => [DOW[s.dow], s.hour, s.supply, s.demand, s.gap]))
    add('Booking funnel', ['status', 'count'], (raw.funnel || []).map((f: any) => [f.status, f.count]))
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `otw-analytics-${raw.days}d.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  // ── Derived view values ──
  // Zero-fill the ride-per-day series across the whole window so quiet days
  // show as empty bars instead of the chart collapsing onto the one busy day.
  const shownDays = Math.min(raw?.days || 7, 30)
  const dayCounts: Record<string, number> = {}
  ;(raw?.ridesPerDay || []).forEach((d: any) => { dayCounts[new Date(d.date).toDateString()] = d.count || 0 })
  const bars = Array.from({ length: shownDays }, (_, i) => {
    const dt = new Date(); dt.setDate(dt.getDate() - (shownDays - 1 - i))
    return { day: dt.toLocaleDateString('en', { weekday: 'short' }), date: dt.getDate(), val: dayCounts[dt.toDateString()] || 0 }
  })
  const maxBar = Math.max(...bars.map((b: any) => b.val), 1)
  const funnelOrder = ['Pending', 'Confirmed', 'Completed', 'Declined', 'Cancelled']
  const funnel = funnelOrder.map(s => ({ status: s, count: (raw?.funnel || []).find((f: any) => f.status === s)?.count || 0 }))
  const funnelMax = Math.max(...funnel.map(f => f.count), 1)
  // Day-of-week × hour supply/demand slots
  const slots = raw?.slots || []
  const slotMap: Record<string, any> = {}
  slots.forEach((s: any) => { slotMap[`${s.dow}-${s.hour}`] = s })
  const maxSlotVal = Math.max(...slots.map((s: any) => Math.max(s.supply, s.demand)), 1)
  const topGaps = [...slots].filter((s: any) => s.gap > 0).sort((a: any, b: any) => b.gap - a.gap).slice(0, 3)
  const biggestGap = topGaps[0] || null
  const statusColors: Record<string, string> = { Upcoming: '#3B82F6', Active: '#16a36b', Completed: '#10B981', Full: '#F59E0B', Cancelled: '#EF4444', Expired: '#9CA3AF' }
  const statusTotal = (raw?.statusBreakdown || []).reduce((s: number, x: any) => s + x.count, 0) || 1
  const ratingsMax = Math.max(...(raw?.ratings || []).map((r: any) => r.count), 1)

  const kpis = raw ? [
    { label: 'Total users',      val: raw.totalUsers?.toLocaleString(),        d: delta(raw.newUsers, raw.newUsersPrev),        sub: `+${raw.newUsers} in ${raw.days}d`,  icon: I.users,    c: { bg: '#EFF6FF', color: '#3B82F6' } },
    { label: 'Seat utilization', val: `${raw.utilization}%`,                    d: delta(raw.utilization, raw.utilizationPrev),  sub: 'of offered seats filled',           icon: I.car,      c: { bg: '#ECFDF5', color: '#10B981' } },
    { label: `Rides (${raw.days}d)`, val: raw.ridesWindow?.toLocaleString(),    d: delta(raw.ridesWindow, raw.ridesPrev),        sub: `${raw.totalRides?.toLocaleString()} all time`, icon: I.trending, c: { bg: '#FEF3E2', color: '#F59E0B' } },
    { label: `Volume $ (${raw.days}d)`, val: `$${Number(raw.volume).toLocaleString()}`, d: delta(Number(raw.volume), Number(raw.volumePrev)), sub: 'completed bookings', icon: I.dollar,   c: { bg: '#F5F3FF', color: '#8B5CF6' } },
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
            <span style={{ fontSize: 12 }}>Showing <strong>demo data</strong> — the backend API is unreachable.</span>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text3)', fontSize: 13 }}>Loading...</div>
        ) : raw && (
          <>
            {/* ── AI summary + anomaly ── */}
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

            {/* ── KPI row with real deltas ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 10 }}>
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

            {/* ── Secondary strip: success, requests, CO2 ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Booking success', val: `${raw.successRate}%` },
                { label: 'Open ride requests', val: raw.openRequests },
                { label: `Requests fulfilled (${raw.days}d)`, val: `${raw.fulfilledRequests}/${raw.requestsWindow}` },
                { label: 'Shared km · CO₂ saved', val: `${Number(raw.sharedKm).toLocaleString()} km · ${raw.co2Kg} kg` },
              ].map((s, i) => (
                <div key={i} className="stat-card" style={{ padding: '10px 14px' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{s.val}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* ── Demand plan: day × hour grid (green = supply covers, amber = riders waiting) ── */}
            <div className="card" style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 6 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Demand plan — day × hour</div>
                <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text3)' }}>
                  <span><span style={{ display: 'inline-block', width: 8, height: 8, background: '#16a36b', borderRadius: 2, marginRight: 4 }} />Rides cover demand</span>
                  <span><span style={{ display: 'inline-block', width: 8, height: 8, background: '#F59E0B', borderRadius: 2, marginRight: 4 }} />Riders waiting (gap)</span>
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 10 }}>Each cell = one day + hour. Hover a cell for exact numbers.</div>
              <div style={{ overflowX: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '36px repeat(24, minmax(15px, 1fr))', gap: 2, minWidth: 500 }}>
                  <div />
                  {Array.from({ length: 24 }, (_, h) => (
                    <div key={h} style={{ fontSize: 8.5, color: 'var(--text4)', textAlign: 'center' }}>{h % 3 === 0 ? String(h).padStart(2, '0') : ''}</div>
                  ))}
                  {DOW.map((d, dow) => (
                    <Fragment key={d}>
                      <div style={{ fontSize: 10, color: 'var(--text3)', display: 'flex', alignItems: 'center' }}>{d}</div>
                      {Array.from({ length: 24 }, (_, h) => {
                        const s = slotMap[`${dow}-${h}`]
                        const bg = !s ? 'var(--bg3)'
                          : s.gap > 0 ? `rgba(245,158,11,${0.3 + 0.7 * Math.min(s.gap / maxSlotVal, 1)})`
                          : `rgba(22,163,107,${0.25 + 0.75 * Math.min(s.supply / maxSlotVal, 1)})`
                        return (
                          <div key={h}
                            title={s ? `${d} ${String(h).padStart(2, '0')}:00 — ${s.demand} rider${s.demand !== 1 ? 's' : ''} vs ${s.supply} ride${s.supply !== 1 ? 's' : ''}${s.gap > 0 ? ` → ${s.gap} unmet` : ''}` : `${d} ${String(h).padStart(2, '0')}:00 — no activity`}
                            style={{ height: 17, borderRadius: 3, background: bg }} />
                        )
                      })}
                    </Fragment>
                  ))}
                </div>
              </div>
              {topGaps.length > 0 ? (
                <div style={{ marginTop: 12 }}>
                  {topGaps.map((g: any, i: number) => (
                    <div key={i} style={{ fontSize: 12, color: '#A66A00', background: 'var(--amber-l)', borderRadius: 8, padding: '6px 10px', marginBottom: 6 }}>
                      ⚠️ <strong>{DOW[g.dow]} {String(g.hour).padStart(2, '0')}:00</strong> — {g.demand} riders vs {g.supply} rides → recommend drivers post <strong>{DOW[g.dow]} around {String(g.hour).padStart(2, '0')}:00</strong>
                    </div>
                  ))}
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>Drivers are notified automatically when a request has no available driver, with this day + time in the message.</div>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 10 }}>✓ Supply currently covers rider demand in every time slot.</div>
              )}
            </div>

            {/* ── Rides per day + Booking funnel ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div className="card" style={{ margin: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>Rides posted per day</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 110, overflowX: 'auto' }}>
                  {bars.map((b: any, i: number) => (
                    <div key={i} style={{ flex: 1, minWidth: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }} title={`${b.day}: ${b.val}`}>
                      <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                        <div style={{ width: '100%', background: 'var(--amber-l)', borderRadius: '4px 4px 0 0', height: `${(b.val / maxBar) * 100}%`, minHeight: 4 }} />
                      </div>
                      {bars.length <= 10 && <div style={{ fontSize: 10, color: 'var(--text3)' }}>{b.day}</div>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="card" style={{ margin: 0 }}>
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
            </div>

            {/* ── Ride status breakdown ── */}
            <div className="card" style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>Ride status (all time)</div>
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
                    {s.status} · <strong style={{ color: 'var(--text)' }}>{s.count}</strong>
                  </span>
                ))}
              </div>
            </div>

            {/* ── Top routes + Waitlist demand ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div className="card" style={{ margin: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>Top routes ({raw.days}d)</div>
                {(raw.topRoutes || []).length === 0 && <div style={{ fontSize: 12, color: 'var(--text3)' }}>No rides in this period</div>}
                {(raw.topRoutes || []).map((r: any, i: number) => (
                  <div key={i} className="row">
                    <span style={{ fontSize: 13, color: 'var(--text2)' }}>{r.fromLocation} → {r.toLocation}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{r.count?.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="card" style={{ margin: 0, border: '1px solid var(--amber, #F59E0B)' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>🔥 Waitlisted routes — need drivers</div>
                {(raw.waitlistDemand || []).length === 0 && <div style={{ fontSize: 12, color: 'var(--text3)' }}>No unmet waitlist demand — supply covers demand</div>}
                {(raw.waitlistDemand || []).map((r: any, i: number) => (
                  <div key={i} className="row">
                    <span style={{ fontSize: 13, color: 'var(--text2)' }}>{r.fromLocation} → {r.toLocation}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#A66A00' }}>{r.waiting} waiting</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Top drivers + Ratings ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div className="card" style={{ margin: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>Top drivers ({raw.days}d, completed)</div>
                {(raw.topDrivers || []).length === 0 && <div style={{ fontSize: 12, color: 'var(--text3)' }}>No completed rides in this period</div>}
                {(raw.topDrivers || []).map((d: any, i: number) => (
                  <div key={i} className="row">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text2)' }}>
                      <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--blue-l)', color: 'var(--blue)', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
                      {d.fullName}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text3)' }}>{d.rides} rides · {d.seats} seats · ★{Number(d.averageRating).toFixed(1)}</span>
                  </div>
                ))}
              </div>
              <div className="card" style={{ margin: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>Ratings ({raw.days}d) · avg ★{raw.avgRating}</div>
                {[5, 4, 3, 2, 1].map(s => {
                  const c = (raw.ratings || []).find((r: any) => r.stars === s)?.count || 0
                  return (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: 'var(--text3)', width: 24 }}>{s}★</span>
                      <div style={{ flex: 1, height: 8, background: 'var(--bg3)', borderRadius: 4 }}>
                        <div style={{ height: '100%', width: `${(c / ratingsMax) * 100}%`, background: '#F59E0B', borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', width: 26, textAlign: 'right' }}>{c}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── Safety panel ── */}
            <div className="card" style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>Safety — reports</div>
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
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>Avg resolution</div>
                </div>
              </div>
              {(raw.reports?.byType || []).length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(raw.reports.byType).map((t: any, i: number) => (
                    <span key={i} className="chip" style={{ fontSize: 11 }}>{t.type} · {t.count}</span>
                  ))}
                </div>
              )}
            </div>

            {/* ── Geographic demand density ── */}
            <div className="card" style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Pickup density ({raw.days}d)</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 10 }}>Where rides start — darker areas = more pickups. Only rides posted with map coordinates appear.</div>
              <MapDensity points={raw.geoPoints || []} height={240} />
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
