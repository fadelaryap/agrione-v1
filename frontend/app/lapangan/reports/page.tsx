'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authAPI, User, fieldReportsAPI, FieldReport, workOrdersAPI, WorkOrder } from '@/lib/api'
import { FileText, Calendar, MapPin, Eye, Image as ImageIcon, Video, MessageSquare } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { id } from 'date-fns/locale'
import { formatDateIndonesian } from '@/lib/dateUtils'

export default function ReportsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [reports, setReports] = useState<FieldReport[]>([])
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<number | null>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (user) {
      loadReports()
      loadWorkOrders()
    }
  }, [user, selectedWorkOrder])

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

  const loadWorkOrders = async () => {
    try {
      const orders = await workOrdersAPI.listWorkOrders()
      setWorkOrders(orders || [])
    } catch (err) {
      console.error('Failed to load work orders:', err)
    }
  }

  const loadReports = async () => {
    try {
      const params = selectedWorkOrder ? { work_order_id: selectedWorkOrder, include_comments: true } : { include_comments: true }
      const data = await fieldReportsAPI.listFieldReports(params)
      setReports(data || [])
    } catch (err) {
      console.error('Failed to load reports:', err)
      setReports([])
    }
  }

  const getWorkOrderTitle = (workOrderId: number | null | undefined) => {
    if (!workOrderId) return 'Tugas Tidak Diketahui'
    const wo = workOrders.find(o => o.id === workOrderId)
    return wo?.title || `Tugas #${workOrderId}`
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-green-600" />
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Laporan Lapangan</h1>
                  <p className="text-gray-600 mt-1">Lihat semua laporan lapangan yang telah Anda kirim</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter by Work Order */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Filter berdasarkan Tugas</label>
          <select
            value={selectedWorkOrder || ''}
            onChange={(e) => setSelectedWorkOrder(e.target.value ? parseInt(e.target.value) : null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
          >
            <option value="">Semua Tugas</option>
            {workOrders.map(wo => (
              <option key={wo.id} value={wo.id}>{wo.title}</option>
            ))}
          </select>
        </div>

        {/* Reports List */}
        {reports.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Tidak Ada Laporan</h2>
            <p className="text-gray-600">
              {selectedWorkOrder ? 'Tidak ada laporan untuk tugas ini.' : 'Anda belum mengirimkan laporan apapun.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report.id} className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{report.title}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {report.created_at ? formatDateIndonesian(report.created_at) : 'Tidak tersedia'}
                      </span>
                      {report.work_order_id && (
                        <span className="flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          {getWorkOrderTitle(report.work_order_id)}
                        </span>
                      )}
                      {report.coordinates && typeof report.coordinates === 'object' && 'latitude' in report.coordinates && 'longitude' in report.coordinates && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {(report.coordinates as any).latitude?.toFixed(4)}, {(report.coordinates as any).longitude?.toFixed(4)}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    report.condition === 'excellent' ? 'bg-green-100 text-green-800' :
                    report.condition === 'good' ? 'bg-blue-100 text-blue-800' :
                    report.condition === 'fair' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {report.condition?.toUpperCase() || 'N/A'}
                  </span>
                </div>

                {report.description && (
                  <p className="text-gray-700 mb-4">{report.description}</p>
                )}

                {/* Media */}
                {report.media && Array.isArray(report.media) && report.media.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      {report.media.some((m: any) => m.type === 'image') && <ImageIcon className="w-4 h-4 text-gray-600" />}
                      {report.media.some((m: any) => m.type === 'video') && <Video className="w-4 h-4 text-gray-600" />}
                      <span className="text-sm font-medium text-gray-700">
                        {report.media.length} {report.media.length === 1 ? 'file' : 'file'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {report.media.map((media: any, idx: number) => (
                        <div key={idx} className="relative">
                          {media.type === 'image' && media.data ? (
                            <img
                              src={`data:image/jpeg;base64,${media.data}`}
                              alt={media.filename || `Image ${idx + 1}`}
                              className="w-full h-24 object-contain rounded-lg border border-gray-200 bg-gray-50"
                            />
                          ) : media.type === 'video' && media.data ? (
                            <video
                              src={`data:video/webm;base64,${media.data}`}
                              className="w-full h-24 object-contain rounded-lg border border-gray-200 bg-gray-50"
                              controls={false}
                            />
                          ) : media.url ? (
                            <img
                              src={media.url}
                              alt={media.filename || `Media ${idx + 1}`}
                              className="w-full h-24 object-contain rounded-lg border border-gray-200 bg-gray-50"
                            />
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {report.notes && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700"><strong>Notes:</strong> {report.notes}</p>
                  </div>
                )}

                {/* Comments */}
                {report.comments && report.comments.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">
                        {report.comments.length} {report.comments.length === 1 ? 'komentar' : 'komentar'}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {report.comments.map((comment, idx) => (
                        <div key={idx} className="p-2 bg-gray-50 rounded text-sm">
                          <p className="font-medium text-gray-900">{comment.commented_by}</p>
                          <p className="text-gray-700">{comment.comment}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDateIndonesian(comment.created_at)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* View Details Button */}
                {report.work_order_id && (
                  <button
                    onClick={() => router.push(`/lapangan/work-orders/${report.work_order_id}/report`)}
                    className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Lihat Detail Tugas
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

