'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authAPI, User, fieldReportsAPI, FieldReport, workOrdersAPI, WorkOrder, fieldsAPI, Field } from '@/lib/api'
import { FileText, Calendar, MapPin, Eye, Image as ImageIcon, Video, MessageSquare, X } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { id } from 'date-fns/locale'
import { formatDateIndonesian } from '@/lib/dateUtils'

export default function ReportsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [reports, setReports] = useState<FieldReport[]>([])
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [fields, setFields] = useState<Field[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<number | null>(null)
  const [selectedImage, setSelectedImage] = useState<{ url: string; filename: string } | null>(null)
  const [groupBy, setGroupBy] = useState<'none' | 'date' | 'work_order' | 'field'>('none')

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (user) {
      loadReports()
      loadWorkOrders()
      loadFields()
    }
  }, [user, selectedWorkOrder])

  const loadFields = async () => {
    try {
      if (user?.id) {
        const data = await fieldsAPI.listFields(user.id)
        setFields(data || [])
      }
    } catch (err) {
      console.error('Failed to load fields:', err)
    }
  }

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
    if (!workOrderId) return 'Aktivitas Tidak Diketahui'
    const wo = workOrders.find(o => o.id === workOrderId)
    return wo?.title || `Aktivitas #${workOrderId}`
  }

  const getFieldName = (workOrderId: number | null | undefined) => {
    if (!workOrderId) return 'Lahan Tidak Diketahui'
    const wo = workOrders.find(o => o.id === workOrderId)
    if (!wo || !wo.field_id) return 'Lahan Tidak Diketahui'
    const field = fields.find(f => f.id === wo.field_id)
    return field?.name || `Lahan #${wo.field_id}`
  }

  // Group reports based on groupBy
  const groupedReports = () => {
    if (groupBy === 'none') {
      return { 'all': reports }
    }

    const groups: Record<string, FieldReport[]> = {}

    reports.forEach(report => {
      let key = 'all'
      
      if (groupBy === 'date') {
        if (report.created_at) {
          key = formatDateIndonesian(report.created_at)
        }
      } else if (groupBy === 'work_order') {
        key = report.work_order_id ? getWorkOrderTitle(report.work_order_id) : 'Tidak Ada Aktivitas'
      } else if (groupBy === 'field') {
        key = report.work_order_id ? getFieldName(report.work_order_id) : 'Tidak Ada Lahan'
      }

      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(report)
    })

    return groups
  }

  const renderReportCard = (report: FieldReport) => (
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
        <div className="flex flex-col gap-2 items-end">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            report.status === 'pending' ? 'bg-amber-100 text-amber-800' :
            report.status === 'approved' ? 'bg-green-100 text-green-800' :
            report.status === 'rejected' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {report.status === 'pending' ? 'Menunggu' : 
             report.status === 'approved' ? 'Disetujui' : 
             report.status === 'rejected' ? 'Ditolak' : 
             report.status}
          </span>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            report.condition === 'excellent' ? 'bg-green-100 text-green-800' :
            report.condition === 'good' ? 'bg-blue-100 text-blue-800' :
            report.condition === 'fair' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {report.condition === 'excellent' ? 'Sangat Baik' :
             report.condition === 'good' ? 'Baik' :
             report.condition === 'fair' ? 'Cukup' :
             report.condition === 'poor' ? 'Buruk' :
             report.condition?.toUpperCase() || 'N/A'}
          </span>
        </div>
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
            {report.media.map((media: any, idx: number) => {
              const isImage = media.type === 'photo' || 
                             (media.url && (media.url.match(/\.(jpg|jpeg|png|gif|webp)$/i) || media.url.startsWith('data:image')))
              const isVideo = media.type === 'video' || 
                             (media.url && (media.url.match(/\.(mp4|webm|mov)$/i) || media.url.startsWith('data:video')))
              
              const mediaUrl = media.url && (media.url.startsWith('http://') || media.url.startsWith('https://'))
                ? media.url
                : media.url
              
              return (
                <div key={idx} className="relative">
                  {isImage && mediaUrl ? (
                    <img
                      src={mediaUrl}
                      alt={media.filename || `Image ${idx + 1}`}
                      className="w-full h-24 object-contain rounded-lg border border-gray-200 bg-gray-50 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setSelectedImage({ url: mediaUrl, filename: media.filename || `Image ${idx + 1}` })}
                    />
                  ) : isVideo && mediaUrl ? (
                    <video
                      src={mediaUrl}
                      className="w-full h-24 object-contain rounded-lg border border-gray-200 bg-gray-50"
                      controls
                      preload="metadata"
                    />
                  ) : mediaUrl ? (
                    <img
                      src={mediaUrl}
                      alt={media.filename || `Media ${idx + 1}`}
                      className="w-full h-24 object-contain rounded-lg border border-gray-200 bg-gray-50 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setSelectedImage({ url: mediaUrl, filename: media.filename || `Media ${idx + 1}` })}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        const video = document.createElement('video')
                        video.src = mediaUrl
                        video.className = target.className
                        video.controls = true
                        video.preload = 'metadata'
                        target.parentNode?.replaceChild(video, target)
                      }}
                    />
                  ) : null}
                  <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1 rounded">
                    {isImage ? <ImageIcon className="w-3 h-3" /> : <Video className="w-3 h-3" />}
                  </div>
                </div>
              )
            })}
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
          Lihat Detail Aktivitas
        </button>
      )}
    </div>
  )

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
          <label className="block text-sm font-medium text-gray-700 mb-2">Filter berdasarkan Aktivitas</label>
          <select
            value={selectedWorkOrder || ''}
            onChange={(e) => setSelectedWorkOrder(e.target.value ? parseInt(e.target.value) : null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
          >
            <option value="">Semua Aktivitas</option>
            {workOrders.map(wo => (
              <option key={wo.id} value={wo.id}>{wo.title}</option>
            ))}
          </select>
        </div>

        {/* Grouping Buttons */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Kelompokkan Berdasarkan</label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setGroupBy('none')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                groupBy === 'none'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setGroupBy('date')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                groupBy === 'date'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Calendar className="w-4 h-4 inline mr-1" />
              Tanggal
            </button>
            <button
              onClick={() => setGroupBy('work_order')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                groupBy === 'work_order'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-1" />
              Aktivitas
            </button>
            <button
              onClick={() => setGroupBy('field')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                groupBy === 'field'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <MapPin className="w-4 h-4 inline mr-1" />
              Lahan
            </button>
          </div>
        </div>

        {/* Reports List */}
        {reports.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Tidak Ada Laporan</h2>
            <p className="text-gray-600">
              {selectedWorkOrder ? 'Tidak ada laporan untuk aktivitas ini.' : 'Anda belum mengirimkan laporan apapun.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedReports()).map(([groupKey, groupReports]) => (
              groupBy !== 'none' ? (
                <div key={groupKey} className="space-y-4">
                  <div className="bg-green-50 border-l-4 border-green-600 p-3 rounded">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {groupBy === 'date' && <Calendar className="w-5 h-5 inline mr-2" />}
                      {groupBy === 'work_order' && <FileText className="w-5 h-5 inline mr-2" />}
                      {groupBy === 'field' && <MapPin className="w-5 h-5 inline mr-2" />}
                      {groupKey}
                      <span className="ml-2 text-sm font-normal text-gray-600">
                        ({groupReports.length} {groupReports.length === 1 ? 'laporan' : 'laporan'})
                      </span>
                    </h3>
                  </div>
                  <div className="space-y-4 pl-4">
                    {groupReports.map(report => renderReportCard(report))}
                  </div>
                </div>
              ) : (
                groupReports.map(report => renderReportCard(report))
              )
            ))}
          </div>
        )}
      </div>

      {/* Image Popup Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="fixed top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 z-[101] transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="relative max-w-7xl max-h-full">
            <img
              src={selectedImage.url}
              alt={selectedImage.filename}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <p className="text-white text-center mt-2 text-sm">{selectedImage.filename}</p>
          </div>
        </div>
      )}
    </div>
  )
}

