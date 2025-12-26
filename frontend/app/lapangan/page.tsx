'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { authAPI, User, fieldsAPI, Field, workOrdersAPI, WorkOrder } from '@/lib/api'
import MapWrapper from '@/components/map/MapWrapper'
import AttendanceCard from '@/components/attendance/AttendanceCard'
import { ClipboardList, Calendar, Clock, CheckCircle, AlertCircle, MapPin } from 'lucide-react'
import { format, parseISO, isToday, eachDayOfInterval } from 'date-fns'

export default function LapanganPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [fields, setFields] = useState<Field[]>([])
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const profile = await authAPI.getProfile()
      if (profile.role !== 'Level 3' && profile.role !== 'Level 4') {
        router.push('/dashboard')
        return
      }
      setUser(profile)
      // Load fields after user is set
      if (profile.id) {
        await loadMyFields(profile.id)
      }
    } catch (err) {
      console.error('Auth check failed:', err)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const loadMyFields = async (userId: number) => {
    try {
      // Load fields assigned to the current authenticated user
      const data = await fieldsAPI.listFields(userId)
      setFields(data)
    } catch (err) {
      console.error('Failed to load fields:', err)
    }
  }

  useEffect(() => {
    if (user?.id) {
      loadTodayWorkOrders()
    }
  }, [user, fields])

  useEffect(() => {
    if (fields.length > 0 && user?.id) {
      loadTodayWorkOrders()
    }
  }, [fields])

  const loadTodayWorkOrders = async () => {
    try {
      if (!user || !fields || fields.length === 0) {
        setWorkOrders([])
        return
      }

      const fieldIds = fields.map(f => f.id).filter((id): id is number => id != null && id !== undefined)
      if (fieldIds.length === 0) {
        setWorkOrders([])
        return
      }

      const allOrders: WorkOrder[] = []
      
      for (const fieldId of fieldIds) {
        try {
          const orders = await workOrdersAPI.listWorkOrders({ field_id: fieldId })
          if (Array.isArray(orders) && orders.length > 0) {
            allOrders.push(...orders.filter(wo => wo != null))
          }
        } catch (err) {
          console.error(`Failed to load work orders for field ${fieldId}:`, err)
        }
      }
      
      // Filter by assignee and today's date
      const userFullName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : ''
      const userEmail = user?.email || ''
      
      // Get today's date in GMT+7 (Asia/Jakarta)
      const now = new Date()
      const todayGMT7 = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
      const today = format(todayGMT7, 'yyyy-MM-dd')
      
      console.log('[DEBUG] Today filter:', {
        clientTime: now.toISOString(),
        clientLocal: now.toLocaleString(),
        gmt7Time: todayGMT7.toISOString(),
        gmt7Local: todayGMT7.toLocaleString(),
        todayString: today
      })
      
      const todayOrders = allOrders.filter(wo => {
        if (!wo || !wo.assignee) return false
        
        // Check assignee
        const assigneeLower = wo.assignee.toLowerCase()
        const matchesAssignee = (
          (userFullName && assigneeLower.includes(userFullName.toLowerCase())) ||
          (userEmail && assigneeLower.includes(userEmail.toLowerCase())) ||
          assigneeLower === userEmail.toLowerCase()
        )
        
        if (!matchesAssignee) return false
        
        // Check if work order is active today (within date range)
        if (wo.start_date && wo.end_date) {
          try {
            const startDate = parseISO(wo.start_date)
            const endDate = parseISO(wo.end_date)
            const todayDate = parseISO(today)
            const dateRange = eachDayOfInterval({ start: startDate, end: endDate })
            return dateRange.some(d => format(d, 'yyyy-MM-dd') === today)
          } catch {
            return false
          }
        } else if (wo.start_date) {
          return format(parseISO(wo.start_date), 'yyyy-MM-dd') === today
        } else if (wo.end_date) {
          return format(parseISO(wo.end_date), 'yyyy-MM-dd') === today
        }
        
        return false
      })
      
      setWorkOrders(todayOrders || [])
    } catch (err) {
      console.error('Failed to load today work orders:', err)
      setWorkOrders([])
    }
  }

  // Get today's work orders summary
  const todayWorkOrdersSummary = useMemo(() => {
    if (!workOrders || workOrders.length === 0) return null

    const pending = workOrders.filter(wo => wo.status === 'pending').length
    const inProgress = workOrders.filter(wo => wo.status === 'in-progress').length
    const completed = workOrders.filter(wo => wo.status === 'completed').length
    const overdue = workOrders.filter(wo => wo.status === 'overdue').length

    return {
      total: workOrders.length,
      pending,
      inProgress,
      completed,
      overdue,
    }
  }, [workOrders])

  // Filter work orders: pending and in-progress
  const pendingAndInProgress = useMemo(() => {
    return workOrders.filter(wo => wo.status === 'pending' || wo.status === 'in-progress')
  }, [workOrders])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 pb-20 lg:pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl shadow-xl p-6 text-white">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Selamat Datang, {user.first_name}!</h1>
            <p className="text-green-100 text-sm sm:text-base">
              {format(new Date(), 'EEEE, dd MMMM yyyy')}
            </p>
          </div>
        </div>

        {/* Absen Card */}
        {user && (
          <div className="mb-6">
            <AttendanceCard onUpdate={loadTodayWorkOrders} />
          </div>
        )}

        {/* Tugas Hari Ini Card */}
        <div 
          className="bg-white rounded-2xl shadow-xl p-6 mb-6 cursor-pointer hover:shadow-2xl transition-all border-l-4 border-green-500"
          onClick={() => router.push('/lapangan/work-orders')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-3 rounded-xl">
                <ClipboardList className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Tugas Hari Ini</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {todayWorkOrdersSummary ? `${todayWorkOrdersSummary.total} tugas` : 'Tidak ada tugas'}
                </p>
              </div>
            </div>
            <Calendar className="w-6 h-6 text-gray-400" />
          </div>
          
          {todayWorkOrdersSummary && todayWorkOrdersSummary.total > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {todayWorkOrdersSummary.pending > 0 && (
                  <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 text-center">
                    <AlertCircle className="w-6 h-6 text-amber-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-amber-900">{todayWorkOrdersSummary.pending}</p>
                    <p className="text-xs font-medium text-amber-700 mt-1">Menunggu</p>
                  </div>
                )}
                {todayWorkOrdersSummary.inProgress > 0 && (
                  <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4 text-center">
                    <Clock className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-blue-900">{todayWorkOrdersSummary.inProgress}</p>
                    <p className="text-xs font-medium text-blue-700 mt-1">Sedang Dikerjakan</p>
                  </div>
                )}
                {todayWorkOrdersSummary.completed > 0 && (
                  <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4 text-center">
                    <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-900">{todayWorkOrdersSummary.completed}</p>
                    <p className="text-xs font-medium text-green-700 mt-1">Selesai</p>
                  </div>
                )}
                {todayWorkOrdersSummary.overdue > 0 && (
                  <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 text-center">
                    <AlertCircle className="w-6 h-6 text-red-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-red-900">{todayWorkOrdersSummary.overdue}</p>
                    <p className="text-xs font-medium text-red-700 mt-1">Terlambat</p>
                  </div>
                )}
              </div>
              
              {/* Tugas yang Belum Selesai */}
              {pendingAndInProgress.length > 0 && (
                <div className="mt-4 pt-4 border-t-2 border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Tugas yang Belum Selesai:</h3>
                  <div className="space-y-2">
                    {pendingAndInProgress.slice(0, 5).map(wo => (
                      <div key={wo.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{wo.title || 'Tugas Tanpa Judul'}</p>
                          <p className="text-xs text-gray-500 mt-1">{wo.category} - {wo.activity}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ml-2 ${
                          wo.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                          wo.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {wo.status === 'pending' ? 'Menunggu' : wo.status === 'in-progress' ? 'Dikerjakan' : wo.status}
                        </span>
                      </div>
                    ))}
                    {pendingAndInProgress.length > 5 && (
                      <p className="text-xs text-center text-gray-500 mt-2">
                        +{pendingAndInProgress.length - 5} tugas lainnya
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Tidak ada tugas untuk hari ini</p>
            </div>
          )}
        </div>

        {/* Map View - Read Only */}
        {fields.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-indigo-100 p-2 rounded-lg">
                <MapPin className="w-5 h-5 text-indigo-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                Lahan Saya ({fields.length})
              </h2>
            </div>
            <MapWrapper isEditMode={false} userId={user.id} />
          </div>
        )}

        {/* Fields List */}
        {fields.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Daftar Lahan</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fields.map((field) => (
                <div
                  key={field.id}
                  className="border-2 border-gray-200 rounded-xl p-4 hover:border-green-400 hover:shadow-md transition-all bg-gradient-to-br from-white to-gray-50"
                >
                  <h3 className="font-bold text-gray-900 text-lg mb-2">{field.name}</h3>
                  {field.description && (
                    <p className="text-sm text-gray-600 mb-3">{field.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {field.area && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                        {field.area.toFixed(2)} ha
                      </span>
                    )}
                    <span className="text-xs bg-gray-100 text-gray-800 px-3 py-1 rounded-full font-medium capitalize">
                      {field.draw_type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {fields.length === 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Belum Ada Lahan</h3>
            <p className="text-gray-500">Lahan Anda akan muncul di sini setelah ditugaskan</p>
          </div>
        )}
      </div>
    </div>
  )
}

