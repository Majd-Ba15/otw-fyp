import { useEffect, useMemo, useState } from 'react'
import Layout, { I } from '../../components/layout/Layout'
import { demandAPI, notifAPI, userAPI } from '../../services/api'

export default function AdminDemandPlanning() {
  const [profile, setProfile] = useState<any>(null)
  const [data, setData] = useState<any>(null)
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(true)
  const [dayIdx, setDayIdx] = useState(0)   // 0 = Monday (backend orders Mon → Sun)

  useEffect(() => {
    Promise.allSettled([
      userAPI.getMe(),
      demandAPI.getAnalytics(),
      notifAPI.getUnreadCount(),
    ]).then(([p, d, n]) => {
      if (p.status === 'fulfilled') setProfile(p.value.data)
      if (d.status === 'fulfilled') {
        setData(d.value.data)
        // Open on the first weekday that actually has demand, else Monday
        const ds = d.value.data?.days || []
        const first = ds.findIndex((x: any) => x.hours?.some((h: any) => h.demand > 0))
        if (first >= 0) setDayIdx(first)
      }
      if (n.status === 'fulfilled') setUnread(n.value.data?.count || 0)
      setLoading(false)
    })
  }, [])

  const day = data?.days?.[dayIdx]
  const maxValue = useMemo(() => {
    const slots = day?.hours || []
    return Math.max(...slots.map((s: any) => Math.max(s.demand || 0, s.supply || 0)), 1)
  }, [day])

  const initials = profile?.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'AD'
  // Highest gaps across ALL days, labelled with the day name
  const gapSlots = useMemo(() =>
    (data?.days || [])
      .flatMap((d: any) => (d.hours || []).map((h: any) => ({ ...h, day: d.day })))
      .filter((s: any) => s.gap > 0)
      .sort((a: any, b: any) => b.gap - a.gap)
      .slice(0, 5)
  , [data])

  return (
    <Layout title="Demand planning" role="Admin" userInitials={initials} userName={profile?.fullName} unreadCount={unread}>
      <div className="page-inner">
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Demand planning</h1>

        {loading ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--text3)' }}>Loading...</div>
        ) : !data ? (
          <div className="card" style={{ color: 'var(--text3)' }}>Demand data is not available yet.</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
              {[
                { icon: I.send, label: 'Open rider requests', val: data.openRequests, bg: '#EFF6FF', color: '#2563EB' },
                { icon: I.check, label: 'Driver accepted', val: data.acceptedRequests, bg: '#ECFDF5', color: '#059669' },
                { icon: I.clock, label: 'Active free slots', val: data.activeAvailability, bg: '#FFFBEB', color: '#D97706' },
                { icon: I.trending, label: data.biggestGap?.gap > 0 ? `Biggest gap (${data.biggestGap.day} ${data.biggestGap.label})` : 'Biggest gap', val: data.biggestGap?.gap || 0, bg: '#F5F3FF', color: '#7C3AED' },
              ].map((k, i) => (
                <div key={i} className="stat-card">
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                    <span style={{ width: 17, height: 17, color: k.color, display: 'flex' }}>{k.icon}</span>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>{k.val}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{k.label}</div>
                </div>
              ))}
            </div>

            {data.biggestGap && data.biggestGap.gap > 0 && (
              <div className="card" style={{ border: '1px solid var(--blue)', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ width: 18, height: 18, color: 'var(--blue)', display: 'flex' }}>{I.robot}</span>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Recommended action</div>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                  {data.biggestGap.recommendation}. Demand is higher than available drivers by {data.biggestGap.gap} request{data.biggestGap.gap > 1 ? 's' : ''}.
                </div>
              </div>
            )}

            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>Demand vs driver supply — by weekday and hour</div>
              {/* Day tabs: Monday → Sunday. A dot marks days that have demand. */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                {(data.days || []).map((d: any, i: number) => {
                  const hasDemand = (d.hours || []).some((h: any) => h.demand > 0)
                  const hasGap    = (d.hours || []).some((h: any) => h.gap > 0)
                  return (
                    <button key={d.day} className={`chip ${dayIdx === i ? 'active' : ''}`} onClick={() => setDayIdx(i)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      {d.day.slice(0, 3)}
                      {hasDemand && <span style={{ width: 6, height: 6, borderRadius: '50%', background: hasGap ? '#EF4444' : '#10B981', display: 'inline-block' }} />}
                    </button>
                  )
                })}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12,1fr)', gap: 8 }}>
                {(day?.hours || []).map((s: any) => (
                  <div key={s.hour} style={{ minHeight: 130, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ flex: 1, display: 'flex', gap: 3, alignItems: 'flex-end' }}>
                      <div title={`${day?.day} ${s.label} — demand: ${s.demand}`} style={{ flex: 1, height: `${((s.demand || 0) / maxValue) * 100}%`, minHeight: s.demand ? 6 : 2, background: '#2563EB', borderRadius: '4px 4px 0 0' }} />
                      <div title={`${day?.day} ${s.label} — supply: ${s.supply}`} style={{ flex: 1, height: `${((s.supply || 0) / maxValue) * 100}%`, minHeight: s.supply ? 6 : 2, background: '#10B981', borderRadius: '4px 4px 0 0' }} />
                    </div>
                    <div style={{ fontSize: 10, color: s.gap > 0 ? 'var(--red,#EF4444)' : 'var(--text3)', textAlign: 'center', fontWeight: s.gap > 0 ? 700 : 400 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 14, marginTop: 12, fontSize: 12, color: 'var(--text3)' }}>
                <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#2563EB', borderRadius: 2, marginRight: 5 }} />Rider demand</span>
                <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#10B981', borderRadius: 2, marginRight: 5 }} />Driver supply</span>
                <span style={{ marginLeft: 'auto' }}>Showing: <strong style={{ color: 'var(--text)' }}>{day?.day}</strong></span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="card" style={{ margin: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>Highest gap times</div>
                {gapSlots.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--text3)' }}>No demand gaps right now.</div>
                ) : gapSlots.map((s: any, i: number) => (
                  <div key={i} className="row">
                    <span style={{ fontSize: 13, color: 'var(--text2)' }}>{s.day} {s.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--red,#EF4444)' }}>+{s.gap}</span>
                  </div>
                ))}
              </div>
              <div className="card" style={{ margin: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>Top requested routes</div>
                {(data.topRoutes || []).length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--text3)' }}>No route demand yet.</div>
                ) : data.topRoutes.map((r: any, i: number) => (
                  <div key={i} className="row">
                    <span style={{ fontSize: 13, color: 'var(--text2)' }}>{r.fromLocation} to {r.toLocation}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{r.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
