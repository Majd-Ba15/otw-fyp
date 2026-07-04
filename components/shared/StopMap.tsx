// StopMap.tsx — map for adding stop pins to a specific ride.
// Shows the ride's from (green) and to (red) pins, plus numbered orange stop pins.
// Click anywhere on the map to drop a new stop; the location is reverse-geocoded.

import { useEffect, useRef, useState } from 'react'

interface Stop { name: string; lat: number; lng: number }

interface Props {
  ride:          any
  stops:         Stop[]
  onAddStop:     (lat: number, lng: number, name: string) => void
  onRemoveStop:  (index: number) => void
  height?:       number
}

// Lebanese city lookup for initial map centering if ride has no coords
const LB_CITIES: [string, [number, number]][] = [
  ['beirut',          [33.8869, 35.5131]],
  ['hamra',           [33.8980, 35.4849]],
  ['ashrafieh',       [33.8878, 35.5278]],
  ['musharafieh',     [33.8820, 35.5200]],
  ['jounieh',         [33.9808, 35.6178]],
  ['tripoli',         [34.4369, 35.8497]],
  ['sidon',           [33.5631, 35.3714]],
  ['saida',           [33.5631, 35.3714]],
  ['tyre',            [33.2705, 35.2038]],
  ['zahle',           [33.8500, 35.9000]],
  ['baalbek',         [34.0050, 36.2100]],
  ['nabatieh',        [33.3775, 35.4836]],
  ['aley',            [33.8108, 35.5975]],
  ['jdaidet el matn', [33.9100, 35.5900]],
  ['jdaideh',         [33.9100, 35.5900]],
  ['jdeidet',         [33.9100, 35.5900]],
  ['metn',            [33.9300, 35.5900]],
  ['dora',            [33.9150, 35.5750]],
  ['sin el fil',      [33.8950, 35.5500]],
  ['antelias',        [33.9500, 35.5900]],
  ['hazmieh',         [33.8567, 35.5486]],
  ['baabda',          [33.8350, 35.5417]],
  ['zalka',           [33.9250, 35.5700]],
  ['chiyah',          [33.8700, 35.5100]],
  ['ghobeiry',        [33.8600, 35.5050]],
  ['cola',            [33.8680, 35.5070]],
  ['jeh',             [33.5900, 35.5400]],
  ['baroun',          [33.4600, 35.4800]],
]

function resolveCoords(name: string): [number, number] | null {
  const lower = name.toLowerCase()
  for (const [city, coords] of LB_CITIES) {
    if (lower.includes(city) || city.includes(lower.trim())) return coords
  }
  return null
}

// Resolve the ride's start/end coords: real coords → city lookup → null.
function endpointsOf(ride: any): { from: [number, number] | null; to: [number, number] | null } {
  const from: [number, number] | null =
    (ride.fromLat && ride.fromLng) ? [Number(ride.fromLat), Number(ride.fromLng)] : resolveCoords(ride.fromLocation)
  const to: [number, number] | null =
    (ride.toLat && ride.toLng) ? [Number(ride.toLat), Number(ride.toLng)] : resolveCoords(ride.toLocation)
  return { from, to }
}

