'use client'

import { useEffect, useState, useMemo } from 'react'
import { User, fieldsAPI, Field } from '@/lib/api'
import { CheckCircle, AlertTriangle, MapPin, Clock } from 'lucide-react'
import { format } from 'date-fns'

interface SiteSummary {
  totalFields: number
  healthyFields: number
  stressedFields: number
  plantingPhases: {
    olahTanah: number
    vegetatif: number
    generatif: number
    panen: number
  }
  pestCases: number
  scheduleDeviations: number
}

export default function SMSitePage() {
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

  // Mock site summary
  const siteSummary: SiteSummary = useMemo(() => {
    return {
      totalFields: fields.length,
      healthyFields: Math.floor(fields.length * 0.75),
      stressedFields: Math.floor(fields.length * 0.15),
      plantingPhases: {
        olahTanah: 5,
        vegetatif: 12,
        generatif: 8,
        panen: 3
      },
      pestCases: 3,
      scheduleDeviations: 2
    }
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
            <h1 className="text-3xl font-bold mb-2">Ringkasan Kondisi Site</h1>
            <p className="text-white" style={{ opacity: 0.9 }}>
              Overview kondisi site dan fase tanam • {format(new Date(), 'EEEE, dd MMMM yyyy')}
            </p>
          </div>
          <MapPin className="w-12 h-12 text-white" style={{ opacity: 0.9 }} />
        </div>
      </div>

      {/* Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Lahan Sehat</h3>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-900">{siteSummary.healthyFields}</p>
          <p className="text-sm text-green-700 mt-2">
            {siteSummary.totalFields > 0 
              ? ((siteSummary.healthyFields / siteSummary.totalFields) * 100).toFixed(1) 
              : 0}% dari total lahan
          </p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Lahan Stres</h3>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <p className="text-3xl font-bold text-red-900">{siteSummary.stressedFields}</p>
          <p className="text-sm text-red-700 mt-2">Perlu perhatian</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Total Lahan</h3>
            <MapPin className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-900">{siteSummary.totalFields}</p>
          <p className="text-sm text-blue-700 mt-2">Lahan aktif</p>
        </div>
      </div>

      {/* Planting Phases */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4 text-lg">Fase Tanam</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(siteSummary.plantingPhases).map(([phase, count]) => (
            <div key={phase} className="bg-gray-50 rounded-lg p-4 text-center hover:shadow-md transition-shadow">
              <p className="text-3xl font-bold text-gray-900">{count}</p>
              <p className="text-sm text-gray-600 mt-2 capitalize">
                {phase.replace(/([A-Z])/g, ' $1').trim()}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Alerts */}
      <div className="space-y-3">
        {siteSummary.pestCases > 0 && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h4 className="font-semibold text-red-900">Kasus Hama Signifikan</h4>
            </div>
            <p className="text-sm text-red-700">
              {siteSummary.pestCases} lahan memerlukan tindakan pengendalian hama
            </p>
          </div>
        )}
        {siteSummary.scheduleDeviations > 0 && (
          <div className="bg-amber-50 border-l-4 border-amber-500 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-amber-600" />
              <h4 className="font-semibold text-amber-900">Deviasi Jadwal</h4>
            </div>
            <p className="text-sm text-amber-700">
              {siteSummary.scheduleDeviations} lahan mengalami keterlambatan jadwal
            </p>
          </div>
        )}
        {siteSummary.pestCases === 0 && siteSummary.scheduleDeviations === 0 && (
          <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h4 className="font-semibold text-green-900">Semua Kondisi Normal</h4>
            </div>
            <p className="text-sm text-green-700">
              Tidak ada kasus hama atau deviasi jadwal yang perlu perhatian
            </p>
          </div>
        )}
      </div>
    </div>
  )
}



