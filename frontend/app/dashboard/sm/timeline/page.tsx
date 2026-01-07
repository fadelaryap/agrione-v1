'use client'

import { Calendar } from 'lucide-react'
import { format } from 'date-fns'

export default function SMTimelinePage() {
  const timelinePhases = [
    { phase: 'Olah Tanah', duration: 'Minggu 1-2', status: 'completed' },
    { phase: 'Tanam', duration: 'Minggu 3', status: 'completed' },
    { phase: 'Pemupukan', duration: 'Minggu 4-8', status: 'in-progress' },
    { phase: 'Pengairan', duration: 'Minggu 3-16', status: 'in-progress' },
    { phase: 'Panen', duration: 'Minggu 17-20', status: 'pending' },
    { phase: 'Rehabilitasi Tanah', duration: 'Minggu 21-24', status: 'pending' }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl shadow-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Timeline Musim Tanam</h1>
            <p className="text-indigo-100">
              Timeline dan fase musim tanam • {format(new Date(), 'EEEE, dd MMMM yyyy')}
            </p>
          </div>
          <Calendar className="w-12 h-12 text-indigo-200" />
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 border-2 border-gray-200">
        <div className="space-y-4">
          {timelinePhases.map((item, idx) => (
            <div key={idx} className="flex items-center gap-4 bg-white rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 ${
                item.status === 'completed' ? 'bg-green-500' :
                item.status === 'in-progress' ? 'bg-blue-500' :
                'bg-gray-300'
              }`}>
                {item.status === 'completed' ? '✓' : idx + 1}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 text-lg">{item.phase}</p>
                <p className="text-sm text-gray-600">{item.duration}</p>
              </div>
              <span className={`px-4 py-2 rounded-full text-sm font-medium flex-shrink-0 ${
                item.status === 'completed' ? 'bg-green-100 text-green-800' :
                item.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {item.status === 'completed' ? 'Selesai' :
                 item.status === 'in-progress' ? 'Berlangsung' : 'Menunggu'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Current Phase Info */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4 text-lg">Fase Saat Ini</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Fase Aktif</p>
            <p className="text-lg font-bold text-gray-900">
              {timelinePhases.find(p => p.status === 'in-progress')?.phase || 'Tidak ada'}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {timelinePhases.find(p => p.status === 'in-progress')?.duration || ''}
            </p>
          </div>
          <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Fase Selesai</p>
            <p className="text-lg font-bold text-gray-900">
              {timelinePhases.filter(p => p.status === 'completed').length} dari {timelinePhases.length}
            </p>
            <p className="text-sm text-gray-600 mt-1">fase telah selesai</p>
          </div>
        </div>
      </div>
    </div>
  )
}



