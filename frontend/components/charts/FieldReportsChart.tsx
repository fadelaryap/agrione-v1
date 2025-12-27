'use client'

import { useState, useEffect, useMemo } from 'react'
import { fieldReportsAPI, FieldReport } from '@/lib/api'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format, parseISO, startOfDay, eachDayOfInterval, isWithinInterval } from 'date-fns'
import { id } from 'date-fns/locale'

interface FieldReportsChartProps {
  className?: string
}

export default function FieldReportsChart({ className }: FieldReportsChartProps) {
  const [reports, setReports] = useState<FieldReport[]>([])
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState<string>(() => {
    // Default: 30 hari terakhir
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return format(date, 'yyyy-MM-dd')
  })
  const [endDate, setEndDate] = useState<string>(() => {
    return format(new Date(), 'yyyy-MM-dd')
  })

  useEffect(() => {
    loadReports()
  }, [])

  const loadReports = async () => {
    try {
      const data = await fieldReportsAPI.listFieldReports({ include_comments: true })
      setReports(data || [])
    } catch (err) {
      console.error('Failed to load reports:', err)
      setReports([])
    } finally {
      setLoading(false)
    }
  }

  // Process data untuk chart
  const chartData = useMemo(() => {
    if (!reports || reports.length === 0) return []

    try {
      const start = parseISO(startDate)
      const end = parseISO(endDate)
      const endOfEndDate = new Date(end)
      endOfEndDate.setHours(23, 59, 59, 999)

      // Generate semua hari dalam range
      const days = eachDayOfInterval({ start, end: endOfEndDate })
      
      // Group reports by date dan status
      const grouped = new Map<string, {
        total: number
        approved: number
        rejected: number
        pending: number
      }>()

      // Initialize semua hari dengan 0
      days.forEach(day => {
        const key = format(day, 'yyyy-MM-dd')
        grouped.set(key, {
          total: 0,
          approved: 0,
          rejected: 0,
          pending: 0,
        })
      })

      // Count reports per day
      reports.forEach(report => {
        if (!report.created_at) return
        
        const reportDate = parseISO(report.created_at)
        const reportDay = startOfDay(reportDate)
        
        if (isWithinInterval(reportDay, { start, end: endOfEndDate })) {
          const key = format(reportDay, 'yyyy-MM-dd')
          const dayData = grouped.get(key)
          
          if (dayData) {
            dayData.total++
            if (report.status === 'approved') {
              dayData.approved++
            } else if (report.status === 'rejected') {
              dayData.rejected++
            } else if (report.status === 'pending') {
              dayData.pending++
            }
          }
        }
      })

      // Convert to array format untuk chart (sudah sorted karena days sudah sorted)
      // Untuk stacked bar: urutan dari bawah ke atas adalah Menunggu -> Ditolak -> Disetujui
      // Bar yang lebih tinggi totalnya akan lebih tinggi secara keseluruhan
      return days.map(day => {
        const key = format(day, 'yyyy-MM-dd')
        const data = grouped.get(key) || { total: 0, approved: 0, rejected: 0, pending: 0 }
        return {
          date: format(day, 'dd MMM', { locale: id }),
          'Menunggu': data.pending,      // Paling bawah (kuning)
          'Ditolak': data.rejected,      // Tengah (merah)
          'Disetujui': data.approved,    // Paling atas (hijau)
        }
      })
    } catch (error) {
      console.error('Error processing chart data:', error)
      return []
    }
  }, [reports, startDate, endDate])

  const totalStats = useMemo(() => {
    const filtered = reports.filter(report => {
      if (!report.created_at) return false
      const reportDate = parseISO(report.created_at)
      const start = parseISO(startDate)
      const end = parseISO(endDate)
      const endOfEndDate = new Date(end)
      endOfEndDate.setHours(23, 59, 59, 999)
      return isWithinInterval(reportDate, { start, end: endOfEndDate })
    })

    return {
      total: filtered.length,
      approved: filtered.filter(r => r.status === 'approved').length,
      rejected: filtered.filter(r => r.status === 'rejected').length,
      pending: filtered.filter(r => r.status === 'pending').length,
    }
  }, [reports, startDate, endDate])

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className || ''}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow ${className || ''}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="mb-3 sm:mb-0">
          <h3 className="text-base font-bold text-gray-900">Statistik Laporan</h3>
          <p className="text-xs text-gray-500 mt-0.5">Status laporan lapangan</p>
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            max={format(new Date(), 'yyyy-MM-dd')}
            className="px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Compact Stats */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-600 font-medium mb-1">Total</p>
          <p className="text-lg font-bold text-blue-900">{totalStats.total}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-xs text-green-600 font-medium mb-1">Disetujui</p>
          <p className="text-lg font-bold text-green-900">{totalStats.approved}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-xs text-red-600 font-medium mb-1">Ditolak</p>
          <p className="text-lg font-bold text-red-900">{totalStats.rejected}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs text-amber-600 font-medium mb-1">Menunggu</p>
          <p className="text-lg font-bold text-amber-900">{totalStats.pending}</p>
        </div>
      </div>

      {/* Chart */}
      {chartData.length === 0 ? (
        <div className="w-full h-64 flex items-center justify-center bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500">Tidak ada data untuk periode yang dipilih</p>
        </div>
      ) : (
        <div className="relative">
          {/* Scroll Controls - Compact */}
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => {
                const container = document.getElementById('chart-scroll-container')
                if (container) {
                  container.scrollBy({ left: -200, behavior: 'smooth' })
                }
              }}
              className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <span className="text-xs text-gray-500">
              Geser untuk melihat lebih banyak
            </span>
            <button
              onClick={() => {
                const container = document.getElementById('chart-scroll-container')
                if (container) {
                  container.scrollBy({ left: 200, behavior: 'smooth' })
                }
              }}
              className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>
          
          {/* Scrollable Chart Container */}
          <div 
            id="chart-scroll-container"
            className="w-full overflow-x-auto"
            style={{ scrollbarWidth: 'thin' }}
          >
            <div className="w-full h-64" style={{ minWidth: `${Math.max(600, chartData.length * 50)}px` }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.2}/>
                    </linearGradient>
                    <linearGradient id="colorRejected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.2}/>
                    </linearGradient>
                    <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.2}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar 
                    dataKey="Menunggu" 
                    stackId="status"
                    fill="url(#colorPending)"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar 
                    dataKey="Ditolak" 
                    stackId="status"
                    fill="url(#colorRejected)"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar 
                    dataKey="Disetujui" 
                    stackId="status"
                    fill="url(#colorApproved)"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

