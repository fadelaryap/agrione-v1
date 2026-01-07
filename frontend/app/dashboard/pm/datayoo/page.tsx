'use client'

import { useEffect, useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { fieldsAPI, Field } from '@/lib/api'
import { 
  MapPin, 
  Layers, 
  Satellite, 
  RefreshCw, 
  Download, 
  Settings,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Calendar,
  Filter
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

const NDVIMap = dynamic(() => import('@/components/map/NDVIMap'), {
  ssr: false,
})

interface DatayooDataset {
  id: string
  name: string
  date: string
  type: 'ndvi' | 'rgb' | 'thermal' | 'elevation'
  resolution: string
  coverage: number // percentage
  status: 'processing' | 'ready' | 'error'
  thumbnail?: string
}

interface DatayooStats {
  totalDatasets: number
  readyDatasets: number
  processingDatasets: number
  lastUpdate: string
  averageCoverage: number
}

export default function DatayooIntegrationPage() {
  const [fields, setFields] = useState<Field[]>([])
  const [loading, setLoading] = useState(true)
  const [datasets, setDatasets] = useState<DatayooDataset[]>([])
  const [selectedField, setSelectedField] = useState<number | null>(null)
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  })
  const [filterType, setFilterType] = useState<'all' | 'ndvi' | 'rgb' | 'thermal' | 'elevation'>('all')
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    loadFields()
    loadDatasets()
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

  const loadDatasets = async () => {
    try {
      // Mock API call - replace with actual Datayoo API integration
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock datasets
      const mockDatasets: DatayooDataset[] = [
        {
          id: '1',
          name: 'NDVI_2024_01_15',
          date: '2024-01-15',
          type: 'ndvi',
          resolution: '10m',
          coverage: 95,
          status: 'ready',
          thumbnail: '/api/placeholder/200/150'
        },
        {
          id: '2',
          name: 'RGB_2024_01_15',
          date: '2024-01-15',
          type: 'rgb',
          resolution: '5m',
          coverage: 98,
          status: 'ready',
          thumbnail: '/api/placeholder/200/150'
        },
        {
          id: '3',
          name: 'NDVI_2024_01_10',
          date: '2024-01-10',
          type: 'ndvi',
          resolution: '10m',
          coverage: 92,
          status: 'ready',
          thumbnail: '/api/placeholder/200/150'
        },
        {
          id: '4',
          name: 'Thermal_2024_01_12',
          date: '2024-01-12',
          type: 'thermal',
          resolution: '20m',
          coverage: 87,
          status: 'ready',
          thumbnail: '/api/placeholder/200/150'
        },
        {
          id: '5',
          name: 'NDVI_2024_01_20',
          date: '2024-01-20',
          type: 'ndvi',
          resolution: '10m',
          coverage: 0,
          status: 'processing',
        },
        {
          id: '6',
          name: 'Elevation_2024_01_08',
          date: '2024-01-08',
          type: 'elevation',
          resolution: '5m',
          coverage: 100,
          status: 'ready',
          thumbnail: '/api/placeholder/200/150'
        },
      ]
      
      setDatasets(mockDatasets)
    } catch (err) {
      console.error('Failed to load datasets:', err)
      toast.error('Gagal memuat data dari Datayoo')
    }
  }

  const syncWithDatayoo = async () => {
    setIsSyncing(true)
    try {
      // Mock API call - replace with actual Datayoo API sync
      await new Promise(resolve => setTimeout(resolve, 2000))
      await loadDatasets()
      toast.success('Sinkronisasi dengan Datayoo berhasil')
    } catch (err) {
      console.error('Sync failed:', err)
      toast.error('Gagal melakukan sinkronisasi')
    } finally {
      setIsSyncing(false)
    }
  }

  const stats: DatayooStats = useMemo(() => {
    return {
      totalDatasets: datasets.length,
      readyDatasets: datasets.filter(d => d.status === 'ready').length,
      processingDatasets: datasets.filter(d => d.status === 'processing').length,
      lastUpdate: datasets.length > 0 ? datasets[0].date : 'Tidak ada',
      averageCoverage: datasets.length > 0 
        ? datasets.reduce((sum, d) => sum + d.coverage, 0) / datasets.length 
        : 0
    }
  }, [datasets])

  const filteredDatasets = useMemo(() => {
    return datasets.filter(dataset => {
      const dateInRange = 
        (!dateRange.start || dataset.date >= dateRange.start) &&
        (!dateRange.end || dataset.date <= dateRange.end)
      const typeMatch = filterType === 'all' || dataset.type === filterType
      return dateInRange && typeMatch
    })
  }, [datasets, dateRange, filterType])

  const ndviData = useMemo(() => {
    // Generate mock NDVI data for fields
    return fields.map(field => ({
      fieldId: field.id || 0,
      ndviValue: 0.3 + Math.random() * 0.6
    }))
  }, [fields])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#2E4E2A' }}></div>
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
              <Satellite className="w-8 h-8" style={{ color: '#2E4E2A' }} />
              Datayoo Integration
            </h1>
            <p className="text-gray-600 mt-2">Integrasi data satelit dan citra dari Datayoo API</p>
          </div>
          <button
            onClick={syncWithDatayoo}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            style={{ backgroundColor: '#2E4E2A' }}
            onMouseEnter={(e) => !isSyncing && (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={(e) => !isSyncing && (e.currentTarget.style.opacity = '1')}
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sinkronisasi...' : 'Sinkronisasi'}
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-lg p-4 border" style={{ backgroundColor: 'rgba(46, 78, 42, 0.1)', borderColor: '#2E4E2A' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: '#2E4E2A' }}>Total Datasets</p>
                <p className="text-2xl font-bold mt-1" style={{ color: '#2E4E2A' }}>{stats.totalDatasets}</p>
              </div>
              <Layers className="w-8 h-8" style={{ color: '#2E4E2A' }} />
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium">Ready</p>
                <p className="text-2xl font-bold text-green-900 mt-1">{stats.readyDatasets}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 border border-amber-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-700 font-medium">Processing</p>
                <p className="text-2xl font-bold text-amber-900 mt-1">{stats.processingDatasets}</p>
              </div>
              <RefreshCw className="w-8 h-8 text-amber-600 animate-spin" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium">Avg Coverage</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">{stats.averageCoverage.toFixed(0)}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Section - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Map */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <MapPin className="w-5 h-5" style={{ color: '#2E4E2A' }} />
                Peta Citra Satelit
              </h2>
              <div className="flex items-center gap-2">
                <select
                  value={selectedField || ''}
                  onChange={(e) => setSelectedField(e.target.value ? parseInt(e.target.value) : null)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                  onFocus={(e) => e.currentTarget.style.outline = '2px solid #2E4E2A'}
                  onBlur={(e) => e.currentTarget.style.outline = ''}
                >
                  <option value="">Semua Lahan</option>
                  {fields.map(field => (
                    <option key={field.id} value={field.id}>{field.name}</option>
                  ))}
                </select>
              </div>
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

          {/* Dataset Details */}
          {selectedDataset && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Detail Dataset</h2>
              {(() => {
                const dataset = datasets.find(d => d.id === selectedDataset)
                if (!dataset) return null
                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Nama</p>
                        <p className="font-semibold text-gray-900">{dataset.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Tanggal</p>
                        <p className="font-semibold text-gray-900">{format(new Date(dataset.date), 'dd MMM yyyy')}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Tipe</p>
                        <p className="font-semibold text-gray-900 capitalize">{dataset.type}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Resolusi</p>
                        <p className="font-semibold text-gray-900">{dataset.resolution}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Coverage</p>
                        <p className="font-semibold text-gray-900">{dataset.coverage}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Status</p>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          dataset.status === 'ready' ? 'bg-green-100 text-green-800' :
                          dataset.status === 'processing' ? 'bg-amber-100 text-amber-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {dataset.status === 'ready' ? 'Siap' :
                           dataset.status === 'processing' ? 'Memproses' : 'Error'}
                        </span>
                      </div>
                    </div>
                    {dataset.thumbnail && (
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Thumbnail</p>
                        <img 
                          src={dataset.thumbnail} 
                          alt={dataset.name}
                          className="w-full h-48 object-cover rounded-lg border border-gray-200"
                        />
                      </div>
                    )}
                    <div className="flex gap-2 pt-4 border-t">
                      <button className="flex-1 px-4 py-2 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                        style={{ backgroundColor: '#2E4E2A' }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                      >
                        <Download className="w-4 h-4" />
                        Download Dataset
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

        {/* Sidebar - Datasets List */}
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Filter className="w-5 h-5" style={{ color: '#2E4E2A' }} />
              Filter
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipe Dataset</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  onFocus={(e) => e.currentTarget.style.outline = '2px solid #2E4E2A'}
                  onBlur={(e) => e.currentTarget.style.outline = ''}
                >
                  <option value="all">Semua Tipe</option>
                  <option value="ndvi">NDVI</option>
                  <option value="rgb">RGB</option>
                  <option value="thermal">Thermal</option>
                  <option value="elevation">Elevation</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Mulai</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  onFocus={(e) => e.currentTarget.style.outline = '2px solid #2E4E2A'}
                  onBlur={(e) => e.currentTarget.style.outline = ''}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Akhir</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  onFocus={(e) => e.currentTarget.style.outline = '2px solid #2E4E2A'}
                  onBlur={(e) => e.currentTarget.style.outline = ''}
                />
              </div>
            </div>
          </div>

          {/* Datasets List */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5" style={{ color: '#2E4E2A' }} />
                Datasets ({filteredDatasets.length})
              </h2>
            </div>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredDatasets.map(dataset => (
                <div
                  key={dataset.id}
                  onClick={() => setSelectedDataset(selectedDataset === dataset.id ? null : dataset.id)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedDataset === dataset.id
                      ? ''
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  style={selectedDataset === dataset.id ? { borderColor: '#2E4E2A', backgroundColor: 'rgba(46, 78, 42, 0.05)' } : {}}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-sm">{dataset.name}</h3>
                      <p className="text-xs text-gray-500 mt-1">{format(new Date(dataset.date), 'dd MMM yyyy')}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      dataset.status === 'ready' ? 'bg-green-100 text-green-800' :
                      dataset.status === 'processing' ? 'bg-amber-100 text-amber-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {dataset.status === 'ready' ? 'Siap' :
                       dataset.status === 'processing' ? 'Memproses' : 'Error'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-600 mt-2">
                    <span className="capitalize">{dataset.type}</span>
                    <span>•</span>
                    <span>{dataset.resolution}</span>
                    <span>•</span>
                    <span>{dataset.coverage}% coverage</span>
                  </div>
                  {dataset.thumbnail && (
                    <img 
                      src={dataset.thumbnail} 
                      alt={dataset.name}
                      className="w-full h-20 object-cover rounded mt-2 border border-gray-200"
                    />
                  )}
                </div>
              ))}
              {filteredDatasets.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>Tidak ada dataset ditemukan</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

