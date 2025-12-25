'use client'

import { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, FeatureGroup, useMap, Marker } from 'react-leaflet'
import { LatLngExpression, Map as LeafletMap } from 'leaflet'
import L from 'leaflet'
import { fieldsAPI, plotsAPI, plantTypesAPI, usersAPI, Field, Plot, PlantType, User } from '@/lib/api'
import { calculateArea, formatArea } from '@/lib/areaUtils'
import { findContainingField } from '@/lib/geometryUtils'

// Fix Leaflet default icon
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  })
}

// Baturaja, South Sumatra
const initialMapCenter: [number, number] = [-4.079, 104.167]

interface MapComponentProps {
  isEditMode?: boolean
  userId?: number // For filtering fields by user
}

export default function MapComponent({ isEditMode = true, userId }: MapComponentProps) {
  const [map, setMap] = useState<LeafletMap | null>(null)
  const [isFieldDialogOpen, setIsFieldDialogOpen] = useState(false)
  const [isPlotDialogOpen, setIsPlotDialogOpen] = useState(false)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [fieldData, setFieldData] = useState<{
    name: string
    description: string
    coordinates: any
    drawType: string
    plantTypeId: string
    soilTypeId: string
    userId: string
  }>({
    name: '',
    description: '',
    coordinates: null,
    drawType: 'polygon',
    plantTypeId: '',
    soilTypeId: '',
    userId: '',
  })
  const [plotData, setPlotData] = useState<{
    name: string
    description: string
    type: string
    apikey: string
    coordinates: any
    fieldRef: string
  }>({
    name: '',
    description: '',
    type: 'storage',
    apikey: '',
    coordinates: null,
    fieldRef: '',
  })
  const [assignData, setAssignData] = useState<{
    fieldId: number | null
    userId: string
  }>({
    fieldId: null,
    userId: '',
  })
  const [activeTool, setActiveTool] = useState<'select' | 'draw_polygon' | 'draw_rectangle' | 'draw_circle' | 'marker' | null>(null)
  const [satellite, setSatellite] = useState(false)
  const [plantTypes, setPlantTypes] = useState<PlantType[]>([])
  const [level34Users, setLevel34Users] = useState<User[]>([])
  const [fields, setFields] = useState<Field[]>([])
  const [plots, setPlots] = useState<Plot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [locationError, setLocationError] = useState<string>('')
  const [isLocating, setIsLocating] = useState(false)
  const userLocationMarkerRef = useRef<any>(null)
  const userLocationCircleRef = useRef<any>(null)

  const featureGroupRef = useRef<any>(null)
  const drawPolygonRef = useRef<any>(null)
  const drawRectangleRef = useRef<any>(null)
  const drawCircleRef = useRef<any>(null)
  const lastCreatedLayerRef = useRef<any>(null)
  const lastCreatedTypeRef = useRef<'field' | 'plot' | null>(null)

  // Load data
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [fieldsData, plotsData, plantTypesData, usersData] = await Promise.all([
        userId ? fieldsAPI.listFields(userId) : fieldsAPI.listFields(), // Filter by user if provided
        plotsAPI.listPlots(),
        plantTypesAPI.listPlantTypes(),
        usersAPI.listUsers(1, 100), // Get all users, filter client-side
      ])
      
      setFields(Array.isArray(fieldsData) ? fieldsData : [])
      setPlots(Array.isArray(plotsData) ? plotsData : [])
      setPlantTypes(Array.isArray(plantTypesData) ? plantTypesData : [])
      setLevel34Users(Array.isArray(usersData?.users) ? usersData.users.filter(u => u.role === 'Level 3' || u.role === 'Level 4') : [])
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  // Reload data when userId changes
  useEffect(() => {
    if (userId !== undefined) {
      loadData()
    }
  }, [userId])

  // Initialize Leaflet.draw
  useEffect(() => {
    if (!map || !featureGroupRef.current) return

    const setupDraw = async () => {
      await import('leaflet-draw')
      
      // @ts-ignore
      drawPolygonRef.current = new L.Draw.Polygon(map, {
        shapeOptions: { color: '#fff200', weight: 2, opacity: 0.9, fillOpacity: 0.2 },
        allowIntersection: false,
      })
      // @ts-ignore
      drawRectangleRef.current = new L.Draw.Rectangle(map, {
        shapeOptions: { color: '#fff200', weight: 2, opacity: 0.9, fillOpacity: 0.2 },
      })
      // @ts-ignore
      drawCircleRef.current = new L.Draw.Circle(map, {
        shapeOptions: { color: '#fff200', weight: 2, opacity: 0.9, fillOpacity: 0.2 },
      })

      // @ts-ignore
      map.on(L.Draw.Event.CREATED, onCreated)
    }

    setupDraw()
  }, [map])

  // Handle tool changes
  useEffect(() => {
    if (!map) return

    // Disable all tools
    // @ts-ignore
    drawPolygonRef.current?.disable?.()
    // @ts-ignore
    drawRectangleRef.current?.disable?.()
    // @ts-ignore
    drawCircleRef.current?.disable?.()

    if (activeTool === 'draw_polygon') {
      // @ts-ignore
      drawPolygonRef.current?.enable?.()
    } else if (activeTool === 'draw_rectangle') {
      // @ts-ignore
      drawRectangleRef.current?.enable?.()
    } else if (activeTool === 'draw_circle') {
      // @ts-ignore
      drawCircleRef.current?.enable?.()
    }
  }, [activeTool, map])

  const onCreated = (e: any) => {
    const { layerType, layer } = e

    if (layerType === 'polygon' || layerType === 'rectangle') {
      const latLngs = layer.getLatLngs()?.[0]?.map((coord: any) => [coord.lat, coord.lng]) || []
      const area = calculateArea(layerType, latLngs)
      setFieldData({
        ...fieldData,
        coordinates: latLngs,
        drawType: layerType,
        userId: '', // Reset user assignment
      })
      setIsFieldDialogOpen(true)
      lastCreatedLayerRef.current = layer
      lastCreatedTypeRef.current = 'field'
    } else if (layerType === 'circle') {
      const center = layer.getLatLng()
      const radius = layer.getRadius()
      const coordinates = { center: [center.lat, center.lng], radius }
      const area = calculateArea('circle', coordinates)
      setFieldData({
        ...fieldData,
        coordinates,
        drawType: 'circle',
        userId: '', // Reset user assignment
      })
      setIsFieldDialogOpen(true)
      lastCreatedLayerRef.current = layer
      lastCreatedTypeRef.current = 'field'
    }

    if (featureGroupRef.current) {
      featureGroupRef.current.addLayer(layer)
    }
  }

  const handleCreateField = async () => {
    try {
      const area = calculateArea(fieldData.drawType, fieldData.coordinates)
      const saved = await fieldsAPI.createField({
        name: fieldData.name,
        description: fieldData.description || undefined,
        coordinates: fieldData.coordinates,
        draw_type: fieldData.drawType,
        area: area,
        plant_type_id: fieldData.plantTypeId ? parseInt(fieldData.plantTypeId) : undefined,
        soil_type_id: fieldData.soilTypeId ? parseInt(fieldData.soilTypeId) : undefined,
        user_id: fieldData.userId ? parseInt(fieldData.userId) : undefined,
      })

      // Update layer metadata
      if (lastCreatedLayerRef.current) {
        lastCreatedLayerRef.current._meta = {
          id: saved.id,
          type: 'field',
          name: saved.name,
        }
      }

      await loadData()
      setIsFieldDialogOpen(false)
      setFieldData({ name: '', description: '', coordinates: null, drawType: 'polygon', plantTypeId: '', soilTypeId: '', userId: '' })
      setActiveTool(null)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create field')
    }
  }

  const handleCreatePlot = async () => {
    try {
      if (!plotData.coordinates) {
        setError('Plot coordinates are required')
        return
      }
      
      const coords = Array.isArray(plotData.coordinates) 
        ? plotData.coordinates 
        : plotData.coordinates?.lat !== undefined && plotData.coordinates?.lng !== undefined
          ? [plotData.coordinates.lat, plotData.coordinates.lng]
          : null
      
      if (!coords || coords.length !== 2) {
        setError('Invalid plot coordinates')
        return
      }
      
      const saved = await plotsAPI.createPlot({
        name: plotData.name,
        description: plotData.description || undefined,
        type: plotData.type,
        apikey: plotData.apikey || `plot-${Date.now()}`,
        coordinates: coords,
        field_ref: plotData.fieldRef ? parseInt(plotData.fieldRef) : undefined,
      })

      await loadData()
      setIsPlotDialogOpen(false)
      setPlotData({ name: '', description: '', type: 'storage', apikey: '', coordinates: null, fieldRef: '' })
      setActiveTool(null)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create plot')
    }
  }

  const handleAssignField = async () => {
    if (!assignData.fieldId) return

    try {
      await fieldsAPI.assignFieldToUser(
        assignData.fieldId,
        assignData.userId ? parseInt(assignData.userId) : null
      )
      await loadData()
      setIsAssignDialogOpen(false)
      setAssignData({ fieldId: null, userId: '' })
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to assign field')
    }
  }


  // Add click handler to map for marker placement
  useEffect(() => {
    if (!map) return

    if (activeTool === 'marker') {
      const handleClick = (e: any) => {
        const latlng = e.latlng
        const containingField = Array.isArray(fields) && fields.length > 0 
          ? findContainingField([latlng.lat, latlng.lng], fields)
          : null
        
        setPlotData({
          name: '',
          description: '',
          type: 'storage',
          apikey: '',
          coordinates: latlng,
          fieldRef: containingField ? containingField.id.toString() : '',
        })
        setIsPlotDialogOpen(true)
        setActiveTool(null)
      }

      map.on('click', handleClick)
      return () => {
        map.off('click', handleClick)
      }
    }
  }, [map, activeTool, fields])

  // Render fields and plots on map
  useEffect(() => {
    if (!map || !featureGroupRef.current || loading) return

    const featureGroup = featureGroupRef.current

    // Clear existing layers
    featureGroup.clearLayers()

    // Draw fields
    if (Array.isArray(fields) && fields.length > 0) {
      fields.forEach((field) => {
      let layer: any
      
      if (field.draw_type === 'circle' && field.coordinates?.center) {
        const center = field.coordinates.center
        const radius = field.coordinates.radius || 10
        layer = L.circle([center[0], center[1]], { radius, color: '#fff200', weight: 2, fillOpacity: 0.2 })
      } else if (Array.isArray(field.coordinates)) {
        const latlngs = field.coordinates.map((coord: any) => [coord[0], coord[1]] as LatLngExpression)
        layer = L.polygon(latlngs, { color: '#fff200', weight: 2, fillOpacity: 0.2 })
      }

      if (layer) {
        layer._meta = { id: field.id, type: 'field', name: field.name }
        layer.bindPopup(`
          <div>
            <strong>${field.name}</strong><br/>
            ${field.description || ''}<br/>
            Type: ${field.draw_type}<br/>
            ${field.area ? `Area: ${formatArea(field.area)}` : ''}
            ${field.user_name ? `<br/>Assigned to: <strong>${field.user_name}</strong>` : field.user_id ? `<br/>Assigned to User ID: ${field.user_id}` : ''}
            ${isEditMode ? `<br/><button onclick="window.assignField(${field.id})" style="margin-top:8px;padding:4px 8px;background:#007bff;color:white;border:none;border-radius:4px;cursor:pointer;">Assign to User</button>` : ''}
          </div>
        `)
        featureGroup.addLayer(layer)
      }
      })
    }

    // Draw plots
    if (Array.isArray(plots) && plots.length > 0) {
      plots.forEach((plot) => {
      if (Array.isArray(plot.coordinates)) {
        const marker = L.marker([plot.coordinates[0], plot.coordinates[1]], {
          icon: createPlotIcon(plot.type),
        })
        marker._meta = { id: plot.id, type: 'plot', name: plot.name }
        marker.bindPopup(`
          <div>
            <strong>${plot.name}</strong><br/>
            Type: ${plot.type}<br/>
            ${plot.description || ''}
          </div>
        `)
        featureGroup.addLayer(marker)
      }
      })
    }

    // Global function for assign field
    ;(window as any).assignField = (fieldId: number) => {
      setAssignData({ fieldId, userId: '' })
      setIsAssignDialogOpen(true)
    }
  }, [map, fields, plots, loading, isEditMode])

  function createPlotIcon(type: string) {
    const colors: { [key: string]: string } = {
      storage: '#10b981',
      workshop: '#3b82f6',
      garage: '#f59e0b',
      sensor: '#ef4444',
    }
    const color = colors[type] || '#6b7280'

    return L.divIcon({
      className: '',
      html: `<div style="
        width: 24px;
        height: 24px;
        background-color: ${color};
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      "></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    })
  }

  // Geolocation functions
  const handleLocateMe = () => {
    if (!map) return
    
    setIsLocating(true)
    setLocationError('')
    
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser')
      setIsLocating(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        const location: [number, number] = [latitude, longitude]
        setUserLocation(location)
        setIsLocating(false)
        
        // Center map on user location
        map.setView(location, 16, { animate: true })
        
        // Add/update user location marker
        if (userLocationMarkerRef.current) {
          map.removeLayer(userLocationMarkerRef.current)
        }
        if (userLocationCircleRef.current) {
          map.removeLayer(userLocationCircleRef.current)
        }
        
        // Create custom icon for user location
        const userIcon = L.divIcon({
          className: 'user-location-marker',
          html: `<div style="
            width: 20px;
            height: 20px;
            background-color: #3b82f6;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          "></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        })
        
        // Add marker
        userLocationMarkerRef.current = L.marker(location, { icon: userIcon }).addTo(map)
        userLocationMarkerRef.current.bindPopup('Your current location').openPopup()
        
        // Add accuracy circle
        const accuracy = position.coords.accuracy || 50 // meters
        userLocationCircleRef.current = L.circle(location, {
          radius: accuracy,
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.2,
          weight: 2,
        }).addTo(map)
      },
      (error) => {
        setIsLocating(false)
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Location access denied. Please enable location permissions.')
            break
          case error.POSITION_UNAVAILABLE:
            setLocationError('Location information unavailable.')
            break
          case error.TIMEOUT:
            setLocationError('Location request timed out.')
            break
          default:
            setLocationError('An unknown error occurred while getting location.')
            break
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }

  // Clean up markers on unmount
  useEffect(() => {
    return () => {
      if (userLocationMarkerRef.current && map) {
        map.removeLayer(userLocationMarkerRef.current)
      }
      if (userLocationCircleRef.current && map) {
        map.removeLayer(userLocationCircleRef.current)
      }
    }
  }, [map])

  function MapSetter({ onReady }: { onReady: (m: LeafletMap) => void }) {
    const m = useMap()
    useEffect(() => {
      onReady(m as unknown as LeafletMap)
    }, [m])
    return null
  }

  if (loading) {
    return (
      <div className="w-full h-[600px] flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading map...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full relative">
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Toolbar */}
      {isEditMode && (
        <div className="absolute top-4 left-4 z-[1000] bg-white rounded-lg shadow-lg p-2 flex flex-col gap-2">
          <button
            onClick={() => setActiveTool(activeTool === 'draw_polygon' ? null : 'draw_polygon')}
            className={`px-4 py-2 rounded ${activeTool === 'draw_polygon' ? 'bg-indigo-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            title="Draw Polygon"
          >
            Draw Polygon
          </button>
          <button
            onClick={() => setActiveTool(activeTool === 'draw_rectangle' ? null : 'draw_rectangle')}
            className={`px-4 py-2 rounded ${activeTool === 'draw_rectangle' ? 'bg-indigo-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            title="Draw Rectangle"
          >
            Draw Rectangle
          </button>
          <button
            onClick={() => setActiveTool(activeTool === 'draw_circle' ? null : 'draw_circle')}
            className={`px-4 py-2 rounded ${activeTool === 'draw_circle' ? 'bg-indigo-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            title="Draw Circle"
          >
            Draw Circle
          </button>
          <div className="h-px bg-gray-300 my-1"></div>
          <button
            onClick={() => setActiveTool(activeTool === 'marker' ? null : 'marker')}
            className={`px-4 py-2 rounded ${activeTool === 'marker' ? 'bg-indigo-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            title="Add Plot Marker"
          >
            Add Plot
          </button>
          <div className="h-px bg-gray-300 my-1"></div>
          <button
            onClick={() => setSatellite(!satellite)}
            className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200"
            title="Toggle Satellite"
          >
            {satellite ? 'Map' : 'Satellite'}
          </button>
        </div>
      )}

      <MapContainer
        center={initialMapCenter}
        zoom={14}
        scrollWheelZoom={true}
        className="h-[600px] w-full z-0"
      >
        <MapSetter onReady={(m) => setMap(m)} />
        <TileLayer
          url={satellite 
            ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          }
          attribution={satellite
            ? '&copy; <a href="https://www.esri.com/">Esri</a>'
            : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          }
        />
        <FeatureGroup ref={featureGroupRef} />
      </MapContainer>

      {/* Locate Me Button */}
      <button
        onClick={handleLocateMe}
        disabled={isLocating || !map}
        className="absolute bottom-4 right-4 z-[1000] bg-white hover:bg-gray-50 border border-gray-300 rounded-lg shadow-lg p-3 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="Locate Me"
      >
        {isLocating ? (
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-indigo-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        )}
      </button>

      {/* Location Error Message */}
      {locationError && (
        <div className="absolute top-4 right-4 z-[1000] bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-lg max-w-sm">
          <p className="text-sm font-medium">{locationError}</p>
          <button
            onClick={() => setLocationError('')}
            className="mt-2 text-xs underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Field Dialog */}
      {isFieldDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">Create Field</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  value={fieldData.name}
                  onChange={(e) => setFieldData({ ...fieldData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Field name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={fieldData.description}
                  onChange={(e) => setFieldData({ ...fieldData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                  placeholder="Field description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Plant Type</label>
                <select
                  value={fieldData.plantTypeId}
                  onChange={(e) => setFieldData({ ...fieldData, plantTypeId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Select plant type</option>
                  {Array.isArray(plantTypes) && plantTypes.map((pt) => (
                    <option key={pt.id} value={pt.id}>
                      {pt.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Assign to User (Level 3/4)</label>
                <select
                  value={fieldData.userId}
                  onChange={(e) => setFieldData({ ...fieldData, userId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">No assignment</option>
                  {Array.isArray(level34Users) && level34Users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} ({user.email}) - {user.role}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Area</label>
                <div className="px-3 py-2 bg-gray-100 rounded-lg">
                  {fieldData.coordinates ? formatArea(calculateArea(fieldData.drawType, fieldData.coordinates)) : '0 ha'}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setIsFieldDialogOpen(false)
                  if (lastCreatedLayerRef.current && featureGroupRef.current) {
                    featureGroupRef.current.removeLayer(lastCreatedLayerRef.current)
                  }
                }}
                className="flex-1 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateField}
                disabled={!fieldData.name}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                Create Field
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Plot Dialog */}
      {isPlotDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">Create Plot</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  value={plotData.name}
                  onChange={(e) => setPlotData({ ...plotData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Plot name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Type *</label>
                <select
                  value={plotData.type}
                  onChange={(e) => setPlotData({ ...plotData, type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="storage">Storage</option>
                  <option value="workshop">Workshop</option>
                  <option value="garage">Garage</option>
                  <option value="sensor">Sensor</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={plotData.description}
                  onChange={(e) => setPlotData({ ...plotData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={2}
                  placeholder="Plot description"
                />
              </div>
              {plotData.type === 'sensor' && (
                <div>
                  <label className="block text-sm font-medium mb-1">API Key</label>
                  <input
                    type="text"
                    value={plotData.apikey}
                    onChange={(e) => setPlotData({ ...plotData, apikey: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="API key"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Field (Auto-detected)</label>
                <select
                  value={plotData.fieldRef}
                  onChange={(e) => setPlotData({ ...plotData, fieldRef: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">No field</option>
                  {Array.isArray(fields) && fields.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsPlotDialogOpen(false)}
                className="flex-1 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePlot}
                disabled={!plotData.name}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                Create Plot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Field Dialog */}
      {isAssignDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">Assign Field to User</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Select User (Level 3/4)</label>
                <select
                  value={assignData.userId}
                  onChange={(e) => setAssignData({ ...assignData, userId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Unassign (No user)</option>
                  {Array.isArray(level34Users) && level34Users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} ({user.email}) - {user.role}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsAssignDialogOpen(false)}
                className="flex-1 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignField}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

