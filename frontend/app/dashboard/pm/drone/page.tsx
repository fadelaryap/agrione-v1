'use client'

import { useEffect, useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { fieldsAPI, Field } from '@/lib/api'
import { 
  Camera, 
  MapPin, 
  Calendar,
  TrendingUp,
  Download,
  Play,
  Pause,
  RefreshCw,
  Settings,
  Layers,
  Image as ImageIcon
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

const NDVIMap = dynamic(() => import('@/components/map/NDVIMap'), {
  ssr: false,
})

interface DroneMission {
  id: string
  name: string
  fieldId: number
  fieldName: string
  date: string
  status: 'scheduled' | 'in-progress' | 'completed' | 'failed'
  coverage: number // percentage
  flightHeight: number // meters
  resolution: string
  imagesCount: number
  processedImages: number
  ndviMap?: string
  orthomosaic?: string
}

interface DroneStats {
  totalMissions: number
  completedMissions: number
  inProgressMissions: number
  averageCoverage: number
  totalImages: number
}

export default function DroneMultispectralPage() {
  const [fields, setFields] = useState<Field[]>([])
  const [loading, setLoading] = useState(true)
  const [missions, setMissions] = useState<DroneMission[]>([])
  const [selectedMission, setSelectedMission] = useState<string | null>(null)
  const [selectedField, setSelectedField] = useState<number | null>(null)
  const [dateFilter, setDateFilter] = useState<string>('')

  useEffect(() => {
    loadFields()
    loadMissions()
  }, [])

  const loadFields = async () => {
    try {
      const data = await fieldsAPI.listFields()
      setFields(data || [])
    } catch (err) {
      console.error('Failed to load fields:', err)
      setFields([])
    } finally {
      setLoading(false)
    }
  }

  const loadMissions = async () => {
    try {
      // Mock API call - replace with actual drone API integration
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock missions
      const mockMissions: DroneMission[] = [
        {
          id: '1',
          name: 'Mission_2024_01_15_Field_A1',
          fieldId: 1,
          fieldName: 'Lahan A1',
          date: '2024-01-15',
          status: 'completed',
          coverage: 95,
          flightHeight: 120,
          resolution: '2cm/pixel',
          imagesCount: 245,
          processedImages: 245,
          ndviMap: '/api/placeholder/600/400',
          orthomosaic: '/api/placeholder/600/400'
        },
        {
          id: '2',
          name: 'Mission_2024_01_20_Field_B2',
          fieldId: 2,
          fieldName: 'Lahan B2',
          date: '2024-01-20',
          status: 'in-progress',
          coverage: 65,
          flightHeight: 120,
          resolution: '2cm/pixel',
          imagesCount: 180,
          processedImages: 120
        },
        {
          id: '3',
          name: 'Mission_2024_01_18_Field_C3',
          fieldId: 3,
          fieldName: 'Lahan C3',
          date: '2024-01-18',
          status: 'completed',
          coverage: 100,
          flightHeight: 100,
          resolution: '1.5cm/pixel',
          imagesCount: 320,
          processedImages: 320,
          ndviMap: '/api/placeholder/600/400',
          orthomosaic: '/api/placeholder/600/400'
        },
        {
          id: '4',
          name: 'Mission_2024_01_22_Field_A1',
          fieldId: 1,
          fieldName: 'Lahan A1',
          date: '2024-01-22',
          status: 'scheduled',
          coverage: 0,
          flightHeight: 120,
          resolution: '2cm/pixel',
          imagesCount: 0,
          processedImages: 0
        },
      ]
      
      setMissions(mockMissions)
    } catch (err) {
      console.error('Failed to load missions:', err)
      toast.error('Gagal memuat data misi drone')
    }
  }

  const stats: DroneStats = useMemo(() => {
    return {
      totalMissions: missions.length,
      completedMissions: missions.filter(m => m.status === 'completed').length,
      inProgressMissions: missions.filter(m => m.status === 'in-progress').length,
      averageCoverage: missions.length > 0
        ? missions.reduce((sum, m) => sum + m.coverage, 0) / missions.length
        : 0,
      totalImages: missions.reduce((sum, m) => sum + m.imagesCount, 0)
    }
  }, [missions])

  const filteredMissions = useMemo(() => {
    return missions.filter(mission => {
      const fieldMatch = !selectedField || mission.fieldId === selectedField
      const dateMatch = !dateFilter || mission.date === dateFilter
      return fieldMatch && dateMatch
    })
  }, [missions, selectedField, dateFilter])

  const ndviData = useMemo(() => {
    return fields.map(field => ({
      fieldId: field.id || 0,
      ndviValue: 0.3 + Math.random() * 0.6
    }))
  }, [fields])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-gray-600">Memuat data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Camera className="w-8 h-8 text-purple-600" />
              Drone Multispectral
            </h1>
            <p className="text-gray-600 mt-2">Kelola misi drone dan data citra multispectral</p>
          </div>
          <button
            onClick={loadMissions}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700 font-medium">Total Missions</p>
                <p className="text-2xl font-bold text-purple-900 mt-1">{stats.totalMissions}</p>
              </div>
              <Layers className="w-8 h-8 text-purple-600" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium">Completed</p>
                <p className="text-2xl font-bold text-green-900 mt-1">{stats.completedMissions}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium">In Progress</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">{stats.inProgressMissions}</p>
              </div>
              <Play className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 border border-amber-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-700 font-medium">Total Images</p>
                <p className="text-2xl font-bold text-amber-900 mt-1">{stats.totalImages}</p>
              </div>
              <ImageIcon className="w-8 h-8 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Map */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-purple-600" />
                Peta Lahan
              </h2>
              <select
                value={selectedField || ''}
                onChange={(e) => setSelectedField(e.target.value ? parseInt(e.target.value) : null)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">Semua Lahan</option>
                {fields.map(field => (
                  <option key={field.id} value={field.id}>{field.name}</option>
                ))}
              </select>
            </div>
            <div className="rounded-lg overflow-hidden border border-gray-200" style={{ height: '500px' }}>
              {fields.length > 0 ? (
                <NDVIMap
                  fields={fields.filter(f => !selectedField || f.id === selectedField)}
                  ndviData={ndviData.filter(d => !selectedField || d.fieldId === selectedField)}
                  includeRandomPolygons={false}
                />
              ) : (
                <div className="flex items-center justify-center h-full bg-gray-50">
                  <p className="text-gray-500">Tidak ada lahan tersedia</p>
                </div>
              )}
            </div>
          </div>

          {/* Mission Details */}
          {selectedMission && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Detail Misi</h2>
              {(() => {
                const mission = missions.find(m => m.id === selectedMission)
                if (!mission) return null
                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Nama Misi</p>
                        <p className="font-semibold text-gray-900">{mission.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Lahan</p>
                        <p className="font-semibold text-gray-900">{mission.fieldName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Tanggal</p>
                        <p className="font-semibold text-gray-900">{format(new Date(mission.date), 'dd MMM yyyy')}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Status</p>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          mission.status === 'completed' ? 'bg-green-100 text-green-800' :
                          mission.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                          mission.status === 'scheduled' ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {mission.status === 'completed' ? 'Selesai' :
                           mission.status === 'in-progress' ? 'Berlangsung' :
                           mission.status === 'scheduled' ? 'Terjadwal' : 'Gagal'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Tinggi Terbang</p>
                        <p className="font-semibold text-gray-900">{mission.flightHeight} m</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Resolusi</p>
                        <p className="font-semibold text-gray-900">{mission.resolution}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Coverage</p>
                        <p className="font-semibold text-gray-900">{mission.coverage}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Gambar</p>
                        <p className="font-semibold text-gray-900">{mission.processedImages}/{mission.imagesCount}</p>
                      </div>
                    </div>
                    {mission.status === 'completed' && (
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        {mission.ndviMap && (
                          <div>
                            <p className="text-sm text-gray-600 mb-2">NDVI Map</p>
                            <img 
                              src={mission.ndviMap} 
                              alt="NDVI Map"
                              className="w-full h-48 object-cover rounded-lg border border-gray-200"
                            />
                          </div>
                        )}
                        {mission.orthomosaic && (
                          <div>
                            <p className="text-sm text-gray-600 mb-2">Orthomosaic</p>
                            <img 
                              src={mission.orthomosaic} 
                              alt="Orthomosaic"
                              className="w-full h-48 object-cover rounded-lg border border-gray-200"
                            />
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex gap-2 pt-4 border-t">
                      <button className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2">
                        <Download className="w-4 h-4" />
                        Download Data
                      </button>
                      <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
        </div>

        {/* Sidebar - Missions List */}
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Filter</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lahan</label>
                <select
                  value={selectedField || ''}
                  onChange={(e) => setSelectedField(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">Semua Lahan</option>
                  {fields.map(field => (
                    <option key={field.id} value={field.id}>{field.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal</label>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Missions List */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                Missions ({filteredMissions.length})
              </h2>
            </div>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredMissions.map(mission => (
                <div
                  key={mission.id}
                  onClick={() => setSelectedMission(selectedMission === mission.id ? null : mission.id)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedMission === mission.id
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-sm">{mission.name}</h3>
                      <p className="text-xs text-gray-500 mt-1">{mission.fieldName}</p>
                      <p className="text-xs text-gray-500">{format(new Date(mission.date), 'dd MMM yyyy')}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      mission.status === 'completed' ? 'bg-green-100 text-green-800' :
                      mission.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                      mission.status === 'scheduled' ? 'bg-gray-100 text-gray-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {mission.status === 'completed' ? 'Selesai' :
                       mission.status === 'in-progress' ? 'Berlangsung' :
                       mission.status === 'scheduled' ? 'Terjadwal' : 'Gagal'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-600 mt-2">
                    <span>{mission.coverage}% coverage</span>
                    <span>•</span>
                    <span>{mission.processedImages}/{mission.imagesCount} images</span>
                  </div>
                  {mission.status === 'in-progress' && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${(mission.processedImages / mission.imagesCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {filteredMissions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Camera className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>Tidak ada misi ditemukan</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

