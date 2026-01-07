'use client'

import { useEffect, useState, useMemo } from 'react'
import { fieldReportsAPI, FieldReport, fieldsAPI, Field } from '@/lib/api'
import { 
  Image as ImageIcon, 
  Brain,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  Download,
  RefreshCw,
  TrendingUp,
  MapPin,
  Calendar
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'

interface AIDetection {
  id: string
  reportId: number
  imageUrl: string
  fieldId: number
  fieldName: string
  detectedIssues: Array<{
    type: 'pest' | 'disease' | 'nutrient' | 'water' | 'weed'
    severity: 'low' | 'medium' | 'high'
    confidence: number
    description: string
    location?: { x: number; y: number }
  }>
  plantHealth: number // 0-100
  aiRecommendations: string[]
  processedAt: string
  status: 'analyzed' | 'pending' | 'error'
}

export default function FieldImageryPage() {
  const [reports, setReports] = useState<FieldReport[]>([])
  const [fields, setFields] = useState<Field[]>([])
  const [loading, setLoading] = useState(true)
  const [detections, setDetections] = useState<AIDetection[]>([])
  const [selectedDetection, setSelectedDetection] = useState<string | null>(null)
  const [filterField, setFilterField] = useState<number | null>(null)
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'low' | 'medium' | 'high'>('all')
  const [filterIssue, setFilterIssue] = useState<'all' | 'pest' | 'disease' | 'nutrient' | 'water' | 'weed'>('all')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [reportsData, fieldsData] = await Promise.all([
        fieldReportsAPI.listFieldReports({ include_comments: true }),
        fieldsAPI.listFields()
      ])
      setReports(reportsData || [])
      setFields(fieldsData || [])
      
      // Process reports to generate AI detections
      await processAIDetections(reportsData || [])
    } catch (err) {
      console.error('Failed to load data:', err)
      toast.error('Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }

  const processAIDetections = async (reports: FieldReport[]) => {
    try {
      // Mock AI processing - replace with actual AI API integration
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const mockDetections: AIDetection[] = []
      
      reports.forEach((report, idx) => {
        if (report.media && report.media.length > 0) {
          report.media.forEach((media, mediaIdx) => {
            if (media.type === 'photo' || media.url) {
              const field = fields.find(f => f.id === report.work_order_id)
              
              // Generate mock AI detections
              const hasIssue = Math.random() > 0.4
              const detectedIssues: AIDetection['detectedIssues'] = []
              
              if (hasIssue) {
                const issueTypes: Array<'pest' | 'disease' | 'nutrient' | 'water' | 'weed'> = ['pest', 'disease', 'nutrient', 'water', 'weed']
                const numIssues = Math.floor(Math.random() * 3) + 1
                
                for (let i = 0; i < numIssues; i++) {
                  const issueType = issueTypes[Math.floor(Math.random() * issueTypes.length)]
                  const severity: 'low' | 'medium' | 'high' = ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as any
                  
                  detectedIssues.push({
                    type: issueType,
                    severity,
                    confidence: 70 + Math.random() * 25,
                    description: getIssueDescription(issueType, severity),
                    location: { x: Math.random() * 100, y: Math.random() * 100 }
                  })
                }
              }
              
              // Use realistic rice field images for mockup
              const mockupImages = [
                'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&h=600&fit=crop', // Rice field healthy
                'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=800&h=600&fit=crop', // Rice field
                'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&h=600&fit=crop', // Rice field closeup
                'https://images.unsplash.com/photo-1599759068001-41eb5e5e5227?w=800&h=600&fit=crop', // Rice plants
                'https://images.unsplash.com/photo-1625246333149-78d9c38ad449?w=800&h=600&fit=crop', // Rice field aerial
                'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800&h=600&fit=crop', // Agricultural field
              ]
              const randomImage = mockupImages[Math.floor(Math.random() * mockupImages.length)]
              
              mockDetections.push({
                id: `${report.id}_${mediaIdx}`,
                reportId: report.id,
                imageUrl: media.url || randomImage,
                fieldId: field?.id || 0,
                fieldName: field?.name || 'Unknown Field',
                detectedIssues,
                plantHealth: hasIssue ? 40 + Math.random() * 40 : 70 + Math.random() * 25,
                aiRecommendations: hasIssue ? generateRecommendations(detectedIssues) : ['Kondisi tanaman baik', 'Lanjutkan monitoring rutin'],
                processedAt: report.created_at,
                status: 'analyzed'
              })
            }
          })
        }
      })
      
      setDetections(mockDetections)
    } catch (err) {
      console.error('Failed to process AI detections:', err)
      toast.error('Gagal memproses deteksi AI')
    }
  }

  const getIssueDescription = (type: string, severity: string): string => {
    const descriptions: Record<string, Record<string, string>> = {
      pest: {
        low: 'Terdeteksi hama ringan',
        medium: 'Terdeteksi hama sedang',
        high: 'Terdeteksi hama berat - perlu tindakan segera'
      },
      disease: {
        low: 'Tanda-tanda penyakit ringan',
        medium: 'Tanda-tanda penyakit sedang',
        high: 'Penyakit berat terdeteksi - isolasi area diperlukan'
      },
      nutrient: {
        low: 'Kemungkinan defisiensi nutrisi ringan',
        medium: 'Defisiensi nutrisi sedang terdeteksi',
        high: 'Defisiensi nutrisi berat - pemupukan segera diperlukan'
      },
      water: {
        low: 'Kemungkinan stres air ringan',
        medium: 'Stres air sedang terdeteksi',
        high: 'Stres air berat - irigasi segera diperlukan'
      },
      weed: {
        low: 'Gulma ringan terdeteksi',
        medium: 'Gulma sedang terdeteksi',
        high: 'Gulma berat - penyiangan segera diperlukan'
      }
    }
    return descriptions[type]?.[severity] || 'Issue terdeteksi'
  }

  const generateRecommendations = (issues: AIDetection['detectedIssues']): string[] => {
    const recommendations: string[] = []
    
    if (issues.some(i => i.type === 'pest' && i.severity === 'high')) {
      recommendations.push('Aplikasi pestisida segera untuk mengontrol hama')
    }
    if (issues.some(i => i.type === 'disease')) {
      recommendations.push('Pertimbangkan aplikasi fungisida')
    }
    if (issues.some(i => i.type === 'nutrient')) {
      recommendations.push('Tingkatkan frekuensi pemupukan')
    }
    if (issues.some(i => i.type === 'water')) {
      recommendations.push('Tingkatkan frekuensi irigasi')
    }
    if (issues.some(i => i.type === 'weed')) {
      recommendations.push('Lakukan penyiangan manual atau herbisida')
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Monitor kondisi tanaman lebih lanjut')
    }
    
    return recommendations
  }

  const stats = useMemo(() => {
    return {
      totalImages: detections.length,
      imagesWithIssues: detections.filter(d => d.detectedIssues.length > 0).length,
      totalIssues: detections.reduce((sum, d) => sum + d.detectedIssues.length, 0),
      averageHealth: detections.length > 0
        ? detections.reduce((sum, d) => sum + d.plantHealth, 0) / detections.length
        : 0
    }
  }, [detections])

  const filteredDetections = useMemo(() => {
    return detections.filter(detection => {
      const fieldMatch = !filterField || detection.fieldId === filterField
      const severityMatch = filterSeverity === 'all' || 
        detection.detectedIssues.some(issue => issue.severity === filterSeverity)
      const issueMatch = filterIssue === 'all' ||
        detection.detectedIssues.some(issue => issue.type === filterIssue)
      return fieldMatch && severityMatch && issueMatch
    })
  }, [detections, filterField, filterSeverity, filterIssue])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#2E4E2A' }}></div>
          <p className="mt-4 text-gray-600">Memproses citra dengan AI...</p>
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
              <Brain className="w-8 h-8" style={{ color: '#2E4E2A' }} />
              Citra Hasil Lapangan
            </h1>
            <p className="text-gray-600 mt-2">Analisis otomatis kondisi tanaman dari foto laporan lapangan menggunakan AI</p>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors shadow-sm"
            style={{ backgroundColor: '#2E4E2A' }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-lg p-4 border" style={{ backgroundColor: 'rgba(46, 78, 42, 0.1)', borderColor: '#2E4E2A' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: '#2E4E2A' }}>Total Citra</p>
                <p className="text-2xl font-bold mt-1" style={{ color: '#2E4E2A' }}>{stats.totalImages}</p>
              </div>
              <ImageIcon className="w-8 h-8" style={{ color: '#2E4E2A' }} />
            </div>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700 font-medium">Dengan Isu</p>
                <p className="text-2xl font-bold text-red-900 mt-1">{stats.imagesWithIssues}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-700 font-medium">Total Isu</p>
                <p className="text-2xl font-bold text-orange-900 mt-1">{stats.totalIssues}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium">Rata-rata Kesehatan</p>
                <p className="text-2xl font-bold text-green-900 mt-1">{stats.averageHealth.toFixed(0)}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Images Grid */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Citra yang Dianalisis ({filteredDetections.length})</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[800px] overflow-y-auto">
              {filteredDetections.map(detection => (
                <div
                  key={detection.id}
                  onClick={() => setSelectedDetection(selectedDetection === detection.id ? null : detection.id)}
                  className={`rounded-lg border-2 overflow-hidden cursor-pointer transition-all ${
                    selectedDetection === detection.id
                      ? 'shadow-lg'
                      : 'border-gray-200 hover:shadow-md'
                  }`}
                  style={selectedDetection === detection.id ? { borderColor: '#2E4E2A' } : {}}
                >
                  <div className="relative">
                    <img 
                      src={detection.imageUrl} 
                      alt={`Detection ${detection.id}`}
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute top-2 right-2 flex gap-2">
                      {detection.detectedIssues.length > 0 ? (
                        <span className="px-2 py-1 bg-red-500 text-white text-xs font-medium rounded-full flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {detection.detectedIssues.length} isu
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-green-500 text-white text-xs font-medium rounded-full flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Sehat
                        </span>
                      )}
                      <span className={`px-2 py-1 text-white text-xs font-medium rounded-full ${
                        detection.plantHealth > 70 ? 'bg-green-500' :
                        detection.plantHealth > 40 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}>
                        {detection.plantHealth.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 text-sm mb-1">{detection.fieldName}</h3>
                    <p className="text-xs text-gray-500 mb-2">
                      {format(parseISO(detection.processedAt), 'dd MMM yyyy HH:mm')}
                    </p>
                    {detection.detectedIssues.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {detection.detectedIssues.map((issue, idx) => (
                          <span
                            key={idx}
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              issue.severity === 'high' ? 'bg-red-100 text-red-800' :
                              issue.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {issue.type} ({issue.severity})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {filteredDetections.length === 0 && (
                <div className="col-span-2 text-center py-12 text-gray-500">
                  <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p>Tidak ada citra ditemukan</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Filter className="w-5 h-5" style={{ color: '#2E4E2A' }} />
              Filter
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lahan</label>
                <select
                  value={filterField || ''}
                  onChange={(e) => setFilterField(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  onFocus={(e) => e.currentTarget.style.outline = '2px solid #2E4E2A'}
                  onBlur={(e) => e.currentTarget.style.outline = ''}
                >
                  <option value="">Semua Lahan</option>
                  {fields.map(field => (
                    <option key={field.id} value={field.id}>{field.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  onFocus={(e) => e.currentTarget.style.outline = '2px solid #2E4E2A'}
                  onBlur={(e) => e.currentTarget.style.outline = ''}
                >
                  <option value="all">Semua</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipe Isu</label>
                <select
                  value={filterIssue}
                  onChange={(e) => setFilterIssue(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  onFocus={(e) => e.currentTarget.style.outline = '2px solid #2E4E2A'}
                  onBlur={(e) => e.currentTarget.style.outline = ''}
                >
                  <option value="all">Semua</option>
                  <option value="pest">Hama</option>
                  <option value="disease">Penyakit</option>
                  <option value="nutrient">Nutrisi</option>
                  <option value="water">Air</option>
                  <option value="weed">Gulma</option>
                </select>
              </div>
            </div>
          </div>

          {/* Detection Details */}
          {selectedDetection && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Detail Analisis</h2>
              {(() => {
                const detection = detections.find(d => d.id === selectedDetection)
                if (!detection) return null
                return (
                  <div className="space-y-4">
                    <div>
                      <img 
                        src={detection.imageUrl} 
                        alt="Selected"
                        className="w-full rounded-lg border border-gray-200"
                      />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Lahan</p>
                      <p className="font-semibold text-gray-900">{detection.fieldName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Kesehatan Tanaman</p>
                      <div className="mt-1">
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full transition-all ${
                              detection.plantHealth > 70 ? 'bg-green-500' :
                              detection.plantHealth > 40 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${detection.plantHealth}%` }}
                          />
                        </div>
                        <p className="text-sm font-semibold text-gray-900 mt-1">{detection.plantHealth.toFixed(1)}%</p>
                      </div>
                    </div>
                    {detection.detectedIssues.length > 0 ? (
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Isu yang Terdeteksi</p>
                        <div className="space-y-2">
                          {detection.detectedIssues.map((issue, idx) => (
                            <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="flex items-start justify-between mb-1">
                                <span className="text-sm font-semibold text-gray-900 capitalize">{issue.type}</span>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  issue.severity === 'high' ? 'bg-red-100 text-red-800' :
                                  issue.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {issue.severity}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 mb-1">{issue.description}</p>
                              <p className="text-xs text-gray-500">Confidence: {issue.confidence.toFixed(0)}%</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <p className="text-sm font-semibold text-green-800">Tidak ada isu terdeteksi</p>
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Rekomendasi AI</p>
                      <ul className="space-y-1">
                        {detection.aiRecommendations.map((rec, idx) => (
                          <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                            <span className="mt-1" style={{ color: '#2E4E2A' }}>•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="pt-4 border-t">
                      <button className="w-full px-4 py-2 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                        style={{ backgroundColor: '#2E4E2A' }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                      >
                        <Download className="w-4 h-4" />
                        Download Report
                      </button>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

