// components/shared/MapDensity.tsx
// Admin analytics — pickup-point density map. Renders each ride's pickup as a
// low-opacity circle; overlap creates natural density shading (no plugin).
// Same dynamic-import / strict-mode-safe pattern as the other map components.

import { useEffect, useRef } from 'react'

interface Props {
  points: Array<{ lat: number; lng: number }>
  height?: number
}

export default function MapDensity({ points, height = 240 }: Props) {
  const ref    = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const layerRef = useRef<any>(null)

  // Init once
  useEffect(() => {
    if (!ref.current || typeof window === 'undefined') return
    let cancelled = false

    import('leaflet').then(L => {
      if (cancelled || !ref.current || mapRef.current) return
      if ((ref.current as any)._leaflet_id) return

      const map = L.map(ref.current!, { zoomControl: true, scrollWheelZoom: false, zoomAnimation: false })
      mapRef.current = map
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(map)
      map.setView([33.8869, 35.5131], 9)   // Lebanon default
    })

    return () => {
      cancelled = true
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; layerRef.current = null }
    }
  }, [])

  // Redraw density dots when points change
  useEffect(() => {
    if (!mapRef.current || typeof window === 'undefined') return
    let stale = false

    import('leaflet').then(L => {
      const map = mapRef.current
      if (stale || !map) return
      if (layerRef.current) { try { map.removeLayer(layerRef.current) } catch {} }

      const valid = points.filter(p => p.lat && p.lng)
      const group = L.layerGroup(valid.map(p =>
        L.circleMarker([Number(p.lat), Number(p.lng)], {
          radius: 9, stroke: false, fillColor: '#0d8a58', fillOpacity: 0.55,
        })
      ))
      group.addTo(map)
      layerRef.current = group

      if (valid.length > 0) {
        try {
          map.fitBounds(L.latLngBounds(valid.map(p => [Number(p.lat), Number(p.lng)] as [number, number])), {
            padding: [30, 30], maxZoom: 12, animate: false,
          })
        } catch {}
      }
    })

    return () => { stale = true }
  }, [points])

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
      <div ref={ref} style={{ height, width: '100%', borderRadius: 10, overflow: 'hidden', border: '0.5px solid var(--border)' }} />
    </>
  )
}
