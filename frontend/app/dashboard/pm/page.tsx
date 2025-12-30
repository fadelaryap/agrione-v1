'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { authAPI, User, fieldsAPI, Field } from '@/lib/api'
import dynamic from 'next/dynamic'

const NDVIMap = dynamic(() => import('@/components/map/NDVIMap'), {
  ssr: false,
})
import { 
  Map,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Brain,
  Zap,
  Layers,
  Activity,
  Target,
  Eye,
  FileText,
  Send,
  RefreshCw,
  Filter
} from 'lucide-react'
import { format } from 'date-fns'

// Mock NDVI data
interface NDVIData {
  fieldId: number
  fieldName: string
  ndviValue: number // 0-1
  healthStatus: 'excellent' | 'good' | 'moderate' | 'poor' | 'critical'
  lastUpdated: string
}

// Mock AI Prediction
interface AIPrediction {
  id: string
  type: 'stress' | 'harvest' | 'failure'
  fieldId: number
  fieldName: string
  prediction: string
  confidence: number // 0-100
  timeframe: string
  riskLevel: 'low' | 'medium' | 'high'
  recommendations: string[]
}

// Mock Correlation Analysis
interface CorrelationAnalysis {
  title: string
  correlation: number // -1 to 1
  description: string
  insights: string[]
}

