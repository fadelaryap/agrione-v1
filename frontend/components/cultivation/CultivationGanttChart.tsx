'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { CultivationActivityItem } from '@/lib/cultivation'
import { Field } from '@/lib/api'
import { format, parseISO, startOfDay, endOfDay, eachDayOfInterval, isWithinInterval, differenceInDays } from 'date-fns'
import { id } from 'date-fns/locale'
import { GripVertical, X, Edit2 } from 'lucide-react'
import { toast } from 'sonner'

interface CultivationGanttChartProps {
  activities: CultivationActivityItem[]
  setActivities: (activities: CultivationActivityItem[]) => void
  fields: Field[]
}

export default function CultivationGanttChart({
  activities,
  setActivities,
  fields
}: CultivationGanttChartProps) {
  const [selectedDateRange, setSelectedDateRange] = useState<{ start: Date; end: Date } | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState<number>(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Calculate date range from all activities
  const dateRange = useMemo(() => {
    if (activities.length === 0) {
      const today = new Date()
      return {
        start: startOfDay(today),
        end: endOfDay(new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000)) // 90 days default
      }
    }

    const dates = activities.flatMap(a => [
      parseISO(a.startDate),
      parseISO(a.endDate)
    ])

    const minDate = new Date(Math.min(...dates.map(d => d.getTime())))
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())))

    // Add padding
    const padding = 7 // 7 days before and after
    return {
      start: startOfDay(new Date(minDate.getTime() - padding * 24 * 60 * 60 * 1000)),
      end: endOfDay(new Date(maxDate.getTime() + padding * 24 * 60 * 60 * 1000))
    }
  }, [activities])

  // Generate all days in range
  const days = useMemo(() => {
    return eachDayOfInterval({ start: dateRange.start, end: dateRange.end })
  }, [dateRange])

  // Calculate position and width for each activity bar
  const getActivityPosition = (activity: CultivationActivityItem) => {
    const start = parseISO(activity.startDate)
    const end = parseISO(activity.endDate)
    const rangeStart = dateRange.start.getTime()
    const rangeEnd = dateRange.end.getTime()
    const rangeDays = differenceInDays(dateRange.end, dateRange.start)

    const left = ((start.getTime() - rangeStart) / (rangeEnd - rangeStart)) * 100
    const width = ((end.getTime() - start.getTime()) / (rangeEnd - rangeStart)) * 100

    return { left: Math.max(0, left), width: Math.max(2, width) }
  }

  const handleDragStart = (e: React.MouseEvent, activityId: string) => {
    e.preventDefault()
    setDraggingId(activityId)
    const rect = containerRef.current?.getBoundingClientRect()
    if (rect) {
      // Calculate offset from the start of the activity bar, not from mouse position
      const activity = activities.find(a => a.id === activityId)
      if (activity) {
        const activityStart = parseISO(activity.startDate)
        const activityPosition = ((activityStart.getTime() - dateRange.start.getTime()) / (dateRange.end.getTime() - dateRange.start.getTime())) * rect.width
        setDragOffset(e.clientX - rect.left - activityPosition)
      } else {
        setDragOffset(e.clientX - rect.left)
      }
    }
  }

  const handleDrag = (e: React.MouseEvent) => {
    if (!draggingId || !containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left - dragOffset
    const percent = (x / rect.width) * 100
    const daysOffset = Math.round((percent / 100) * differenceInDays(dateRange.end, dateRange.start))
    
    const activity = activities.find(a => a.id === draggingId)
    if (activity) {
      const newStart = new Date(dateRange.start)
      newStart.setDate(newStart.getDate() + daysOffset)
      const duration = differenceInDays(parseISO(activity.endDate), parseISO(activity.startDate))
      const newEnd = new Date(newStart)
      newEnd.setDate(newEnd.getDate() + duration)

      setActivities(activities.map(a => 
        a.id === draggingId 
          ? { ...a, startDate: format(newStart, 'yyyy-MM-dd'), endDate: format(newEnd, 'yyyy-MM-dd') }
          : a
      ))
    }
  }

  const handleDragEnd = () => {
    setDraggingId(null)
    setDragOffset(0)
  }

  useEffect(() => {
    if (draggingId) {
      let lastDayOffset = -1
      let lastUpdateTime = 0
      const UPDATE_THROTTLE = 16 // ~60fps

      const handleMouseMove = (e: MouseEvent) => {
        if (!containerRef.current) return
        
        const now = Date.now()
        if (now - lastUpdateTime < UPDATE_THROTTLE) return
        lastUpdateTime = now

        const rect = containerRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left - dragOffset
        const percent = Math.max(0, Math.min(100, (x / rect.width) * 100))
        
        const totalDays = differenceInDays(dateRange.end, dateRange.start)
        const exactDaysOffset = (percent / 100) * totalDays
        
        // Snap langsung ke hari terdekat - sekali geser = satu hari
        // Ini membuat drag & drop lebih smooth dan predictable
        const dayOffset = Math.round(exactDaysOffset)
        
        // Prevent unnecessary updates jika masih di hari yang sama
        if (dayOffset === lastDayOffset) return
        lastDayOffset = dayOffset
        
        const activity = activities.find(a => a.id === draggingId)
        if (activity) {
          const newStart = new Date(dateRange.start)
          newStart.setDate(newStart.getDate() + dayOffset)
          const duration = differenceInDays(parseISO(activity.endDate), parseISO(activity.startDate))
          const newEnd = new Date(newStart)
          newEnd.setDate(newEnd.getDate() + duration)

          setActivities(activities.map(a => 
            a.id === draggingId 
              ? { ...a, startDate: format(newStart, 'yyyy-MM-dd'), endDate: format(newEnd, 'yyyy-MM-dd') }
              : a
          ))
        }
      }

      const handleMouseUp = () => {
        handleDragEnd()
      }

      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)

      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [draggingId, dragOffset, activities, dateRange, setActivities])

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

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900 mb-1">Gantt Chart View</h3>
        <p className="text-xs text-gray-500">Geser activity untuk mengubah timeline (drag & drop)</p>
      </div>

      {/* Timeline Header */}
      <div className="overflow-x-auto mb-4">
        <div className="flex min-w-full" style={{ minWidth: `${days.length * 40}px` }}>
          <div className="w-48 flex-shrink-0 border-r border-gray-200"></div>
          <div className="flex flex-1">
            {days.map((day, idx) => {
              const isWeekend = day.getDay() === 0 || day.getDay() === 6
              const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
              return (
                <div
                  key={idx}
                  className={`flex-1 min-w-[40px] text-center text-xs py-2 border-r border-gray-200 ${
                    isWeekend ? 'bg-gray-50' : 'bg-white'
                  } ${isToday ? 'bg-indigo-50 border-indigo-300' : ''}`}
                >
                  <div className="font-medium text-gray-700">
                    {format(day, 'dd', { locale: id })}
                  </div>
                  <div className="text-gray-500 text-[10px]">
                    {format(day, 'MMM', { locale: id })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Activities Rows */}
      <div className="overflow-x-auto" ref={containerRef}>
        <div className="flex flex-col" style={{ minWidth: `${days.length * 40}px` }}>
          {activities.map((activity, idx) => {
            const position = getActivityPosition(activity)
            const isDragging = draggingId === activity.id
            return (
              <div key={activity.id} className="flex border-b border-gray-200 hover:bg-gray-50 transition-colors">
                {/* Activity Label */}
                <div className="w-48 flex-shrink-0 p-3 border-r border-gray-200 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{activity.title}</p>
                      <p className="text-xs text-gray-500 truncate">{activity.activity}</p>
                      {activity.fieldName && (
                        <p className="text-xs text-gray-400 truncate">{activity.fieldName}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onMouseDown={(e) => handleDragStart(e, activity.id)}
                        className="p-1 text-gray-400 hover:text-gray-600 cursor-move touch-none"
                        title="Geser timeline"
                      >
                        <GripVertical className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteActivity(activity.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Hapus"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Timeline Bar */}
                <div className="flex-1 relative h-16">
                  <div
                    className={`absolute top-2 h-12 rounded-lg ${getActivityColor(activity.activity)} text-white flex items-center justify-between px-3 cursor-move transition-all ${
                      isDragging ? 'opacity-75 shadow-lg z-10' : 'opacity-90 hover:opacity-100'
                    }`}
                    style={{
                      left: `${position.left}%`,
                      width: `${position.width}%`,
                      minWidth: '60px',
                      userSelect: 'none',
                      WebkitUserSelect: 'none'
                    }}
                    onMouseDown={(e) => handleDragStart(e, activity.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{activity.title}</p>
                      <p className="text-[10px] opacity-90">
                        {format(parseISO(activity.startDate), 'dd MMM', { locale: id })} - {format(parseISO(activity.endDate), 'dd MMM', { locale: id })}
                      </p>
                    </div>
                    {activity.priority === 'high' && (
                      <span className="ml-2 px-1.5 py-0.5 bg-red-500 rounded text-[10px] font-bold">!</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {activities.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>Belum ada activity untuk ditampilkan</p>
        </div>
      )}
    </div>
  )
}