export default function StopMap({ ride, stops, onAddStop, onRemoveStop, height = 340 }: Props) {
  const ref        = useRef<HTMLDivElement>(null)
  const mapRef     = useRef<any>(null)
  const stopMarkers= useRef<any[]>([])
  const routeRef   = useRef<any>(null)     // holds the drawn OSRM route layer
  const [ready, setReady] = useState(false) // true once the map is initialised

  // Init map once
  useEffect(() => {
    if (!ref.current || typeof window === 'undefined') return
    let cancelled = false
    setReady(false)

    import('leaflet').then(L => {
      if (cancelled || !ref.current || mapRef.current) return
      if ((ref.current as any)._leaflet_id) return

      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })

      // zoomAnimation:false avoids the "_leaflet_pos of undefined" crash — a
      // pending zoom-transition callback firing after the map is torn down
      // (React Strict Mode double-mount) would otherwise read a destroyed pane.
      const map = L.map(ref.current!, { zoomControl: true, scrollWheelZoom: true, zoomAnimation: false })
      mapRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map)

      // Determine initial center: ride coords → city lookup → Beirut
      const { from: fromCoords, to: toCoords } = endpointsOf(ride)
      const center: [number, number] = fromCoords || toCoords || [33.8869, 35.5131]
      map.setView(center, 13, { animate: false })

      // From pin (green)
      if (fromCoords) {
        const icon = L.divIcon({
          html: `<div style="width:14px;height:14px;border-radius:50%;background:#16a36b;border:2.5px solid white;box-shadow:0 1px 5px rgba(0,0,0,.4)"></div>`,
          iconSize: [14, 14], iconAnchor: [7, 7], className: '',
        })
        L.marker(fromCoords, { icon })
          .addTo(map)
          .bindTooltip(`Start: ${ride.fromLocation}`, { direction: 'top', permanent: false })
      }

      // To pin (red)
      if (toCoords) {
        const icon = L.divIcon({
          html: `<div style="width:14px;height:14px;border-radius:50%;background:#DC2626;border:2.5px solid white;box-shadow:0 1px 5px rgba(0,0,0,.4)"></div>`,
          iconSize: [14, 14], iconAnchor: [7, 7], className: '',
        })
        L.marker(toCoords, { icon })
          .addTo(map)
          .bindTooltip(`End: ${ride.toLocation}`, { direction: 'top', permanent: false })
      }

      // Fit to endpoints. The actual route line — through the stops, via OSRM —
      // is drawn in the stops effect below and redrawn whenever stops change.
      if (fromCoords && toCoords) {
        map.fitBounds(L.latLngBounds([fromCoords, toCoords]), { padding: [40, 40], maxZoom: 14, animate: false })
      }

      // Signal the map is ready so the route/stops effect can draw.
      if (!cancelled) setReady(true)

      // Click to add stop
      map.on('click', async (e: any) => {
        const { lat, lng } = e.latlng

        // Reverse-geocode via Nominatim
        let name = `${lat.toFixed(5)}, ${lng.toFixed(5)}`
        try {
          const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
          const data = await res.json()
          if (data.display_name) {
            name = data.display_name.split(',').slice(0, 2).join(',').trim()
          }
        } catch {}

        onAddStop(lat, lng, name)
      })
    })

    return () => {
      cancelled = true
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; stopMarkers.current = []; routeRef.current = null }
    }
  }, [ride])

  // Redraw stop markers + the OSRM route whenever stops change (or map ready)
  useEffect(() => {
    if (!ready || !mapRef.current || typeof window === 'undefined') return
    let stale = false

    import('leaflet').then(L => {
      const map = mapRef.current
      if (stale || !map) return

      // Remove old stop markers
      stopMarkers.current.forEach(m => { try { map.removeLayer(m) } catch {} })
      stopMarkers.current = []

      stops.forEach((stop, i) => {
        if (!stop.lat || !stop.lng) return
        const icon = L.divIcon({
          html: `
            <div style="display:flex;flex-direction:column;align-items:center">
              <div style="width:26px;height:26px;border-radius:50%;background:#F59E0B;border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:white">
                ${i + 1}
              </div>
              <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid #F59E0B;margin-top:-1px"></div>
            </div>`,
          iconSize: [26, 32], iconAnchor: [13, 32], className: '',
        })
        const marker = L.marker([stop.lat, stop.lng], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:system-ui;min-width:160px">
              <div style="font-weight:700;font-size:12px;margin-bottom:6px">Stop ${i + 1}</div>
              <div style="font-size:11px;color:#444;margin-bottom:8px">${stop.name}</div>
              <button onclick="window.__otw_remove_stop(${i})"
                style="width:100%;background:#EF4444;color:white;border:none;padding:5px;border-radius:5px;font-size:11px;font-weight:600;cursor:pointer">
                Remove stop
              </button>
            </div>`)

        stopMarkers.current.push(marker)
      })

      ;(window as any).__otw_remove_stop = (i: number) => {
        onRemoveStop(i)
        if (mapRef.current) mapRef.current.closePopup()
      }

      // ── OSRM route through from → stops → to (follows real streets) ──────
      // Waypoints are ordered: pickup, each stop in list order, then drop-off.
      if (routeRef.current) { try { map.removeLayer(routeRef.current) } catch {} ; routeRef.current = null }

      const { from, to } = endpointsOf(ride)
      if (!from || !to) return

      const via = stops.filter(s => s.lat && s.lng).map(s => `${s.lng},${s.lat}`)
      const waypoints = [`${from[1]},${from[0]}`, ...via, `${to[1]},${to[0]}`].join(';')

      fetch(`https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=full&geometries=geojson`)
        .then(r => r.json())
        .then(data => {
          if (stale || !mapRef.current) return
          if (routeRef.current) { try { mapRef.current.removeLayer(routeRef.current) } catch {} }
          if (data.routes?.[0]) {
            routeRef.current = L.geoJSON(data.routes[0].geometry, {
              style: { color: '#185FA5', weight: 4, opacity: 0.75 },
            }).addTo(mapRef.current)
          } else {
            throw new Error('no route')
          }
        })
        .catch(() => {
          if (stale || !mapRef.current) return
          // OSRM unreachable — dashed straight line through the same waypoints
          const pts: [number, number][] = [
            from,
            ...stops.filter(s => s.lat && s.lng).map(s => [s.lat, s.lng] as [number, number]),
            to,
          ]
          routeRef.current = L.polyline(pts, { color: '#94A3B8', weight: 2, dashArray: '6 4' }).addTo(mapRef.current)
        })
    })

    return () => { stale = true }
  }, [stops, ready, ride])

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
      <div ref={ref} style={{ height, width: '100%' }} />
    </>
  )
}
