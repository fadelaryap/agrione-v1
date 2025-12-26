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
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className || ''}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">Statistik Laporan Lapangan</h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Dari:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Sampai:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              max={format(new Date(), 'yyyy-MM-dd')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium">Total Laporan</p>
          <p className="text-3xl font-bold text-blue-900">{totalStats.total}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium">Disetujui</p>
          <p className="text-3xl font-bold text-green-900">{totalStats.approved}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600 font-medium">Ditolak</p>
          <p className="text-3xl font-bold text-red-900">{totalStats.rejected}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-600 font-medium">Menunggu</p>
          <p className="text-3xl font-bold text-amber-900">{totalStats.pending}</p>
        </div>
      </div>

      {/* Chart */}
      {chartData.length === 0 ? (
        <div className="w-full h-80 flex items-center justify-center bg-gray-50 rounded-lg">
          <p className="text-gray-500">Tidak ada data untuk periode yang dipilih</p>
        </div>
      ) : (
        <div className="relative">
          {/* Scroll Controls */}
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => {
                const container = document.getElementById('chart-scroll-container')
                if (container) {
                  container.scrollBy({ left: -200, behavior: 'smooth' })
                }
              }}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <span className="text-sm text-gray-600">
              Geser untuk melihat lebih banyak data
            </span>
            <button
              onClick={() => {
                const container = document.getElementById('chart-scroll-container')
                if (container) {
                  container.scrollBy({ left: 200, behavior: 'smooth' })
                }
              }}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          
          {/* Scrollable Chart Container */}
          <div 
            id="chart-scroll-container"
            className="w-full overflow-x-auto"
            style={{ scrollbarWidth: 'thin' }}
          >
            <div className="w-full h-80" style={{ minWidth: `${Math.max(800, chartData.length * 60)}px` }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  {/* Stacked bars - urutan dari bawah ke atas */}
                  <Bar 
                    dataKey="Menunggu" 
                    stackId="status"
                    fill="#f59e0b" 
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar 
                    dataKey="Ditolak" 
                    stackId="status"
                    fill="#ef4444" 
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar 
                    dataKey="Disetujui" 
                    stackId="status"
                    fill="#10b981" 
                    radius={[8, 8, 0, 0]}
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

