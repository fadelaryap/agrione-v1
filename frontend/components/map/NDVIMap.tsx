'use client'

import { useEffect, useRef, useMemo } from 'react'
import { MapContainer, TileLayer, FeatureGroup, useMap } from 'react-leaflet'
import { LatLngExpression } from 'leaflet'
import L from 'leaflet'
import { Field } from '@/lib/api'

// Fix Leaflet default icon
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  })
}

const initialMapCenter: [number, number] = [-4.079, 104.167]

interface NDVIData {
  fieldId: number
  ndviValue: number // 0-1
}

interface NDVIMapProps {
  fields: Field[]
  ndviData?: NDVIData[]
  includeRandomPolygons?: boolean // Add random polygons for demonstration
}

// Function to get color based on NDVI value (with gradient support)
function getNDVIColor(ndvi: number): string {
  // Use smooth gradient colors like real NDVI imagery
  if (ndvi >= 0.7) return '#228B22' // Forest Green - Excellent
  if (ndvi >= 0.6) return '#32CD32' // Lime Green - Good
  if (ndvi >= 0.5) return '#FFD700' // Gold - Moderate
  if (ndvi >= 0.4) return '#FF8C00' // Dark Orange - Poor
  return '#DC143C' // Crimson - Critical
}

// Function to interpolate color between two NDVI values
function interpolateNDVIColor(ndvi: number): string {
  // Smooth color interpolation for realistic gradient
  if (ndvi >= 0.7) {
    // Green range: 0.7-1.0
    const t = (ndvi - 0.7) / 0.3
    const r = Math.floor(34 + (34 - 34) * t)
    const g = Math.floor(139 + (205 - 139) * t)
    const b = Math.floor(34 + (34 - 34) * t)
    return `rgb(${r}, ${g}, ${b})`
  } else if (ndvi >= 0.6) {
    // Lime green range: 0.6-0.7
    const t = (ndvi - 0.6) / 0.1
    const r = Math.floor(50 + (34 - 50) * t)
    const g = Math.floor(205 + (139 - 205) * t)
    const b = Math.floor(50 + (34 - 50) * t)
    return `rgb(${r}, ${g}, ${b})`
  } else if (ndvi >= 0.5) {
    // Yellow range: 0.5-0.6
    const t = (ndvi - 0.5) / 0.1
    const r = Math.floor(255 + (50 - 255) * t)
    const g = Math.floor(215 + (205 - 215) * t)
    const b = Math.floor(0 + (50 - 0) * t)
    return `rgb(${r}, ${g}, ${b})`
  } else if (ndvi >= 0.4) {
    // Orange range: 0.4-0.5
    const t = (ndvi - 0.4) / 0.1
    const r = Math.floor(255 + (255 - 255) * t)
    const g = Math.floor(140 + (215 - 140) * t)
    const b = Math.floor(0 + (0 - 0) * t)
    return `rgb(${r}, ${g}, ${b})`
  } else {
    // Red range: 0.0-0.4
    const t = Math.min(ndvi / 0.4, 1)
    const r = Math.floor(220 + (255 - 220) * t)
    const g = Math.floor(20 + (140 - 20) * t)
    const b = Math.floor(60 + (0 - 60) * t)
    return `rgb(${r}, ${g}, ${b})`
  }
}

// Function to get NDVI value for a field
function getNDVIForField(fieldId: number, ndviData?: NDVIData[]): number {
  if (!ndviData) return 0.3 + Math.random() * 0.6 // Random 0.3-0.9
  const data = ndviData.find(d => d.fieldId === fieldId)
  return data ? data.ndviValue : 0.3 + Math.random() * 0.6
}

// Function to divide polygon into grid cells for gradient effect
function createGradientGrid(
  baseCoords: [number, number][],
  baseNDVI: number,
  gridSize: number = 4
): Array<{ coords: [number, number][], ndvi: number }> {
  if (baseCoords.length < 3) return []

  // Calculate bounding box
  const lats = baseCoords.map(c => c[0])
  const lngs = baseCoords.map(c => c[1])
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)

  const latStep = (maxLat - minLat) / gridSize
  const lngStep = (maxLng - minLng) / gridSize

  const cells: Array<{ coords: [number, number][], ndvi: number }> = []

  // Simple point-in-polygon check
  const isPointInPolygon = (lat: number, lng: number, polygon: [number, number][]): boolean => {
    let inside = false
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][1], yi = polygon[i][0]
      const xj = polygon[j][1], yj = polygon[j][0]
      const intersect = ((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)
      if (intersect) inside = !inside
    }
    return inside
  }

  // Create grid cells
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const cellMinLat = minLat + i * latStep
      const cellMaxLat = minLat + (i + 1) * latStep
      const cellMinLng = minLng + j * lngStep
      const cellMaxLng = minLng + (j + 1) * lngStep

      // Check if cell center is inside polygon
      const centerLat = (cellMinLat + cellMaxLat) / 2
      const centerLng = (cellMinLng + cellMaxLng) / 2

      if (isPointInPolygon(centerLat, centerLng, baseCoords)) {
        // Create cell polygon
        const cellCoords: [number, number][] = [
          [cellMinLat, cellMinLng],
          [cellMaxLat, cellMinLng],
          [cellMaxLat, cellMaxLng],
          [cellMinLat, cellMaxLng],
          [cellMinLat, cellMinLng]
        ]

        // Vary NDVI within ±0.15 of base value for gradient effect
        const variation = (Math.random() - 0.5) * 0.3
        const cellNDVI = Math.max(0.1, Math.min(0.95, baseNDVI + variation))

        cells.push({ coords: cellCoords, ndvi: cellNDVI })
      }
    }
  }

  return cells
}

