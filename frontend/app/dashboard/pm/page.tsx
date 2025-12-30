'use client'

import { useEffect, useState, useMemo } from 'react'
import { fieldsAPI, Field } from '@/lib/api'
import dynamic from 'next/dynamic'
import { RefreshCw } from 'lucide-react'
import { format } from 'date-fns'

const NDVIMap = dynamic(() => import('@/components/map/NDVIMap'), {
  ssr: false,
})

// Mock NDVI data
interface NDVIData {
  fieldId: number
  fieldName: string
  ndviValue: number // 0-1
  healthStatus: 'excellent' | 'good' | 'moderate' | 'poor' | 'critical'
  lastUpdated: string
}

export default function PMMapPage() {
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
            <h1 className="text-3xl font-bold mb-2">Peta NDVI & Analisis Vegetasi</h1>
            <p className="text-purple-100">
              Visualisasi kesehatan tanaman berdasarkan NDVI • {format(new Date(), 'EEEE, dd MMMM yyyy')}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Lahan</p>
              <p className="text-2xl font-bold text-gray-900">{fields.length}</p>
            </div>
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
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Lahan Sedang</p>
              <p className="text-2xl font-bold text-gray-900">
                {ndviData.filter(d => d.healthStatus === 'moderate').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Lahan Berisiko</p>
              <p className="text-2xl font-bold text-gray-900">
                {ndviData.filter(d => d.healthStatus === 'poor' || d.healthStatus === 'critical').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* NDVI Map */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Peta NDVI</h2>
          <button 
            onClick={loadFields}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Data
          </button>
        </div>

        <div className="bg-gray-100 rounded-xl overflow-hidden border-2 border-gray-300" style={{ height: '500px' }}>
          <NDVIMap fields={fields} ndviData={ndviMapData} includeRandomPolygons={true} />
        </div>

        {/* NDVI Legend */}
        <div className="mt-4 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-lg p-4">
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
      </div>

      {/* NDVI Data Table */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4 text-lg">Data NDVI per Lahan</h3>
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
                <tr key={data.fieldId} className="border-b border-gray-200 hover:bg-gray-50">
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
  )
}
