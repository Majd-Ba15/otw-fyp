// components/shared/MapPicker.tsx
// Click on map to pick a location — returns lat/lng and address name
// Usage: <MapPicker label="Pickup" onPick={(lat,lng,name) => ...} />
//
// Additive campus support: every campus from lib/universities.ts is rendered
// as a pin, plus a horizontal quick-select chip row above the map. Picking a
// campus (pin or chip) skips Nominatim entirely and reports the clean campus
// name — the original click-anywhere + reverse-geocode flow is unchanged.

import { useEffect, useRef, useState } from 'react'
import { allCampuses, type Campus } from '../../lib/universities'

interface Props {
  label:              string
  onPick:             (lat: number, lng: number, name: string) => void
  initial?:           { lat: number; lng: number }
  height?:            number
  userUniversity?:    string   // orders that university's campuses first in the chip row
  highlightCampuses?: boolean  // default true — set false on compact in-form pickers to hide pins/chips
}

// "LAU Beirut Campus" -> "LAU Beirut" — short enough for a pin label / chip
function shortCampusName(name: string): string {
  return name.replace(/\s*Campus$/i, '')
}

function campusIconHtml(name: string, showLabel: boolean): string {
  if (!showLabel) {
    return '<div style="width:14px;height:14px;border-radius:50%;background:#185FA5;border:2px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.35)"></div>'
  }
  return `<div style="display:inline-flex;align-items:center;gap:3px;background:#185FA5;color:#fff;padding:3px 8px;border-radius:14px;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35);font-size:10px;font-weight:700;white-space:nowrap">${shortCampusName(name)}</div>`
}

export default function MapPicker({ label, onPick, initial, height = 180, userUniversity, highlightCampuses = true }: Props) {
  const ref        = useRef<HTMLDivElement>(null)
  const mapRef     = useRef<any>(null)
  const markRef    = useRef<any>(null)
  const campusMarkersRef = useRef<any[]>([])
  const leafletRef = useRef<any>(null)   // holds the loaded `L` module so chip clicks (outside the async init) can use it
  const [picked, setPicked] = useState<string | null>(null)

  const campuses: Array<Campus & { universityCode: string }> = highlightCampuses
    ? [...allCampuses()].sort((a, b) => {
        if (!userUniversity) return 0
        const aMine = a.universityCode === userUniversity ? 0 : 1
        const bMine = b.universityCode === userUniversity ? 0 : 1
        return aMine - bMine
      })
    : []

  // Reverse-geocode via Nominatim — used for free map clicks and for dragging
  // the marker away from a picked campus (it's no longer an exact campus point).
  function reverseGeocode(lat: number, lng: number, marker: any) {
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

  // Selecting a campus (pin click or chip tap): move/create the draggable
  // marker at the exact campus coords, report the clean campus name — no
  // Nominatim call, so it can never get overwritten by a nearby street address.
  function selectCampus(lat: number, lng: number, name: string) {
    const L = leafletRef.current
    const map = mapRef.current
    if (!L || !map) return
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
    markRef.current.bindPopup(name).openPopup()
    map.setView([lat, lng], Math.max(map.getZoom(), 16))
    setPicked(name)
    onPick(lat, lng, name)
  }

  useEffect(() => {
    if (!ref.current || mapRef.current) return
    if (typeof window === 'undefined') return

    let cancelled = false

    import('leaflet').then(L => {
      if (cancelled || !ref.current || mapRef.current) return
      leafletRef.current = L

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
        attribution: 'Â© OpenStreetMap'
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

      // Campus pins — one per campus, always visible, distinct from the
      // free-pick marker. Clicking one selects it exactly like a map click,
      // except the name is the campus name (no Nominatim call).
      if (highlightCampuses) {
        const makeCampusIcon = (name: string, showLabel: boolean) => L.divIcon({
          className: '',
          html: campusIconHtml(name, showLabel),
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        })

        campuses.forEach(c => {
          const marker = L.marker([c.lat, c.lng], { icon: makeCampusIcon(c.name, map.getZoom() >= 12), zIndexOffset: 500 })
            .addTo(map)
            .on('click', () => selectCampus(c.lat, c.lng, c.name))
          campusMarkersRef.current.push({ marker, name: c.name })
        })

        map.on('zoomend', () => {
          const showLabel = map.getZoom() >= 12
          campusMarkersRef.current.forEach(({ marker, name }) => {
            marker.setIcon(makeCampusIcon(name, showLabel))
          })
        })
      }
    })

    return () => {
      cancelled = true
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; markRef.current = null; campusMarkersRef.current = []; leafletRef.current = null }
    }
  }, [])

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4, fontWeight: 500 }}>{label ? `${label} - ` : ''}tap map to set location</div>

        {highlightCampuses && campuses.length > 0 && (
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6, marginBottom: 4, scrollbarWidth: 'thin' }}>
            {campuses.map(c => (
              <button key={c.name} type="button" className={`chip ${picked === c.name ? 'active' : ''}`}
                onClick={() => selectCampus(c.lat, c.lng, c.name)}>
                {shortCampusName(c.name)}
              </button>
            ))}
          </div>
        )}

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

