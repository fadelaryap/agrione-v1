'use client'

import { useMemo, useState } from 'react'
import { WorkOrder } from '@/lib/api'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, parseISO, isSameDay, addMonths, subMonths } from 'date-fns'
import { Calendar, MapPin, Clock, ChevronLeft, ChevronRight } from 'lucide-react'

interface CalendarGridViewProps {
  workOrders: WorkOrder[]
}

export default function CalendarGridView({ workOrders }: CalendarGridViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Group work orders by date (handle date ranges)
  const workOrdersByDate = useMemo(() => {
    if (!workOrders || workOrders.length === 0) {
      return new Map<string, WorkOrder[]>()
    }

    const grouped = new Map<string, WorkOrder[]>()
    
    workOrders.forEach(wo => {
      if (!wo) return
      
      const startDateStr = wo.start_date
      const endDateStr = wo.end_date
      
      if (!startDateStr && !endDateStr) return
      
      try {
        const startDate = startDateStr ? parseISO(startDateStr) : null
        const endDate = endDateStr ? parseISO(endDateStr) : null
        
        if (!startDate && !endDate) return
        
        // If both dates exist, create range
        if (startDate && endDate) {
          const dateRange = eachDayOfInterval({ start: startDate, end: endDate })
          dateRange.forEach(date => {
            const dateKey = format(date, 'yyyy-MM-dd')
            if (!grouped.has(dateKey)) {
              grouped.set(dateKey, [])
            }
            // Avoid duplicates
            if (!grouped.get(dateKey)!.some(o => o.id === wo.id)) {
              grouped.get(dateKey)!.push(wo)
            }
          })
        } else if (startDate) {
          // Only start date
          const dateKey = format(startDate, 'yyyy-MM-dd')
          if (!grouped.has(dateKey)) {
            grouped.set(dateKey, [])
          }
          if (!grouped.get(dateKey)!.some(o => o.id === wo.id)) {
            grouped.get(dateKey)!.push(wo)
          }
        } else if (endDate) {
          // Only end date
          const dateKey = format(endDate, 'yyyy-MM-dd')
          if (!grouped.has(dateKey)) {
            grouped.set(dateKey, [])
          }
          if (!grouped.get(dateKey)!.some(o => o.id === wo.id)) {
            grouped.get(dateKey)!.push(wo)
          }
        }
      } catch (err) {
        console.error('Error parsing date:', err, startDateStr, endDateStr)
      }
    })
    
    return grouped
  }, [workOrders])

  const getWorkOrdersForDate = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd')
    return workOrdersByDate.get(dateKey) || []
  }

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'pending': 'bg-amber-500',
      'in-progress': 'bg-blue-500',
      'completed': 'bg-green-500',
      'overdue': 'bg-red-500',
      'cancelled': 'bg-gray-500',
    }
    return colors[status] || 'bg-gray-500'
  }

  const goToPreviousMonth = () => {
    setCurrentDate(prev => subMonths(prev, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(prev => addMonths(prev, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={goToPreviousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 min-w-[200px] justify-center">
            <Calendar className="w-5 h-5 text-green-600" />
            {format(currentDate, 'MMMM yyyy')}
          </h3>
          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        <button
          onClick={goToToday}
          className="px-4 py-2 text-sm font-medium text-green-600 hover:bg-green-50 rounded-lg transition-colors"
        >
          Today
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-xs font-semibold text-gray-600 py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells for days before month start */}
        {Array.from({ length: monthStart.getDay() }).map((_, idx) => (
          <div key={`empty-${idx}`} className="aspect-square" />
        ))}

        {/* Days of the month */}
        {daysInMonth.map(day => {
          const dayWorkOrders = getWorkOrdersForDate(day)
          const isCurrentDay = isToday(day)
          const isCurrentMonth = isSameMonth(day, currentDate)

          return (
            <div
              key={day.toISOString()}
              className={`aspect-square border border-gray-200 rounded-lg p-1 sm:p-2 overflow-hidden ${
                isCurrentDay ? 'bg-green-50 border-green-500 border-2' : ''
              } ${!isCurrentMonth ? 'opacity-50' : ''}`}
            >
              <div className={`text-xs font-medium mb-1 ${isCurrentDay ? 'text-green-700 font-bold' : 'text-gray-700'}`}>
                {format(day, 'd')}
              </div>
              
              <div className="space-y-1 overflow-y-auto max-h-full">
                {dayWorkOrders && dayWorkOrders.length > 0 ? (
                  <>
                    {dayWorkOrders.slice(0, 3).map(wo => {
                      if (!wo) return null
                      return (
                        <div
                          key={wo.id}
                          className={`text-[10px] px-1 py-0.5 rounded truncate ${getStatusColor(wo.status || 'pending')} text-white`}
                          title={wo.title || 'Untitled Work Order'}
                        >
                          {wo.title || 'Untitled'}
                        </div>
                      )
                    })}
                    {dayWorkOrders.length > 3 && (
                      <div className="text-[10px] text-gray-500 font-medium">
                        +{dayWorkOrders.length - 3} more
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-amber-500 rounded"></div>
          <span>Pending</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded"></div>
          <span>In Progress</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span>Overdue</span>
        </div>
      </div>
    </div>
  )
}
