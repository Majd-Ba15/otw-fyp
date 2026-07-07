import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import Layout, { I } from '../../components/layout/Layout'
import { rideAPI, userAPI } from '../../services/api'
import { isRideActive } from '../../lib/rideStatus'

const MapRides  = dynamic(() => import('../../components/shared/MapRides'),  { ssr: false })
const MapPicker = dynamic(() => import('../../components/shared/MapPicker'), { ssr: false })

// Stops arrive as an array of names from the API, or a '|'-joined string (demo data)
const stopNames = (s: any): string[] =>
  Array.isArray(s) ? s.filter(Boolean) : s ? String(s).split('|').filter(Boolean) : []

export default function SearchRides() {
  const router = useRouter()

  const [profile,      setProfile]      = useState<any>(null)
  const [allRides,     setAllRides]     = useState<any[]>([])   // every ride from API
  const [displayed,    setDisplayed]    = useState<any[]>([])   // filtered subset shown in list + map
  const [loadingAll,   setLoadingAll]   = useState(true)
  const [searching,    setSearching]    = useState(false)
  const [searched,     setSearched]     = useState(false)
  const [selectedRide, setSelectedRide] = useState<any>(null)
  const [sort,         setSort]         = useState('Price')
  const [sortOpen,     setSortOpen]     = useState(false)
  const [showFromMap,  setShowFromMap]  = useState(false)
  const [showToMap,    setShowToMap]    = useState(false)
  const [bestId,       setBestId]       = useState<number | null>(null)
  const [bestReason,   setBestReason]   = useState('')
  const [aiLoading,    setAiLoading]    = useState(false)
  const [form, setForm] = useState({ from: '', to: '', date: '', seats: 1, fromLat: 0, fromLng: 0 })

  // Load ALL rides on mount so map is populated immediately
  useEffect(() => {
    userAPI.getMe().then(r => setProfile(r.data)).catch(() => {})
    rideAPI.search({})
      .then(r => {
        // Only show active rides — hide expired (past departure / past recurring
        // end date) and completed/cancelled ones from the map and the list.
        const rides = (r.data || []).filter(isRideActive)
        setAllRides(rides)
        setDisplayed(rides)
        if (rides.length > 1) runAiMatch(rides)
      })
      .catch(() => {
        // Demo rides with Lebanese coordinates so map looks populated
        const demo = [
          { rideId:1, fromLocation:'Beirut',  fromLat:33.8869, fromLng:35.5131, toLocation:'Tripoli',  toLat:34.4369, toLng:35.8497, stops:'Jounieh|Byblos', pricePerSeat:8,  availableSeats:3, departureTime:new Date(Date.now()+3*3600000).toISOString(),  driver:{ fullName:'Sarah Tan',   averageRating:4.9 } },
          { rideId:2, fromLocation:'Sidon',   fromLat:33.5631, fromLng:35.3714, toLocation:'Beirut',   toLat:33.8869, toLng:35.5131, stops:'Aley',            pricePerSeat:5,  availableSeats:2, departureTime:new Date(Date.now()+5*3600000).toISOString(),  driver:{ fullName:'Ahmad Rizal', averageRating:4.7 } },
          { rideId:3, fromLocation:'Zahle',   fromLat:33.8500, fromLng:35.9000, toLocation:'Beirut',   toLat:33.8869, toLng:35.5131, stops:'',                pricePerSeat:7,  availableSeats:1, departureTime:new Date(Date.now()+7*3600000).toISOString(),  driver:{ fullName:'Nurul Huda',  averageRating:4.8 } },
          { rideId:4, fromLocation:'Jeh',     fromLat:33.5900, fromLng:35.5400, toLocation:'Baroun',   toLat:33.4600, toLng:35.4800, stops:'Nabatieh',        pricePerSeat:4,  availableSeats:4, departureTime:new Date(Date.now()+2*3600000).toISOString(),  driver:{ fullName:'Khalil Mrad', averageRating:4.6 } },
          { rideId:5, fromLocation:'Baalbek', fromLat:34.0050, fromLng:36.2100, toLocation:'Beirut',   toLat:33.8869, toLng:35.5131, stops:'Zahle',           pricePerSeat:10, availableSeats:2, departureTime:new Date(Date.now()+4*3600000).toISOString(),  driver:{ fullName:'Rania Khoury',averageRating:5.0 } },
        ]
        const activeDemo = demo.filter(isRideActive)
        setAllRides(activeDemo)
        setDisplayed(activeDemo)
        if (activeDemo.length > 1) runAiMatch(activeDemo)
      })
      .finally(() => setLoadingAll(false))
  }, [])

  const runAiMatch = async (results: any[]) => {
    setAiLoading(true)
    try {
      const res = await fetch('/api/rides/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rides: results, from: form.from, to: form.to, seats: form.seats }),
      })
      const data = await res.json()
      if (data.bestId) { setBestId(data.bestId); setBestReason(data.reason) }
    } catch {}
    finally { setAiLoading(false) }
  }

  const search = async () => {
    if (!form.to && !form.from) return
    setSearching(true)
    setSearched(true)
    setBestId(null)
    setBestReason('')
    try {
      const params: any = { from: form.from, to: form.to, date: form.date || undefined, seats: form.seats }
      if (form.fromLat) { params.fromLat = form.fromLat; params.fromLng = form.fromLng }

      const r = await rideAPI.search(params)
      let results: any[] = r.data || []

      // Smart nearby: also check allRides for stops matching from location
      if (form.from) {
        const fromLower = form.from.toLowerCase()
        const nearby = allRides
          .filter(ride => !results.find(ex => (ex.rideId || ex.id) === (ride.rideId || ride.id)))
          .filter(ride => stopNames(ride.stops).some((s: string) => s.toLowerCase().includes(fromLower) || fromLower.includes(s.toLowerCase().trim())))
          .map((ride: any) => ({ ...ride, _nearbyStop: true }))
        results = [...results, ...nearby]
      }

      // If API returned nothing, filter the already-loaded allRides client-side
      if (results.length === 0 && allRides.length > 0) {
        const fl = form.from.toLowerCase()
        const tl = form.to.toLowerCase()
        results = allRides.filter((r: any) => {
          const fromMatch = !fl || r.fromLocation.toLowerCase().includes(fl) || stopNames(r.stops).join('|').toLowerCase().includes(fl)
          const toMatch   = !tl || r.toLocation.toLowerCase().includes(tl)
          return fromMatch && toMatch
        })
      }

      results = results.filter(isRideActive)   // never surface expired rides in search
      setDisplayed(results)
      if (results.length > 1) runAiMatch(results)
    } catch {
      // Fall back to client-side filter of allRides
      const fl = form.from.toLowerCase()
      const tl = form.to.toLowerCase()
      const filtered = allRides.filter((r: any) => {
        const fromMatch = !fl || r.fromLocation.toLowerCase().includes(fl) || stopNames(r.stops).join('|').toLowerCase().includes(fl)
        const toMatch   = !tl || r.toLocation.toLowerCase().includes(tl)
        return fromMatch && toMatch
      }).filter(isRideActive)
      setDisplayed(filtered)
    } finally {
      setSearching(false)
    }
  }

  const clearSearch = () => {
    setSearched(false)
    setDisplayed(allRides)
    setBestId(null)
    setBestReason('')
    setForm({ from: '', to: '', date: '', seats: 1, fromLat: 0, fromLng: 0 })
    setSelectedRide(null)
  }

  const sorted = useMemo(() => [...displayed].sort((a, b) => {
    if (sort === 'Price')  return (a.pricePerSeat || 0)          - (b.pricePerSeat || 0)
    if (sort === 'Time')   return new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime()
    if (sort === 'Rating') return (b.driver?.averageRating || 0) - (a.driver?.averageRating || 0)
    return 0
  }), [displayed, sort])

  const initials = profile?.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'AK'
  const fmtDate  = (iso: string) => new Date(iso).toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' })
  const fmtTime  = (iso: string) => new Date(iso).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })

  return (
    <Layout title="Search rides" role="Rider" userInitials={initials} userName={profile?.fullName}>
      <div className="page-inner" style={{ paddingBottom: 32 }}>

        {/* ── Search form ── */}
        <div className="card" style={{ marginBottom: 12 }}>
          {/* From */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--green)', display: 'flex' }}>{I.pin}</span>
                <input className="input" style={{ paddingLeft: 32 }} placeholder="From (e.g. Beirut, Sidon)"
                  value={form.from}
                  onChange={e => setForm(p => ({ ...p, from: e.target.value, fromLat: 0, fromLng: 0 }))}
                  onKeyDown={e => e.key === 'Enter' && search()} />
              </div>
              <button className="btn btn-secondary btn-sm" title="Pick from map"
                style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                onClick={() => { setShowFromMap(o => !o); setShowToMap(false) }}>
                <span style={{ width: 13, height: 13, display: 'flex' }}>{I.map}</span>
              </button>
            </div>
            {showFromMap && (
              <div style={{ marginTop: 8 }}>
                <MapPicker label="Tap to set your pickup point" height={180}
                  onPick={(lat, lng, name) => { setForm(p => ({ ...p, from: name, fromLat: lat, fromLng: lng })); setShowFromMap(false) }} />
              </div>
            )}
          </div>

          {/* To */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#EF4444', display: 'flex' }}>{I.pin}</span>
                <input className="input" style={{ paddingLeft: 32 }} placeholder="To (e.g. Tripoli, Tyre)"
                  value={form.to}
                  onChange={e => setForm(p => ({ ...p, to: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && search()} />
              </div>
              <button className="btn btn-secondary btn-sm" title="Pick from map"
                style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                onClick={() => { setShowToMap(o => !o); setShowFromMap(false) }}>
                <span style={{ width: 13, height: 13, display: 'flex' }}>{I.map}</span>
              </button>
            </div>
            {showToMap && (
              <div style={{ marginTop: 8 }}>
                <MapPicker label="Tap to set your destination" height={180}
                  onPick={(lat, lng, name) => { setForm(p => ({ ...p, to: name })); setShowToMap(false) }} />
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--text3)', display: 'flex' }}>{I.clock}</span>
              <input type="date" className="input" style={{ paddingLeft: 30 }}
                value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
            </div>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--text3)', display: 'flex' }}>{I.users}</span>
              <select className="input" style={{ paddingLeft: 30 }} value={form.seats}
                onChange={e => setForm(p => ({ ...p, seats: parseInt(e.target.value) }))}>
                {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n} seat{n > 1 ? 's' : ''}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-full btn-lg" style={{ flex: 1 }} onClick={search} disabled={searching}>
              <span style={{ width: 16, height: 16, display: 'flex' }}>{I.search}</span>
              {searching ? 'Searching...' : 'Search rides'}
            </button>
            {searched && (
              <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }} onClick={clearSearch}>
                <span style={{ width: 14, height: 14, display: 'flex' }}>{I.x}</span> Clear
              </button>
            )}
          </div>
        </div>

        {/* ── Always-visible map ── */}
        <div className="map-contain" style={{ borderRadius: 14, border: '1px solid var(--border)', marginBottom: 14 }}>
          {loadingAll && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--text3)' }}>
              Loading map...
            </div>
          )}
          <MapRides
            rides={sorted}
            selected={selectedRide}
            onSelect={(ride: any) => {
              setSelectedRide(ride)
              try { sessionStorage.setItem('otw_ride_preview', JSON.stringify(ride)) } catch {}
              router.push(`/rider/ride/${ride.rideId}`)
            }}
            height={420}
          />
          {/* Legend */}
          <div style={{ padding: '8px 14px', background: 'var(--bg-card)', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', fontSize: 11, color: 'var(--text3)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#16a36b', display: 'inline-block' }} /> Start point
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'white', border: '2px solid #666', display: 'inline-block' }} /> Stop
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ padding: '1px 5px', background: '#2563EB', borderRadius: 3, color: 'white', fontSize: 10, fontWeight: 700 }}>$</span> Destination / price
            </span>
            <span style={{ marginLeft: 'auto' }}>Each colour = one ride · tap a pin for details</span>
          </div>
        </div>

        {/* ── Results header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--text3)' }}>
            {searched
              ? `${sorted.length} ride${sorted.length !== 1 ? 's' : ''} found`
              : `${sorted.length} ride${sorted.length !== 1 ? 's' : ''} available`}
          </span>
          <div style={{ position: 'relative' }}>
            <button className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={() => setSortOpen(o => !o)}>
              Sort: {sort}
              <span style={{ width: 14, height: 14, display: 'flex' }}>{I.back}</span>
            </button>
            {sortOpen && (
              <div style={{ position: 'absolute', right: 0, top: '110%', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: 'var(--shadow-md)', zIndex: 50, minWidth: 120, padding: '4px 0' }}>
                {['Price', 'Time', 'Rating'].map(s => (
                  <div key={s}
                    style={{ padding: '8px 16px', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: sort === s ? 'var(--green)' : 'var(--text)' }}
                    onClick={() => { setSort(s); setSortOpen(false) }}>
                    {s}
                    {sort === s && <span style={{ width: 14, height: 14, display: 'flex' }}>{I.check}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* AI match banner */}
        {bestReason && bestId && (
          <div style={{ background: 'linear-gradient(135deg,#1e40af,#2563eb)', borderRadius: 12, padding: '12px 14px', marginBottom: 12, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span style={{ width: 18, height: 18, color: 'white', display: 'flex', flexShrink: 0, marginTop: 1 }}>{I.robot}</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.8)', marginBottom: 2 }}>AI RECOMMENDATION</div>
              <div style={{ fontSize: 13, color: 'white', lineHeight: 1.5 }}>{bestReason}</div>
            </div>
          </div>
        )}
        {aiLoading && !bestId && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--blue-l)', borderRadius: 10, marginBottom: 12, fontSize: 13, color: 'var(--blue-d)' }}>
            <span style={{ width: 14, height: 14, display: 'flex' }}>{I.robot}</span>
            AI is finding your best match...
          </div>
        )}

        {/* ── Ride list ── */}
        {sorted.length === 0 && !loadingAll ? (
          <div className="card" style={{ textAlign: 'center', padding: '36px' }}>
            <div style={{ width: 40, height: 40, margin: '0 auto 12px', opacity: .3, display: 'flex' }}>{I.search}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
              {searched ? 'No rides match your search' : 'No rides available right now'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>
              {searched ? 'Try a different route or date' : 'Check back soon or post your own ride'}
            </div>
          </div>
        ) : (
          sorted.map((r: any) => {
            const isAiBest   = (r.rideId || r.id) === bestId
            const isSelected = selectedRide && (selectedRide.rideId || selectedRide.id) === (r.rideId || r.id)
            const stops: string[] = stopNames(r.stops)
            return (
              <div key={r.rideId || r.id}
                className="card card-hover"
                style={{ cursor: 'pointer', marginBottom: 10, border: isAiBest ? '2px solid var(--blue)' : isSelected ? '2px solid var(--green)' : undefined, position: 'relative' }}
                onClick={() => {
                  try { sessionStorage.setItem('otw_ride_preview', JSON.stringify(r)) } catch {}
                  router.push(`/rider/ride/${r.rideId || r.id}`)
                }}>

                {/* AI badge */}
                {isAiBest && (
                  <div style={{ position: 'absolute', top: -1, right: 12, background: 'var(--blue)', color: 'white', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: '0 0 6px 6px', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 10, height: 10, display: 'flex' }}>{I.robot}</span> AI BEST MATCH
                  </div>
                )}
                {r._nearbyStop && !isAiBest && (
                  <div style={{ position: 'absolute', top: -1, right: 12, background: 'var(--green)', color: 'white', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: '0 0 6px 6px', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 10, height: 10, display: 'flex' }}>{I.pin}</span> STOPS NEAR YOU
                  </div>
                )}

                {/* Driver + price */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, paddingTop: (isAiBest || r._nearbyStop) ? 8 : 0 }}>
                  <div className="av" style={{ width: 40, height: 40, fontSize: 13 }}>
                    {r.driver?.initials || r.driver?.fullName?.slice(0, 2).toUpperCase() || '??'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{r.driver?.fullName || 'Driver'}</span>
                      {r.driver?.isVerified && <span style={{ width: 14, height: 14, color: 'var(--green)', display: 'flex' }}>{I.checkC}</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text3)' }}>
                      <span style={{ color: '#F59E0B', display: 'flex', width: 12, height: 12 }}>{I.starF}</span>
                      {r.driver?.averageRating ?? '—'} · {r.driver?.tripCount ?? 0} trips
                    </div>
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--green)' }}>${r.pricePerSeat}</span>
                </div>

                {/* Route with stops */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <div className="rdot-g" />
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{r.fromLocation}</span>
                  </div>
                  {stops.length > 0 && (
                    <div style={{ marginLeft: 4, borderLeft: '1.5px dashed var(--border2)', paddingLeft: 12, marginBottom: 4 }}>
                      {stops.map((s: string, i: number) => {
                        const isUserLoc = form.from && s.toLowerCase().includes(form.from.toLowerCase())
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: isUserLoc ? 'var(--blue)' : 'var(--border2)', border: `1.5px solid ${isUserLoc ? 'var(--blue)' : 'var(--text4)'}`, flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: isUserLoc ? 'var(--blue)' : 'var(--text3)', fontWeight: isUserLoc ? 600 : 400 }}>
                              {s}{isUserLoc ? ' ← you' : ''}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {stops.length === 0 && <div style={{ width: 1.5, height: 10, background: 'var(--border2)', marginLeft: 4.25, marginBottom: 4 }} />}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="rdot-r" />
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{r.toLocation}</span>
                  </div>
                </div>

                {/* Date + seats */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--text3)', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <span style={{ width: 12, height: 12, display: 'flex' }}>{I.clock}</span>
                      {fmtDate(r.departureTime)}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <span style={{ width: 12, height: 12, display: 'flex' }}>{I.clock}</span>
                      {fmtTime(r.departureTime)}
                    </span>
                  </div>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <span style={{ width: 12, height: 12, display: 'flex' }}>{I.users}</span>
                    {r.availableSeats ?? '?'} left
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </Layout>
  )
}
