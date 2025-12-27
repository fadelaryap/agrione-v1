'use client'

import { useState, useMemo } from 'react'
import { Field } from '@/lib/api'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { format, parseISO, startOfDay, startOfMonth, startOfYear, subDays, subMonths, subYears } from 'date-fns'
import { id } from 'date-fns/locale'
import { TrendingUp, Calendar } from 'lucide-react'

interface HectaresChartProps {
  fields: Field[]
}

type FilterType = 'day' | 'month' | 'year'

export default function HectaresChart({ fields }: HectaresChartProps) {
  const [filterType, setFilterType] = useState<FilterType>('month')
  const [dateRange, setDateRange] = useState(12)

  const chartData = useMemo(() => {
    if (!Array.isArray(fields) || fields.length === 0) return []

    const now = new Date()
    let startDate: Date
    let formatStr: string
    let groupBy: (date: string) => string

    switch (filterType) {
      case 'day':
        startDate = startOfDay(subDays(now, dateRange - 1))
        formatStr = 'dd MMM'
        groupBy = (date: string) => format(startOfDay(parseISO(date)), formatStr, { locale: id })
        break
      case 'month':
        startDate = startOfMonth(subMonths(now, dateRange - 1))
        formatStr = 'MMM yyyy'
        groupBy = (date) => format(startOfMonth(parseISO(date)), formatStr, { locale: id })
        break
      case 'year':
        startDate = startOfYear(subYears(now, dateRange - 1))
        formatStr = 'yyyy'
        groupBy = (date) => format(startOfYear(parseISO(date)), formatStr)
        break
    }

    // Group fields by date and sum hectares
    const grouped = new Map<string, number>()
    
    // Initialize all dates in range with 0 (oldest to newest)
    const dates: string[] = []
    for (let i = 0; i < dateRange; i++) {
      let date: Date
      if (filterType === 'day') {
        date = startOfDay(subDays(now, dateRange - 1 - i))
      } else if (filterType === 'month') {
        date = startOfMonth(subMonths(now, dateRange - 1 - i))
      } else {
        date = startOfYear(subYears(now, dateRange - 1 - i))
      }
      const key = format(date, formatStr, { locale: id })
      dates.push(key)
      grouped.set(key, 0)
    }
    // dates are now from oldest to newest (we don't reverse)

    // Sum hectares by date (cumulative)
    let cumulativeHectares = 0
    const fieldsByDate = new Map<string, Field[]>()
    
    fields.forEach((field) => {
      if (field.created_at && field.area) {
        const fieldDate = parseISO(field.created_at)
        if (fieldDate >= startDate) {
          const key = groupBy(field.created_at)
          if (!fieldsByDate.has(key)) {
            fieldsByDate.set(key, [])
          }
          fieldsByDate.get(key)!.push(field)
        }
      }
    })

    // Calculate cumulative hectares
    dates.forEach((date) => {
      const fieldsInPeriod = fieldsByDate.get(date) || []
      const hectaresInPeriod = fieldsInPeriod.reduce((sum, field) => sum + (field.area || 0), 0)
      cumulativeHectares += hectaresInPeriod
      grouped.set(date, cumulativeHectares)
    })

    // Return data from oldest to newest (dates array is already in correct order)
    return dates.map((date) => ({
      date,
      hectares: Number((grouped.get(date) || 0).toFixed(2)),
    }))
  }, [fields, filterType, dateRange])

  const totalHectares = fields.reduce((sum, field) => sum + (field.area || 0), 0)
  const latestHectares = chartData.length > 0 ? chartData[chartData.length - 1].hectares : 0
  const previousHectares = chartData.length > 1 ? chartData[chartData.length - 2].hectares : 0
  const growth = latestHectares > 0 && previousHectares > 0 
    ? ((latestHectares - previousHectares) / previousHectares * 100).toFixed(1)
    : '0'

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="text-sm font-semibold text-gray-700 mb-1">{payload[0].payload.date}</p>
          <p className="text-lg font-bold text-indigo-600">
            {payload[0].value.toFixed(2)} Ha
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="mb-4 sm:mb-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Luas Lahan Dikelola</h3>
          </div>
          <p className="text-sm text-gray-500 ml-12">Perkembangan luas lahan dari waktu ke waktu</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FilterType)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="day">Harian</option>
              <option value="month">Bulanan</option>
              <option value="year">Tahunan</option>
            </select>
          </div>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(parseInt(e.target.value))}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            {filterType === 'day' && (
              <>
                <option value="7">7 Hari</option>
                <option value="14">14 Hari</option>
                <option value="30">30 Hari</option>
              </>
            )}
            {filterType === 'month' && (
              <>
                <option value="6">6 Bulan</option>
                <option value="12">12 Bulan</option>
                <option value="24">24 Bulan</option>
              </>
            )}
            {filterType === 'year' && (
              <>
                <option value="5">5 Tahun</option>
                <option value="10">10 Tahun</option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4 border border-indigo-200">
          <p className="text-xs text-indigo-600 font-medium mb-1">Total</p>
          <p className="text-2xl font-bold text-indigo-900">{totalHectares.toFixed(2)} Ha</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
          <p className="text-xs text-purple-600 font-medium mb-1">Saat Ini</p>
          <p className="text-2xl font-bold text-purple-900">{latestHectares.toFixed(2)} Ha</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
          <p className="text-xs text-green-600 font-medium mb-1">Pertumbuhan</p>
          <p className="text-2xl font-bold text-green-900">{growth}%</p>
        </div>
      </div>

      {/* Chart */}
      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorHectares" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 11, fill: '#6b7280' }}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis 
              tick={{ fontSize: 11, fill: '#6b7280' }}
              axisLine={{ stroke: '#e5e7eb' }}
              label={{ value: 'Hektar (Ha)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#6b7280', fontSize: 12 } }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="hectares" 
              stroke="#6366f1" 
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorHectares)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}


