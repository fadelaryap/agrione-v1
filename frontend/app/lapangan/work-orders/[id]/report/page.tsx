'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { authAPI, User, workOrdersAPI, WorkOrder, fieldReportsAPI, FieldReport, FieldReportComment } from '@/lib/api'
import { Calendar, MapPin, User as UserIcon, Clock, CheckCircle, AlertCircle, MessageSquare, Send, Camera, Video, X } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { id } from 'date-fns/locale'
import { toast } from 'sonner'
import { formatDateIndonesian, formatDateOnly } from '@/lib/dateUtils'

export default function WorkOrderReportPage() {
  const router = useRouter()
  const params = useParams()
  const workOrderId = params?.id ? parseInt(params.id as string) : null

  const [user, setUser] = useState<User | null>(null)
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null)
  const [fieldReports, setFieldReports] = useState<FieldReport[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState<{ [reportId: number]: string }>({})
  const [submittingComment, setSubmittingComment] = useState<number | null>(null)
  const [selectedImage, setSelectedImage] = useState<{ url: string; filename: string } | null>(null)

  useEffect(() => {
    if (!workOrderId) {
      router.push('/lapangan/work-orders')
      return
    }
    checkAuth()
  }, [workOrderId])

  useEffect(() => {
    if (user && workOrderId) {
      loadWorkOrder()
      loadFieldReports()
    }
  }, [user, workOrderId])

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

  const loadWorkOrder = async () => {
    if (!workOrderId) return
    try {
      const wo = await workOrdersAPI.getWorkOrder(workOrderId)
      setWorkOrder(wo)
    } catch (err) {
      console.error('Failed to load work order:', err)
    }
  }

  const loadFieldReports = async () => {
    if (!workOrderId) return
    try {
      const reports = await fieldReportsAPI.listFieldReports({
        work_order_id: workOrderId,
        include_comments: true,
      })
      setFieldReports(reports || [])
    } catch (err) {
      console.error('Failed to load field reports:', err)
    }
  }

  const handleAddComment = async (reportId: number) => {
    if (!user || !newComment[reportId]?.trim()) return

    setSubmittingComment(reportId)
    try {
      const commentedBy = `${user.first_name} ${user.last_name}`
      await fieldReportsAPI.addComment(reportId, newComment[reportId], commentedBy)
      setNewComment(prev => ({ ...prev, [reportId]: '' }))
      await loadFieldReports() // Reload to get updated comments
      toast.success('Komentar berhasil ditambahkan!')
    } catch (err) {
      console.error('Failed to add comment:', err)
      toast.error('Gagal menambahkan komentar')
    } finally {
      setSubmittingComment(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: { [key: string]: { bg: string; text: string; icon: any } } = {
      'pending': { bg: 'bg-amber-100', text: 'text-amber-800', icon: AlertCircle },
      'in-progress': { bg: 'bg-blue-100', text: 'text-blue-800', icon: Clock },
      'completed': { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      'overdue': { bg: 'bg-red-100', text: 'text-red-800', icon: AlertCircle },
      'cancelled': { bg: 'bg-gray-100', text: 'text-gray-800', icon: AlertCircle },
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

  const getConditionBadge = (condition: string) => {
    const styles: { [key: string]: string } = {
      'excellent': 'bg-green-100 text-green-800 border-green-200',
      'good': 'bg-blue-100 text-blue-800 border-blue-200',
      'fair': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'poor': 'bg-red-100 text-red-800 border-red-200',
    }
    const conditionLabels: { [key: string]: string } = {
      'excellent': 'Sangat Baik',
      'good': 'Baik',
      'fair': 'Cukup',
      'poor': 'Buruk',
    }
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium border ${styles[condition] || styles.fair}`}>
        {conditionLabels[condition] || condition}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-16">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <p className="mt-4 text-gray-600">Memuat...</p>
        </div>
      </div>
    )
  }

  if (!user || !workOrder) {
    return null
  }

  return (
    <div className="min-h-screen pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-green-600 hover:text-green-700 mb-4 text-sm font-medium"
          >
            ← Kembali ke Tugas
          </button>
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{workOrder.title}</h1>
                <p className="text-sm text-gray-600 mt-1">{workOrder.category} - {workOrder.activity}</p>
              </div>
              {getStatusBadge(workOrder.status || 'pending')}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>
                  {workOrder.start_date ? formatDateOnly(workOrder.start_date) : 'Tidak tersedia'} -{' '}
                  {workOrder.end_date ? formatDateOnly(workOrder.end_date) : 'Tidak tersedia'}
                </span>
              </div>
              {workOrder.field_name && (
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>{workOrder.field_name}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-600">
                <UserIcon className="w-4 h-4" />
                <span>{workOrder.assignee}</span>
              </div>
            </div>

            {workOrder.description && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-700">{workOrder.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Field Reports */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Laporan Lapangan ({fieldReports.length})</h2>
            <button
              onClick={() => router.push(`/lapangan/work-orders/${workOrderId}/report/create`)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              + Tambah Laporan
            </button>
          </div>

          {fieldReports.length === 0 ? (
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <p className="text-gray-500">Belum ada laporan lapangan. Buat laporan untuk memulai.</p>
            </div>
          ) : (
            fieldReports.map((report) => (
              <div key={report.id} className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{report.title}</h3>
                    {report.description && (
                      <p className="text-sm text-gray-600 mt-1">{report.description}</p>
                    )}
                  </div>
                  {getConditionBadge(report.condition)}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 text-sm">
                  <div>
                    <span className="text-gray-500">Dikirim oleh:</span>
                    <span className="ml-2 font-medium text-gray-900">{report.submitted_by}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Tanggal:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {formatDateIndonesian(report.created_at)}
                    </span>
                  </div>
                  {report.coordinates && (
                    <div className="col-span-2">
                      <span className="text-gray-500">Lokasi:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {report.coordinates.latitude?.toFixed(6)}, {report.coordinates.longitude?.toFixed(6)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Media */}
                {report.media && report.media.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Media ({report.media.length})</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {report.media.map((media, idx) => {
                        // Check if it's an image (photo/image) or video
                        const isImage = media.type === 'photo' || media.type === 'image' || 
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
                              // Fallback: try to determine from URL or show as image
                              <img
                                src={mediaUrl}
                                alt={media.filename || `Media ${idx + 1}`}
                                className="w-full h-24 object-contain rounded-lg border border-gray-200 bg-gray-50 cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => setSelectedImage({ url: mediaUrl, filename: media.filename || `Media ${idx + 1}` })}
                                onError={(e) => {
                                  // If image fails, try as video
                                  const target = e.target as HTMLImageElement
                                  const video = document.createElement('video')
                                  video.src = mediaUrl
                                  video.className = target.className.replace('img', 'video')
                                  video.controls = true
                                  video.preload = 'metadata'
                                  target.parentNode?.replaceChild(video, target)
                                }}
                              />
                            ) : null}
                            <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1 rounded">
                              {isImage ? <Camera className="w-3 h-3" /> : <Video className="w-3 h-3" />}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {report.notes && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">{report.notes}</p>
                  </div>
                )}

                {/* Comments Section */}
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Komentar ({report.comments?.length || 0})
                  </h4>

                  {/* Comments List */}
                  {report.comments && report.comments.length > 0 && (
                    <div className="space-y-3 mb-4">
                      {report.comments.map((comment) => (
                        <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-start justify-between mb-1">
                            <span className="text-sm font-medium text-gray-900">{comment.commented_by}</span>
                            <span className="text-xs text-gray-500">
                              {formatDateIndonesian(comment.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{comment.comment}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Form Tambah Komentar (hanya untuk Level 1/2) */}
                  {user.role === 'Level 1' || user.role === 'Level 2' ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newComment[report.id] || ''}
                        onChange={(e) => setNewComment(prev => ({ ...prev, [report.id]: e.target.value }))}
                        placeholder="Tambah komentar..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleAddComment(report.id)
                          }
                        }}
                      />
                      <button
                        onClick={() => handleAddComment(report.id)}
                        disabled={!newComment[report.id]?.trim() || submittingComment === report.id}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submittingComment === report.id ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">Hanya pengguna Level 1 dan Level 2 yang dapat menambahkan komentar</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Image Popup Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-7xl max-h-full">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 z-10 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
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

