'use client'

import { useEffect, useState, useMemo } from 'react'
import { fieldsAPI, Field } from '@/lib/api'
import { Send, Zap } from 'lucide-react'
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

interface Recommendation {
  id: string
  title: string
  urgency: 'low' | 'medium' | 'high'
  affectedAreas: string[]
  rationale: string
  recommendedAction: string
  impact: string
  generatedAt: string
}

export default function PMRecommendationsPage() {
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

  // Generate recommendations for SM
  const recommendations: Recommendation[] = useMemo(() => {
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

  const handleGenerateAll = () => {
    alert('Semua rekomendasi akan digenerate')
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
            <h1 className="text-3xl font-bold mb-2">Generator Rekomendasi untuk SM</h1>
            <p className="text-purple-100">
              Generate dan kirim rekomendasi ke Site Manager • {format(new Date(), 'EEEE, dd MMMM yyyy')}
            </p>
          </div>
          <Zap className="w-12 h-12 text-purple-200" />
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between bg-white rounded-xl shadow-lg p-4">
        <div>
          <p className="text-sm text-gray-600">Total Rekomendasi</p>
          <p className="text-2xl font-bold text-gray-900">{recommendations.length}</p>
        </div>
        <button 
          onClick={handleGenerateAll}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium flex items-center gap-2"
        >
          <Zap className="w-4 h-4" />
          Generate Semua
        </button>
      </div>

      {/* Recommendations List */}
      <div className="space-y-4">
        {recommendations.map(rec => (
          <div key={rec.id} className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-bold text-gray-900 text-lg">{rec.title}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    rec.urgency === 'high' ? 'bg-red-200 text-red-800' :
                    rec.urgency === 'medium' ? 'bg-amber-200 text-amber-800' :
                    'bg-blue-200 text-blue-800'
                  }`}>
                    {rec.urgency === 'high' ? 'Urgensi Tinggi' :
                     rec.urgency === 'medium' ? 'Urgensi Sedang' : 'Urgensi Rendah'}
                  </span>
                </div>
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
                  <div>
                    <span className="text-gray-600">Generated: </span>
                    <span className="font-semibold text-gray-900">
                      {format(new Date(rec.generatedAt), 'dd MMM yyyy HH:mm')}
                    </span>
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
  )
}



