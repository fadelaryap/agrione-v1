'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { authAPI, User, fieldsAPI, Field, workOrdersAPI, WorkOrder } from '@/lib/api'
import { ClipboardList, Calendar, ChevronDown, ChevronUp, MapPin, User as UserIcon, Clock, CheckCircle, XCircle, AlertCircle, Filter, ArrowUpDown, Navigation, CalendarDays } from 'lucide-react'
import { format, parseISO, startOfDay, isToday, isTomorrow, addDays, isSameDay, eachDayOfInterval, isBefore, isAfter } from 'date-fns'
import { id } from 'date-fns/locale'
import { toast } from 'sonner'
import CalendarGridView from '@/components/work-orders/CalendarGridView'

export default function WorkOrdersPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [fields, setFields] = useState<Field[]>([])
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'accordion' | 'calendar'>('accordion')
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateRangeFilter, setDateRangeFilter] = useState<{ start: string; end: string }>({ start: '', end: '' })
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'priority'>('date')

  useEffect(() => {
    checkAuth()
    
    // Listen for calendar date clicks
    const handleCalendarDateClick = (event: CustomEvent) => {
      const dateKey = event.detail.dateKey
      setViewMode('accordion')
      setExpandedDates(new Set([dateKey]))
      // Scroll to accordion section after a short delay
      setTimeout(() => {
        const element = document.querySelector(`[data-date-key="${dateKey}"]`)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)
    }
    
    window.addEventListener('calendar-date-click', handleCalendarDateClick as EventListener)
    return () => {
      window.removeEventListener('calendar-date-click', handleCalendarDateClick as EventListener)
    }
  }, [])

  useEffect(() => {
    if (user?.id) {
      loadMyFields()
    }
  }, [user])

  useEffect(() => {
    if (fields.length > 0) {
      loadWorkOrders()
    }
  }, [fields])

  const checkAuth = async () => {
    try {
      const profile = await authAPI.getProfile()
      if (profile.role !== 'Level 3' && profile.role !== 'Level 4') {
        router.push('/dashboard')
        return
      }
      setUser(profile)
    } catch (err) {
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const loadMyFields = async () => {
    try {
      if (user?.id) {
        const data = await fieldsAPI.listFields(user.id)
        setFields(data || [])
      }
    } catch (err) {
      console.error('Failed to load fields:', err)
    }
  }

  const openGoogleMapsForField = async (fieldId: number) => {
    try {
      // Find field in loaded fields first
      let field = fields.find(f => f.id === fieldId)
      
      // If not found, load it
      if (!field) {
        field = await fieldsAPI.getField(fieldId)
      }
      
      if (!field || !field.coordinates) {
        toast.error('Koordinat field tidak tersedia')
        return
      }

      let lat: number, lng: number

      // Handle different coordinate formats
      if (field.draw_type === 'circle' && field.coordinates.center) {
        // Circle: use center
        lat = field.coordinates.center[0]
        lng = field.coordinates.center[1]
      } else if (Array.isArray(field.coordinates) && field.coordinates.length > 0) {
        // Polygon: use first point
        lat = field.coordinates[0][0]
        lng = field.coordinates[0][1]
      } else if (field.coordinates.latitude && field.coordinates.longitude) {
        // Point format
        lat = field.coordinates.latitude
        lng = field.coordinates.longitude
      } else {
        toast.error('Format koordinat tidak didukung')
        return
      }

      // Open Google Maps with navigation
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
      window.open(url, '_blank')
    } catch (err) {
      console.error('Failed to open Google Maps:', err)
      toast.error('Gagal membuka Google Maps')
    }
  }

  const loadWorkOrders = async () => {
    try {
      // Get work orders for all fields assigned to this user - optimized: single API call
      const fieldIds = fields.map(f => f.id).filter((id): id is number => id != null && id !== undefined)
      
      if (fieldIds.length === 0) {
        setWorkOrders([])
        return
      }

      // Use field_ids parameter for better performance (single API call instead of multiple)
      const allOrders = await workOrdersAPI.listWorkOrders({ field_ids: fieldIds })
      
      // Also filter by assignee (user's name)
      const userFullName = user ? `${user.first_name} ${user.last_name}` : ''
      const filteredOrders = allOrders.filter(wo => 
        wo.assignee && (
          wo.assignee.toLowerCase().includes(userFullName.toLowerCase()) ||
          wo.assignee === user?.email
        )
      )
      
      setWorkOrders(filteredOrders || [])
    } catch (err) {
      console.error('Failed to load work orders:', err)
      setWorkOrders([])
    }
  }

  // Filter and sort work orders
  const filteredAndSortedWorkOrders = useMemo(() => {
    if (!workOrders || workOrders.length === 0) {
      return []
    }

    let filtered = workOrders.filter(wo => {
      if (!wo) return false
      
      // Status filter
      if (statusFilter !== 'all' && wo.status !== statusFilter) {
        return false
      }
      
      // Date range filter
      if (dateRangeFilter.start || dateRangeFilter.end) {
        const woStart = wo.start_date ? parseISO(wo.start_date) : null
        const woEnd = wo.end_date ? parseISO(wo.end_date) : null
        
        if (dateRangeFilter.start) {
          const filterStart = parseISO(dateRangeFilter.start)
          if (woEnd && isBefore(woEnd, filterStart)) return false
        }
        
        if (dateRangeFilter.end) {
          const filterEnd = parseISO(dateRangeFilter.end)
          if (woStart && isAfter(woStart, filterEnd)) return false
        }
      }
      
      return true
    })

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        const aDate = a.start_date ? parseISO(a.start_date) : new Date(0)
        const bDate = b.start_date ? parseISO(b.start_date) : new Date(0)
        return aDate.getTime() - bDate.getTime()
      } else if (sortBy === 'status') {
        return (a.status || '').localeCompare(b.status || '')
      } else if (sortBy === 'priority') {
        const priorityOrder: { [key: string]: number } = { 'high': 3, 'medium': 2, 'low': 1 }
        return (priorityOrder[b.priority || 'medium'] || 0) - (priorityOrder[a.priority || 'medium'] || 0)
      }
      return 0
    })

    return filtered
  }, [workOrders, statusFilter, dateRangeFilter, sortBy])

  // Group work orders by date (handle date ranges - work order appears on all dates in range)
  const workOrdersByDate = useMemo(() => {
    if (!filteredAndSortedWorkOrders || filteredAndSortedWorkOrders.length === 0) {
      return new Map<string, WorkOrder[]>()
    }

    const grouped = new Map<string, WorkOrder[]>()
    
    filteredAndSortedWorkOrders.forEach(wo => {
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
            const dateKey = format(startOfDay(date), 'yyyy-MM-dd')
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
          const dateKey = format(startOfDay(startDate), 'yyyy-MM-dd')
          if (!grouped.has(dateKey)) {
            grouped.set(dateKey, [])
          }
          if (!grouped.get(dateKey)!.some(o => o.id === wo.id)) {
            grouped.get(dateKey)!.push(wo)
          }
        } else if (endDate) {
          // Only end date
          const dateKey = format(startOfDay(endDate), 'yyyy-MM-dd')
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
    
    // Sort dates
    const sortedDates = Array.from(grouped.keys()).sort()
    const sortedMap = new Map<string, WorkOrder[]>()
    sortedDates.forEach(date => {
      const orders = grouped.get(date)
      if (orders && orders.length > 0) {
        sortedMap.set(date, orders)
      }
    })
    
    return sortedMap
  }, [filteredAndSortedWorkOrders])

  // Initialize expanded dates with "Today" if it exists
  useEffect(() => {
    if (workOrdersByDate.size > 0) {
      const today = format(new Date(), 'yyyy-MM-dd')
      if (workOrdersByDate.has(today)) {
        setExpandedDates(new Set([today]))
      } else {
        // If today doesn't exist, expand the first date
        const firstDate = Array.from(workOrdersByDate.keys())[0]
        if (firstDate) {
          setExpandedDates(new Set([firstDate]))
        }
      }
    }
  }, [workOrdersByDate])

  const getDateLabel = (dateStr: string) => {
    try {
      const date = parseISO(dateStr)
      const today = startOfDay(new Date())
      const isPast = isBefore(date, today)
      
      if (isToday(date)) return 'Hari Ini'
      if (isTomorrow(date)) return 'Besok'
      if (isPast) return `Kadaluwarsa - ${format(date, 'EEEE, d MMMM yyyy', { locale: id })}`
      return format(date, 'EEEE, d MMMM yyyy', { locale: id })
    } catch {
      return dateStr
    }
  }

  const toggleDate = (dateStr: string) => {
    setExpandedDates(prev => {
      const newSet = new Set(prev)
      if (newSet.has(dateStr)) {
        newSet.delete(dateStr)
      } else {
        newSet.add(dateStr)
      }
      return newSet
    })
  }

  const getStatusBadge = (status: string) => {
    const styles: { [key: string]: { bg: string; text: string; icon: any } } = {
      'pending': { bg: 'bg-amber-100', text: 'text-amber-800', icon: AlertCircle },
      'in-progress': { bg: 'bg-blue-100', text: 'text-blue-800', icon: Clock },
      'completed': { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      'overdue': { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
      'cancelled': { bg: 'bg-gray-100', text: 'text-gray-800', icon: XCircle },
    }
    const style = styles[status] || styles.pending
    const Icon = style.icon
    
    const statusLabels: { [key: string]: string } = {
      'pending': 'Menunggu',
      'in-progress': 'Sedang Berjalan',
      'completed': 'Selesai',
      'overdue': 'Terlambat',
      'cancelled': 'Dibatalkan',
    }
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${style.bg} ${style.text}`}>
        <Icon className="w-3 h-3" />
        {statusLabels[status] || status}
      </span>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const styles: { [key: string]: string } = {
      'low': 'bg-green-100 text-green-800',
      'medium': 'bg-yellow-100 text-yellow-800',
      'high': 'bg-red-100 text-red-800',
    }
    const priorityLabels: { [key: string]: string } = {
      'low': 'Rendah',
      'medium': 'Sedang',
      'high': 'Tinggi',
    }
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[priority] || styles.medium}`}>
        {priorityLabels[priority] || priority}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-16">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <ClipboardList className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Aktivitas</h1>
                  <p className="text-sm text-gray-600 mt-1">Aktivitas yang ditetapkan kepada Anda</p>
                </div>
              </div>
              
              {/* View Mode Toggle - Mobile only */}
              <div className="sm:hidden flex gap-2">
                <button
                  onClick={() => setViewMode('accordion')}
                  className={`px-3 py-1 rounded text-xs font-medium ${
                    viewMode === 'accordion' 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  Daftar
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`px-3 py-1 rounded text-xs font-medium ${
                    viewMode === 'calendar' 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Sort - Compact */}
        <div className="bg-white rounded-lg shadow-lg p-3 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-green-500"
              >
                <option value="all">Semua</option>
                <option value="pending">Menunggu</option>
                <option value="in-progress">Sedang Berjalan</option>
                <option value="completed">Selesai</option>
                <option value="overdue">Terlambat</option>
              </select>
            </div>
            
            {/* Date inputs - compact, 2 columns on mobile */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 sm:gap-0">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tanggal Mulai</label>
                <div className="relative">
                  <CalendarDays className="absolute left-1 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none z-10" />
                  <input
                    type="date"
                    value={dateRangeFilter.start}
                    onChange={(e) => setDateRangeFilter({ ...dateRangeFilter, start: e.target.value })}
                    className="w-full pl-5 pr-1 py-1 border border-gray-300 rounded text-[9px] sm:text-xs focus:ring-1 focus:ring-green-500 min-w-0"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tanggal Selesai</label>
                <div className="relative">
                  <CalendarDays className="absolute left-1 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none z-10" />
                  <input
                    type="date"
                    value={dateRangeFilter.end}
                    onChange={(e) => setDateRangeFilter({ ...dateRangeFilter, end: e.target.value })}
                    className="w-full pl-5 pr-1 py-1 border border-gray-300 rounded text-[9px] sm:text-xs focus:ring-1 focus:ring-green-500 min-w-0"
                  />
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Urutkan</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'status' | 'priority')}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-green-500"
              >
                <option value="date">Tanggal</option>
                <option value="status">Status</option>
                <option value="priority">Prioritas</option>
              </select>
            </div>
            
            <div className="flex items-end">
              {(statusFilter !== 'all' || dateRangeFilter.start || dateRangeFilter.end) && (
                <button
                  onClick={() => {
                    setStatusFilter('all')
                    setDateRangeFilter({ start: '', end: '' })
                  }}
                  className="w-full px-2 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-xs font-medium"
                >
                  Hapus Filter
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Accordion View */}
        {viewMode === 'accordion' && (
          <div className="space-y-3">
            {workOrdersByDate && workOrdersByDate.size > 0 ? (() => {
              const today = startOfDay(new Date())
              const pastDates: Array<[string, WorkOrder[]]> = []
              const futureDates: Array<[string, WorkOrder[]]> = []
              
              Array.from(workOrdersByDate.entries()).forEach(([dateStr, orders]) => {
                if (!orders || orders.length === 0) return
                const date = parseISO(dateStr)
                const isPast = isBefore(date, today)
                if (isPast) {
                  pastDates.push([dateStr, orders])
                } else {
                  futureDates.push([dateStr, orders])
                }
              })
              
              // Sort past dates (newest first)
              pastDates.sort((a, b) => b[0].localeCompare(a[0]))
              // Sort future dates (oldest first)
              futureDates.sort((a, b) => a[0].localeCompare(b[0]))
              
              return (
                <>
                  {/* Future dates (normal accordions) */}
                  {futureDates.map(([dateStr, orders]) => {
                    const isExpanded = expandedDates.has(dateStr)
                    const dateLabel = getDateLabel(dateStr)
                    
                    return (
                      <div key={dateStr} data-date-key={dateStr} className="bg-white rounded-lg shadow-lg overflow-hidden">
                        <button
                          onClick={() => toggleDate(dateStr)}
                          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-green-600" />
                            <div className="text-left">
                              <h3 className="font-semibold text-gray-900">{dateLabel}</h3>
                              <p className="text-xs text-gray-500">{orders.length} aktivitas</p>
                            </div>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                      
                        {isExpanded && (
                          <div className="border-t border-gray-200 p-4 space-y-3">
                            {orders.map(wo => {
                              // Check if work order date matches today - only allow clicking if it's today
                              const today = startOfDay(new Date())
                              const woStartDate = wo.start_date ? startOfDay(parseISO(wo.start_date)) : null
                              const woEndDate = wo.end_date ? startOfDay(parseISO(wo.end_date)) : null
                              
                              let isToday = false
                              if (woStartDate) {
                                const todayStr = format(today, 'yyyy-MM-dd')
                                const woStartStr = format(woStartDate, 'yyyy-MM-dd')
                                const woEndStr = woEndDate ? format(woEndDate, 'yyyy-MM-dd') : woStartStr
                                isToday = todayStr >= woStartStr && todayStr <= woEndStr
                              }
                              
                              return (
                              <div
                                key={wo.id}
                                className={`border border-gray-200 rounded-lg p-4 transition-shadow ${
                                  isToday 
                                    ? 'hover:shadow-md cursor-pointer' 
                                    : 'opacity-60 cursor-not-allowed'
                                }`}
                                onClick={() => {
                                  if (isToday) {
                                    router.push(`/lapangan/work-orders/${wo.id}/report`)
                                  } else {
                                    toast.error('Work order ini hanya bisa diakses pada tanggal yang sesuai')
                                  }
                                }}
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-gray-900 text-sm mb-1">{wo.title || 'Untitled'}</h4>
                                    <p className="text-xs text-gray-600">
                                      {wo.category || 'N/A'} - {wo.activity || 'N/A'}
                                    </p>
                                  </div>
                                  {getStatusBadge(wo.status || 'pending')}
                                </div>
                                
                                {wo.description && (
                                  <p className="text-xs text-gray-500 mb-3 mt-2 line-clamp-2">{wo.description}</p>
                                )}
                                
                                <div className="space-y-2 text-xs">
                                  {wo.field_name && (
                                    <div className="flex items-center gap-2 text-gray-600">
                                      <MapPin className="w-3 h-3" />
                                      <span>{wo.field_name}</span>
                                    </div>
                                  )}
                                  
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-600">Progress</span>
                                    <span className="font-medium">{wo.progress || 0}%</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-green-600 h-2 rounded-full transition-all"
                                      style={{ width: `${wo.progress || 0}%` }}
                                    />
                                  </div>
                                  
                                  {wo.requirements && wo.requirements.length > 0 && (
                                    <div className="mt-2">
                                      <p className="text-gray-600 mb-1">Persyaratan:</p>
                                      <ul className="list-disc list-inside text-gray-500 space-y-1">
                                        {wo.requirements.slice(0, 3).map((req, idx) => (
                                          <li key={idx} className="text-xs">{req}</li>
                                        ))}
                                        {wo.requirements.length > 3 && (
                                          <li className="text-xs text-gray-400">
                                            +{wo.requirements.length - 3} more
                                          </li>
                                        )}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="mt-3 space-y-2 pt-3 border-t border-gray-100">
                                  <div className="flex items-center justify-between">
                                    {getPriorityBadge(wo.priority || 'medium')}
                                    {wo.actual_hours && (
                                      <span className="text-xs text-gray-500 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {wo.actual_hours}h
                                      </span>
                                    )}
                                  </div>
                                  {wo.field_id && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        openGoogleMapsForField(wo.field_id!)
                                      }}
                                      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-xs font-medium"
                                    >
                                      <Navigation className="w-4 h-4" />
                                      Buka di Google Maps
                                    </button>
                                  )}
                                </div>
                              </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  
                  {/* Past dates (single accordion) */}
                  {pastDates.length > 0 && (() => {
                    const expiredKey = 'expired'
                    const isExpanded = expandedDates.has(expiredKey)
                    
                    return (
                      <div data-date-key="expired" className="bg-white rounded-lg shadow-lg overflow-hidden border-2 border-red-300">
                        <button
                          onClick={() => toggleDate(expiredKey)}
                          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-red-600" />
                            <div className="text-left">
                              <h3 className="font-semibold text-red-700">Kadaluwarsa / Sudah Lewat</h3>
                              <p className="text-xs text-gray-500">{pastDates.reduce((sum, [, orders]) => sum + orders.length, 0)} aktivitas</p>
                            </div>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                      
                        {isExpanded && (
                          <div className="border-t border-gray-200 p-4 space-y-4">
                            {pastDates.map(([dateStr, orders]) => {
                              const date = parseISO(dateStr)
                              const dateLabel = format(date, 'EEEE, d MMMM yyyy', { locale: id })
                              const isDateExpanded = expandedDates.has(dateStr)
                              
                              return (
                                <div key={dateStr} className="border border-red-200 rounded-lg overflow-hidden">
                                  <button
                                    onClick={() => toggleDate(dateStr)}
                                    className="w-full flex items-center justify-between p-3 bg-red-50 hover:bg-red-100 transition-colors"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Calendar className="w-4 h-4 text-red-600" />
                                      <span className="text-sm font-medium text-red-700">{dateLabel}</span>
                                      <span className="text-xs text-red-600">({orders.length} aktivitas)</span>
                                    </div>
                                    {isDateExpanded ? (
                                      <ChevronUp className="w-4 h-4 text-red-600" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4 text-red-600" />
                                    )}
                                  </button>
                                  
                                  {isDateExpanded && (
                                    <div className="p-3 space-y-2 bg-white">
                                      {orders.map(wo => {
                                        // Past dates are not clickable
                                        return (
                                        <div
                                          key={wo.id}
                                          className="border border-gray-200 rounded-lg p-3 opacity-60 cursor-not-allowed"
                                          onClick={() => {
                                            toast.error('Work order ini sudah lewat tanggalnya, tidak bisa diakses')
                                          }}
                                        >
                                          <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1">
                                              <h4 className="font-semibold text-gray-900 text-sm mb-1">{wo.title || 'Untitled'}</h4>
                                              <p className="text-xs text-gray-600">
                                                {wo.category || 'N/A'} - {wo.activity || 'N/A'}
                                              </p>
                                            </div>
                                            {getStatusBadge(wo.status || 'pending')}
                                          </div>
                                          
                                          {wo.description && (
                                            <p className="text-xs text-gray-500 mb-2 line-clamp-2">{wo.description}</p>
                                          )}
                                          
                                          <div className="flex items-center justify-between text-xs">
                                            <span className="text-gray-600">Progress: {wo.progress || 0}%</span>
                                            {getPriorityBadge(wo.priority || 'medium')}
                                          </div>
                                        </div>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </>
              )
            })() : (
              <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                <ClipboardList className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Tidak Ada Aktivitas</h3>
                <p className="text-gray-600">
                  Anda belum memiliki aktivitas yang ditetapkan.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Calendar View */}
        {viewMode === 'calendar' && (
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
            <CalendarGridView workOrders={filteredAndSortedWorkOrders} />
          </div>
        )}
      </div>
    </div>
  )
}
