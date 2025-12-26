'use client'

import { useState, useEffect } from 'react'
import { 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock, 
  ClipboardList, 
  Users,
  TrendingUp,
  AlertCircle
} from 'lucide-react'
import { fieldReportsAPI, workOrdersAPI, FieldReport, WorkOrder } from '@/lib/api'
import { formatDateIndonesian } from '@/lib/dateUtils'

interface DashboardStatsProps {
  className?: string
}

export default function DashboardStats({ className }: DashboardStatsProps) {
  const [stats, setStats] = useState({
    totalReports: 0,
    pendingReports: 0,
    approvedReports: 0,
    rejectedReports: 0,
    totalWorkOrders: 0,
    completedWorkOrders: 0,
    inProgressWorkOrders: 0,
    pendingWorkOrders: 0,
    todayReports: 0,
    thisWeekReports: 0,
    thisMonthReports: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
    // Refresh every 30 seconds
    const interval = setInterval(loadStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      
      // Load field reports
      const reports = await fieldReportsAPI.listFieldReports({ include_comments: true })
      
      // Load work orders
      const workOrders = await workOrdersAPI.listWorkOrders({})

      // Calculate stats
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

      const todayReports = reports.filter(r => {
        if (!r.created_at) return false
        const reportDate = new Date(r.created_at)
        return reportDate >= today
      }).length

      const thisWeekReports = reports.filter(r => {
        if (!r.created_at) return false
        const reportDate = new Date(r.created_at)
        return reportDate >= weekAgo
      }).length

      const thisMonthReports = reports.filter(r => {
        if (!r.created_at) return false
        const reportDate = new Date(r.created_at)
        return reportDate >= monthAgo
      }).length

      setStats({
        totalReports: reports.length,
        pendingReports: reports.filter(r => r.status === 'pending').length,
        approvedReports: reports.filter(r => r.status === 'approved').length,
        rejectedReports: reports.filter(r => r.status === 'rejected').length,
        totalWorkOrders: workOrders.length,
        completedWorkOrders: workOrders.filter(wo => wo.status === 'completed').length,
        inProgressWorkOrders: workOrders.filter(wo => wo.status === 'in-progress').length,
        pendingWorkOrders: workOrders.filter(wo => wo.status === 'pending').length,
        todayReports,
        thisWeekReports,
        thisMonthReports,
      })
    } catch (err) {
      console.error('Failed to load stats:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className || ''}`}>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-lg p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          </div>
        ))}
      </div>
    )
  }

  const approvalRate = stats.totalReports > 0 
    ? ((stats.approvedReports / stats.totalReports) * 100).toFixed(1)
    : '0'

  const completionRate = stats.totalWorkOrders > 0
    ? ((stats.completedWorkOrders / stats.totalWorkOrders) * 100).toFixed(1)
    : '0'

  return (
    <div className={`space-y-8 ${className || ''}`}>
      {/* Field Reports Stats */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Statistik Laporan Lapangan</h2>
              <p className="text-sm text-gray-600">Ringkasan laporan lapangan</p>
            </div>
          </div>
          <span className="text-xs text-gray-500 bg-white px-3 py-1 rounded-full">Real-time</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-md p-6 border-2 border-blue-200 hover:border-blue-400 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Total Laporan</h3>
              <FileText className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalReports}</p>
            <p className="text-xs text-gray-500 mt-2">
              {stats.thisMonthReports} bulan ini
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-2 border-amber-200 hover:border-amber-400 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Menunggu</h3>
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.pendingReports}</p>
            <p className="text-xs text-gray-500 mt-2">
              Perlu persetujuan
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-2 border-green-200 hover:border-green-400 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Disetujui</h3>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.approvedReports}</p>
            <p className="text-xs text-gray-500 mt-2">
              {approvalRate}% approval rate
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-2 border-red-200 hover:border-red-400 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Ditolak</h3>
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.rejectedReports}</p>
            <p className="text-xs text-gray-500 mt-2">
              Perlu revisi
            </p>
          </div>
        </div>
      </div>

      {/* Work Orders Stats */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border-2 border-indigo-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500 rounded-lg">
              <ClipboardList className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Statistik Work Orders</h2>
              <p className="text-sm text-gray-600">Ringkasan tugas kerja</p>
            </div>
          </div>
          <span className="text-xs text-gray-500 bg-white px-3 py-1 rounded-full">Real-time</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-md p-6 border-2 border-indigo-200 hover:border-indigo-400 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Total Work Orders</h3>
              <ClipboardList className="w-5 h-5 text-indigo-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalWorkOrders}</p>
            <p className="text-xs text-gray-500 mt-2">
              Semua work orders
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-2 border-amber-200 hover:border-amber-400 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Pending</h3>
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.pendingWorkOrders}</p>
            <p className="text-xs text-gray-500 mt-2">
              Belum dimulai
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-2 border-blue-200 hover:border-blue-400 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">In Progress</h3>
              <TrendingUp className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.inProgressWorkOrders}</p>
            <p className="text-xs text-gray-500 mt-2">
              Sedang dikerjakan
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-2 border-green-200 hover:border-green-400 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Selesai</h3>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.completedWorkOrders}</p>
            <p className="text-xs text-gray-500 mt-2">
              {completionRate}% completion rate
            </p>
          </div>
        </div>
      </div>

      {/* Activity Stats */}
      <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-6 border-2 border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-500 rounded-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Aktivitas Terkini</h2>
              <p className="text-sm text-gray-600">Laporan berdasarkan periode</p>
            </div>
          </div>
          <span className="text-xs text-gray-500 bg-white px-3 py-1 rounded-full">Real-time</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-md p-6 border-2 border-gray-200 hover:border-gray-400 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Hari Ini</h3>
              <AlertCircle className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.todayReports}</p>
            <p className="text-xs text-gray-500 mt-2">
              Laporan dibuat hari ini
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-2 border-gray-200 hover:border-gray-400 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">7 Hari Terakhir</h3>
              <TrendingUp className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.thisWeekReports}</p>
            <p className="text-xs text-gray-500 mt-2">
              Laporan minggu ini
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-2 border-gray-200 hover:border-gray-400 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">30 Hari Terakhir</h3>
              <FileText className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.thisMonthReports}</p>
            <p className="text-xs text-gray-500 mt-2">
              Laporan bulan ini
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

