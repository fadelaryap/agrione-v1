'use client'

import { useEffect, useState, useMemo } from 'react'
import { User, fieldsAPI, Field } from '@/lib/api'
import { Lightbulb } from 'lucide-react'
import { format } from 'date-fns'

interface PMRecommendation {
  id: string
  title: string
  urgency: 'low' | 'medium' | 'high'
  affectedAreas: string[]
  rationale: string
  recommendedAction: string
  impact: string
  generatedAt: string
}

export default function SMRecommendationsPage() {
  const [fields, setFields] = useState<Field[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const fieldsData = await fieldsAPI.listFields()
      setFields(fieldsData || [])
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Mock PM recommendations
  const pmRecommendations: PMRecommendation[] = useMemo(() => {
    return [
      {
        id: '1',
        title: 'Peningkatan Irigasi untuk Lahan Stres',
        urgency: 'high',
        affectedAreas: [fields[0]?.name || 'Lahan A1', fields[1]?.name || 'Lahan B2'],
        rationale: 'NDVI menunjukkan penurunan signifikan, prediksi stres air dalam 5-7 hari',
        recommendedAction: 'Tingkatkan frekuensi irigasi menjadi 2x sehari, monitor kondisi harian',
        impact: 'Dapat mencegah penurunan hasil panen hingga 15%',
        generatedAt: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: '2',
        title: 'Persiapan Panen Optimal',
        urgency: 'low',
        affectedAreas: [fields[2]?.name || 'Lahan C3'],
        rationale: 'Prediksi waktu panen optimal dalam 15-20 hari',
        recommendedAction: 'Persiapkan peralatan panen, koordinasi jadwal dengan tim',
        impact: 'Optimasi kualitas hasil panen',
        generatedAt: new Date(Date.now() - 43200000).toISOString()
      },
      {
        id: '3',
        title: 'Pemupukan Tambahan untuk Area Spesifik',
        urgency: 'medium',
        affectedAreas: [fields[3]?.name || 'Lahan D4'],
        rationale: 'Analisis NDVI menunjukkan defisiensi nutrisi di area tertentu',
        recommendedAction: 'Aplikasikan pupuk tambahan sesuai dosis, fokus pada area terdampak',
        impact: 'Meningkatkan pertumbuhan dan hasil panen',
        generatedAt: new Date(Date.now() - 21600000).toISOString()
      }
    ]
  }, [fields])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#2E4E2A' }}></div>
          <p className="mt-4 text-gray-600">Memuat...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl shadow-xl p-6 text-white" style={{ backgroundColor: '#2E4E2A' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Rekomendasi dari PM (via DSS)</h1>
            <p className="text-white" style={{ opacity: 0.9 }}>
              Rekomendasi berbasis AI untuk eksekusi • {format(new Date(), 'EEEE, dd MMMM yyyy')}
            </p>
          </div>
          <Lightbulb className="w-12 h-12 text-white" style={{ opacity: 0.9 }} />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-lg p-4 border-l-4" style={{ borderColor: '#2E4E2A' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Rekomendasi</p>
              <p className="text-2xl font-bold text-gray-900">{pmRecommendations.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Urgent</p>
              <p className="text-2xl font-bold text-gray-900">
                {pmRecommendations.filter(r => r.urgency === 'high').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Medium Priority</p>
              <p className="text-2xl font-bold text-gray-900">
                {pmRecommendations.filter(r => r.urgency === 'medium').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations List */}
      <div className="space-y-4">
        {pmRecommendations.map(rec => (
          <div
            key={rec.id}
            className={`border-2 rounded-lg p-6 hover:shadow-lg transition-shadow ${
              rec.urgency === 'high' ? 'border-red-300 bg-red-50' :
              rec.urgency === 'medium' ? 'border-amber-300 bg-amber-50' :
              'border-blue-300 bg-blue-50'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-5 h-5" style={{ color: '#2E4E2A' }} />
                  <h3 className="font-bold text-gray-900 text-lg">{rec.title}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    rec.urgency === 'high' ? 'bg-red-200 text-red-800' :
                    rec.urgency === 'medium' ? 'bg-amber-200 text-amber-800' :
                    'bg-blue-200 text-blue-800'
                  }`}>
                    {rec.urgency === 'high' ? 'Urgent' : rec.urgency === 'medium' ? 'Medium' : 'Low'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{rec.rationale}</p>
                <div className="bg-white rounded-lg p-4 mb-3">
                  <p className="text-sm font-semibold text-gray-900 mb-2">Rekomendasi Tindakan:</p>
                  <p className="text-sm text-gray-700">{rec.recommendedAction}</p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Area Terdampak: </span>
                    <span className="font-semibold text-gray-900">{rec.affectedAreas.join(', ')}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Dampak: </span>
                    <span className="font-semibold text-green-700">{rec.impact}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Received: </span>
                    <span className="font-semibold text-gray-900">
                      {format(new Date(rec.generatedAt), 'dd MMM yyyy HH:mm')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-300">
              <button className="px-4 py-2 text-white rounded-lg transition-colors text-sm font-medium"
                style={{ backgroundColor: '#2E4E2A' }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                Buat Instruksi ke SPV
              </button>
              <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium">
                Lihat Detail
              </button>
            </div>
          </div>
        ))}
        {pmRecommendations.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Lightbulb className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">Tidak ada rekomendasi saat ini</p>
            <p className="text-sm mt-2">Rekomendasi dari PM akan muncul di sini</p>
          </div>
        )}
      </div>
    </div>
  )
}



