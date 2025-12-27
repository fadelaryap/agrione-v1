'use client'

import { useState, useEffect } from 'react'
import { fieldReportsAPI, FieldReport } from '@/lib/api'
import { TrendingUp, Package, Award } from 'lucide-react'
import { format, parseISO, startOfDay, subDays, subMonths, subYears } from 'date-fns'
import { id } from 'date-fns/locale'

interface HarvestStatsProps {
  className?: string
}

export default function HarvestStats({ className }: HarvestStatsProps) {
  const [stats, setStats] = useState({
    totalHarvest: 0, // in ton
    todayHarvest: 0,
    thisWeekHarvest: 0,
    thisMonthHarvest: 0,
    averageQuality: '',
    totalReports: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHarvestStats()
    const interval = setInterval(loadHarvestStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadHarvestStats = async () => {
    try {
      setLoading(true)
      const reports = await fieldReportsAPI.listFieldReports({ include_comments: true })
      
      // Filter reports with harvest quantity (Panen activity)
      const harvestReports = reports.filter(r => r.harvest_quantity !== undefined && r.harvest_quantity !== null)
      
      const now = new Date()
      const today = startOfDay(now)
      const weekAgo = subDays(today, 7)
      const monthAgo = subMonths(today, 1)

      let totalHarvest = 0
      let todayHarvest = 0
      let thisWeekHarvest = 0
      let thisMonthHarvest = 0
      const qualityCounts: Record<string, number> = {}

      harvestReports.forEach(report => {
        const quantity = report.harvest_quantity || 0
        totalHarvest += quantity

        if (report.created_at) {
          const reportDate = parseISO(report.created_at)
          
          if (reportDate >= today) {
            todayHarvest += quantity
          }
          if (reportDate >= weekAgo) {
            thisWeekHarvest += quantity
          }
          if (reportDate >= monthAgo) {
            thisMonthHarvest += quantity
          }
        }

        if (report.harvest_quality) {
          qualityCounts[report.harvest_quality] = (qualityCounts[report.harvest_quality] || 0) + 1
        }
      })

      // Calculate average quality (most common)
      const averageQuality = Object.keys(qualityCounts).length > 0
        ? Object.keys(qualityCounts).reduce((a, b) => qualityCounts[a] > qualityCounts[b] ? a : b)
        : '-'

      setStats({
        totalHarvest,
        todayHarvest,
        thisWeekHarvest,
        thisMonthHarvest,
        averageQuality,
        totalReports: harvestReports.length,
      })
    } catch (err) {
      console.error('Failed to load harvest stats:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 ${className || ''}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  // Always show the component, even if there are no harvest reports
  return (
    <div className={`bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl shadow-sm border border-amber-200 p-6 ${className || ''}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500 rounded-lg">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Statistik Hasil Panen</h3>
            <p className="text-xs text-gray-600">Ringkasan hasil panen dari laporan lapangan</p>
          </div>
        </div>
        <span className="text-xs text-gray-500 bg-white px-3 py-1 rounded-full">Real-time</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4 border border-amber-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-600">Total Panen</p>
            <Package className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalHarvest.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">Ton</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-600">Hari Ini</p>
            <TrendingUp className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.todayHarvest.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">Ton</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-600">Minggu Ini</p>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.thisWeekHarvest.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">Ton</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-600">Bulan Ini</p>
            <Award className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.thisMonthHarvest.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">Ton</p>
        </div>
      </div>

      {stats.averageQuality !== '-' && stats.totalReports > 0 && (
        <div className="mt-4 pt-4 border-t border-amber-200">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">Kualitas Rata-rata</p>
            <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-semibold">
              {stats.averageQuality}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}