export default function PMDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [fields, setFields] = useState<Field[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState<'map' | 'analysis' | 'ai' | 'recommendations'>('map')

  useEffect(() => {
    // Skip auth check for now
    const mockUser: User = {
      id: 9992,
      email: 'pm@agrione.dev',
      username: 'pm',
      first_name: 'Project',
      last_name: 'Manager',
      role: 'Level 1',
      status: 'approved'
    }
    setUser(mockUser)
    loadFields()
    setLoading(false)
    
    // Original auth check (commented out for development)
    /*
    checkAuth()
    const checkAuth = async () => {
      try {
        const profile = await authAPI.getProfile()
        if (profile.role !== 'Level 1' && profile.role !== 'Level 2') {
          router.push('/dashboard')
          return
        }
        setUser(profile)
        await loadFields()
      } catch (err) {
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }
    */
  }, [])

  const loadFields = async () => {
    try {
      const data = await fieldsAPI.listFields()
      setFields(data || [])
    } catch (err) {
      console.error('Failed to load fields:', err)
      setFields([])
    }
  }

  // Mock NDVI data
  const ndviData: NDVIData[] = useMemo(() => {
    return fields.map((field, idx) => {
      const ndvi = 0.3 + Math.random() * 0.6 // 0.3-0.9
      let healthStatus: NDVIData['healthStatus'] = 'moderate'
      if (ndvi > 0.7) healthStatus = 'excellent'
      else if (ndvi > 0.6) healthStatus = 'good'
      else if (ndvi > 0.5) healthStatus = 'moderate'
      else if (ndvi > 0.4) healthStatus = 'poor'
      else healthStatus = 'critical'

      return {
        fieldId: field.id,
        fieldName: field.name,
        ndviValue: ndvi,
        healthStatus,
        lastUpdated: new Date(Date.now() - Math.random() * 86400000 * 2).toISOString()
      }
    })
  }, [fields])

  // NDVI data for map overlay (simplified format)
  const ndviMapData = useMemo(() => {
    return ndviData.map(d => ({
      fieldId: d.fieldId,
      ndviValue: d.ndviValue
    }))
  }, [ndviData])

  // Mock AI Predictions
  const aiPredictions: AIPrediction[] = useMemo(() => {
    return [
      {
        id: '1',
        type: 'stress',
        fieldId: fields[0]?.id || 1,
        fieldName: fields[0]?.name || 'Lahan A1',
        prediction: 'Prediksi stres air dalam 5-7 hari',
        confidence: 85,
        timeframe: '5-7 hari',
        riskLevel: 'high',
        recommendations: [
          'Tingkatkan frekuensi irigasi',
          'Monitor NDVI harian',
          'Koordinasi dengan SM untuk eksekusi'
        ]
      },
      {
        id: '2',
        type: 'harvest',
        fieldId: fields[1]?.id || 2,
        fieldName: fields[1]?.name || 'Lahan B2',
        prediction: 'Waktu panen optimal: 15-20 hari lagi',
        confidence: 92,
        timeframe: '15-20 hari',
        riskLevel: 'low',
        recommendations: [
          'Persiapkan peralatan panen',
          'Koordinasi jadwal dengan SM',
          'Monitor kualitas gabah'
        ]
      },
      {
        id: '3',
        type: 'failure',
        fieldId: fields[2]?.id || 3,
        fieldName: fields[2]?.name || 'Lahan C3',
        prediction: 'Risiko gagal panen 15% tanpa intervensi',
        confidence: 78,
        timeframe: '30 hari',
        riskLevel: 'medium',
        recommendations: [
          'Pemupukan tambahan diperlukan',
          'Pengendalian hama intensif',
          'Review dengan SM dan GM'
        ]
      }
    ]
  }, [fields])

  // Mock Correlation Analysis
  const correlations: CorrelationAnalysis[] = useMemo(() => {
    return [
      {
        title: 'NDVI vs Laporan Lapangan',
        correlation: 0.82,
        description: 'Korelasi kuat antara NDVI dan kondisi lapangan yang dilaporkan SPV',
        insights: [
          'Laporan SPV dapat diandalkan',
          'NDVI dapat digunakan untuk validasi',
          'Discrepancies perlu investigasi lebih lanjut'
        ]
      },
      {
        title: 'Pertumbuhan vs Input Pupuk',
        correlation: 0.65,
        description: 'Korelasi sedang antara jumlah pupuk dan pertumbuhan tanaman',
        insights: [
          'Efisiensi pemupukan dapat ditingkatkan',
          'Waktu aplikasi pupuk berpengaruh signifikan',
          'Perlu optimasi dosis berdasarkan fase tanam'
        ]
      },
      {
        title: 'Penyakit vs Fase Tanam',
        correlation: -0.58,
        description: 'Korelasi negatif: penyakit lebih sering terjadi pada fase tertentu',
        insights: [
          'Fase vegetatif lebih rentan',
          'Perlu peningkatan monitoring pada fase kritis',
          'Preventive action lebih efektif'
        ]
      }
    ]
  }, [])

  // Generate recommendations for SM
  const recommendations = useMemo(() => {
    return aiPredictions.map(pred => ({
      id: pred.id,
      title: pred.prediction,
      urgency: pred.riskLevel,
      affectedAreas: [pred.fieldName],
      rationale: `AI prediction dengan confidence ${pred.confidence}%`,
      recommendedAction: pred.recommendations.join('; '),
      impact: pred.type === 'failure' ? 'Dapat mencegah gagal panen' : 'Optimasi hasil',
      generatedAt: new Date().toISOString()
    }))
  }, [aiPredictions])

  const handleGenerateRecommendation = async (prediction: AIPrediction) => {
    // In real implementation, this would send recommendation to SM
    alert(`Rekomendasi untuk ${prediction.fieldName} akan dikirim ke Site Manager`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-gray-600">Memuat...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl shadow-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">Dashboard Project Manager</h1>
                <p className="text-purple-100">
                  Analisis & Decision Support System • {format(new Date(), 'EEEE, dd MMMM yyyy')}
                </p>
              </div>
              <Brain className="w-12 h-12 text-purple-200" />
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Lahan</p>
                <p className="text-2xl font-bold text-gray-900">{fields.length}</p>
              </div>
              <Map className="w-8 h-8 text-purple-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Lahan Sehat</p>
                <p className="text-2xl font-bold text-gray-900">
                  {ndviData.filter(d => d.healthStatus === 'excellent' || d.healthStatus === 'good').length}
                </p>
              </div>
              <Activity className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Risiko Tinggi</p>
                <p className="text-2xl font-bold text-gray-900">
                  {aiPredictions.filter(p => p.riskLevel === 'high').length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">AI Predictions</p>
                <p className="text-2xl font-bold text-gray-900">{aiPredictions.length}</p>
              </div>
              <Brain className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {[
                { id: 'map', label: 'Peta & NDVI', icon: Map },
                { id: 'analysis', label: 'Analisis Korelasi', icon: BarChart3 },
                { id: 'ai', label: 'AI & DSS', icon: Brain },
                { id: 'recommendations', label: 'Generator Rekomendasi', icon: Zap }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id as any)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    selectedTab === tab.id
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Map & NDVI Tab */}
            {selectedTab === 'map' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Peta NDVI & Analisis Vegetasi</h2>
                  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Refresh Data
                  </button>
                </div>

                {/* NDVI Map */}
                <div className="bg-gray-100 rounded-xl overflow-hidden border-2 border-gray-300" style={{ height: '500px' }}>
                  <NDVIMap fields={fields} ndviData={ndviMapData} includeRandomPolygons={true} />
                </div>

                {/* NDVI Legend */}
                <div className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-lg p-4">
                  <div className="flex items-center justify-between text-white font-semibold text-sm mb-2">
                    <span>Kritis</span>
                    <span>Sedang</span>
                    <span>Baik</span>
                    <span>Sangat Baik</span>
                  </div>
                  <div className="h-4 bg-gradient-to-r from-red-600 via-yellow-500 to-green-600 rounded"></div>
                  <div className="flex items-center justify-between text-xs text-white mt-2">
                    <span>0.0</span>
                    <span>0.5</span>
                    <span>1.0</span>
                  </div>
                </div>

                {/* NDVI Data Table */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-900 mb-4">Data NDVI per Lahan</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-300">
                          <th className="text-left py-2 px-4 text-sm font-semibold text-gray-700">Lahan</th>
                          <th className="text-left py-2 px-4 text-sm font-semibold text-gray-700">NDVI</th>
                          <th className="text-left py-2 px-4 text-sm font-semibold text-gray-700">Status</th>
                          <th className="text-left py-2 px-4 text-sm font-semibold text-gray-700">Update Terakhir</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ndviData.map(data => (
                          <tr key={data.fieldId} className="border-b border-gray-200 hover:bg-white">
                            <td className="py-3 px-4 text-sm text-gray-900">{data.fieldName}</td>
                            <td className="py-3 px-4 text-sm">
                              <span className="font-semibold">{data.ndviValue.toFixed(3)}</span>
                            </td>
                            <td className="py-3 px-4 text-sm">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                data.healthStatus === 'excellent' ? 'bg-green-100 text-green-800' :
                                data.healthStatus === 'good' ? 'bg-blue-100 text-blue-800' :
                                data.healthStatus === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                                data.healthStatus === 'poor' ? 'bg-orange-100 text-orange-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {data.healthStatus === 'excellent' ? 'Sangat Baik' :
                                 data.healthStatus === 'good' ? 'Baik' :
                                 data.healthStatus === 'moderate' ? 'Sedang' :
                                 data.healthStatus === 'poor' ? 'Buruk' : 'Kritis'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {format(new Date(data.lastUpdated), 'dd MMM yyyy HH:mm')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Correlation Analysis Tab */}
            {selectedTab === 'analysis' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900">Analisis Korelasi Data</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {correlations.map((corr, idx) => (
                    <div key={idx} className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-900">{corr.title}</h3>
                        <div className={`px-4 py-2 rounded-lg font-bold ${
                          corr.correlation > 0.7 ? 'bg-green-200 text-green-800' :
                          corr.correlation > 0.4 ? 'bg-yellow-200 text-yellow-800' :
                          'bg-red-200 text-red-800'
                        }`}>
                          {corr.correlation > 0 ? '+' : ''}{corr.correlation.toFixed(2)}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">{corr.description}</p>
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-gray-900">Insights:</p>
                        {corr.insights.map((insight, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2"></div>
                            <span>{insight}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI & DSS Tab */}
            {selectedTab === 'ai' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900">AI Predictions & Decision Support</h2>
                <div className="space-y-4">
                  {aiPredictions.map(pred => (
                    <div
                      key={pred.id}
                      className={`border-2 rounded-xl p-6 ${
                        pred.riskLevel === 'high' ? 'border-red-300 bg-red-50' :
                        pred.riskLevel === 'medium' ? 'border-amber-300 bg-amber-50' :
                        'border-blue-300 bg-blue-50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Brain className="w-6 h-6 text-purple-600" />
                            <h3 className="font-bold text-gray-900">{pred.prediction}</h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              pred.riskLevel === 'high' ? 'bg-red-200 text-red-800' :
                              pred.riskLevel === 'medium' ? 'bg-amber-200 text-amber-800' :
                              'bg-blue-200 text-blue-800'
                            }`}>
                              {pred.riskLevel === 'high' ? 'Risiko Tinggi' :
                               pred.riskLevel === 'medium' ? 'Risiko Sedang' : 'Risiko Rendah'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div>
                              <p className="text-xs text-gray-600">Lahan</p>
                              <p className="text-sm font-semibold text-gray-900">{pred.fieldName}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">Confidence</p>
                              <p className="text-sm font-semibold text-gray-900">{pred.confidence}%</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">Timeframe</p>
                              <p className="text-sm font-semibold text-gray-900">{pred.timeframe}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">Type</p>
                              <p className="text-sm font-semibold text-gray-900 capitalize">{pred.type}</p>
                            </div>
                          </div>
                          <div className="bg-white rounded-lg p-4">
                            <p className="text-sm font-semibold text-gray-900 mb-2">Rekomendasi:</p>
                            <ul className="space-y-1">
                              {pred.recommendations.map((rec, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                  <span className="text-purple-600 mt-1">•</span>
                                  <span>{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4 pt-4 border-t border-gray-300">
                        <button
                          onClick={() => handleGenerateRecommendation(pred)}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium flex items-center gap-2"
                        >
                          <Send className="w-4 h-4" />
                          Kirim ke SM
                        </button>
                        <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium">
                          Detail Analisis
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations Generator Tab */}
            {selectedTab === 'recommendations' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Generator Rekomendasi untuk SM</h2>
                  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium">
                    Generate Semua
                  </button>
                </div>
                <div className="space-y-4">
                  {recommendations.map(rec => (
                    <div key={rec.id} className="bg-white border-2 border-gray-200 rounded-xl p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 mb-2">{rec.title}</h3>
                          <p className="text-sm text-gray-600 mb-4">{rec.rationale}</p>
                          <div className="bg-gray-50 rounded-lg p-4 mb-4">
                            <p className="text-sm font-semibold text-gray-900 mb-2">Rekomendasi Tindakan:</p>
                            <p className="text-sm text-gray-700">{rec.recommendedAction}</p>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Area: </span>
                              <span className="font-semibold text-gray-900">{rec.affectedAreas.join(', ')}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Dampak: </span>
                              <span className="font-semibold text-green-700">{rec.impact}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
                        <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium flex items-center gap-2">
                          <Send className="w-4 h-4" />
                          Kirim ke SM
                        </button>
                        <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium">
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

