// components/shared/MapPicker.tsx
// Click on map to pick a location — returns lat/lng and address name
// Usage: <MapPicker label="Pickup" onPick={(lat,lng,name) => ...} />

import { useEffect, useRef, useState } from 'react'

interface Props {
  label:    string
  onPick:   (lat: number, lng: number, name: string) => void
  initial?: { lat: number; lng: number }
  height?:  number
}

export default function MapPicker({ label, onPick, initial, height = 180 }: Props) {
  const ref     = useRef<HTMLDivElement>(null)
  const mapRef  = useRef<any>(null)
  const markRef = useRef<any>(null)
  const [picked, setPicked] = useState<string | null>(null)

  useEffect(() => {
    if (!ref.current || mapRef.current) return
    if (typeof window === 'undefined') return

    let cancelled = false

    import('leaflet').then(L => {
      if (cancelled || !ref.current || mapRef.current) return

      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })

      // Default center — Lebanon (Beirut)
      const center: [number, number] = initial
        ? [initial.lat, initial.lng]
        : [33.8869, 35.5131]

      if ((ref.current as any)._leaflet_id) {
        ;(ref.current as any)._leaflet_id = undefined
      }

      const map = L.map(ref.current!, { zoomControl: true, scrollWheelZoom: true })
      mapRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(map)

      map.setView(center, 15)

      // If initial position provided, place marker
      if (initial) {
        const marker = L.marker([initial.lat, initial.lng], { draggable: true }).addTo(map)
        markRef.current = marker
        marker.on('dragend', () => {
          const pos = marker.getLatLng()
          reverseGeocode(pos.lat, pos.lng, marker)
        })
      }

      // Click to place / move marker
      map.on('click', (e: any) => {
        const { lat, lng } = e.latlng
        if (markRef.current) {
          markRef.current.setLatLng([lat, lng])
        } else {
          const marker = L.marker([lat, lng], { draggable: true }).addTo(map)
          markRef.current = marker
          marker.on('dragend', () => {
            const pos = marker.getLatLng()
            reverseGeocode(pos.lat, pos.lng, marker)
          })
        }
        reverseGeocode(lat, lng, markRef.current)
      })

      function reverseGeocode(lat: number, lng: number, marker: any) {
        // Free reverse geocoding via Nominatim (OpenStreetMap)
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
          .then(r => r.json())
          .then(data => {
            const name = data.display_name?.split(',').slice(0, 2).join(',') ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
            marker.bindPopup(name).openPopup()
            setPicked(name)
            onPick(lat, lng, name)
          })
          .catch(() => {
            const name = `${lat.toFixed(5)}, ${lng.toFixed(5)}`
            setPicked(name)
            onPick(lat, lng, name)
          })
      }
    })

    return () => {
      cancelled = true
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; markRef.current = null }
    }
  }, [])

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4, fontWeight: 500 }}>{label} — tap map to set location</div>
        <div ref={ref} style={{ height, width: '100%', borderRadius: 10, overflow: 'hidden', border: `1.5px dashed ${picked ? '#16a36b' : 'var(--border)'}`, cursor: 'crosshair' }} />
        {picked && (
          <div style={{ fontSize: 11, color: '#16a36b', marginTop: 4, display: 'flex', gap: 4, alignItems: 'center' }}>
            <span>📍</span><span>{picked}</span>
          </div>
        )}
        {!picked && (
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>No location selected yet</div>
        )}
      </div>
    </>
  )
}
