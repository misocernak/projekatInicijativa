import { useEffect } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import { Link } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Initiative } from '../types'

const pinIcon = L.divIcon({
  className: '',
  html: '<div class="pin" style="width:26px;height:26px"></div>',
  iconSize: [26, 26],
  iconAnchor: [13, 26],
  popupAnchor: [0, -26],
})

function Fit({ items }: { items: Initiative[] }) {
  const map = useMap()
  useEffect(() => {
    map.invalidateSize()
    if (items.length === 0) return
    if (items.length === 1) {
      map.setView([items[0].lat, items[0].lng], 15)
      return
    }
    map.fitBounds(
      L.latLngBounds(items.map((i) => [i.lat, i.lng] as [number, number])),
      { padding: [40, 40], maxZoom: 14 },
    )
  }, [items, map])
  return null
}

interface Props {
  items: Initiative[]
  height?: string
  link?: boolean
}

export default function MapView({ items, height = '420px', link = true }: Props) {
  return (
    <MapContainer
      center={[44.2, 20.9]}
      zoom={7}
      scrollWheelZoom={false}
      style={{ height }}
      className="w-full border border-sand"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Fit items={items} />
      {items.map((i) => (
        <Marker key={i.id} position={[i.lat, i.lng]} icon={pinIcon}>
          <Popup>
            <strong>{i.title}</strong>
            {link && (
              <>
                <br />
                <Link to={`/inicijative/${i.id}`}>Pogledaj inicijativu</Link>
              </>
            )}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
