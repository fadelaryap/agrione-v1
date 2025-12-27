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
import { fieldReportsAPI, workOrdersAPI, attendanceAPI, FieldReport, WorkOrder, AttendanceStats } from '@/lib/api'
import { formatDateIndonesian } from '@/lib/dateUtils'

function parseDateCorrectly(dateString: string): Date {
  if (!dateString) return new Date(0)
  if (dateString.endsWith('Z')) {
    return new Date(dateString.slice(0, -1))
  }
  return new Date(dateString)
}

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
    totalEmployees: 0,
    todayAttendance: 0,
    thisWeekAttendance: 0,
    thisMonthAttendance: 0,
  })
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
    const interval = setInterval(loadStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      
      const reports = await fieldReportsAPI.listFieldReports({ include_comments: true })
      const workOrders = await workOrdersAPI.listWorkOrders({})
      
      let attendanceData: AttendanceStats | null = null
      try {
        attendanceData = await attendanceAPI.getAttendanceStats()
        setAttendanceStats(attendanceData)
      } catch (err) {
        console.error('Failed to load attendance stats:', err)
      }

      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

      const todayReports = reports.filter(r => {
        if (!r.created_at) return false
        const reportDate = parseDateCorrectly(r.created_at)
        return reportDate >= today
      }).length

      const thisWeekReports = reports.filter(r => {
        if (!r.created_at) return false
        const reportDate = parseDateCorrectly(r.created_at)
        return reportDate >= weekAgo
      }).length

      const thisMonthReports = reports.filter(r => {
        if (!r.created_at) return false
        const reportDate = parseDateCorrectly(r.created_at)
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
        totalEmployees: attendanceData?.total_users || 0,
        todayAttendance: attendanceData?.today_attendance || 0,
        thisWeekAttendance: attendanceData?.this_week_attendance || 0,
        thisMonthAttendance: attendanceData?.this_month_attendance || 0,
      })
    } catch (err) {
      console.error('Failed to load stats:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={`grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 ${className || ''}`}>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm p-4 animate-pulse border border-gray-100">
            <div className="h-3 bg-gray-200 rounded w-2/3 mb-3"></div>
            <div className="h-6 bg-gray-200 rounded w-1/2"></div>
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

  // Compact stat card component
  const StatCard = ({ 
    icon: Icon, 
    label, 
    value, 
    subtext, 
    color = 'indigo',
    iconBg = 'indigo'
  }: {
    icon: any,
    label: string,
    value: string | number,
    subtext?: string,
    color?: string,
    iconBg?: string
  }) => {
    const colorClasses: Record<string, string> = {
      indigo: 'text-indigo-600 bg-indigo-50 border-indigo-200',
      blue: 'text-blue-600 bg-blue-50 border-blue-200',
      green: 'text-green-600 bg-green-50 border-green-200',
      red: 'text-red-600 bg-red-50 border-red-200',
      amber: 'text-amber-600 bg-amber-50 border-amber-200',
      purple: 'text-purple-600 bg-purple-50 border-purple-200',
      gray: 'text-gray-600 bg-gray-50 border-gray-200',
    }

    const iconBgClasses: Record<string, string> = {
      indigo: 'bg-indigo-500',
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      red: 'bg-red-500',
      amber: 'bg-amber-500',
      purple: 'bg-purple-500',
      gray: 'bg-gray-500',
    }

    return (
      <div className={`bg-white rounded-lg shadow-sm p-4 border border-gray-100 hover:shadow-md transition-all ${colorClasses[color]}`}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-gray-600">{label}</p>
          <div className={`p-1.5 rounded ${iconBgClasses[iconBg]}`}>
            <Icon className="w-3.5 h-3.5 text-white" />
          </div>
        </div>
        <p className="text-xl font-bold text-gray-900">{value}</p>
        {subtext && (
          <p className="text-xs text-gray-500 mt-1">{subtext}</p>
        )}
      </div>
    )
  }

  return (
    <div className={`${className || ''} space-y-4`}>
      {/* Group 1: Field Reports */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-500" />
          Laporan Lapangan
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard 
            icon={FileText} 
            label="Total Laporan" 
            value={stats.totalReports}
            subtext={`${stats.thisMonthReports} bulan ini`}
            color="blue"
            iconBg="blue"
          />
          <StatCard 
            icon={Clock} 
            label="Menunggu" 
            value={stats.pendingReports}
            subtext="Perlu persetujuan"
            color="amber"
            iconBg="amber"
          />
          <StatCard 
            icon={CheckCircle} 
            label="Disetujui" 
            value={stats.approvedReports}
            subtext={`${approvalRate}% rate`}
            color="green"
            iconBg="green"
          />
          <StatCard 
            icon={XCircle} 
            label="Ditolak" 
            value={stats.rejectedReports}
            subtext="Perlu revisi"
            color="red"
            iconBg="red"
          />
        </div>
      </div>

      {/* Group 2: Work Orders */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-indigo-500" />
          Work Orders
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard 
            icon={ClipboardList} 
            label="Total WO" 
            value={stats.totalWorkOrders}
            subtext="Semua work orders"
            color="indigo"
            iconBg="indigo"
          />
          <StatCard 
            icon={Clock} 
            label="Pending WO" 
            value={stats.pendingWorkOrders}
            subtext="Belum dimulai"
            color="amber"
            iconBg="amber"
          />
          <StatCard 
            icon={TrendingUp} 
            label="In Progress" 
            value={stats.inProgressWorkOrders}
            subtext="Sedang dikerjakan"
            color="blue"
            iconBg="blue"
          />
          <StatCard 
            icon={CheckCircle} 
            label="Selesai" 
            value={stats.completedWorkOrders}
            subtext={`${completionRate}% rate`}
            color="green"
            iconBg="green"
          />
        </div>
      </div>

      {/* Group 3: Attendance - Only show if available */}
      {stats.totalEmployees > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-500" />
            Kehadiran Karyawan
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard 
              icon={Users} 
              label="Karyawan" 
              value={stats.totalEmployees}
              subtext="Level 3 & 4"
              color="purple"
              iconBg="purple"
            />
            <StatCard 
              icon={Clock} 
              label="Absen Hari Ini" 
              value={stats.todayAttendance}
              subtext={`${stats.totalEmployees > 0 ? ((stats.todayAttendance / (stats.totalEmployees * 2)) * 100).toFixed(0) : 0}% target`}
              color="green"
              iconBg="green"
            />
            <StatCard 
              icon={TrendingUp} 
              label="Absen Minggu" 
              value={stats.thisWeekAttendance}
              subtext={`${stats.totalEmployees > 0 ? ((stats.thisWeekAttendance / (stats.totalEmployees * 14)) * 100).toFixed(0) : 0}% target`}
              color="purple"
              iconBg="purple"
            />
            <StatCard 
              icon={CheckCircle} 
              label="Absen Bulan" 
              value={stats.thisMonthAttendance}
              subtext={`Avg ${stats.totalEmployees > 0 ? (stats.thisMonthAttendance / stats.totalEmployees).toFixed(1) : 0}`}
              color="indigo"
              iconBg="indigo"
            />
          </div>
        </div>
      )}
    </div>
  )
}
