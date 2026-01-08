'use client'

import { useMemo } from 'react'
import { WorkOrder } from '@/lib/api'
import { Field } from '@/lib/api'
import { format, parseISO, startOfDay, endOfDay, eachDayOfInterval, differenceInDays } from 'date-fns'
import { id } from 'date-fns/locale'

interface WorkOrdersGanttChartProps {
  workOrders: WorkOrder[]
  fields: Field[]
}

export default function WorkOrdersGanttChart({
  workOrders,
  fields
}: WorkOrdersGanttChartProps) {
  // Calculate date range from all work orders
  const dateRange = useMemo(() => {
    const validWorkOrders = workOrders.filter(wo => wo.start_date && wo.end_date)
    
    if (validWorkOrders.length === 0) {
      const today = new Date()
      return {
        start: startOfDay(today),
        end: endOfDay(new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000)) // 90 days default
      }
    }

    const dates = validWorkOrders.flatMap(wo => [
      parseISO(wo.start_date!),
      parseISO(wo.end_date!)
    ])

    const minDate = new Date(Math.min(...dates.map(d => d.getTime())))
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())))

    // Add padding
    const padding = 7 // 7 days before and after
    return {
      start: startOfDay(new Date(minDate.getTime() - padding * 24 * 60 * 60 * 1000)),
      end: endOfDay(new Date(maxDate.getTime() + padding * 24 * 60 * 60 * 1000))
    }
  }, [workOrders])

  // Generate all days in range
  const days = useMemo(() => {
    return eachDayOfInterval({ start: dateRange.start, end: dateRange.end })
  }, [dateRange])

  // Calculate position and width for each work order bar
  const getWorkOrderPosition = (wo: WorkOrder) => {
    if (!wo.start_date || !wo.end_date) return { left: 0, width: 0 }
    
    const start = parseISO(wo.start_date)
    const end = parseISO(wo.end_date)
    const rangeStart = dateRange.start.getTime()
    const rangeEnd = dateRange.end.getTime()

    const left = ((start.getTime() - rangeStart) / (rangeEnd - rangeStart)) * 100
    const width = ((end.getTime() - start.getTime()) / (rangeEnd - rangeStart)) * 100

    return { left: Math.max(0, left), width: Math.max(2, width) }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500'
      case 'in-progress': return 'bg-blue-500'
      case 'pending': return 'bg-amber-500'
      case 'overdue': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getFieldName = (fieldId?: number) => {
    if (!fieldId) return null
    const field = fields.find(f => f.id === fieldId)
    return field?.name || null
  }

  // Group by field
  const workOrdersByField = useMemo(() => {
    return workOrders.reduce((acc, wo) => {
      const fieldId = wo.field_id || 0
      if (!acc[fieldId]) {
        acc[fieldId] = []
      }
      acc[fieldId].push(wo)
      return acc
    }, {} as Record<number, WorkOrder[]>)
  }, [workOrders])

  const validWorkOrders = workOrders.filter(wo => wo.start_date && wo.end_date)

  if (validWorkOrders.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="text-center py-12 text-gray-500">
          <p>Tidak ada work order untuk ditampilkan</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900 mb-1">Gantt Chart View</h3>
        <p className="text-xs text-gray-500">Timeline work orders</p>
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

      {/* Work Orders Rows */}
      <div className="overflow-x-auto">
        <div className="flex flex-col" style={{ minWidth: `${days.length * 40}px` }}>
          {Object.entries(workOrdersByField).map(([fieldId, orders]) => {
            const fieldName = getFieldName(Number(fieldId))
            return (
              <div key={fieldId}>
                {fieldName && (
                  <div className="bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 border-b border-gray-200">
                    {fieldName}
                  </div>
                )}
                {orders
                  .filter(wo => wo.start_date && wo.end_date)
                  .map((wo) => {
                    const position = getWorkOrderPosition(wo)
                    const progress = wo.progress || 0
                    const startDate = parseISO(wo.start_date!)
                    const endDate = parseISO(wo.end_date!)

                    return (
                      <div key={wo.id} className="flex border-b border-gray-200 hover:bg-gray-50 transition-colors">
                        {/* Work Order Label */}
                        <div className="w-48 flex-shrink-0 p-3 border-r border-gray-200 bg-white">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{wo.title}</p>
                            <p className="text-xs text-gray-500 truncate">{wo.category} - {wo.activity}</p>
                            {wo.field_name && (
                              <p className="text-xs text-gray-400 truncate">{wo.field_name}</p>
                            )}
                            <div className="mt-1">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                                wo.status === 'completed' ? 'bg-green-100 text-green-800' :
                                wo.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                                wo.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                                wo.status === 'overdue' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {wo.status?.replace('-', ' ').toUpperCase() || 'PENDING'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Timeline Bar */}
                        <div className="flex-1 relative h-16">
                          <div
                            className={`absolute top-2 h-12 rounded-lg ${getStatusColor(wo.status || 'pending')} text-white flex items-center justify-between px-3 opacity-90`}
                            style={{
                              left: `${position.left}%`,
                              width: `${position.width}%`,
                              minWidth: '60px',
                            }}
                            title={`${wo.title} (${format(startDate, 'dd MMM', { locale: id })} - ${format(endDate, 'dd MMM', { locale: id })})`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate">{wo.title}</p>
                              <p className="text-[10px] opacity-90">
                                {format(startDate, 'dd MMM', { locale: id })} - {format(endDate, 'dd MMM', { locale: id })}
                              </p>
                            </div>
                            <div className="ml-2 text-xs font-bold">
                              {progress}%
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}








