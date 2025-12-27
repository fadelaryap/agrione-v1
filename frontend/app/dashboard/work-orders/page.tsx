'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { authAPI, User, fieldsAPI, Field, workOrdersAPI, WorkOrder } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { MapPin, ClipboardList, LayoutGrid, BarChart3, GanttChart as GanttChartIcon } from 'lucide-react'
import { parseISO, format, startOfDay, differenceInDays } from 'date-fns'
import WorkOrdersGanttChart from '@/components/work-orders/WorkOrdersGanttChart'

export default function WorkOrdersPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [fields, setFields] = useState<Field[]>([])
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'card' | 'gantt'>('card')

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (user) {
      loadFields()
    }
  }, [user])

  useEffect(() => {
    if (user) {
      loadWorkOrders()
    }
  }, [user, selectedFieldId])

  const checkAuth = async () => {
    try {
      const profile = await authAPI.getProfile()
      if (profile.role === 'superadmin') {
        router.push('/suadm')
        return
      }
      if (profile.role === 'Level 3' || profile.role === 'Level 4') {
        router.push('/lapangan')
        return
      }
      setUser(profile)
    } catch (err) {
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const loadFields = async () => {
    try {
      const data = await fieldsAPI.listFields()
      setFields(data || [])
    } catch (err) {
      console.error('Failed to load fields:', err)
    }
  }

  const loadWorkOrders = async () => {
    try {
      const params: any = {}
      if (selectedFieldId) {
        params.field_id = selectedFieldId
      }
      const data = await workOrdersAPI.listWorkOrders(params)
      setWorkOrders(data || [])
    } catch (err) {
      console.error('Failed to load work orders:', err)
    }
  }

  // Calculate progress for each field
  const fieldsWithProgress = useMemo(() => {
    if (!fields || fields.length === 0) return []

    return fields.map(field => {
      const fieldWorkOrders = workOrders.filter(wo => wo.field_id === field.id)
      
      if (fieldWorkOrders.length === 0) {
        return {
          ...field,
          hasWorkOrders: false,
          progress: 0,
          totalOrders: 0,
          completedOrders: 0,
        }
      }

      const completedOrders = fieldWorkOrders.filter(wo => wo.status === 'completed').length
      const totalProgress = fieldWorkOrders.reduce((sum, wo) => sum + (wo.progress || 0), 0)
      const averageProgress = totalProgress / fieldWorkOrders.length

      return {
        ...field,
        hasWorkOrders: true,
        progress: Math.round(averageProgress),
        totalOrders: fieldWorkOrders.length,
        completedOrders,
      }
    })
  }, [fields, workOrders])


  // Early returns
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Memuat...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Work Order</h1>
              <p className="text-gray-600 mt-2">Kelola work order untuk setiap lahan</p>
            </div>
            {/* View Toggle - Only show when viewing work orders (not fields) */}
            {selectedFieldId && workOrders.length > 0 && (
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('card')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                    viewMode === 'card'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  Kartu
                </button>
                <button
                  onClick={() => setViewMode('gantt')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                    viewMode === 'gantt'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  Gantt Chart
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filter by Field */}
        {selectedFieldId && (
          <div className="mb-4 bg-indigo-50 border border-indigo-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-indigo-600" />
              <span className="text-sm font-medium text-indigo-900">
                Menampilkan work order untuk: {fields.find(f => f.id === selectedFieldId)?.name || 'Lahan'}
              </span>
            </div>
            <button
              onClick={() => setSelectedFieldId(null)}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Hapus Filter
            </button>
          </div>
        )}

        {/* Work Orders List (if filtered by field) */}
        {selectedFieldId && workOrders.length > 0 && (
          <div className="mb-6 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Work Order ({workOrders.length})
            </h2>
            {viewMode === 'card' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workOrders.map(wo => (
                  <div
                    key={wo.id}
                    onClick={() => router.push(`/dashboard/work-orders/${wo.id}`)}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 text-sm">{wo.title}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        wo.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                        wo.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                        wo.status === 'completed' ? 'bg-green-100 text-green-800' :
                        wo.status === 'overdue' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {wo.status?.replace('-', ' ').toUpperCase() || 'PENDING'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">{wo.category} - {wo.activity}</p>
                    {wo.description && (
                      <p className="text-xs text-gray-500 mb-3 line-clamp-2">{wo.description}</p>
                    )}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-medium">{wo.progress || 0}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all"
                        style={{ width: `${wo.progress || 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <WorkOrdersGanttChart workOrders={workOrders} fields={fields} />
            )}
          </div>
        )}

        {/* Fields List with Progress */}
        {!selectedFieldId && (
          fieldsWithProgress.filter(f => f.hasWorkOrders).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {fieldsWithProgress.filter(f => f.hasWorkOrders).map((field) => (
                <div
                  key={field.id}
                  className="bg-white rounded-lg shadow-lg p-6 border-2 border-indigo-200 transition-all hover:shadow-xl cursor-pointer"
                  onClick={() => setSelectedFieldId(field.id)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 flex-1">
                      <MapPin className="w-6 h-6 text-indigo-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-semibold text-gray-900 truncate">{field.name}</h2>
                        {field.description && (
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{field.description}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {field.hasWorkOrders && (
                    <div className="space-y-4">
                      {/* Progress Section */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                          <span className="text-sm font-bold text-indigo-600">{field.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-indigo-600 h-3 rounded-full transition-all duration-500"
                            style={{ width: `${field.progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200">
                        <div>
                          <p className="text-xs text-gray-500">Total Work Order</p>
                          <p className="text-lg font-semibold text-gray-900">{field.totalOrders}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Selesai</p>
                          <p className="text-lg font-semibold text-green-600">{field.completedOrders}</p>
                        </div>
                      </div>

                      {/* View Details Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          // Filter work orders by this field
                          setSelectedFieldId(field.id)
                        }}
                        className="w-full mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                      >
                        Lihat Detail
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <ClipboardList className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Tidak Ada Work Order</h3>
              <p className="text-gray-600 mb-4">
                Belum ada lahan yang memiliki work order.
              </p>
              <p className="text-sm text-gray-500">
                Buat perencanaan budidaya di halaman <a href="/dashboard/cultivation" className="text-indigo-600 hover:underline font-medium">Cultivation Planning</a> untuk membuat work order.
              </p>
            </div>
          )
        )}

        {/* No work orders message when filtered */}
        {selectedFieldId && workOrders.length === 0 && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <ClipboardList className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Tidak Ada Work Orders</h3>
            <p className="text-gray-600">
              Field ini belum memiliki work orders.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

