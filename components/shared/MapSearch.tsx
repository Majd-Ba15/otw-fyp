// components/shared/MapSearch.tsx
// Shows all ride pickup points as pins on the map
// Green pin = seats available, Red pin = full
// Tap a pin to select that ride

import { useEffect, useRef } from 'react'

interface Ride {
  rideId:        number
  fromLocation:  string
  toLocation:    string
  fromLat?:      number
  fromLng?:      number
  toLat?:        number
  toLng?:        number
  availableSeats:number
  pricePerSeat:  number
  departureTime: string
  driver?:       { fullName: string; averageRating: number }
}

interface Props {
  rides:    Ride[]
  selected: Ride | null
  onSelect: (ride: Ride) => void
  height?:  number
}

export default function MapSearch({ rides, selected, onSelect, height = 320 }: Props) {
  const ref    = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])

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

      // OpenStreetMap tiles — free, no API key
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map)

      // Filter rides that have coordinates
      const ridesWithCoords = rides.filter(r => r.fromLat && r.fromLng)

      if (ridesWithCoords.length === 0) {
        // No coordinates — show default center (UTM Malaysia)
        map.setView([1.5597, 103.6380], 13)
        return
      }

      // Add a pin for each ride
      ridesWithCoords.forEach(ride => {
        const available = ride.availableSeats > 0
        const isSelected = selected?.rideId === ride.rideId

        const icon = L.divIcon({
          html: `
            <div style="
              position: relative;
              display: flex;
              flex-direction: column;
              align-items: center;
            ">
              <div style="
                background: ${isSelected ? '#185FA5' : available ? '#16a36b' : '#A32D2D'};
                color: #fff;
                padding: 4px 8px;
                border-radius: 8px;
                font-size: 11px;
                font-weight: 700;
                white-space: nowrap;
                box-shadow: 0 2px 6px rgba(0,0,0,0.25);
                border: 2px solid #fff;
                cursor: pointer;
              ">
                $${ride.pricePerSeat}
              </div>
              <div style="
                width: 0; height: 0;
                border-left: 5px solid transparent;
                border-right: 5px solid transparent;
                border-top: 6px solid ${isSelected ? '#185FA5' : available ? '#16a36b' : '#A32D2D'};
                margin-top: -1px;
              "></div>
            </div>
          `,
          iconSize:   [50, 36],
          iconAnchor: [25, 36],
          className:  '',
        })

        const marker = L.marker([Number(ride.fromLat), Number(ride.fromLng)], { icon })
          .addTo(map)

        // Popup with ride summary
        marker.bindPopup(`
          <div style="font-family:Arial,sans-serif;min-width:180px">
            <div style="font-weight:700;font-size:13px;margin-bottom:4px">
              ${ride.fromLocation.split(',')[0]} → ${ride.toLocation.split(',')[0]}
            </div>
            <div style="font-size:11px;color:#666;margin-bottom:4px">
              ${new Date(ride.departureTime).toLocaleString('en', { weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
            </div>
            <div style="font-size:11px;color:#666;margin-bottom:6px">
              ${ride.driver?.fullName} · ${ride.availableSeats > 0 ? ride.availableSeats + ' seats left' : 'Full'}
            </div>
            <div style="font-size:14px;font-weight:700;color:#16a36b;margin-bottom:8px">
              $${ride.pricePerSeat}
            </div>
            <button
              onclick="window.__otw_select(${ride.rideId})"
              style="
                background:#16a36b;color:#fff;border:none;
                padding:5px 14px;border-radius:6px;
                font-size:12px;font-weight:600;cursor:pointer;width:100%
              ">
              View ride →
            </button>
          </div>
        `)

        marker.on('click', () => {
          marker.openPopup()
          onSelect(ride)
        })

        markersRef.current.push({ rideId: ride.rideId, marker })
      })

      // Register global handler for popup button
      ;(window as any).__otw_select = (rideId: number) => {
        const ride = rides.find(r => r.rideId === rideId)
        if (ride) onSelect(ride)
      }

      // Fit map to show all pins
      const bounds = L.latLngBounds(
        ridesWithCoords.map(r => [Number(r.fromLat), Number(r.fromLng)] as [number, number])
      )
      map.fitBounds(bounds, { padding: [40, 40] })
    })

    return () => {
      cancelled = true
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; markersRef.current = []; delete (window as any).__otw_select }
    }
  }, [rides])

  // Highlight selected marker when selection changes
  useEffect(() => {
    if (!selected || !mapRef.current) return
    const entry = markersRef.current.find(m => m.rideId === selected.rideId)
    if (entry) {
      entry.marker.openPopup()
      mapRef.current.panTo(entry.marker.getLatLng(), { animate: true })
    }
  }, [selected])

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
      <div ref={ref} style={{ height, width: '100%' }} />
    </>
  )
}
