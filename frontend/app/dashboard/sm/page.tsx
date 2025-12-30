'use client'

import { useEffect, useState } from 'react'
import { User, fieldReportsAPI, FieldReport } from '@/lib/api'
import { 
  Inbox, 
  CheckCircle, 
  XCircle, 
  Clock,
  Check,
  X
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'

export default function SMInboxPage() {
  const [user, setUser] = useState<User | null>(null)
  const [reports, setReports] = useState<FieldReport[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Skip auth check for now
    const mockUser: User = {
      id: 9991,
      email: 'sm@agrione.dev',
      username: 'sm',
      first_name: 'Site',
      last_name: 'Manager',
      role: 'Level 2',
      status: 'approved'
    }
    setUser(mockUser)
    loadData()
    setLoading(false)
  }, [])

  const loadData = async () => {
    try {
      const reportsData = await fieldReportsAPI.listFieldReports()
      // Use mock data if API returns empty or fails
      if (!reportsData || reportsData.length === 0) {
        const mockReports: FieldReport[] = [
          {
            id: 1,
            title: 'Laporan Kondisi Tanaman - Lahan Padi A1',
            description: 'Tanaman padi dalam kondisi baik, tinggi tanaman sekitar 45 cm. Warna daun hijau segar, tidak ada tanda-tanda hama atau penyakit. Kondisi air cukup, tanah lembab.',
            condition: 'baik',
            coordinates: { latitude: -4.070, longitude: 104.160 },
            notes: 'Semua kondisi normal, monitoring rutin dilanjutkan',
            submitted_by: 'Budi Santoso (SPV)',
            work_order_id: 101,
            progress: 100,
            media: [
              {
                type: 'photo',
                url: '/api/placeholder/800/600',
                filename: 'lahan-a1-001.jpg',
                size: 2456789,
                uploadedAt: new Date(Date.now() - 3600000).toISOString()
              }
            ],
            status: 'pending',
            created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
            updated_at: new Date(Date.now() - 2 * 3600000).toISOString()
          },
          {
            id: 2,
            title: 'Temuan Hama Wereng di Lahan B2',
            description: 'Ditemukan tanda-tanda infestasi wereng coklat pada beberapa rumpun padi. Daun mulai menguning di bagian tengah. Sudah dilakukan tindakan awal dengan penyemprotan insektisida ringan.',
            condition: 'buruk',
            coordinates: { latitude: -4.075, longitude: 104.165 },
            notes: 'Perlu tindakan lanjutan untuk mencegah penyebaran',
            submitted_by: 'Ahmad Wijaya (SPV)',
            work_order_id: 102,
            progress: 60,
            media: [
              {
                type: 'photo',
                url: '/api/placeholder/800/600',
                filename: 'hama-wereng-b2.jpg',
                size: 1890234,
                uploadedAt: new Date(Date.now() - 7200000).toISOString()
              }
            ],
            status: 'pending',
            created_at: new Date(Date.now() - 4 * 3600000).toISOString(),
            updated_at: new Date(Date.now() - 4 * 3600000).toISOString()
          },
          {
            id: 3,
            title: 'Laporan Pemupukan - Lahan C3',
            description: 'Pemupukan tahap kedua sudah selesai dilakukan. Dosis sesuai rekomendasi: Urea 150 kg/ha, SP-36 100 kg/ha, KCl 75 kg/ha. Tanaman merespon baik dengan pertumbuhan yang optimal.',
            condition: 'baik',
            coordinates: { latitude: -4.080, longitude: 104.155 },
            notes: 'Kondisi tanaman setelah pemupukan sangat baik',
            submitted_by: 'Siti Nurhaliza (SPV)',
            work_order_id: 103,
            progress: 100,
            media: [],
            status: 'pending',
            created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
            updated_at: new Date(Date.now() - 5 * 3600000).toISOString()
          },
          {
            id: 4,
            title: 'Kondisi Air Berkurang - Lahan D4',
            description: 'Level air di sawah mulai menurun. Saluran irigasi tersumbat oleh sampah dan tanah. Perlu pembersihan saluran segera untuk menjaga ketersediaan air.',
            condition: 'sedang',
            coordinates: { latitude: -4.085, longitude: 104.172 },
            notes: 'Sudah dilakukan pembersihan sebagian, butuh bantuan untuk area yang lebih besar',
            submitted_by: 'Joko Widodo (SPV)',
            work_order_id: 104,
            progress: 40,
            media: [
              {
                type: 'photo',
                url: '/api/placeholder/800/600',
                filename: 'saluran-irigasi-d4.jpg',
                size: 2100567,
                uploadedAt: new Date(Date.now() - 1800000).toISOString()
              }
            ],
            status: 'pending',
            created_at: new Date(Date.now() - 1800000).toISOString(),
            updated_at: new Date(Date.now() - 1800000).toISOString()
          },
          {
            id: 5,
            title: 'Laporan Rutin - Lahan E5',
            description: 'Monitoring rutin mingguan. Tanaman padi berusia 35 HST, fase vegetatif aktif. Tinggi tanaman rata-rata 42 cm, warna daun hijau tua. Kondisi air optimal, tidak ada gangguan hama atau penyakit.',
            condition: 'baik',
            coordinates: { latitude: -4.090, longitude: 104.158 },
            notes: 'Semua parameter dalam batas normal',
            submitted_by: 'Dewi Sartika (SPV)',
            work_order_id: 105,
            progress: 100,
            media: [],
            status: 'pending',
            created_at: new Date(Date.now() - 10800000).toISOString(),
            updated_at: new Date(Date.now() - 10800000).toISOString()
          },
          {
            id: 6,
            title: 'Penyemprotan Pestisida - Lahan F6',
            description: 'Penyemprotan pestisida preventif sudah dilakukan sesuai jadwal. Menggunakan pestisida sistemik untuk pencegahan hama wereng dan penggerek batang. Cuaca cerah, kondisi optimal untuk penyemprotan.',
            condition: 'baik',
            coordinates: { latitude: -4.095, longitude: 104.162 },
            notes: 'Tidak ada efek samping yang terlihat pada tanaman',
            submitted_by: 'Muhammad Rizki (SPV)',
            work_order_id: 106,
            progress: 100,
            media: [
              {
                type: 'photo',
                url: '/api/placeholder/800/600',
                filename: 'penyemprotan-f6.jpg',
                size: 1987654,
                uploadedAt: new Date(Date.now() - 5400000).toISOString()
              }
            ],
            status: 'pending',
            created_at: new Date(Date.now() - 5400000).toISOString(),
            updated_at: new Date(Date.now() - 5400000).toISOString()
          },
          {
            id: 7,
            title: 'Gangguan Burung di Lahan G7',
            description: 'Aktivitas burung meningkat di area sawah. Beberapa rumpun padi mulai rusak karena dimakan burung. Sudah dipasang alat pengusir burung (scarecrow) namun masih perlu monitoring lebih intensif.',
            condition: 'sedang',
            coordinates: { latitude: -4.100, longitude: 104.168 },
            notes: 'Mungkin perlu tambahan pengusir burung atau jaring pelindung',
            submitted_by: 'Ayu Lestari (SPV)',
            work_order_id: 107,
            progress: 70,
            media: [
              {
                type: 'photo',
                url: '/api/placeholder/800/600',
                filename: 'gangguan-burung-g7.jpg',
                size: 1765432,
                uploadedAt: new Date(Date.now() - 9000000).toISOString()
              }
            ],
            status: 'pending',
            created_at: new Date(Date.now() - 9000000).toISOString(),
            updated_at: new Date(Date.now() - 9000000).toISOString()
          },
          {
            id: 8,
            title: 'Laporan Panen - Lahan H8',
            description: 'Panen tahap pertama sudah selesai. Hasil panen 6.2 ton/ha, sedikit di bawah target 6.5 ton/ha. Kualitas gabah baik dengan kadar air 18%. Sudah dilakukan pengeringan awal.',
            condition: 'baik',
            coordinates: { latitude: -4.105, longitude: 104.155 },
            notes: 'Hasil panen memuaskan, kualitas gabah bagus',
            submitted_by: 'Bambang Sutrisno (SPV)',
            work_order_id: 108,
            progress: 95,
            media: [
              {
                type: 'photo',
                url: '/api/placeholder/800/600',
                filename: 'panen-h8-001.jpg',
                size: 2234567,
                uploadedAt: new Date(Date.now() - 12600000).toISOString()
              },
              {
                type: 'photo',
                url: '/api/placeholder/800/600',
                filename: 'panen-h8-002.jpg',
                size: 2012345,
                uploadedAt: new Date(Date.now() - 12600000).toISOString()
              }
            ],
            status: 'pending',
            created_at: new Date(Date.now() - 12600000).toISOString(),
            updated_at: new Date(Date.now() - 12600000).toISOString()
          }
        ]
        setReports(mockReports)
      } else {
        setReports(reportsData)
      }
    } catch (err) {
      console.error('Failed to load data:', err)
      // On error, use mock data
      const mockReports: FieldReport[] = [
        {
          id: 1,
          title: 'Laporan Kondisi Tanaman - Lahan Padi A1',
          description: 'Tanaman padi dalam kondisi baik, tinggi tanaman sekitar 45 cm. Warna daun hijau segar, tidak ada tanda-tanda hama atau penyakit.',
          condition: 'baik',
          coordinates: { latitude: -4.070, longitude: 104.160 },
          notes: 'Semua kondisi normal',
          submitted_by: 'Budi Santoso (SPV)',
          work_order_id: 101,
          progress: 100,
          media: [],
          status: 'pending',
          created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
          updated_at: new Date(Date.now() - 2 * 3600000).toISOString()
        },
        {
          id: 2,
          title: 'Temuan Hama Wereng di Lahan B2',
          description: 'Ditemukan tanda-tanda infestasi wereng coklat pada beberapa rumpun padi. Sudah dilakukan tindakan awal.',
          condition: 'buruk',
          coordinates: { latitude: -4.075, longitude: 104.165 },
          notes: 'Perlu tindakan lanjutan',
          submitted_by: 'Ahmad Wijaya (SPV)',
          work_order_id: 102,
          progress: 60,
          media: [],
          status: 'pending',
          created_at: new Date(Date.now() - 4 * 3600000).toISOString(),
          updated_at: new Date(Date.now() - 4 * 3600000).toISOString()
        }
      ]
      setReports(mockReports)
    }
  }

  const handleApproveReport = async (reportId: number) => {
    try {
      await fieldReportsAPI.approveFieldReport(reportId, user?.email || '')
      toast.success('Laporan disetujui')
      loadData()
    } catch (err: any) {
      toast.error('Gagal menyetujui laporan: ' + (err.response?.data?.error || err.message))
    }
  }

  const handleRejectReport = async (reportId: number, reason: string) => {
    try {
      await fieldReportsAPI.rejectFieldReport(reportId, user?.email || '', reason)
      toast.success('Laporan ditolak')
      loadData()
    } catch (err: any) {
      toast.error('Gagal menolak laporan: ' + (err.response?.data?.error || err.message))
    }
  }

  const reportsByStatus = {
    pending: reports.filter(r => r.status === 'pending'),
    approved: reports.filter(r => r.status === 'approved'),
    rejected: reports.filter(r => r.status === 'rejected')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Memuat...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl shadow-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Inbox Laporan SPV</h1>
            <p className="text-indigo-100">
              Validasi dan review laporan dari Supervisor • {format(new Date(), 'EEEE, dd MMMM yyyy')}
            </p>
          </div>
          <Inbox className="w-12 h-12 text-indigo-200" />
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-amber-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Menunggu Validasi</p>
              <p className="text-2xl font-bold text-gray-900">{reportsByStatus.pending.length}</p>
            </div>
            <Clock className="w-8 h-8 text-amber-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Disetujui</p>
              <p className="text-2xl font-bold text-gray-900">{reportsByStatus.approved.length}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ditolak</p>
              <p className="text-2xl font-bold text-gray-900">{reportsByStatus.rejected.length}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Pending Reports */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Menunggu Validasi ({reportsByStatus.pending.length})
        </h2>
        <div className="space-y-3">
          {reportsByStatus.pending.slice(0, 20).map(report => (
            <div key={report.id} className="border-2 border-amber-200 bg-amber-50 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-gray-900">{report.title}</h4>
                    <span className="px-2 py-1 bg-amber-200 text-amber-800 rounded-full text-xs font-medium">
                      Baru
                    </span>
                    {report.condition && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        report.condition === 'baik' ? 'bg-green-200 text-green-800' :
                        report.condition === 'sedang' ? 'bg-yellow-200 text-yellow-800' :
                        'bg-red-200 text-red-800'
                      }`}>
                        {report.condition}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{report.description || 'Tidak ada deskripsi'}</p>
                  {report.notes && (
                    <p className="text-sm text-gray-500 italic mb-2">Catatan: {report.notes}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    Dari: {report.submitted_by} • {format(parseISO(report.created_at), 'dd MMM yyyy HH:mm')}
                  </p>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleApproveReport(report.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Setujui
                  </button>
                  <button
                    onClick={() => {
                      const reason = prompt('Alasan penolakan:')
                      if (reason) handleRejectReport(report.id, reason)
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Tolak
                  </button>
                </div>
              </div>
            </div>
          ))}
          {reportsByStatus.pending.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Inbox className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">Tidak ada laporan yang menunggu validasi</p>
              <p className="text-sm mt-2">Semua laporan sudah diproses</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
