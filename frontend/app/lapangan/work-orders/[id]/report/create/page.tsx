'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { authAPI, User, workOrdersAPI, WorkOrder, fieldReportsAPI, FieldReport, uploadAPI } from '@/lib/api'
import { Camera, Video, MapPin, ArrowLeft, X } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'

export default function CreateReportPage() {
  const router = useRouter()
  const params = useParams()
  const workOrderId = params?.id ? parseInt(params.id as string) : null

  const [user, setUser] = useState<User | null>(null)
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    condition: 'good' as 'excellent' | 'good' | 'fair' | 'poor',
    notes: '',
    coordinates: { latitude: 0, longitude: 0 },
    progress: 0, // Progress percentage for work order (0-100)
  })
  
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [gpsPermission, setGpsPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt')
  const [gpsRequested, setGpsRequested] = useState(false)

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
    }
  }, [user, workOrderId])

  useEffect(() => {
    if (workOrder) {
      // Set progress dari work order terakhir
      setFormData(prev => ({ ...prev, progress: workOrder.progress || 0 }))
    }
  }, [workOrder])

  // Auto-get GPS location when form is ready
  useEffect(() => {
    if (user && workOrder && !gpsRequested && formData.coordinates.latitude === 0 && formData.coordinates.longitude === 0) {
      getCurrentLocation()
    }
  }, [user, workOrder])


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
      // Pre-fill title with work order title
      setFormData(prev => ({ ...prev, title: wo.title || '' }))
    } catch (err) {
      console.error('Failed to load work order:', err)
    }
  }

  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setGpsPermission('denied')
      toast.error('GPS tidak didukung di browser ini')
      return
    }

    setGpsRequested(true)
    
    // For Safari, we need to check permission first and show proper error
    if ('permissions' in navigator) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName })
        
        // Listen for permission changes
        permission.onchange = () => {
          if (permission.state === 'granted') {
            // Retry getting location if permission was granted
            navigator.geolocation.getCurrentPosition(
              (position) => {
                setGpsPermission('granted')
                setFormData(prev => ({
                  ...prev,
                  coordinates: {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                  },
                }))
                toast.success('Lokasi berhasil didapatkan')
              },
              (error) => {
                setGpsPermission('denied')
                console.log('GPS error after permission granted:', error.message)
              },
              {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
              }
            )
          } else if (permission.state === 'denied') {
            setGpsPermission('denied')
            toast.error('Akses GPS ditolak. Silakan aktifkan di pengaturan browser.')
          }
        }
        
        if (permission.state === 'denied') {
          setGpsPermission('denied')
          toast.error('Akses GPS ditolak. Silakan aktifkan di pengaturan browser.')
          return
        }
      } catch (err) {
        // Permissions API not supported or error, continue with getCurrentPosition
        console.log('Permissions API error:', err)
      }
    }

    // Request location (this will trigger permission prompt in Safari if needed)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsPermission('granted')
        setFormData(prev => ({
          ...prev,
          coordinates: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
        }))
        toast.success('Lokasi berhasil didapatkan')
      },
      (error) => {
        setGpsPermission('denied')
        console.log('GPS access denied:', error.message)
        if (error.code === error.PERMISSION_DENIED) {
          toast.error('Akses GPS ditolak. Silakan aktifkan di pengaturan browser. Di Safari, pastikan untuk mengizinkan akses lokasi saat diminta.')
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          toast.error('Lokasi tidak tersedia')
        } else if (error.code === error.TIMEOUT) {
          toast.error('Timeout saat mendapatkan lokasi. Silakan coba lagi.')
        } else {
          toast.error('Gagal mendapatkan lokasi')
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000, // Increase timeout for Safari
        maximumAge: 0
      }
    )
  }


  const removeMediaFile = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index))
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title || !formData.description || !workOrderId || !user) {
      toast.error('Harap isi semua field yang wajib diisi')
      return
    }

    setSubmitting(true)
    try {
      // Upload media files to GCS
      const mediaUrls: any[] = []
      
      for (const file of mediaFiles) {
        try {
          // Upload to GCS
          const url = await uploadAPI.uploadFile(file)
          
          mediaUrls.push({
            filename: file.name,
            type: file.type.startsWith('image/') ? 'image' : 'video',
            size: file.size,
            url: url, // GCS URL
            uploaded_at: new Date().toISOString(),
          })
        } catch (err) {
          console.error('Failed to upload file to GCS:', err)
          toast.error(`Gagal upload file ${file.name}. Silakan coba lagi.`)
          setSubmitting(false)
          return
        }
      }

      const reportData: Partial<FieldReport> = {
        title: formData.title,
        description: formData.description,
        condition: formData.condition,
        coordinates: formData.coordinates,
        notes: formData.notes || undefined,
        submitted_by: `${user.first_name} ${user.last_name}`,
        work_order_id: workOrderId,
        media: mediaUrls,
        progress: formData.progress, // Include progress in report
      }

      await fieldReportsAPI.createFieldReport(reportData)
      
      // Note: Progress is already updated in backend when creating report
      
      toast.success('Laporan berhasil dibuat!')
      router.push(`/lapangan/work-orders/${workOrderId}/report`)
    } catch (err: any) {
      console.error('Failed to create report:', err)
      toast.error('Gagal membuat laporan: ' + (err.response?.data?.error || err.message))
    } finally {
      setSubmitting(false)
    }
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
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-green-600 hover:text-green-700 mb-4 text-sm font-medium flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </button>
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Buat Laporan Lapangan</h1>
            <p className="text-sm text-gray-600 mt-1">Tugas: {workOrder.title}</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-4 sm:p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Judul <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-gray-50"
              required
              readOnly
              title="Judul tidak dapat diubah karena sudah terikat dengan work order"
            />
            <p className="text-xs text-gray-500 mt-1">Judul mengikuti work order dan tidak dapat diubah</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deskripsi <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kondisi <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.condition}
              onChange={(e) => setFormData(prev => ({ ...prev, condition: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
              required
            >
              <option value="excellent">Sangat Baik</option>
              <option value="good">Baik</option>
              <option value="fair">Cukup</option>
              <option value="poor">Buruk</option>
            </select>
          </div>

          {/* Media Capture - Camera Only */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Foto/Video <span className="text-red-500">*</span>
              <span className="text-xs text-gray-500 ml-2">(Hanya kamera - tidak ada upload file)</span>
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <div className="text-center space-y-4">
                <div className="flex justify-center gap-4">
                  <Camera className="w-8 h-8 text-gray-400" />
                  <Video className="w-8 h-8 text-gray-400" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-900">Gunakan Kamera untuk Mengambil Foto/Video</p>
                  <p className="text-xs text-gray-500">
                    Klik tombol di bawah untuk membuka aplikasi kamera bawaan HP. Upload file dinonaktifkan untuk mencegah pemalsuan data.
                  </p>
                </div>
                <div className="flex justify-center gap-3 flex-wrap">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setMediaFiles(prev => [...prev, file])
                      }
                      e.target.value = ''
                    }}
                    className="hidden"
                    id="photo-input"
                  />
                  <label
                    htmlFor="photo-input"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-2 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    Ambil Foto
                  </label>
                  
                  <input
                    type="file"
                    accept="video/*"
                    capture="environment"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setMediaFiles(prev => [...prev, file])
                      }
                      e.target.value = ''
                    }}
                    className="hidden"
                    id="video-input"
                  />
                  <label
                    htmlFor="video-input"
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium flex items-center gap-2 cursor-pointer"
                  >
                    <Video className="w-4 h-4" />
                    Ambil Video
                  </label>
                </div>
              </div>
            </div>

            {/* Display uploaded files */}
            {mediaFiles.length > 0 && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {mediaFiles.map((file, index) => (
                  <div key={index} className="relative">
                    {file.type.startsWith('image/') ? (
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="w-full h-24 object-contain rounded-lg border border-gray-200 bg-gray-50"
                      />
                    ) : (
                      <video
                        src={URL.createObjectURL(file)}
                        className="w-full h-24 object-contain rounded-lg border border-gray-200 bg-gray-50"
                        controls={false}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => removeMediaFile(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* GPS Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status Lokasi</label>
            {!gpsRequested && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <MapPin className="w-4 h-4 text-blue-600 animate-pulse" />
                  <p className="text-sm text-blue-700">Mendapatkan lokasi GPS...</p>
                </div>
              </div>
            )}
            {gpsPermission === 'denied' && gpsRequested && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                  <MapPin className="w-4 h-4 text-red-600" />
                  <p className="text-sm text-red-600">
                    Akses GPS ditolak. Silakan aktifkan di pengaturan browser.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                  Coba Lagi
                </button>
              </div>
            )}
            {gpsPermission === 'granted' && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
                <MapPin className="w-4 h-4 text-green-600" />
                <p className="text-sm text-green-600">
                  Akses GPS diberikan. Lokasi: {formData.coordinates.latitude.toFixed(6)}, {formData.coordinates.longitude.toFixed(6)}
                </p>
              </div>
            )}
            {gpsPermission === 'prompt' && gpsRequested && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                <MapPin className="w-4 h-4 text-yellow-600" />
                <p className="text-sm text-yellow-600">
                  Meminta izin GPS...
                </p>
              </div>
            )}
          </div>

          {/* Progress */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Progress Tugas <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max="100"
                value={formData.progress}
                onChange={(e) => setFormData(prev => ({ ...prev, progress: parseInt(e.target.value) }))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">0%</span>
                <span className="text-sm font-semibold text-green-600">{formData.progress}%</span>
                <span className="text-xs text-gray-500">100%</span>
              </div>
              <p className="text-xs text-gray-500">
                Tentukan progress penyelesaian tugas berdasarkan laporan ini.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catatan (Opsional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="Catatan tambahan..."
            />
          </div>

          <div className="flex gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {submitting ? 'Mengirim...' : 'Kirim Laporan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

