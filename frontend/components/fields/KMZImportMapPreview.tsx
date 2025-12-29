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
  selectedPolygonIds?: Set<string>
  onPolygonClick: (polygon: ParsedPolygon & { id: string }) => void
  onPolygonEdit?: (polygonId: string) => void
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

function PolygonLayers({ polygons, selectedPolygonIds, onPolygonClick, onPolygonEdit }: { polygons: ParsedPolygon[], selectedPolygonIds?: Set<string>, onPolygonClick: (polygon: ParsedPolygon & { id: string }) => void, onPolygonEdit?: (polygonId: string) => void }) {
  const featureGroupRef = useRef<L.FeatureGroup | null>(null)
  const layersRef = useRef<L.Polygon[]>([])
  const polygonsRef = useRef<ParsedPolygon[]>(polygons)
  const selectedPolygonIdsRef = useRef<Set<string> | undefined>(selectedPolygonIds)
  const onPolygonClickRef = useRef(onPolygonClick)
  const onPolygonEditRef = useRef(onPolygonEdit)

  // Update refs when props change
  useEffect(() => {
    polygonsRef.current = polygons
    selectedPolygonIdsRef.current = selectedPolygonIds
    onPolygonClickRef.current = onPolygonClick
    onPolygonEditRef.current = onPolygonEdit
  }, [polygons, selectedPolygonIds, onPolygonClick, onPolygonEdit])

  // Create a stable key for polygons to detect changes (include selected state)
  const polygonsKey = useMemo(() => {
    const selectedIds = selectedPolygonIds ? Array.from(selectedPolygonIds).sort().join(',') : ''
    return polygons.map(p => `${p.id}-${p.coordinates.length}`).join(',') + `|selected:${selectedIds}`
  }, [polygons, selectedPolygonIds])

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
            const isSelected = selectedPolygonIdsRef.current?.has(poly.id) || false
            const layer = L.polygon(latlngs, { 
              color: isSelected ? '#3b82f6' : '#f97316', // Blue if selected, orange if not
              weight: isSelected ? 4 : 3, 
              fillOpacity: isSelected ? 0.35 : 0.25,
              dashArray: isSelected ? undefined : '5, 5' // Solid border if selected, dashed if not
            })
            
            ;(layer as any)._meta = { id: poly.id, type: 'temporary_polygon', name: poly.name, isSelected }
            const statusText = isSelected ? '<span style="color:#3b82f6;font-weight:bold;">✓ Selected</span>' : '<span style="color:#f97316;">Not Selected</span>'
            layer.bindPopup(`
              <div>
                <strong style="color: ${isSelected ? '#3b82f6' : '#f97316'};"">${poly.name || 'Unnamed'}</strong><br/>
                <div style="margin-top:4px;font-size:12px;">${statusText}</div>
                <div style="margin-top:8px;display:flex;gap:4px;">
                  <button onclick="window.clickKMZPolygon('${poly.id}')" style="padding:4px 8px;background:${isSelected ? '#3b82f6' : '#f97316'};color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;">${isSelected ? 'Deselect' : 'Select'}</button>
                  <button onclick="window.editKMZPolygon('${poly.id}')" style="padding:4px 8px;background:#6b7280;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;">Edit</button>
                </div>
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

    // Global function for editing polygon from popup
    ;(window as any).editKMZPolygon = (polygonId: string) => {
      if (onPolygonEditRef.current) {
        onPolygonEditRef.current(polygonId)
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

export default function KMZImportMapPreview({ polygons, selectedPolygonIds, onPolygonClick, onPolygonEdit }: KMZImportMapPreviewProps) {
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
        <PolygonLayers polygons={polygons} selectedPolygonIds={selectedPolygonIds} onPolygonClick={onPolygonClick} onPolygonEdit={onPolygonEdit} />
        <MapBounds polygons={polygons} />
      </MapContainer>
    </div>
  )
}

