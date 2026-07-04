// components/shared/MapLive.tsx
// Live tracking map — driver marker moves in real time via SignalR.
// The ride path is fetched ONCE from OSRM (real road-following route) on mount,
// NOT re-fetched on every GPS update — only the driver marker position updates.
// Usage: <MapLive driverLat={} driverLng={} toLat={} toLng={} />

import { useEffect, useRef } from 'react'

interface Props {
  driverLat: number
  driverLng: number
  toLat:     number
  toLng:     number
  height?:   number
}

export default function MapLive({ driverLat, driverLng, toLat, toLng, height = 220 }: Props) {
  const ref       = useRef<HTMLDivElement>(null)
  const mapRef    = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const routeRef  = useRef<any>(null)   // holds the drawn ride-path layer

  // Init map once
  useEffect(() => {
    if (!ref.current || typeof window === 'undefined') return
    let cancelled = false

    import('leaflet').then(L => {
      if (cancelled || !ref.current || mapRef.current) return
      if ((ref.current as any)._leaflet_id) return   // already initialised — bail
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })

      const map = L.map(ref.current!, { zoomControl: true, scrollWheelZoom: false })
      mapRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(map)

      // Driver icon — animated pulse
      const driverIcon = L.divIcon({
        html: `<div style="position:relative">
          <div style="width:18px;height:18px;border-radius:50%;background:#185FA5;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4);z-index:2;position:relative"></div>
          <div style="position:absolute;top:-4px;left:-4px;width:26px;height:26px;border-radius:50%;background:rgba(24,95,165,0.25);animation:ping 1.5s ease-in-out infinite"></div>
        </div>`,
        iconSize: [18, 18], iconAnchor: [9, 9], className: ''
      })

      // Destination icon
      const destIcon = L.divIcon({
        html: `<div style="width:14px;height:14px;border-radius:50%;background:#A32D2D;border:2.5px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>`,
        iconSize: [14, 14], iconAnchor: [7, 7], className: ''
      })

      markerRef.current = L.marker([driverLat, driverLng], { icon: driverIcon })
        .addTo(map).bindPopup('Driver')

      L.marker([toLat, toLng], { icon: destIcon })
        .addTo(map).bindPopup('Your destination')

      map.fitBounds([[driverLat, driverLng], [toLat, toLng]], { padding: [30, 30] })

      // ── Fetch the exact road-following ride path via OSRM ──────────────
      // Runs only inside this mount effect (deps: []), so it fires ONCE per
      // component lifetime — NOT on every GPS update. The line is the planned
      // route; only the driver marker moves after this.
      fetch(`https://router.project-osrm.org/route/v1/driving/${driverLng},${driverLat};${toLng},${toLat}?overview=full&geometries=geojson`)
        .then(r => r.json())
        .then(data => {
          if (cancelled || !mapRef.current) return
          if (data.routes?.[0]) {
            routeRef.current = L.geoJSON(data.routes[0].geometry, {
              style: { color: '#185FA5', weight: 4, opacity: 0.75 }
            }).addTo(mapRef.current)
          } else {
            throw new Error('no route')
          }
        })
        .catch(() => {
          if (cancelled || !mapRef.current) return
          // OSRM unreachable — fall back to a straight dashed line so the UI never breaks
          routeRef.current = L.polyline(
            [[driverLat, driverLng], [toLat, toLng]],
            { color: '#185FA5', weight: 3, opacity: 0.6, dashArray: '6 4' }
          ).addTo(mapRef.current)
        })
    })

    return () => {
      cancelled = true
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; markerRef.current = null; routeRef.current = null }
    }
  }, [])

  // Update driver marker position when coordinates change
  useEffect(() => {
    if (!markerRef.current || !mapRef.current) return
    markerRef.current.setLatLng([driverLat, driverLng])
    mapRef.current.panTo([driverLat, driverLng], { animate: true, duration: 0.5 })
  }, [driverLat, driverLng])

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
      <style>{`@keyframes ping{0%,100%{transform:scale(1);opacity:0.6}50%{transform:scale(1.5);opacity:0}}`}</style>
      <div ref={ref} style={{ height, width: '100%', borderRadius: 10, overflow: 'hidden', border: '0.5px solid var(--border)', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 1000, background: '#185FA5', color: '#fff', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff', animation: 'ping 1.5s ease-in-out infinite' }}/>
          LIVE
        </div>
      </div>
    </>
  )
}
