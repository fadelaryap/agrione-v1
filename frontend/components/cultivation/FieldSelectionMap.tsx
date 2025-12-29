'use client'

import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, FeatureGroup, useMap } from 'react-leaflet'
import { LatLngExpression } from 'leaflet'
import L from 'leaflet'
import 'leaflet-draw/dist/leaflet.draw.css'
import 'leaflet-draw'
import { toast } from 'sonner'

// Fix Leaflet default icon
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  })
}

interface Field {
  id: number
  name: string
  coordinates: number[][] | { center: number[]; radius: number } | null
  draw_type?: string
  area?: number
  description?: string
}

interface FieldSelectionMapProps {
  fields: Field[]
  selectedFieldIds: Set<number>
  onFieldToggle: (fieldId: number) => void
  onFieldsSelectByPolygon: (fieldIds: number[]) => void
}

function MapBounds({ fields }: { fields: Field[] }) {
  const map = useMap()
  
  useEffect(() => {
    if (fields.length === 0) return
    
    const allCoords: [number, number][] = []
    fields.forEach(field => {
      if (field.draw_type === 'circle' && field.coordinates && typeof field.coordinates === 'object' && 'center' in field.coordinates) {
        allCoords.push([field.coordinates.center[0], field.coordinates.center[1]])
      } else if (Array.isArray(field.coordinates)) {
        field.coordinates.forEach(coord => {
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
  }, [map, fields])
  
  return null
}

function FieldLayers({ fields, selectedFieldIds, onFieldToggle, onFieldsSelectByPolygon }: FieldSelectionMapProps) {
  const featureGroupRef = useRef<L.FeatureGroup | null>(null)
  const drawControlRef = useRef<L.Control.Draw | null>(null)
  const drawnLayersRef = useRef<L.FeatureGroup>(L.featureGroup())
  const layersRef = useRef<Map<number, L.Layer>>(new Map())
  const mapRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!mapRef.current || !featureGroupRef.current) return

    const map = mapRef.current
    const featureGroup = featureGroupRef.current

    // Clear existing layers
    layersRef.current.forEach(layer => {
      featureGroup.removeLayer(layer)
      layer.remove()
    })
    layersRef.current.clear()

    // Draw fields
    fields.forEach((field) => {
      if (!field.coordinates) return

      const isSelected = selectedFieldIds.has(field.id)
      let layer: L.Layer | null = null

      if (field.draw_type === 'circle' && typeof field.coordinates === 'object' && 'center' in field.coordinates) {
        const center = field.coordinates.center
        const radius = field.coordinates.radius || 10
        layer = L.circle([center[0], center[1]], {
          radius,
          color: isSelected ? '#3b82f6' : '#10b981',
          weight: isSelected ? 4 : 2,
          fillOpacity: isSelected ? 0.35 : 0.2,
        })
      } else if (Array.isArray(field.coordinates)) {
        const latlngs = field.coordinates.map((coord: any) => [coord[0], coord[1]] as LatLngExpression)
        layer = L.polygon(latlngs, {
          color: isSelected ? '#3b82f6' : '#10b981',
          weight: isSelected ? 4 : 2,
          fillOpacity: isSelected ? 0.35 : 0.2,
        })
      }

      if (layer) {
        ;(layer as any)._meta = { id: field.id, type: 'field', name: field.name }
        layer.bindPopup(`
          <div>
            <strong>${field.name}</strong><br/>
            ${field.description || ''}<br/>
            ${field.area ? `Area: ${field.area.toFixed(2)} Ha<br/>` : ''}
            Status: <strong style="color: ${isSelected ? '#3b82f6' : '#10b981'}">${isSelected ? 'Selected' : 'Not Selected'}</strong><br/>
            <button onclick="window.toggleField(${field.id})" style="margin-top:8px;padding:4px 8px;background:${isSelected ? '#ef4444' : '#3b82f6'};color:white;border:none;border-radius:4px;cursor:pointer;">${isSelected ? 'Deselect' : 'Select'}</button>
          </div>
        `)

        layer.on('click', () => {
          onFieldToggle(field.id)
        })

        featureGroup.addLayer(layer)
        layersRef.current.set(field.id, layer)
      }
    })

    // Global function for popup buttons
    ;(window as any).toggleField = (fieldId: number) => {
      onFieldToggle(fieldId)
    }

    // Cleanup
    return () => {
      layersRef.current.forEach(layer => {
        featureGroup.removeLayer(layer)
        layer.remove()
      })
      layersRef.current.clear()
    }
  }, [fields, selectedFieldIds, onFieldToggle])

  // Setup draw control for polygon selection
  useEffect(() => {
    if (!mapRef.current) return

    const map = mapRef.current

    // Remove existing draw control
    if (drawControlRef.current) {
      map.removeControl(drawControlRef.current)
    }

    // Setup draw control for polygon selection
    const drawControl = new L.Control.Draw({
      draw: {
        polygon: {
          allowIntersection: false,
          drawError: {
            color: '#e1e100',
            message: '<strong>Invalid polygon!</strong> Please draw a valid polygon.'
          },
          shapeOptions: {
            color: '#f97316',
            weight: 3,
            fillOpacity: 0.2
          }
        },
        polyline: false,
        rectangle: false,
        circle: false,
        circlemarker: false,
        marker: false
      },
      edit: {
        featureGroup: drawnLayersRef.current,
        remove: true
      }
    })

    map.addControl(drawControl)
    drawControlRef.current = drawControl

    // Handle polygon drawn
    const handleDrawCreated = (e: L.DrawEvents.Created) => {
      const layer = e.layer
      
      // Only handle polygon layers
      if (!(layer instanceof L.Polygon)) {
        return
      }

      drawnLayersRef.current.addLayer(layer)

      // Find all fields that intersect or are contained within the drawn polygon
      const selectedIds: number[] = []
      const drawnPolygon = layer as L.Polygon
      const drawnBounds = drawnPolygon.getBounds()

      fields.forEach(field => {
        if (!field.coordinates) return

        try {
          let fieldPoints: L.LatLng[] = []

          if (field.draw_type === 'circle' && typeof field.coordinates === 'object' && 'center' in field.coordinates) {
            // For circles, check if center is inside drawn polygon
            const center = field.coordinates.center
            fieldPoints = [L.latLng(center[0], center[1])]
          } else if (Array.isArray(field.coordinates)) {
            // For polygons, check if any point is inside drawn polygon
            fieldPoints = field.coordinates.map((coord: any) => L.latLng(coord[0], coord[1]))
          }

          // Check if any point of the field is inside the drawn polygon
          // Using simple bounds check first, then point-in-polygon
          const fieldBounds = L.latLngBounds(fieldPoints)
          if (drawnBounds.intersects(fieldBounds)) {
            // Check if center point is inside drawn polygon
            const fieldCenter = fieldBounds.getCenter()
            const drawnLatLngs = (drawnPolygon as any).getLatLngs()[0] as L.LatLng[]
            if (drawnLatLngs && drawnLatLngs.length > 0) {
              // Simple point-in-polygon check using ray casting algorithm
              const isInside = (point: L.LatLng, polygon: L.LatLng[]): boolean => {
                let inside = false
                for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
                  const xi = polygon[i].lat, yi = polygon[i].lng
                  const xj = polygon[j].lat, yj = polygon[j].lng
                  const intersect = ((yi > point.lng) !== (yj > point.lng)) && 
                    (point.lat < (xj - xi) * (point.lng - yi) / (yj - yi) + xi)
                  if (intersect) inside = !inside
                }
                return inside
              }

              // Check if center is inside
              if (isInside(fieldCenter, drawnLatLngs)) {
                selectedIds.push(field.id)
              } else if (fieldPoints.length > 1) {
                // Check if any vertex is inside
                const hasPointInside = fieldPoints.some(point => isInside(point, drawnLatLngs))
                if (hasPointInside) {
                  selectedIds.push(field.id)
                }
              }
            }
          }
        } catch (err) {
          console.error('Error checking field intersection:', err, field)
        }
      })

      if (selectedIds.length > 0) {
        onFieldsSelectByPolygon(selectedIds)
        toast.success(`Selected ${selectedIds.length} field(s) within polygon`)
      } else {
        toast.info('No fields found within the drawn polygon')
      }

      // Remove the drawn polygon after selection
      setTimeout(() => {
        drawnLayersRef.current.removeLayer(layer)
      }, 1000)
    }

    map.on(L.Draw.Event.CREATED, handleDrawCreated as any)

    // Cleanup
    return () => {
      map.off(L.Draw.Event.CREATED, handleDrawCreated as any)
      if (drawControlRef.current) {
        map.removeControl(drawControlRef.current)
      }
      drawnLayersRef.current.clearLayers()
    }
  }, [fields, onFieldsSelectByPolygon])

  return (
    <>
      <FeatureGroup ref={featureGroupRef} />
      <SetMapRef onMapReady={(map) => { mapRef.current = map }} />
    </>
  )
}

function SetMapRef({ onMapReady }: { onMapReady: (map: L.Map) => void }) {
  const map = useMap()
  useEffect(() => {
    onMapReady(map)
  }, [map, onMapReady])
  return null
}

export default function FieldSelectionMap({ fields, selectedFieldIds, onFieldToggle, onFieldsSelectByPolygon }: FieldSelectionMapProps) {
  const getCenter = (): [number, number] => {
    if (fields.length === 0) return [-4.079, 104.167]
    
    const allCoords: [number, number][] = []
    fields.forEach(field => {
      if (field.draw_type === 'circle' && field.coordinates && typeof field.coordinates === 'object' && 'center' in field.coordinates) {
        allCoords.push([field.coordinates.center[0], field.coordinates.center[1]])
      } else if (Array.isArray(field.coordinates)) {
        field.coordinates.forEach(coord => {
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
    <div className="w-full h-full rounded-lg overflow-hidden border border-gray-300 relative">
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
        <FieldLayers 
          fields={fields} 
          selectedFieldIds={selectedFieldIds}
          onFieldToggle={onFieldToggle}
          onFieldsSelectByPolygon={onFieldsSelectByPolygon}
        />
        <MapBounds fields={fields} />
      </MapContainer>
      <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 z-[1000] border border-gray-200">
        <p className="text-xs font-semibold text-gray-700 mb-2">Selection Tools</p>
        <div className="text-xs text-gray-600 space-y-1">
          <p>• Click field to toggle</p>
          <p>• Use polygon tool (top-left) to select by area</p>
          <p className="text-orange-600 font-medium">• {selectedFieldIds.size} selected</p>
        </div>
      </div>
    </div>
  )
}