function NDVIOverlay({ fields, ndviData, includeRandomPolygons = false }: NDVIMapProps) {
  const featureGroupRef = useRef<L.FeatureGroup | null>(null)
  const layersRef = useRef<L.Polygon[]>([])

  // Generate random polygons around fields area
  const randomPolygons = useMemo(() => {
    if (!includeRandomPolygons || fields.length === 0) return []

    // Get center and bounds from existing fields
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

    if (allCoords.length === 0) return []

    const avgLat = allCoords.reduce((sum, c) => sum + c[0], 0) / allCoords.length
    const avgLng = allCoords.reduce((sum, c) => sum + c[1], 0) / allCoords.length

    // Generate 8-12 random polygons around the center
    const numPolygons = 8 + Math.floor(Math.random() * 5)
    const polygons: Array<{ id: string, coordinates: number[][], ndvi: number }> = []

    for (let i = 0; i < numPolygons; i++) {
      // Random offset from center (0.01 to 0.05 degrees, roughly 1-5 km)
      const offsetLat = (Math.random() - 0.5) * 0.04
      const offsetLng = (Math.random() - 0.5) * 0.04
      const centerLat = avgLat + offsetLat
      const centerLng = avgLng + offsetLng

      // Create a random polygon (triangle, square, or pentagon)
      const numSides = 3 + Math.floor(Math.random() * 3) // 3, 4, or 5 sides
      const radius = 0.003 + Math.random() * 0.007 // 0.3-1 km
      const coords: number[][] = []

      for (let j = 0; j < numSides; j++) {
        const angle = (j / numSides) * 2 * Math.PI
        const lat = centerLat + (radius / 111) * Math.cos(angle)
        const lng = centerLng + (radius / (111 * Math.cos(centerLat * Math.PI / 180))) * Math.sin(angle)
        coords.push([lat, lng])
      }
      // Close the polygon
      coords.push(coords[0])

      const ndvi = 0.2 + Math.random() * 0.7 // Random NDVI 0.2-0.9
      polygons.push({
        id: `random-${i}`,
        coordinates: coords,
        ndvi
      })
    }

    return polygons
  }, [fields, includeRandomPolygons])

  useEffect(() => {
    if (!featureGroupRef.current) return

    const featureGroup = featureGroupRef.current

    // Cleanup previous layers
    layersRef.current.forEach(layer => {
      featureGroup.removeLayer(layer)
      layer.remove()
    })
    layersRef.current = []

    // Draw fields with NDVI colors
    if (fields && fields.length > 0) {
      fields.forEach((field) => {
        if (!field.coordinates) return

        try {
          let latlngs: LatLngExpression[] = []

          if (field.draw_type === 'circle' && field.coordinates && typeof field.coordinates === 'object' && 'center' in field.coordinates) {
            const center = field.coordinates.center
            const radius = field.coordinates.radius || 10 // radius in km
            // For circles, create a polygon approximation (32-sided polygon)
            const numPoints = 32
            latlngs = []
            for (let i = 0; i <= numPoints; i++) {
              const angle = (i / numPoints) * 2 * Math.PI
              // Convert km to degrees (approximate: 1 degree ≈ 111 km)
              const lat = center[0] + (radius / 111) * Math.cos(angle)
              const lng = center[1] + (radius / (111 * Math.cos(center[0] * Math.PI / 180))) * Math.sin(angle)
              latlngs.push([lat, lng])
            }
          } else if (Array.isArray(field.coordinates)) {
            latlngs = field.coordinates.map((coord: any) => [coord[0], coord[1]] as LatLngExpression)
          }

          if (latlngs.length > 0) {
            const baseNDVI = getNDVIForField(field.id, ndviData)
            
            // Create gradient grid for realistic NDVI visualization
            const gridCells = createGradientGrid(
              latlngs as [number, number][],
              baseNDVI,
              5 // 5x5 grid for smooth gradient
            )

            // If grid creation failed or returned empty, use single polygon
            if (gridCells.length === 0) {
              const color = interpolateNDVIColor(baseNDVI)
              const layer = L.polygon(latlngs, {
                color: color,
                weight: 1,
                fillColor: color,
                fillOpacity: 0.85, // Higher opacity like real NDVI imagery
              })

              ;(layer as any)._meta = { id: field.id, type: 'ndvi_field', ndvi: baseNDVI, name: field.name }
              layer.bindPopup(`
                <div>
                  <strong>${field.name || 'Unnamed Field'}</strong><br/>
                  NDVI: <strong>${baseNDVI.toFixed(3)}</strong><br/>
                  Status: <span style="color: ${color}">
                    ${baseNDVI >= 0.7 ? 'Excellent' :
                      baseNDVI >= 0.6 ? 'Good' :
                      baseNDVI >= 0.5 ? 'Moderate' :
                      baseNDVI >= 0.4 ? 'Poor' : 'Critical'}
                  </span>
                </div>
              `)

              featureGroup.addLayer(layer)
              layersRef.current.push(layer)
            } else {
              // Render each grid cell with varying NDVI for gradient effect
              gridCells.forEach((cell, idx) => {
                const color = interpolateNDVIColor(cell.ndvi)
                const cellLayer = L.polygon(cell.coords, {
                  color: 'transparent', // No border for seamless gradient
                  weight: 0,
                  fillColor: color,
                  fillOpacity: 0.85, // Higher opacity like real NDVI imagery
                })

                ;(cellLayer as any)._meta = { 
                  id: `${field.id}-cell-${idx}`, 
                  type: 'ndvi_cell', 
                  ndvi: cell.ndvi,
                  fieldId: field.id,
                  fieldName: field.name
                }

                // Only bind popup to first cell to avoid clutter
                if (idx === 0) {
                  cellLayer.bindPopup(`
                    <div>
                      <strong>${field.name || 'Unnamed Field'}</strong><br/>
                      Avg NDVI: <strong>${baseNDVI.toFixed(3)}</strong><br/>
                      Range: ${Math.min(...gridCells.map(c => c.ndvi)).toFixed(3)} - ${Math.max(...gridCells.map(c => c.ndvi)).toFixed(3)}<br/>
                      Status: <span style="color: ${interpolateNDVIColor(baseNDVI)}">
                        ${baseNDVI >= 0.7 ? 'Excellent' :
                          baseNDVI >= 0.6 ? 'Good' :
                          baseNDVI >= 0.5 ? 'Moderate' :
                          baseNDVI >= 0.4 ? 'Poor' : 'Critical'}
                      </span>
                    </div>
                  `)
                }

                featureGroup.addLayer(cellLayer)
                layersRef.current.push(cellLayer)
              })
            }
          }
        } catch (err) {
          console.error('Error rendering NDVI polygon:', err, field)
        }
      })
    }

    // Draw random polygons if enabled
    if (includeRandomPolygons && randomPolygons.length > 0) {
      randomPolygons.forEach((poly) => {
        try {
          const latlngs = poly.coordinates.map((coord: any) => [coord[0], coord[1]] as LatLngExpression)
          const color = getNDVIColor(poly.ndvi)

          const layer = L.polygon(latlngs, {
            color: color,
            weight: 1,
            fillColor: color,
            fillOpacity: 0.8, // Higher opacity for better visibility
            dashArray: '5, 5' // Dashed to distinguish from real fields
          })

          ;(layer as any)._meta = { id: poly.id, type: 'random_ndvi', ndvi: poly.ndvi }
          layer.bindPopup(`
            <div>
              <strong>Random Polygon (Demo)</strong><br/>
              NDVI: <strong>${poly.ndvi.toFixed(3)}</strong><br/>
              Status: <span style="color: ${color}">
                ${poly.ndvi >= 0.7 ? 'Excellent' :
                  poly.ndvi >= 0.6 ? 'Good' :
                  poly.ndvi >= 0.5 ? 'Moderate' :
                  poly.ndvi >= 0.4 ? 'Poor' : 'Critical'}
              </span>
            </div>
          `)

          featureGroup.addLayer(layer)
          layersRef.current.push(layer)
        } catch (err) {
          console.error('Error rendering random polygon:', err, poly)
        }
      })
    }

    return () => {
      if (featureGroupRef.current) {
        layersRef.current.forEach(layer => {
          featureGroupRef.current!.removeLayer(layer)
          layer.remove()
        })
        layersRef.current = []
      }
    }
  }, [fields, ndviData, includeRandomPolygons, randomPolygons])

  const setFeatureGroupRef = (instance: L.FeatureGroup | null) => {
    featureGroupRef.current = instance
  }

  return <FeatureGroup ref={setFeatureGroupRef} />
}

function MapBounds({ fields }: { fields: Field[] }) {
  const map = useMap()

  useEffect(() => {
    if (fields.length === 0 || !map) return

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
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
    }
  }, [map, fields])

  return null
}

export default function NDVIMap({ fields, ndviData, includeRandomPolygons = false }: NDVIMapProps) {
  const getCenter = (): [number, number] => {
    if (fields.length === 0) return initialMapCenter

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

    if (allCoords.length === 0) return initialMapCenter

    const avgLat = allCoords.reduce((sum, c) => sum + c[0], 0) / allCoords.length
    const avgLng = allCoords.reduce((sum, c) => sum + c[1], 0) / allCoords.length
    return [avgLat, avgLng]
  }

  return (
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
      <NDVIOverlay fields={fields} ndviData={ndviData} includeRandomPolygons={includeRandomPolygons} />
      <MapBounds fields={fields} />
    </MapContainer>
  )
}
