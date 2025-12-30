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
      setReports(reportsData || [])
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
