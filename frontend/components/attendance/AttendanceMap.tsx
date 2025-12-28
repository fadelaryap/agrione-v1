'use client'

import { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import { LatLngExpression, Icon } from 'leaflet'
import L from 'leaflet'
import { Attendance, User } from '@/lib/api'
import { format, parseISO } from 'date-fns'
import { id } from 'date-fns/locale'
import { MapPin, Calendar, Clock, User as UserIcon } from 'lucide-react'

// Fix Leaflet default icon
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  })
}

// Create custom icons for different sessions
const createCustomIcon = (session: string, color: string) => {
  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg width="32" height="41" viewBox="0 0 32 41" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.164 0 0 7.164 0 16c0 11.045 16 25 16 25s16-13.955 16-25C32 7.164 24.836 0 16 0z" fill="${color}" stroke="white" stroke-width="2"/>
        <text x="16" y="22" font-family="Arial" font-size="12" font-weight="bold" text-anchor="middle" fill="white">
          ${session === 'pagi' ? 'P' : 'S'}
        </text>
      </svg>
    `)}`,
    iconSize: [32, 41],
    iconAnchor: [16, 41],
    popupAnchor: [0, -41],
  })
}

const pagiIcon = createCustomIcon('pagi', '#10b981') // green
const soreIcon = createCustomIcon('sore', '#f59e0b') // amber

interface AttendanceMapProps {
  attendances: Attendance[]
  users: User[]
}

function MapBounds({ attendances }: { attendances: Attendance[] }) {
  const map = useMap()
  
  useEffect(() => {
    if (attendances.length === 0) return
    
    const bounds = attendances
      .filter(a => a.latitude && a.longitude)
      .map(a => [a.latitude!, a.longitude!] as LatLngExpression)
    
    if (bounds.length > 0) {
      map.fitBounds(bounds as LatLngExpression[], { padding: [50, 50] })
    }
  }, [attendances, map])
  
  return null
}

export default function AttendanceMap({ attendances, users }: AttendanceMapProps) {
  const [selectedUserId, setSelectedUserId] = useState<number | 'all'>('all')
  const [showTrajectory, setShowTrajectory] = useState(true)

  // Group attendances by user
  const attendancesByUser = attendances.reduce((acc, att) => {
    if (!acc[att.user_id]) {
      acc[att.user_id] = []
    }
    acc[att.user_id].push(att)
    return acc
  }, {} as Record<number, Attendance[]>)

  // Sort attendances by date for each user to create trajectory
  Object.keys(attendancesByUser).forEach(userId => {
    attendancesByUser[parseInt(userId)].sort((a, b) => {
      const dateA = a.date ? parseISO(a.date) : new Date(0)
      const dateB = b.date ? parseISO(b.date) : new Date(0)
      return dateA.getTime() - dateB.getTime()
    })
  })

  // Get selected user's attendances or all if 'all'
  const displayedAttendances = selectedUserId === 'all'
    ? attendances
    : attendancesByUser[selectedUserId] || []

  // Create trajectory lines for each user
  const trajectoryLines: { userId: number; coordinates: LatLngExpression[]; color: string }[] = []
  
  if (showTrajectory) {
    Object.entries(attendancesByUser).forEach(([userId, userAttendances]) => {
      if (selectedUserId !== 'all' && parseInt(userId) !== selectedUserId) return
      
      const coordinates = userAttendances
        .filter(a => a.latitude && a.longitude)
        .map(a => [a.latitude!, a.longitude!] as LatLngExpression)
      
      if (coordinates.length > 1) {
        // Generate color based on user ID for consistency
        const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']
        const color = colors[parseInt(userId) % colors.length]
        
        trajectoryLines.push({
          userId: parseInt(userId),
          coordinates,
          color,
        })
      }
    })
  }

  const getUserName = (userId: number) => {
    const foundUser = users.find(u => u.id === userId)
    return foundUser ? `${foundUser.first_name} ${foundUser.last_name}` : `User ID: ${userId}`
  }

  // Calculate center point (average of all coordinates)
  const center: LatLngExpression = attendances.length > 0 && attendances[0].latitude && attendances[0].longitude
    ? [attendances[0].latitude, attendances[0].longitude]
    : [-4.079, 104.167] // Default: Baturaja

  const avgLat = attendances
    .filter(a => a.latitude)
    .reduce((sum, a) => sum + (a.latitude || 0), 0) / attendances.filter(a => a.latitude).length

  const avgLng = attendances
    .filter(a => a.longitude)
    .reduce((sum, a) => sum + (a.longitude || 0), 0) / attendances.filter(a => a.longitude).length

  const calculatedCenter: LatLngExpression = 
    !isNaN(avgLat) && !isNaN(avgLng) ? [avgLat, avgLng] : center

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-gray-50 rounded-lg p-4 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-2">Filter Karyawan</label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">Semua Karyawan</option>
            {Object.keys(attendancesByUser).map(userId => {
              const id = parseInt(userId)
              return (
                <option key={id} value={id}>
                  {getUserName(id)}
                </option>
              )
            })}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="show-trajectory"
            checked={showTrajectory}
            onChange={(e) => setShowTrajectory(e.target.checked)}
            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
          />
          <label htmlFor="show-trajectory" className="text-sm font-medium text-gray-700">
            Tampilkan Trajectory
          </label>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span>Sesi Pagi</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-amber-500"></div>
            <span>Sesi Sore</span>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="rounded-lg overflow-hidden border border-gray-200 shadow-lg">
        <MapContainer
          center={calculatedCenter}
          zoom={12}
          scrollWheelZoom={true}
          className="h-[600px] w-full z-0"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          <MapBounds attendances={displayedAttendances} />

          {/* Trajectory lines */}
          {showTrajectory && trajectoryLines.map((line, idx) => (
            <Polyline
              key={`trajectory-${line.userId}-${idx}`}
              positions={line.coordinates}
              pathOptions={{
                color: line.color,
                weight: 3,
                opacity: 0.6,
              }}
            />
          ))}

          {/* Markers */}
          {displayedAttendances
            .filter(a => a.latitude && a.longitude)
            .map((attendance) => {
              const icon = attendance.session === 'pagi' ? pagiIcon : soreIcon
              
              return (
                <Marker
                  key={attendance.id}
                  position={[attendance.latitude!, attendance.longitude!]}
                  icon={icon}
                >
                  <Popup className="attendance-popup">
                    <div className="p-2 min-w-[200px]">
                      <div className="flex items-center gap-2 mb-2">
                        <UserIcon className="h-4 w-4 text-gray-600" />
                        <h3 className="font-semibold text-gray-900">{getUserName(attendance.user_id)}</h3>
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {attendance.date
                              ? format(parseISO(attendance.date), 'dd MMM yyyy', { locale: id })
                              : '-'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>
                            {attendance.session === 'pagi' ? 'Pagi' : 'Sore'}
                            {attendance.check_in_time &&
                              ` - ${format(parseISO(attendance.check_in_time), 'HH:mm', { locale: id })}`}
                          </span>
                        </div>
                        
                        {attendance.has_issue && (
                          <div className="text-red-600 text-xs mt-2">
                            ⚠️ Ada Kendala
                          </div>
                        )}
                      </div>
                      
                      {attendance.selfie_image && (
                        <img
                          src={attendance.selfie_image}
                          alt="Selfie"
                          className="w-full h-32 object-cover rounded mt-2"
                        />
                      )}
                    </div>
                  </Popup>
                </Marker>
              )
            })}
        </MapContainer>
      </div>
    </div>
  )
}

