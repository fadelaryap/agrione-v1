'use client'

import { CultivationActivityItem } from '@/lib/cultivation'
import { Field } from '@/lib/api'
import { format, parseISO } from 'date-fns'
import { id } from 'date-fns/locale'
import { X, Edit2, Calendar, MapPin, User, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface CultivationCardViewProps {
  activities: CultivationActivityItem[]
  setActivities: (activities: CultivationActivityItem[]) => void
  fields: Field[]
}

export default function CultivationCardView({
  activities,
  setActivities,
  fields
}: CultivationCardViewProps) {
  const deleteActivity = (id: string) => {
    setActivities(activities.filter(a => a.id !== id))
    toast.success('Activity dihapus')
  }

  const getActivityColor = (activity: string) => {
    const colors: Record<string, string> = {
      'Pengolahan Tanah': 'bg-amber-500',
      'Persemaian': 'bg-green-500',
      'Penanaman': 'bg-emerald-500',
      'Pengelolaan Air (Irigasi Presisi)': 'bg-blue-500',
      'Pemupukan': 'bg-purple-500',
      'Pengendalian Gulma': 'bg-yellow-500',
      'Pengendalian Hama Penyakit': 'bg-red-500',
      'Forecasting Panen': 'bg-orange-500',
      'Panen': 'bg-indigo-500',
      'Rehabilitasi Lahan': 'bg-gray-500',
      'RnD': 'bg-pink-500',
    }
    return colors[activity] || 'bg-gray-400'
  }

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200'
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'low': return 'bg-green-100 text-green-700 border-green-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-all relative"
        >
          {/* Delete Button */}
          <button
            onClick={() => deleteActivity(activity.id)}
            className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-red-600 transition-colors"
            title="Hapus activity"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Activity Type Badge */}
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-3 h-3 rounded-full ${getActivityColor(activity.activity)}`}></div>
            <span className="text-xs font-medium text-gray-600">{activity.activity}</span>
          </div>

          {/* Title */}
          <h3 className="text-base font-bold text-gray-900 mb-3 pr-8">{activity.title}</h3>

          {/* Details */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>
                {format(parseISO(activity.startDate), 'dd MMM yyyy', { locale: id })} - {format(parseISO(activity.endDate), 'dd MMM yyyy', { locale: id })}
              </span>
            </div>

            {activity.fieldName && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span>{activity.fieldName}</span>
              </div>
            )}

            {activity.assignee && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="w-4 h-4 text-gray-400" />
                <span>{activity.assignee}</span>
              </div>
            )}

            {activity.priority && (
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded border ${getPriorityColor(activity.priority)}`}>
                  {activity.priority === 'high' ? 'Tinggi' : activity.priority === 'medium' ? 'Sedang' : 'Rendah'}
                </span>
              </div>
            )}
          </div>

          {/* Description */}
          {activity.description && (
            <p className="text-sm text-gray-600 mb-4 line-clamp-2">{activity.description}</p>
          )}

          {/* Activity-specific parameters */}
          {activity.parameters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              {activity.parameters.harvestQuantity !== undefined && (
                <div className="mb-2">
                  <p className="text-xs text-gray-500 mb-1">Hasil Panen</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {activity.parameters.harvestQuantity.toFixed(2)} {activity.parameters.harvestQuantity < 1 ? 'Kg' : 'Ton'}
                  </p>
                  {activity.parameters.harvestQuality && (
                    <p className="text-xs text-gray-600 mt-1">Kualitas: {activity.parameters.harvestQuality}</p>
                  )}
                </div>
              )}

              {activity.parameters.fertilizerType && (
                <div className="mb-2">
                  <p className="text-xs text-gray-500 mb-1">Pupuk</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {activity.parameters.fertilizerType}
                    {activity.parameters.fertilizerAmount && ` - ${activity.parameters.fertilizerAmount} Kg`}
                  </p>
                </div>
              )}

              {activity.parameters.area !== undefined && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Luas Lahan</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {activity.parameters.area.toFixed(2)} Ha
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}


