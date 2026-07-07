// MapRides.tsx — Lebanon-centered map showing all rides as colored routes.
// Each ride gets a unique color. Start pin → stop pins → price-badge end pin.
// For rides without explicit lat/lng, city names are resolved first from a
// local Lebanese lookup, then geocoded live via Nominatim as a last resort.

import { useEffect, useRef, useState } from 'react'

interface Ride {
  rideId:         number
  fromLocation:   string
  toLocation:     string
  fromLat?:       number
  fromLng?:       number
  toLat?:         number
  toLng?:         number
  stops?:         string | string[]   // array of names from API, '|'-string from demo data
  pricePerSeat:   number
  availableSeats: number
  departureTime:  string
  driver?:        { fullName: string; averageRating?: number }
}

interface Props {
  rides:    Ride[]
  selected: Ride | null
  onSelect: (ride: any) => void
  height?:  number
}

const COLORS = [
  '#16a36b','#2563EB','#DC2626','#F59E0B','#7C3AED',
  '#DB2777','#0891B2','#65A30D','#EA580C','#0D9488',
]

// ── Lebanese city/neighbourhood lookup ────────────────────────────────────────
const LB_CITIES: [string, [number, number]][] = [
  ['beirut',           [33.8869, 35.5131]],
  ['hamra',            [33.8980, 35.4849]],
  ['ashrafieh',        [33.8878, 35.5278]],
  ['musharafieh',      [33.8820, 35.5200]],
  ['verdun',           [33.8804, 35.4897]],
  ['ras beirut',       [33.8950, 35.4800]],
  ['mar mikhael',      [33.8920, 35.5270]],
  ['gemmayze',         [33.8920, 35.5230]],
  ['downtown',         [33.8892, 35.5014]],
  ['solidere',         [33.8892, 35.5014]],
  ['jounieh',          [33.9808, 35.6178]],
  ['byblos',           [34.1217, 35.6517]],
  ['jbeil',            [34.1217, 35.6517]],
  ['tripoli',          [34.4369, 35.8497]],
  ['sidon',            [33.5631, 35.3714]],
  ['saida',            [33.5631, 35.3714]],
  ['tyre',             [33.2705, 35.2038]],
  ['sour',             [33.2705, 35.2038]],
  ['zahle',            [33.8500, 35.9000]],
  ['baalbek',          [34.0050, 36.2100]],
  ['nabatieh',         [33.3775, 35.4836]],
  ['aley',             [33.8108, 35.5975]],
  ['bint jbeil',       [33.1200, 35.4300]],
  ['jeh',              [33.5900, 35.5400]],
  ['baroun',           [33.4600, 35.4800]],
  ['chouf',            [33.6500, 35.5500]],
  ['jdaidet el matn',  [33.9100, 35.5900]],
  ['jdaideh',          [33.9100, 35.5900]],
  ['jdeidet',          [33.9100, 35.5900]],
  ['jdaydeh',          [33.9100, 35.5900]],
  ['metn',             [33.9300, 35.5900]],
  ['kesrouan',         [34.0100, 35.6400]],
  ['batroun',          [34.2553, 35.6581]],
  ['zgharta',          [34.3989, 35.8942]],
  ['koura',            [34.3000, 35.7500]],
  ['akkar',            [34.5500, 36.1500]],
  ['dora',             [33.9150, 35.5750]],
  ['sin el fil',       [33.8950, 35.5500]],
  ['dekwaneh',         [33.9000, 35.5600]],
  ['bourj hammoud',    [33.9050, 35.5550]],
  ['antelias',         [33.9500, 35.5900]],
  ['dbayeh',           [33.9700, 35.6200]],
  ['hazmieh',          [33.8567, 35.5486]],
  ['baabda',           [33.8350, 35.5417]],
  ['mtayleb',          [33.9700, 35.5700]],
  ['rabieh',           [33.9600, 35.5800]],
  ['jal el dib',       [33.9500, 35.5800]],
  ['zalka',            [33.9250, 35.5700]],
  ['naccache',         [33.9600, 35.5600]],
  ['hadath',           [33.8600, 35.5250]],
  ['furn el chebbak',  [33.8784, 35.5350]],
  ['chiyah',           [33.8700, 35.5100]],
  ['ghobeiry',         [33.8600, 35.5050]],
  ['haret hreik',      [33.8560, 35.5000]],
  ['dahieh',           [33.8400, 35.5000]],
  ['dahiye',           [33.8400, 35.5000]],
  ['khomayni',         [33.8820, 35.5200]],
  ['corniche',         [33.8920, 35.4780]],
  ['manara',           [33.8946, 35.4778]],
  ['tallet el khayat', [33.8786, 35.4920]],
  ['sanayeh',          [33.8875, 35.4900]],
  ['zarif',            [33.8843, 35.4990]],
  ['badaro',           [33.8751, 35.5149]],
  ['mar elias',        [33.8716, 35.5056]],
  ['tayouneh',         [33.8660, 35.5150]],
  ['cola',             [33.8680, 35.5070]],
]

