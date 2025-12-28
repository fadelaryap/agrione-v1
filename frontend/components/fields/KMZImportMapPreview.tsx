'use client'

import { useEffect, useRef, useMemo } from 'react'
import { MapContainer, TileLayer, FeatureGroup, useMap } from 'react-leaflet'
import { LatLngExpression } from 'leaflet'
import L from 'leaflet'

// Fix Leaflet default icon
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  })
}

interface ParsedPolygon {
  id: string
  name: string
  coordinates: number[][]
}

interface KMZImportMapPreviewProps {
  polygons: ParsedPolygon[]
  onPolygonClick: (polygon: ParsedPolygon & { id: string }) => void
}

function MapBounds({ polygons }: { polygons: ParsedPolygon[] }) {
  const map = useMap()
  
  useEffect(() => {
    if (polygons.length === 0) return
    
    // Calculate bounds from all polygons
    const allCoords: [number, number][] = []
    polygons.forEach(poly => {
      if (Array.isArray(poly.coordinates)) {
        poly.coordinates.forEach(coord => {
          if (Array.isArray(coord) && coord.length >= 2) {
            allCoords.push([coord[0], coord[1]])
          }
        })
      }
    })
    
    if (allCoords.length > 0) {
      const bounds = L.latLngBounds(allCoords)
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [map, polygons])
  
  return null
}

function PolygonLayers({ polygons, onPolygonClick }: { polygons: ParsedPolygon[], onPolygonClick: (polygon: ParsedPolygon & { id: string }) => void }) {
  const featureGroupRef = useRef<L.FeatureGroup | null>(null)
  const layersRef = useRef<L.Polygon[]>([])
  const polygonsRef = useRef<ParsedPolygon[]>(polygons)
  const onPolygonClickRef = useRef(onPolygonClick)

  // Update refs when props change
  useEffect(() => {
    polygonsRef.current = polygons
    onPolygonClickRef.current = onPolygonClick
  }, [polygons, onPolygonClick])

  // Create a stable key for polygons to detect changes
  const polygonsKey = useMemo(() => {
    return polygons.map(p => `${p.id}-${p.coordinates.length}`).join(',')
  }, [polygons])

  useEffect(() => {
    if (!featureGroupRef.current) return

    const featureGroup = featureGroupRef.current

    // Cleanup previous layers
    layersRef.current.forEach(layer => {
      featureGroup.removeLayer(layer)
      layer.remove()
    })
    layersRef.current = []

    // Draw temporary imported polygons (orange color)
    const currentPolygons = polygonsRef.current
    if (Array.isArray(currentPolygons) && currentPolygons.length > 0) {
      currentPolygons.forEach((poly) => {
        if (Array.isArray(poly.coordinates) && poly.coordinates.length > 0) {
          try {
            const latlngs = poly.coordinates.map((coord: any) => [coord[0], coord[1]] as LatLngExpression)
            const layer = L.polygon(latlngs, { 
              color: '#f97316', // Orange color
              weight: 3, 
              fillOpacity: 0.25,
              dashArray: '5, 5' // Dashed border to show it's temporary
            })
            
            ;(layer as any)._meta = { id: poly.id, type: 'temporary_polygon', name: poly.name }
            layer.bindPopup(`
              <div>
                <strong style="color: #f97316;">${poly.name || 'Unnamed'}</strong><br/>
                <button onclick="window.clickKMZPolygon('${poly.id}')" style="margin-top:8px;padding:4px 8px;background:#f97316;color:white;border:none;border-radius:4px;cursor:pointer;">Edit Detail</button>
              </div>
            `)
            
            layer.on('click', () => {
              const foundPoly = currentPolygons.find(p => p.id === poly.id)
              if (foundPoly) {
                onPolygonClickRef.current(foundPoly)
              }
            })
            
            featureGroup.addLayer(layer)
            layersRef.current.push(layer)
          } catch (err) {
            console.error('Error rendering polygon:', err, poly)
          }
        }
      })
    }

    // Global function for clicking polygon from popup
    ;(window as any).clickKMZPolygon = (polygonId: string) => {
      const poly = currentPolygons.find(p => p.id === polygonId)
      if (poly) {
        onPolygonClickRef.current(poly)
      }
    }

    // Cleanup
    return () => {
      if (featureGroupRef.current) {
        layersRef.current.forEach(layer => {
          featureGroupRef.current!.removeLayer(layer)
          layer.remove()
        })
        layersRef.current = []
      }
    }
  }, [polygonsKey]) // Depend on polygonsKey to trigger re-render

  // Callback ref to ensure FeatureGroup is ready
  const setFeatureGroupRef = (instance: L.FeatureGroup | null) => {
    featureGroupRef.current = instance
  }

  return <FeatureGroup ref={setFeatureGroupRef} />
}

export default function KMZImportMapPreview({ polygons, onPolygonClick }: KMZImportMapPreviewProps) {
  // Calculate center from polygons
  const getCenter = (): [number, number] => {
    if (polygons.length === 0) return [-4.079, 104.167] // Default center
    
    const allCoords: [number, number][] = []
    polygons.forEach(poly => {
      if (Array.isArray(poly.coordinates)) {
        poly.coordinates.forEach(coord => {
          if (Array.isArray(coord) && coord.length >= 2) {
            allCoords.push([coord[0], coord[1]])
          }
        })
      }
    })
    
    if (allCoords.length === 0) return [-4.079, 104.167]
    
    const avgLat = allCoords.reduce((sum, c) => sum + c[0], 0) / allCoords.length
    const avgLng = allCoords.reduce((sum, c) => sum + c[1], 0) / allCoords.length
    return [avgLat, avgLng]
  }

  return (
    <div className="w-full h-[400px] rounded-lg overflow-hidden border border-gray-300">
      <MapContainer
        center={getCenter()}
        zoom={13}
        scrollWheelZoom={true}
        className="h-full w-full z-0"
      >
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
        />
        <PolygonLayers polygons={polygons} onPolygonClick={onPolygonClick} />
        <MapBounds polygons={polygons} />
      </MapContainer>
    </div>
  )
}

