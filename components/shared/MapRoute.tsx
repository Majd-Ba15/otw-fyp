// components/shared/MapRoute.tsx
// Route preview map — shows pickup, dropoff and draws route via OSRM
// Usage: <MapRoute from={{lat,lng}} to={{lat,lng}} />
// Dynamic import only — never SSR

import { useEffect, useRef, useState } from 'react'

interface LatLng { lat: number; lng: number }
interface Props {
  from:    LatLng
  to:      LatLng
  stops?:  Array<{ stopLat: number; stopLng: number; stopName: string }>
  height?: number
}

export default function MapRoute({ from, to, stops = [], height = 200 }: Props) {
  const ref  = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!ref.current || mapRef.current) return
    if (typeof window === 'undefined') return

    // Dynamic import of leaflet CSS + library
    import('leaflet').then(L => {
      // Fix default marker icons broken by webpack
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })

      const map = L.map(ref.current!, { zoomControl: true, scrollWheelZoom: false })
      mapRef.current = map

      // OpenStreetMap tiles — free, no API key
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map)

      // Green pickup marker
      const greenIcon = L.divIcon({
        html: `<div style="width:14px;height:14px;border-radius:50%;background:#16a36b;border:2.5px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>`,
        iconSize: [14, 14], iconAnchor: [7, 7], className: ''
      })

      // Red dropoff marker
      const redIcon = L.divIcon({
        html: `<div style="width:14px;height:14px;border-radius:50%;background:#A32D2D;border:2.5px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>`,
        iconSize: [14, 14], iconAnchor: [7, 7], className: ''
      })

      // Amber stop marker
      const stopIcon = L.divIcon({
        html: `<div style="width:10px;height:10px;border-radius:50%;background:#EF9F27;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>`,
        iconSize: [10, 10], iconAnchor: [5, 5], className: ''
      })

      L.marker([from.lat, from.lng], { icon: greenIcon })
        .addTo(map).bindPopup('Pickup').openPopup()
      L.marker([to.lat,   to.lng],   { icon: redIcon })
        .addTo(map).bindPopup('Drop-off')

      stops.forEach(s => {
        if (s.stopLat && s.stopLng) {
          L.marker([s.stopLat, s.stopLng], { icon: stopIcon })
            .addTo(map).bindPopup(s.stopName)
        }
      })

      // Fit map to show all points
      const allPoints: [number,number][] = [
        [from.lat, from.lng], [to.lat, to.lng],
        ...stops.filter(s=>s.stopLat&&s.stopLng).map(s=>[s.stopLat,s.stopLng] as [number,number])
      ]
      map.fitBounds(L.latLngBounds(allPoints), { padding: [20, 20] })

      // Draw route via OSRM — free, no API key
      const waypoints = [
        `${from.lng},${from.lat}`,
        ...stops.filter(s=>s.stopLat&&s.stopLng).map(s=>`${s.stopLng},${s.stopLat}`),
        `${to.lng},${to.lat}`
      ].join(';')

      fetch(`https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=full&geometries=geojson`)
        .then(r => r.json())
        .then(data => {
          if (data.routes?.[0]) {
            L.geoJSON(data.routes[0].geometry, {
              style: { color: '#16a36b', weight: 4, opacity: 0.8 }
            }).addTo(map)
          }
        })
        .catch(() => {
          // If OSRM fails just draw a straight line
          L.polyline([[from.lat,from.lng],[to.lat,to.lng]], {
            color: '#16a36b', weight: 3, dashArray: '6 4'
          }).addTo(map)
        })
    }).catch(() => setError(true))

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    }
  }, [])

  if (error) return (
    <div style={{ height, background: 'var(--bg3)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--text3)' }}>
      🗺 {`Map unavailable`}
    </div>
  )

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
      <div ref={ref} style={{ height, width: '100%', borderRadius: 10, overflow: 'hidden', border: '0.5px solid var(--border)' }} />
    </>
  )
}
