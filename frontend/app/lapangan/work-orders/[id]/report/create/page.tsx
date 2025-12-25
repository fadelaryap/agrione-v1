'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { authAPI, User, workOrdersAPI, WorkOrder, fieldReportsAPI, FieldReport } from '@/lib/api'
import { Camera, Video, MapPin, ArrowLeft, X } from 'lucide-react'
import { format, parseISO } from 'date-fns'

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
  const [isMobile, setIsMobile] = useState(false)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!workOrderId) {
      router.push('/lapangan/work-orders')
      return
    }
    checkAuth()
    checkDevice()
  }, [workOrderId])

  useEffect(() => {
    if (user && workOrderId) {
      loadWorkOrder()
      getCurrentLocation()
    }
  }, [user, workOrderId])

  const checkDevice = () => {
    const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    setIsMobile(mobile)
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

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
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
        },
        (error) => {
          setGpsPermission('denied')
          console.log('GPS access denied:', error.message)
        }
      )
    } else {
      setGpsPermission('denied')
    }
  }

  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Use back camera on mobile
        audio: false,
      })
      setCameraStream(stream)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      console.error('Error accessing camera:', err)
      alert('Failed to access camera. Please allow camera permission.')
    }
  }

  // Stop camera
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop())
      setCameraStream(null)
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  // Capture photo from camera
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(video, 0, 0)
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' })
          setMediaFiles(prev => [...prev, file])
        }
      }, 'image/jpeg', 0.9)
    }
  }

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])

  // Start video recording
  const startVideoRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: true,
      })
      setCameraStream(stream)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      // Setup MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8,opus',
      })
      mediaRecorderRef.current = mediaRecorder
      recordedChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' })
        const file = new File([blob], `video-${Date.now()}.webm`, { type: 'video/webm' })
        setMediaFiles(prev => [...prev, file])
        recordedChunksRef.current = []
      }

      mediaRecorder.start()
      setIsCapturing(true)
    } catch (err) {
      console.error('Error accessing camera for video:', err)
      alert('Failed to access camera. Please allow camera permission.')
    }
  }

  // Stop video recording
  const stopVideoRecording = () => {
    if (mediaRecorderRef.current && isCapturing) {
      mediaRecorderRef.current.stop()
      setIsCapturing(false)
    }
    // Don't stop camera stream here, let user continue taking photos
  }

  const removeMediaFile = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index))
  }

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera()
      stopVideoRecording()
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title || !formData.description || !workOrderId || !user) {
      alert('Please fill in all required fields')
      return
    }

    setSubmitting(true)
    try {
      // Convert media files to base64 for now (in production, upload to GCS)
      const mediaUrls: any[] = []
      
      for (const file of mediaFiles) {
        try {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
              const result = reader.result as string
              // Remove data:image/jpeg;base64, prefix if present
              const base64Data = result.includes(',') ? result.split(',')[1] : result
              resolve(base64Data)
            }
            reader.onerror = reject
            reader.readAsDataURL(file)
          })

          mediaUrls.push({
            filename: file.name,
            type: file.type.startsWith('image/') ? 'image' : 'video',
            size: file.size,
            data: base64, // Base64 data (in production, this would be GCS URL)
            uploaded_at: new Date().toISOString(),
            // In production, you would upload to GCS and store the URL here:
            // url: `https://storage.googleapis.com/your-bucket/${file.name}`
          })
        } catch (err) {
          console.error('Failed to convert file to base64:', err)
          // Continue with other files
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
      
      router.push(`/lapangan/work-orders/${workOrderId}/report`)
    } catch (err: any) {
      console.error('Failed to create report:', err)
      alert('Failed to create report: ' + (err.response?.data?.error || err.message))
    } finally {
      setSubmitting(false)
    }
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
            Back
          </button>
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Create Field Report</h1>
            <p className="text-sm text-gray-600 mt-1">Work Order: {workOrder.title}</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-4 sm:p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
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
              Condition <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.condition}
              onChange={(e) => setFormData(prev => ({ ...prev, condition: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
              required
            >
              <option value="excellent">Excellent</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="poor">Poor</option>
            </select>
          </div>

          {/* Media Capture - Camera Only */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photos/Videos <span className="text-red-500">*</span>
              <span className="text-xs text-gray-500 ml-2">(Camera only - no file upload)</span>
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              {/* Camera Preview */}
              {cameraStream && (
                <div className="mb-4">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full max-w-md mx-auto rounded-lg border border-gray-200"
                    style={{ maxHeight: '400px' }}
                  />
                  <canvas ref={canvasRef} className="hidden" />
                </div>
              )}

              <div className="text-center space-y-4">
                {!cameraStream ? (
                  <>
                    <div className="flex justify-center gap-4">
                      <Camera className="w-8 h-8 text-gray-400" />
                      <Video className="w-8 h-8 text-gray-400" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-900">Use Camera to Capture Media</p>
                      <p className="text-xs text-gray-500">
                        Click below to start camera. File upload is disabled to prevent data falsification.
                      </p>
                    </div>
                    <div className="flex justify-center gap-3">
                      <button
                        type="button"
                        onClick={startCamera}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium flex items-center gap-2"
                      >
                        <Camera className="w-4 h-4" />
                        Start Camera
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-center gap-3">
                      <button
                        type="button"
                        onClick={capturePhoto}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-2"
                      >
                        <Camera className="w-4 h-4" />
                        Capture Photo
                      </button>
                      {!isCapturing ? (
                        <button
                          type="button"
                          onClick={startVideoRecording}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium flex items-center gap-2"
                        >
                          <Video className="w-4 h-4" />
                          Start Video
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={stopVideoRecording}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium flex items-center gap-2"
                        >
                          <Video className="w-4 h-4" />
                          Stop Video
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-medium"
                      >
                        Stop Camera
                      </button>
                    </div>
                  </div>
                )}
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
                        className="w-full h-24 object-cover rounded-lg border border-gray-200"
                      />
                    ) : (
                      <video
                        src={URL.createObjectURL(file)}
                        className="w-full h-24 object-cover rounded-lg border border-gray-200"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Location Status</label>
            {gpsPermission === 'denied' && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                <MapPin className="w-4 h-4 text-red-600" />
                <p className="text-sm text-red-600">
                  GPS access denied. Location will not be automatically detected.
                </p>
              </div>
            )}
            {gpsPermission === 'granted' && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
                <MapPin className="w-4 h-4 text-green-600" />
                <p className="text-sm text-green-600">
                  GPS access granted. Location: {formData.coordinates.latitude.toFixed(6)}, {formData.coordinates.longitude.toFixed(6)}
                </p>
              </div>
            )}
            {gpsPermission === 'prompt' && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                <MapPin className="w-4 h-4 text-yellow-600" />
                <p className="text-sm text-yellow-600">
                  Requesting GPS permission...
                </p>
              </div>
            )}
          </div>

          {/* Progress */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Work Order Progress <span className="text-red-500">*</span>
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
                Set the completion progress for this work order based on this report.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="Additional notes..."
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
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

