'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authAPI, User, fieldReportsAPI, FieldReport } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { FileText, CheckCircle, XCircle, Clock, Calendar, MapPin, User as UserIcon, Camera, Video, X } from 'lucide-react'
import { toast } from 'sonner'
import { formatDateIndonesian, formatDateOnly } from '@/lib/dateUtils'
import { wsClient } from '@/lib/websocket'

export default function FieldReportsApprovalPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [reports, setReports] = useState<FieldReport[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [selectedImage, setSelectedImage] = useState<{ url: string; filename: string } | null>(null)
  const [rejectingId, setRejectingId] = useState<number | null>(null)
  const [rejectionReason, setRejectionReason] = useState<string>('')

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (user) {
      loadReports()
    }
  }, [user, filter])

  // WebSocket real-time updates for new reports
  useEffect(() => {
    if (!user) return

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) return

    // Create callback function
    const handleNotification = (notification: any) => {
      // If it's a new field report notification, reload reports
      if (notification.type === 'field_report_pending' || notification.type === 'field_report_comment') {
        loadReports()
        toast.info(notification.title, {
          description: notification.message,
          duration: 5000,
        })
      }
    }

    if (!wsClient.isConnected()) {
      wsClient.connect(token, {
        onNotification: handleNotification,
        onError: (error) => {
          console.error('WebSocket error:', error)
        },
        onClose: () => {
          console.log('WebSocket closed')
        }
      })
    } else {
      // Update callbacks if already connected
      wsClient.updateCallbacks({
        onNotification: handleNotification,
        onError: (error) => {
          console.error('WebSocket error:', error)
        },
        onClose: () => {
          console.log('WebSocket closed')
        }
      })
    }
  }, [user])

  const checkAuth = async () => {
    try {
      const profile = await authAPI.getProfile()
      if (profile.role !== 'Level 1' && profile.role !== 'Level 2') {
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

  const loadReports = async () => {
    try {
      const data = await fieldReportsAPI.listFieldReports({ include_comments: true })
      setReports(data || [])
    } catch (err) {
      console.error('Failed to load reports:', err)
      setReports([])
    }
  }

  const filteredReports = reports.filter(report => {
    if (filter === 'all') return true
    return report.status === filter
  })

  const handleApprove = async (reportId: number) => {
    if (!user) return

    try {
      const approvedBy = `${user.first_name} ${user.last_name}`
      await fieldReportsAPI.approveFieldReport(reportId, approvedBy)
      toast.success('Laporan berhasil disetujui!')
      await loadReports()
    } catch (err: any) {
      console.error('Failed to approve report:', err)
      toast.error('Gagal menyetujui laporan: ' + (err.response?.data?.error || err.message))
    }
  }

  const handleReject = async (reportId: number) => {
    if (!user || !rejectionReason.trim()) {
      toast.error('Alasan penolakan harus diisi')
      return
    }

    try {
      const rejectedBy = `${user.first_name} ${user.last_name}`
      await fieldReportsAPI.rejectFieldReport(reportId, rejectedBy, rejectionReason)
      toast.success('Laporan berhasil ditolak!')
      setRejectingId(null)
      setRejectionReason('')
      await loadReports()
    } catch (err: any) {
      console.error('Failed to reject report:', err)
      toast.error('Gagal menolak laporan: ' + (err.response?.data?.error || err.message))
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: { [key: string]: { bg: string; text: string; icon: any } } = {
      'pending': { bg: 'bg-amber-100', text: 'text-amber-800', icon: Clock },
      'approved': { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      'rejected': { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
    }
    const style = styles[status] || styles.pending
    const Icon = style.icon

    const statusLabels: { [key: string]: string } = {
      'pending': 'Menunggu',
      'approved': 'Disetujui',
      'rejected': 'Ditolak',
    }
    
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
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
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">Memuat...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!user) {
    return null
  }

  return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8">
        {/* Header */}
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="h-8 w-8 text-indigo-600" />
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Persetujuan Laporan Lapangan</h1>
                <p className="text-gray-600 mt-1">Tinjau dan setujui atau tolak laporan lapangan</p>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 flex-wrap">
              {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === f
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {f === 'all' ? 'Semua' : f === 'pending' ? 'Menunggu' : f === 'approved' ? 'Disetujui' : 'Ditolak'}
                  {f !== 'all' && (
                    <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">
                      {reports.filter(r => r.status === f).length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Reports List */}
        {filteredReports.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Tidak Ada Laporan</h2>
            <p className="text-gray-600">
              {filter === 'pending' 
                ? 'Tidak ada laporan yang menunggu persetujuan.' 
                : `Tidak ada laporan dengan status "${filter}".`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReports.map((report) => (
              <div key={report.id} className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{report.title}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDateIndonesian(report.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <UserIcon className="w-4 h-4" />
                        {report.submitted_by}
                      </span>
                      {report.coordinates && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {report.coordinates.latitude?.toFixed(4)}, {report.coordinates.longitude?.toFixed(4)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(report.status)}
                    {getConditionBadge(report.condition)}
                  </div>
                </div>

                {report.description && (
                  <p className="text-gray-700 mb-4">{report.description}</p>
                )}

                {/* Media */}
                {report.media && report.media.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Media ({report.media.length})</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {report.media.map((media, idx) => {
                        // Check if it's an image (photo) or video
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

                {/* Approval Info */}
                {report.status === 'approved' && report.approved_by && (
                  <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-800">
                      <strong>Disetujui oleh:</strong> {report.approved_by}
                      {report.approved_at && ` pada ${formatDateIndonesian(report.approved_at)}`}
                    </p>
                  </div>
                )}

                {report.status === 'rejected' && report.approved_by && (
                  <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm text-red-800 mb-1">
                      <strong>Ditolak oleh:</strong> {report.approved_by}
                      {report.approved_at && ` pada ${formatDateIndonesian(report.approved_at)}`}
                    </p>
                    {report.rejection_reason && (
                      <p className="text-sm text-red-700">
                        <strong>Alasan:</strong> {report.rejection_reason}
                      </p>
                    )}
                  </div>
                )}

                {/* Approval Actions */}
                {report.status === 'pending' && (
                  <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                    {rejectingId === report.id ? (
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Alasan Penolakan <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Masukkan alasan penolakan..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setRejectingId(null)
                              setRejectionReason('')
                            }}
                            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium"
                          >
                            Batal
                          </button>
                          <button
                            onClick={() => handleReject(report.id)}
                            disabled={!rejectionReason.trim()}
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                          >
                            Tolak
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(report.id)}
                          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium flex items-center justify-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Setujui
                        </button>
                        <button
                          onClick={() => setRejectingId(report.id)}
                          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium flex items-center justify-center gap-2"
                        >
                          <XCircle className="w-4 h-4" />
                          Tolak
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
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
    </DashboardLayout>
  )
}

