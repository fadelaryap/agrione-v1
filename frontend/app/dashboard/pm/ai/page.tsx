'use client'

import { useEffect, useState, useMemo } from 'react'
import { fieldsAPI, Field } from '@/lib/api'
import { Brain, Send } from 'lucide-react'
import { format } from 'date-fns'

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

export default function PMAIPage() {
  const [fields, setFields] = useState<Field[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFields()
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

  const handleGenerateRecommendation = async (prediction: AIPrediction) => {
    // In real implementation, this would send recommendation to SM
    alert(`Rekomendasi untuk ${prediction.fieldName} akan dikirim ke Site Manager`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-gray-600">Memuat...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl shadow-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">AI Predictions & Decision Support</h1>
            <p className="text-purple-100">
              Prediksi dan rekomendasi berbasis AI • {format(new Date(), 'EEEE, dd MMMM yyyy')}
            </p>
          </div>
          <Brain className="w-12 h-12 text-purple-200" />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Predictions</p>
              <p className="text-2xl font-bold text-gray-900">{aiPredictions.length}</p>
            </div>
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
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Confidence</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(aiPredictions.reduce((sum, p) => sum + p.confidence, 0) / aiPredictions.length)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Predictions */}
      <div className="space-y-4">
        {aiPredictions.map(pred => (
          <div
            key={pred.id}
            className={`border-2 rounded-xl p-6 hover:shadow-lg transition-shadow ${
              pred.riskLevel === 'high' ? 'border-red-300 bg-red-50' :
              pred.riskLevel === 'medium' ? 'border-amber-300 bg-amber-50' :
              'border-blue-300 bg-blue-50'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Brain className="w-6 h-6 text-purple-600" />
                  <h3 className="font-bold text-gray-900 text-lg">{pred.prediction}</h3>
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
  )
}