function resolveCoords(name: string): [number, number] | null {
  const lower = name.toLowerCase()
  for (const [city, coords] of LB_CITIES) {
    if (lower.includes(city) || city.includes(lower.trim())) return coords
  }
  return null
}

// OSRM route geometry cache — key is the waypoint string. Value: GeoJSON
// LineString geometry (routed), or null when OSRM had no answer (draw dashed
// straight instead). Cached so selection/redraws never re-hit the OSRM server.
const routeGeoCache: Record<string, any> = {}

// Nominatim geocode — last resort for unrecognised addresses
const geocodeCache: Record<string, [number, number] | null> = {}
async function geocode(address: string): Promise<[number, number] | null> {
  if (address in geocodeCache) return geocodeCache[address]
  try {
    const q = encodeURIComponent(address + ', Lebanon')
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=lb`,
      { headers: { 'Accept-Language': 'en' } }
    )
    const data = await res.json()
    if (data?.[0]) {
      const coords: [number, number] = [parseFloat(data[0].lat), parseFloat(data[0].lon)]
      geocodeCache[address] = coords
      return coords
    }
  } catch {}
  geocodeCache[address] = null
  return null
}

async function resolveRideCoords(ride: Ride): Promise<{
  from: [number, number] | null
  to:   [number, number] | null
}> {
  let from: [number, number] | null =
    (ride.fromLat && ride.fromLng)
      ? [Number(ride.fromLat), Number(ride.fromLng)]
      : resolveCoords(ride.fromLocation)

  let to: [number, number] | null =
    (ride.toLat && ride.toLng)
      ? [Number(ride.toLat), Number(ride.toLng)]
      : resolveCoords(ride.toLocation)

  // Fall back to live geocoding for unrecognised addresses
  if (!from) from = await geocode(ride.fromLocation)
  if (!to)   to   = await geocode(ride.toLocation)

  return { from, to }
}

export default function MapRides({ rides, selected, onSelect, height = 400 }: Props) {
  const ref       = useRef<HTMLDivElement>(null)
  const mapRef    = useRef<any>(null)
  const layersRef = useRef<any[]>([])
  const fitSigRef = useRef<string>('')                  // last fitBounds signature (rides+selection)
  const [routeVersion, setRouteVersion] = useState(0)   // bumps when an OSRM route resolves

  // Initialise map once
  useEffect(() => {
    if (!ref.current || typeof window === 'undefined') return
    let cancelled = false

    import('leaflet').then(L => {
      if (cancelled || !ref.current || mapRef.current) return
      if ((ref.current as any)._leaflet_id) return

      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })

      const map = L.map(ref.current!, { zoomControl: true, scrollWheelZoom: true })
      mapRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map)

      map.setView([33.8869, 35.5131], 9)
    })

    return () => {
      cancelled = true
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; layersRef.current = [] }
    }
  }, [])

  // Redraw rides whenever list or selection changes
  useEffect(() => {
    if (!mapRef.current || typeof window === 'undefined') return

    import('leaflet').then(async L => {
      const map = mapRef.current
      if (!map) return

      // Clear old layers
      layersRef.current.forEach(l => { try { map.removeLayer(l) } catch {} })
      layersRef.current = []

      const allPoints: [number, number][] = []

      // Resolve all coordinates (including geocoding) before drawing
      const resolved = await Promise.all(
        rides.map(ride => resolveRideCoords(ride))
      )

      rides.forEach((ride, idx) => {
        const { from, to } = resolved[idx]
        if (!from && !to) return         // can't place this ride at all

        const color    = COLORS[idx % COLORS.length]
        const isActive = selected && selected.rideId === ride.rideId
        const weight   = isActive ? 5 : 3
        const opacity  = isActive ? 1 : 0.65

        const routePoints: [number, number][] = []
        if (from) routePoints.push(from)

        // Stops — accept both API shape (array of names) and demo shape ('|'-string)
        const stopPoints: { name: string; coords: [number, number] }[] = []
        const names = Array.isArray(ride.stops) ? ride.stops : ride.stops ? String(ride.stops).split('|') : []
        names.filter(Boolean).forEach(name => {
          const sc = resolveCoords(name.trim())
          if (sc) { routePoints.push(sc); stopPoints.push({ name: name.trim(), coords: sc }) }
        })
        if (to) routePoints.push(to)

        // Route line: prefer the OSRM road-following geometry; fall back to a
        // dashed straight line when OSRM has no answer for these waypoints.
        if (routePoints.length >= 2) {
          const key    = routePoints.map(p => `${p[0].toFixed(5)},${p[1].toFixed(5)}`).join(';')
          const cached = routeGeoCache[key]

          if (cached) {
            // Routed — solid line following real streets
            const line = L.geoJSON(cached, { style: { color, weight, opacity } }).addTo(map)
            layersRef.current.push(line)
          } else {
            // Not routed (not fetched yet, or OSRM failed) — dashed straight line
            const line = L.polyline(routePoints, {
              color, weight, opacity,
              dashArray: isActive ? undefined : '7 5',
            }).addTo(map)
            layersRef.current.push(line)

            // Fetch the real route ONCE per waypoint set (undefined = never tried).
            // On resolve we cache it and bump routeVersion so this redraws routed.
            if (cached === undefined) {
              const wp = routePoints.map(p => `${p[1]},${p[0]}`).join(';')
              fetch(`https://router.project-osrm.org/route/v1/driving/${wp}?overview=full&geometries=geojson`)
                .then(r => r.json())
                .then(data => { routeGeoCache[key] = data.routes?.[0]?.geometry ?? null; setRouteVersion(v => v + 1) })
                .catch(() => { routeGeoCache[key] = null; setRouteVersion(v => v + 1) })
            }
          }

          routePoints.forEach(p => allPoints.push(p))
        }

        const popup = () => `
          <div style="font-family:system-ui,sans-serif;min-width:200px;max-width:240px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
              <div style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0"></div>
              <div style="font-weight:700;font-size:13px;color:#111;line-height:1.3">
                ${ride.fromLocation.split(',')[0]} → ${ride.toLocation.split(',')[0]}
              </div>
            </div>
            <div style="font-size:11px;color:#666;margin-bottom:3px">
              ${new Date(ride.departureTime).toLocaleString('en',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
            </div>
            <div style="font-size:11px;color:#666;margin-bottom:6px">
              ${ride.driver?.fullName || 'Driver'} · ${ride.availableSeats} seat${ride.availableSeats !== 1 ? 's' : ''} left
            </div>
            <div style="font-size:15px;font-weight:700;color:${color};margin-bottom:8px">
              $${ride.pricePerSeat}<span style="font-size:10px;font-weight:400;color:#666"> /seat</span>
            </div>
            <button onclick="window.__otw_select_ride(${ride.rideId})"
              style="width:100%;background:${color};color:#fff;border:none;padding:6px 0;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer">
              View ride →
            </button>
          </div>
        `

        // Start pin — filled circle
        if (from) {
          const icon = L.divIcon({
            html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 1px 5px rgba(0,0,0,.45)"></div>`,
            iconSize: [14, 14], iconAnchor: [7, 7], className: '',
          })
          const m = L.marker(from, { icon }).addTo(map)
          m.bindPopup(popup())
          m.on('click', () => { m.openPopup(); onSelect(ride) })
          layersRef.current.push(m)
          allPoints.push(from)
        }

        // Stop pins — hollow circle
        stopPoints.forEach(({ name, coords: sc }) => {
          const icon = L.divIcon({
            html: `<div style="width:9px;height:9px;border-radius:50%;background:white;border:2.5px solid ${color};box-shadow:0 1px 3px rgba(0,0,0,.3)"></div>`,
            iconSize: [9, 9], iconAnchor: [4.5, 4.5], className: '',
          })
          const sm = L.marker(sc, { icon }).addTo(map)
          sm.bindTooltip(name, { direction: 'top', offset: [0, -6] })
          sm.bindPopup(popup())
          sm.on('click', () => { sm.openPopup(); onSelect(ride) })
          layersRef.current.push(sm)
          allPoints.push(sc)
        })

        // End pin — price badge
        if (to) {
          const icon = L.divIcon({
            html: `
              <div style="display:flex;flex-direction:column;align-items:center">
                <div style="background:${color};color:#fff;padding:3px 7px;border-radius:6px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 2px 5px rgba(0,0,0,.25);border:1.5px solid white">
                  $${ride.pricePerSeat}
                </div>
                <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid ${color};margin-top:-1px"></div>
              </div>`,
            iconSize: [50, 34], iconAnchor: [25, 34], className: '',
          })
          const em = L.marker(to, { icon }).addTo(map)
          em.bindPopup(popup())
          em.on('click', () => { em.openPopup(); onSelect(ride) })
          layersRef.current.push(em)
          allPoints.push(to)
        }
      })

      // Fit bounds only when the ride set or selection changes — NOT on every
      // OSRM route that streams in, so the map doesn't keep re-zooming/jumping.
      const fitSig = rides.map(r => r.rideId).join(',') + '|' + (selected?.rideId ?? '')
      if (allPoints.length > 0 && fitSigRef.current !== fitSig) {
        fitSigRef.current = fitSig
        try {
          map.fitBounds(L.latLngBounds(allPoints), { padding: [48, 48], maxZoom: 14 })
        } catch {}
      }

      // Global handler for popup "View ride" button
      ;(window as any).__otw_select_ride = (rideId: number) => {
        const ride = rides.find(r => r.rideId === rideId)
        if (ride) onSelect(ride)
      }
    })
  }, [rides, selected, routeVersion])

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
      <div ref={ref} style={{ height, width: '100%' }} />
    </>
  )
}
