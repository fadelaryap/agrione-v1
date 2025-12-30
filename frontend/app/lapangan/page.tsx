'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { authAPI, User, fieldsAPI, Field, workOrdersAPI, WorkOrder, fieldReportsAPI, FieldReport } from '@/lib/api'
import MapWrapper from '@/components/map/MapWrapper'
import AttendanceCard from '@/components/attendance/AttendanceCard'
import { 
  ClipboardList, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  MapPin, 
  FileText,
  Send,
  XCircle,
  TrendingUp,
  Droplet,
  Leaf,
  Bug,
  AlertTriangle
} from 'lucide-react'
import { format, parseISO, isToday } from 'date-fns'

// Mock data untuk field condition
interface FieldCondition {
  fieldId: number
  plantHeight?: number // cm
  leafColor?: 'hijau' | 'kuning' | 'coklat' | 'kering'
  waterCondition?: 'cukup' | 'kurang' | 'tergenang'
  pests?: Array<{ name: string; severity: 'ringan' | 'sedang' | 'berat' }>
  diseases?: Array<{ name: string; severity: 'ringan' | 'sedang' | 'berat' }>
  activities?: Array<{ activity: string; date: string }>
  hst?: number // Hari Setelah Tanam
  variety?: string
}

export default function SPVDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [fields, setFields] = useState<Field[]>([])
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [reports, setReports] = useState<FieldReport[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedField, setSelectedField] = useState<number | null>(null)

  useEffect(() => {
    // Skip auth check for now
    const mockUser: User = {
      id: 9993,
      email: 'spv@agrione.dev',
      username: 'spv',
      first_name: 'Supervisor',
      last_name: 'Test',
      role: 'Level 3',
      status: 'approved'
    }
    setUser(mockUser)
    // Load all fields for now (no user filtering)
    loadMyFields()
    loadReports()
    setLoading(false)
    
    // Original auth check (commented out for development)
    /*
    checkAuth()
    const checkAuth = async () => {
      try {
        const profile = await authAPI.getProfile()
        if (profile.role !== 'Level 3' && profile.role !== 'Level 4') {
          router.push('/dashboard')
          return
        }
        setUser(profile)
        if (profile.id) {
          await loadMyFields(profile.id)
          await loadReports()
        }
      } catch (err) {
        console.error('Auth check failed:', err)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }
    */
  }, [])

  const loadMyFields = async (userId?: number) => {
    try {
      const data = userId ? await fieldsAPI.listFields(userId) : await fieldsAPI.listFields()
      setFields(data)
    } catch (err) {
      console.error('Failed to load fields:', err)
      setFields([])
    }
  }

  const loadReports = async () => {
    try {
      const data = await fieldReportsAPI.listFieldReports()
      setReports(data || [])
    } catch (err) {
      console.error('Failed to load reports:', err)
    }
  }

  useEffect(() => {
    if (user?.id && fields.length > 0) {
      loadTodayWorkOrders()
    }
  }, [user, fields])

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

      const allOrders = await workOrdersAPI.listWorkOrders({ field_ids: fieldIds })
      
      const userFullName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : ''
      const userEmail = user?.email || ''
      const today = format(new Date(), 'yyyy-MM-dd')
      
      const todayOrders = allOrders.filter(wo => {
        if (!wo || !wo.assignee) return false
        
        const assigneeLower = wo.assignee.toLowerCase()
        const matchesAssignee = (
          (userFullName && assigneeLower.includes(userFullName.toLowerCase())) ||
          (userEmail && assigneeLower.includes(userEmail.toLowerCase())) ||
          assigneeLower === userEmail.toLowerCase()
        )
        
        if (!matchesAssignee) return false
        
        if (wo.start_date && wo.end_date) {
          try {
            const startDate = parseISO(wo.start_date)
            const endDate = parseISO(wo.end_date)
            const todayDate = parseISO(today)
            return todayDate >= startDate && todayDate <= endDate
          } catch {
            return false
          }
        }
        return false
      })
      
      setWorkOrders(todayOrders || [])
    } catch (err) {
      console.error('Failed to load today work orders:', err)
      setWorkOrders([])
    }
  }

  // Mock field conditions data
  const fieldConditions: Record<number, FieldCondition> = useMemo(() => {
    const conditions: Record<number, FieldCondition> = {}
    fields.forEach(field => {
      conditions[field.id] = {
        fieldId: field.id,
        plantHeight: 45 + Math.floor(Math.random() * 30), // 45-75 cm
        leafColor: ['hijau', 'kuning', 'coklat'][Math.floor(Math.random() * 3)] as any,
        waterCondition: ['cukup', 'kurang', 'tergenang'][Math.floor(Math.random() * 3)] as any,
        pests: Math.random() > 0.7 ? [{ name: 'Wereng', severity: 'ringan' as any }] : [],
        diseases: Math.random() > 0.8 ? [{ name: 'Blas', severity: 'sedang' as any }] : [],
        hst: 30 + Math.floor(Math.random() * 60), // 30-90 HST
        variety: 'Inpari 32'
      }
    })
    return conditions
  }, [fields])

  // Get report status counts
  const reportStatusCounts = useMemo(() => {
    const counts = { pending: 0, approved: 0, rejected: 0 }
    reports.forEach(r => {
      if (r.status === 'pending') counts.pending++
      else if (r.status === 'approved') counts.approved++
      else if (r.status === 'rejected') counts.rejected++
    })
    return counts
  }, [reports])

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

  if (!user) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 pb-20 lg:pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl shadow-xl p-6 text-white">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Dashboard Supervisor</h1>
            <p className="text-green-100 text-sm sm:text-base">
              Selamat datang, {user.first_name}! • {format(new Date(), 'EEEE, dd MMMM yyyy')}
            </p>
          </div>
        </div>

        {/* Attendance Card */}
        {user && (
          <div className="mb-6">
            <AttendanceCard onUpdate={loadTodayWorkOrders} />
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Lahan Dikelola</p>
                <p className="text-2xl font-bold text-gray-900">{fields.length}</p>
              </div>
              <MapPin className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-amber-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Laporan Menunggu</p>
                <p className="text-2xl font-bold text-gray-900">{reportStatusCounts.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-amber-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Aktivitas Hari Ini</p>
                <p className="text-2xl font-bold text-gray-900">{workOrders.length}</p>
              </div>
              <ClipboardList className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-indigo-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Laporan Disetujui</p>
                <p className="text-2xl font-bold text-gray-900">{reportStatusCounts.approved}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-indigo-500" />
            </div>
          </div>
        </div>

        {/* Field Reports Section */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-green-600" />
              <h2 className="text-xl font-bold text-gray-900">Laporan Kondisi Lahan</h2>
            </div>
            <button
              onClick={() => router.push('/lapangan/reports')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Buat Laporan
            </button>
          </div>

          {/* Report Status Summary */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4 text-center">
              <Clock className="w-6 h-6 text-amber-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-amber-900">{reportStatusCounts.pending}</p>
              <p className="text-xs text-amber-700 mt-1">Menunggu Review</p>
            </div>
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 text-center">
              <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-900">{reportStatusCounts.approved}</p>
              <p className="text-xs text-green-700 mt-1">Disetujui</p>
            </div>
            <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 text-center">
              <XCircle className="w-6 h-6 text-orange-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-orange-900">{reportStatusCounts.rejected}</p>
              <p className="text-xs text-orange-700 mt-1">Perlu Perbaikan</p>
            </div>
          </div>

          {/* Recent Reports */}
          {reports.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">Laporan Terakhir</h3>
              {reports.slice(0, 5).map(report => (
                <div key={report.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900">{report.title}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          report.status === 'approved' ? 'bg-green-100 text-green-800' :
                          report.status === 'rejected' ? 'bg-orange-100 text-orange-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {report.status === 'approved' ? 'Disetujui' :
                           report.status === 'rejected' ? 'Perlu Perbaikan' : 'Menunggu'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{report.description || 'Tidak ada deskripsi'}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {format(parseISO(report.created_at), 'dd MMM yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Field List with Conditions */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Daftar Lahan & Kondisi</h2>
          <div className="grid grid-cols-1 gap-4">
            {fields.map((field) => {
              const condition = fieldConditions[field.id]
              return (
                <div
                  key={field.id}
                  className="border-2 border-gray-200 rounded-xl p-5 hover:border-green-400 hover:shadow-lg transition-all bg-gradient-to-br from-white to-gray-50"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-lg mb-2">{field.name}</h3>
                      {field.description && (
                        <p className="text-sm text-gray-600 mb-3">{field.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {field.area && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                            {field.area.toFixed(2)} ha
                          </span>
                        )}
                        {condition?.variety && (
                          <span className="text-xs bg-purple-100 text-purple-800 px-3 py-1 rounded-full font-medium">
                            {condition.variety}
                          </span>
                        )}
                        {condition?.hst && (
                          <span className="text-xs bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full font-medium">
                            HST {condition.hst}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => router.push(`/lapangan/work-orders?field=${field.id}`)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                      Detail
                    </button>
                  </div>

                  {/* Condition Details */}
                  {condition && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
                      {/* Plant Height */}
                      {condition.plantHeight && (
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-green-600" />
                          <div>
                            <p className="text-xs text-gray-600">Tinggi Tanaman</p>
                            <p className="text-sm font-semibold text-gray-900">{condition.plantHeight} cm</p>
                          </div>
                        </div>
                      )}

                      {/* Water Condition */}
                      {condition.waterCondition && (
                        <div className="flex items-center gap-2">
                          <Droplet className={`w-5 h-5 ${
                            condition.waterCondition === 'cukup' ? 'text-blue-600' :
                            condition.waterCondition === 'kurang' ? 'text-amber-600' : 'text-red-600'
                          }`} />
                          <div>
                            <p className="text-xs text-gray-600">Kondisi Air</p>
                            <p className="text-sm font-semibold text-gray-900 capitalize">{condition.waterCondition}</p>
                          </div>
                        </div>
                      )}

                      {/* Leaf Color */}
                      {condition.leafColor && (
                        <div className="flex items-center gap-2">
                          <Leaf className={`w-5 h-5 ${
                            condition.leafColor === 'hijau' ? 'text-green-600' :
                            condition.leafColor === 'kuning' ? 'text-yellow-600' : 'text-amber-700'
                          }`} />
                          <div>
                            <p className="text-xs text-gray-600">Warna Daun</p>
                            <p className="text-sm font-semibold text-gray-900 capitalize">{condition.leafColor}</p>
                          </div>
                        </div>
                      )}

                      {/* Pests/Diseases Alert */}
                      {(condition.pests?.length || condition.diseases?.length) && (
                        <div className="flex items-center gap-2">
                          <Bug className="w-5 h-5 text-red-600" />
                          <div>
                            <p className="text-xs text-gray-600">Hama/Penyakit</p>
                            <p className="text-sm font-semibold text-red-600">
                              {condition.pests?.length || 0} hama, {condition.diseases?.length || 0} penyakit
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Status Actions */}
                  <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FileText className="w-4 h-4" />
                      <span>Status: Menunggu Review SM</span>
                    </div>
                    <button
                      onClick={() => router.push(`/lapangan/work-orders?field=${field.id}`)}
                      className="text-sm text-green-600 hover:text-green-700 font-medium"
                    >
                      Lihat Aktivitas →
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Map View */}
        {fields.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <MapPin className="w-6 h-6 text-indigo-600" />
              <h2 className="text-xl font-bold text-gray-900">Peta Lahan</h2>
            </div>
            <MapWrapper isEditMode={false} userId={user.id} />
          </div>
        )}

        {fields.length === 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Belum Ada Lahan</h3>
            <p className="text-gray-500">Lahan Anda akan muncul di sini setelah ditetapkan</p>
          </div>
        )}
      </div>
    </div>
  )
}
