'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { authAPI, User, fieldReportsAPI, FieldReport, fieldsAPI, Field } from '@/lib/api'
import { 
  Inbox, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  TrendingUp,
  Calendar,
  MapPin,
  FileText,
  Send,
  Clock,
  Check,
  X,
  ArrowUp,
  Users,
  BarChart3,
  Sparkles,
  Lightbulb
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'

// Mock data untuk PM recommendations
interface PMRecommendation {
  id: string
  title: string
  urgency: 'low' | 'medium' | 'high'
  affectedAreas: string[]
  rationale: string
  recommendedAction: string
  impact: string
  generatedAt: string
}

// Mock data untuk site summary
interface SiteSummary {
  totalFields: number
  healthyFields: number
  stressedFields: number
  plantingPhases: {
    olahTanah: number
    vegetatif: number
    generatif: number
    panen: number
  }
  pestCases: number
  scheduleDeviations: number
}

export default function SMDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [reports, setReports] = useState<FieldReport[]>([])
  const [fields, setFields] = useState<Field[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState<'inbox' | 'site' | 'recommendations' | 'timeline'>('inbox')

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
    
    // Original auth check (commented out for development)
    /*
    checkAuth()
    const checkAuth = async () => {
      try {
        const profile = await authAPI.getProfile()
        if (profile.role !== 'Level 1' && profile.role !== 'Level 2') {
          router.push('/dashboard')
          return
        }
        setUser(profile)
        await loadData()
      } catch (err) {
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }
    */
  }, [])

  const loadData = async () => {
    try {
      const [reportsData, fieldsData] = await Promise.all([
        fieldReportsAPI.listFieldReports(),
        fieldsAPI.listFields()
      ])
      setReports(reportsData || [])
      setFields(fieldsData || [])
    } catch (err) {
      console.error('Failed to load data:', err)
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

  // Mock site summary
  const siteSummary: SiteSummary = useMemo(() => {
    return {
      totalFields: fields.length,
      healthyFields: Math.floor(fields.length * 0.75),
      stressedFields: Math.floor(fields.length * 0.15),
      plantingPhases: {
        olahTanah: 5,
        vegetatif: 12,
        generatif: 8,
        panen: 3
      },
      pestCases: 3,
      scheduleDeviations: 2
    }
  }, [fields])

  // Mock PM recommendations
  const pmRecommendations: PMRecommendation[] = useMemo(() => {
    return [
      {
        id: '1',
        title: 'Peningkatan Irigasi untuk Lahan Stres',
        urgency: 'high',
        affectedAreas: ['Lahan A1', 'Lahan A2', 'Lahan B3'],
        rationale: 'NDVI menunjukkan tanda-tanda stres air pada 15% lahan',
        recommendedAction: 'Tingkatkan frekuensi irigasi 2x per hari selama 5 hari',
        impact: 'Dapat mencegah penurunan hasil 10-15%',
        generatedAt: new Date().toISOString()
      },
      {
        id: '2',
        title: 'Aplikasi Pestisida untuk Wereng',
        urgency: 'medium',
        affectedAreas: ['Lahan C1', 'Lahan C2'],
        rationale: 'Laporan SPV menunjukkan infestasi wereng tingkat sedang',
        recommendedAction: 'Aplikasi pestisida sistemik pada lahan terdampak',
        impact: 'Mencegah kerusakan daun dan penurunan hasil',
        generatedAt: new Date(Date.now() - 86400000).toISOString()
      }
    ]
  }, [])

  // Group reports by status
  const reportsByStatus = useMemo(() => {
    return {
      pending: reports.filter(r => r.status === 'pending'),
      approved: reports.filter(r => r.status === 'approved'),
      rejected: reports.filter(r => r.status === 'rejected')
    }
  }, [reports])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Memuat...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-xl p-6 text-white">
            <h1 className="text-3xl font-bold mb-2">Dashboard Site Manager</h1>
            <p className="text-indigo-100">
              Selamat datang, {user?.first_name}! • {format(new Date(), 'EEEE, dd MMMM yyyy')}
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-amber-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Laporan Menunggu</p>
                <p className="text-2xl font-bold text-gray-900">{reportsByStatus.pending.length}</p>
              </div>
              <Inbox className="w-8 h-8 text-amber-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Lahan Sehat</p>
                <p className="text-2xl font-bold text-gray-900">{siteSummary.healthyFields}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Lahan Stres</p>
                <p className="text-2xl font-bold text-gray-900">{siteSummary.stressedFields}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rekomendasi PM</p>
                <p className="text-2xl font-bold text-gray-900">{pmRecommendations.length}</p>
              </div>
              <Lightbulb className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {[
                { id: 'inbox', label: 'Inbox Laporan SPV', icon: Inbox },
                { id: 'site', label: 'Ringkasan Site', icon: BarChart3 },
                { id: 'recommendations', label: 'Rekomendasi PM', icon: Sparkles },
                { id: 'timeline', label: 'Timeline Musim Tanam', icon: Calendar }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id as any)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    selectedTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Inbox Tab */}
            {selectedTab === 'inbox' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Laporan dari SPV</h2>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">
                      {reportsByStatus.pending.length} Menunggu
                    </span>
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      {reportsByStatus.approved.length} Disetujui
                    </span>
                  </div>
                </div>

                {/* Pending Reports */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Menunggu Validasi ({reportsByStatus.pending.length})
                  </h3>
                  <div className="space-y-3">
                    {reportsByStatus.pending.slice(0, 10).map(report => (
                      <div key={report.id} className="border-2 border-amber-200 bg-amber-50 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-gray-900">{report.title}</h4>
                              <span className="px-2 py-1 bg-amber-200 text-amber-800 rounded-full text-xs font-medium">
                                Baru
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{report.description || 'Tidak ada deskripsi'}</p>
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
                      <div className="text-center py-8 text-gray-500">
                        <Inbox className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p>Tidak ada laporan yang menunggu validasi</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Site Summary Tab */}
            {selectedTab === 'site' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900">Ringkasan Kondisi Site</h2>

                {/* Health Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900">Lahan Sehat</h3>
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <p className="text-3xl font-bold text-green-900">{siteSummary.healthyFields}</p>
                    <p className="text-sm text-green-700 mt-2">
                      {((siteSummary.healthyFields / siteSummary.totalFields) * 100).toFixed(1)}% dari total lahan
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900">Lahan Stres</h3>
                      <AlertTriangle className="w-8 h-8 text-red-600" />
                    </div>
                    <p className="text-3xl font-bold text-red-900">{siteSummary.stressedFields}</p>
                    <p className="text-sm text-red-700 mt-2">Perlu perhatian</p>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900">Total Lahan</h3>
                      <MapPin className="w-8 h-8 text-blue-600" />
                    </div>
                    <p className="text-3xl font-bold text-blue-900">{siteSummary.totalFields}</p>
                    <p className="text-sm text-blue-700 mt-2">Lahan aktif</p>
                  </div>
                </div>

                {/* Planting Phases */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Fase Tanam</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(siteSummary.plantingPhases).map(([phase, count]) => (
                      <div key={phase} className="bg-white rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-gray-900">{count}</p>
                        <p className="text-sm text-gray-600 mt-1 capitalize">{phase.replace(/([A-Z])/g, ' $1').trim()}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Alerts */}
                <div className="space-y-3">
                  {siteSummary.pestCases > 0 && (
                    <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        <h4 className="font-semibold text-red-900">Kasus Hama Signifikan</h4>
                      </div>
                      <p className="text-sm text-red-700">{siteSummary.pestCases} lahan memerlukan tindakan pengendalian hama</p>
                    </div>
                  )}
                  {siteSummary.scheduleDeviations > 0 && (
                    <div className="bg-amber-50 border-l-4 border-amber-500 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-5 h-5 text-amber-600" />
                        <h4 className="font-semibold text-amber-900">Deviasi Jadwal</h4>
                      </div>
                      <p className="text-sm text-amber-700">{siteSummary.scheduleDeviations} lahan mengalami keterlambatan jadwal</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PM Recommendations Tab */}
            {selectedTab === 'recommendations' && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900">Rekomendasi dari PM (via DSS)</h2>
                <div className="space-y-4">
                  {pmRecommendations.map(rec => (
                    <div
                      key={rec.id}
                      className={`border-2 rounded-lg p-6 ${
                        rec.urgency === 'high' ? 'border-red-300 bg-red-50' :
                        rec.urgency === 'medium' ? 'border-amber-300 bg-amber-50' :
                        'border-blue-300 bg-blue-50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Lightbulb className="w-5 h-5 text-purple-600" />
                            <h3 className="font-bold text-gray-900">{rec.title}</h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              rec.urgency === 'high' ? 'bg-red-200 text-red-800' :
                              rec.urgency === 'medium' ? 'bg-amber-200 text-amber-800' :
                              'bg-blue-200 text-blue-800'
                            }`}>
                              {rec.urgency === 'high' ? 'Urgent' : rec.urgency === 'medium' ? 'Medium' : 'Low'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{rec.rationale}</p>
                          <div className="bg-white rounded-lg p-4 mb-3">
                            <p className="text-sm font-semibold text-gray-900 mb-2">Rekomendasi Tindakan:</p>
                            <p className="text-sm text-gray-700">{rec.recommendedAction}</p>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Area Terdampak: </span>
                              <span className="font-semibold text-gray-900">{rec.affectedAreas.join(', ')}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Dampak: </span>
                              <span className="font-semibold text-green-700">{rec.impact}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4 pt-4 border-t border-gray-300">
                        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium">
                          Buat Instruksi ke SPV
                        </button>
                        <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium">
                          Lihat Detail
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline Tab */}
            {selectedTab === 'timeline' && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900">Timeline Musim Tanam</h2>
                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 border-2 border-gray-200">
                  <div className="space-y-4">
                    {[
                      { phase: 'Olah Tanah', duration: 'Minggu 1-2', status: 'completed' },
                      { phase: 'Tanam', duration: 'Minggu 3', status: 'completed' },
                      { phase: 'Pemupukan', duration: 'Minggu 4-8', status: 'in-progress' },
                      { phase: 'Pengairan', duration: 'Minggu 3-16', status: 'in-progress' },
                      { phase: 'Panen', duration: 'Minggu 17-20', status: 'pending' },
                      { phase: 'Rehabilitasi Tanah', duration: 'Minggu 21-24', status: 'pending' }
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${
                          item.status === 'completed' ? 'bg-green-500' :
                          item.status === 'in-progress' ? 'bg-blue-500' :
                          'bg-gray-300'
                        }`}>
                          {item.status === 'completed' ? '✓' : idx + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{item.phase}</p>
                          <p className="text-sm text-gray-600">{item.duration}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          item.status === 'completed' ? 'bg-green-100 text-green-800' :
                          item.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {item.status === 'completed' ? 'Selesai' :
                           item.status === 'in-progress' ? 'Berlangsung' : 'Menunggu'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

