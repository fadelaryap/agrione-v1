'use client'

import { useState, useEffect } from 'react'
import { Camera, CheckCircle, Clock, Sun, Moon, X, AlertCircle } from 'lucide-react'
import { attendanceAPI, uploadAPI, Attendance } from '@/lib/api'
import { format } from 'date-fns'

interface AttendanceCardProps {
  onUpdate?: () => void
}

export default function AttendanceCard({ onUpdate }: AttendanceCardProps) {
  const [todayAttendance, setTodayAttendance] = useState<Attendance[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState<'pagi' | 'sore' | null>(null)
  const [showForm, setShowForm] = useState<'pagi' | 'sore' | null>(null)
  
  // Form state
  const [selfieImage, setSelfieImage] = useState<string | null>(null) // Preview URL (data URL)
  const [selfieFile, setSelfieFile] = useState<File | null>(null) // File object untuk upload
  const [backCameraImage, setBackCameraImage] = useState<string | null>(null) // Preview URL
  const [backCameraFile, setBackCameraFile] = useState<File | null>(null) // File object untuk upload
  const [hasIssue, setHasIssue] = useState<boolean>(false)
  const [description, setDescription] = useState<string>('')

  useEffect(() => {
    loadTodayAttendance()
  }, [])

  const loadTodayAttendance = async () => {
    try {
      const data = await attendanceAPI.getTodayAttendance()
      setTodayAttendance(data)
    } catch (err) {
      console.error('Failed to load attendance:', err)
    } finally {
      setLoading(false)
    }
  }


  const openForm = (session: 'pagi' | 'sore') => {
    setShowForm(session)
    setSelfieImage(null)
    setSelfieFile(null)
    setBackCameraImage(null)
    setBackCameraFile(null)
    setHasIssue(false)
    setDescription('')
  }

  const closeForm = () => {
    setShowForm(null)
    setSelfieImage(null)
    setSelfieFile(null)
    setBackCameraImage(null)
    setBackCameraFile(null)
    setHasIssue(false)
    setDescription('')
  }

  const submitAttendance = async () => {
    if (!selfieFile) {
      alert('Silakan ambil foto selfie terlebih dahulu')
      return
    }

    if (!showForm) return

    setSubmitting(showForm)
    try {
      // Upload selfie ke GCS
      const selfieURL = await uploadAPI.uploadFile(selfieFile)
      
      // Upload back camera ke GCS (jika ada)
      let backCameraURL: string | undefined
      if (backCameraFile) {
        backCameraURL = await uploadAPI.uploadFile(backCameraFile)
      }
      
      // Kirim URL ke backend
      await attendanceAPI.createAttendance({
        session: showForm,
        selfie_image: selfieURL,
        back_camera_image: backCameraURL,
        has_issue: hasIssue,
        description: description.trim() || undefined,
      })
      
      closeForm()
      await loadTodayAttendance()
      if (onUpdate) onUpdate()
      alert(`Absen ${showForm === 'pagi' ? 'Pagi' : 'Sore'} berhasil!`)
    } catch (err: any) {
      console.error('Failed to submit attendance:', err)
      alert('Gagal melakukan absen: ' + (err.response?.data?.error || err.message))
    } finally {
      setSubmitting(null)
    }
  }

  const pagiAttendance = todayAttendance.find(a => a.session === 'pagi')
  const soreAttendance = todayAttendance.find(a => a.session === 'sore')

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-lg p-6 border border-green-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-6 h-6 text-green-600" />
          Absen Harian
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Absen Pagi */}
          <div className={`bg-white rounded-lg p-4 border-2 ${
            pagiAttendance ? 'border-green-500' : 'border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sun className="w-5 h-5 text-amber-500" />
                <span className="font-semibold text-gray-900">Absen Pagi</span>
              </div>
              {pagiAttendance && (
                <CheckCircle className="w-5 h-5 text-green-600" />
              )}
            </div>
            
            {pagiAttendance ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Waktu: {format(new Date(pagiAttendance.check_in_time), 'HH:mm')}
                </p>
                {pagiAttendance.selfie_image && (
                  <img
                    src={`data:image/jpeg;base64,${pagiAttendance.selfie_image}`}
                    alt="Selfie pagi"
                    className="w-full h-32 object-cover rounded-lg border border-gray-200"
                  />
                )}
                {pagiAttendance.has_issue && (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    <span>Ada kendala</span>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => openForm('pagi')}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium hover:from-amber-600 hover:to-orange-600 transition-all flex items-center justify-center gap-2"
              >
                <Camera className="w-5 h-5" />
                Absen Pagi
              </button>
            )}
          </div>

          {/* Absen Sore */}
          <div className={`bg-white rounded-lg p-4 border-2 ${
            soreAttendance ? 'border-green-500' : 'border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Moon className="w-5 h-5 text-indigo-500" />
                <span className="font-semibold text-gray-900">Absen Sore</span>
              </div>
              {soreAttendance && (
                <CheckCircle className="w-5 h-5 text-green-600" />
              )}
            </div>
            
            {soreAttendance ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Waktu: {format(new Date(soreAttendance.check_in_time), 'HH:mm')}
                </p>
                {soreAttendance.selfie_image && (
                  <img
                    src={soreAttendance.selfie_image.startsWith('http') ? soreAttendance.selfie_image : `data:image/jpeg;base64,${soreAttendance.selfie_image}`}
                    alt="Selfie sore"
                    className="w-full h-32 object-cover rounded-lg border border-gray-200"
                  />
                )}
                {soreAttendance.has_issue && (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    <span>Ada kendala</span>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => openForm('sore')}
                className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg font-medium hover:from-indigo-600 hover:to-purple-600 transition-all flex items-center justify-center gap-2"
              >
                <Camera className="w-5 h-5" />
                Absen Sore
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                Form Absen {showForm === 'pagi' ? 'Pagi' : 'Sore'}
              </h3>
              <button
                onClick={closeForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Foto Selfie */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Foto Selfie (Kamera Depan) <span className="text-red-500">*</span>
                </label>
                {!selfieImage ? (
                  <div className="space-y-3">
                    <input
                      type="file"
                      accept="image/*"
                      capture="user"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setSelfieFile(file)
                          // Create preview
                          const reader = new FileReader()
                          reader.onload = (event) => {
                            const result = event.target?.result as string
                            setSelfieImage(result)
                          }
                          reader.readAsDataURL(file)
                        }
                        // Reset input
                        e.target.value = ''
                      }}
                      className="hidden"
                      id="selfie-input"
                    />
                    <label
                      htmlFor="selfie-input"
                      className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Camera className="w-5 h-5" />
                      Ambil Foto Selfie
                    </label>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <img
                      src={selfieImage}
                      alt="Selfie"
                      className="w-full h-48 object-cover rounded-lg border border-gray-200"
                    />
                    <input
                      type="file"
                      accept="image/*"
                      capture="user"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const reader = new FileReader()
                          reader.onload = (event) => {
                            const result = event.target?.result as string
                            setSelfieImage(result)
                          }
                          reader.readAsDataURL(file)
                        }
                        e.target.value = ''
                      }}
                      className="hidden"
                      id="selfie-input-retake"
                    />
                    <label
                      htmlFor="selfie-input-retake"
                      className="w-full py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 cursor-pointer text-center block"
                    >
                      Ambil Ulang
                    </label>
                  </div>
                )}
              </div>

              {/* Foto Kamera Belakang */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Foto Kamera Belakang (Opsional)
                </label>
                {!backCameraImage ? (
                  <div className="space-y-3">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setBackCameraFile(file)
                          // Create preview
                          const reader = new FileReader()
                          reader.onload = (event) => {
                            const result = event.target?.result as string
                            setBackCameraImage(result)
                          }
                          reader.readAsDataURL(file)
                        }
                        e.target.value = ''
                      }}
                      className="hidden"
                      id="back-camera-input"
                    />
                    <label
                      htmlFor="back-camera-input"
                      className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Camera className="w-5 h-5" />
                      Ambil Foto Kamera Belakang
                    </label>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <img
                      src={backCameraImage}
                      alt="Back camera"
                      className="w-full h-48 object-cover rounded-lg border border-gray-200"
                    />
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setBackCameraFile(file)
                          // Create preview
                          const reader = new FileReader()
                          reader.onload = (event) => {
                            const result = event.target?.result as string
                            setBackCameraImage(result)
                          }
                          reader.readAsDataURL(file)
                        }
                        e.target.value = ''
                      }}
                      className="hidden"
                      id="back-camera-input-retake"
                    />
                    <label
                      htmlFor="back-camera-input-retake"
                      className="w-full py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 cursor-pointer text-center block"
                    >
                      Ambil Ulang
                    </label>
                  </div>
                )}
              </div>

              {/* Pertanyaan Kendala */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Apakah ada kendala?
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="hasIssue"
                      checked={hasIssue === false}
                      onChange={() => setHasIssue(false)}
                      className="w-4 h-4 text-green-600"
                    />
                    <span className="text-gray-700">Tidak Ada</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="hasIssue"
                      checked={hasIssue === true}
                      onChange={() => setHasIssue(true)}
                      className="w-4 h-4 text-red-600"
                    />
                    <span className="text-gray-700">Ada Kendala</span>
                  </label>
                </div>
              </div>

              {/* Deskripsi/Keterangan */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Deskripsi / Keterangan
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Masukkan deskripsi atau keterangan (opsional)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                  rows={4}
                />
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={closeForm}
                  className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
                >
                  Batal
                </button>
                <button
                  onClick={submitAttendance}
                  disabled={!selfieFile || submitting === showForm}
                  className="flex-1 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting === showForm ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Mengirim...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Kirim Absen
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
