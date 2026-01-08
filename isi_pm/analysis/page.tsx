'use client'

import { useMemo } from 'react'
import { format } from 'date-fns'

// Mock Correlation Analysis
interface CorrelationAnalysis {
  title: string
  correlation: number // -1 to 1
  description: string
  insights: string[]
}

export default function PMAnalysisPage() {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl shadow-xl p-6 text-white" style={{ backgroundColor: '#2E4E2A' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Analisis Korelasi Data</h1>
            <p className="text-white" style={{ opacity: 0.9 }}>
              Analisis hubungan antar variabel • {format(new Date(), 'EEEE, dd MMMM yyyy')}
            </p>
          </div>
        </div>
      </div>

      {/* Correlation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {correlations.map((corr, idx) => (
          <div key={idx} className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 text-lg">{corr.title}</h3>
              <div className={`px-4 py-2 rounded-lg font-bold text-lg ${
                corr.correlation > 0.7 ? 'bg-green-200 text-green-800' :
                corr.correlation > 0.4 ? 'bg-yellow-200 text-yellow-800' :
                corr.correlation > -0.4 ? 'bg-gray-200 text-gray-800' :
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
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <span>{insight}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}



