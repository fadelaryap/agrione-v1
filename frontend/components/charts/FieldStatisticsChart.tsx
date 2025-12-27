'use client'

import { useState, useEffect, useMemo } from 'react'
import { fieldsAPI, Field } from '@/lib/api'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { format, parseISO, startOfDay, startOfMonth, startOfYear, subDays, subMonths, subYears } from 'date-fns'

interface FieldStatisticsChartProps {
  fields: Field[]
}

type FilterType = 'day' | 'month' | 'year'

export default function FieldStatisticsChart({ fields }: FieldStatisticsChartProps) {
  const [filterType, setFilterType] = useState<FilterType>('month')
  const [dateRange, setDateRange] = useState(12) // 12 months, 12 days, or 12 years

  // Process data based on filter type
  const chartData = useMemo(() => {
    if (!Array.isArray(fields) || fields.length === 0) return []

    const now = new Date()
    let startDate: Date
    let formatStr: string
    let groupBy: (date: string) => string

    switch (filterType) {
      case 'day':
        startDate = startOfDay(subDays(now, dateRange - 1))
        formatStr = 'MMM dd'
        groupBy = (date: string) => format(startOfDay(parseISO(date)), formatStr)
        break
      case 'month':
        startDate = startOfMonth(subMonths(now, dateRange - 1))
        formatStr = 'MMM yyyy'
        groupBy = (date) => format(startOfMonth(parseISO(date)), formatStr)
        break
      case 'year':
        startDate = startOfYear(subYears(now, dateRange - 1))
        formatStr = 'yyyy'
        groupBy = (date) => format(startOfYear(parseISO(date)), formatStr)
        break
    }

    // Group fields by date
    const grouped = new Map<string, number>()
    
    // Initialize all dates in range with 0
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
      const key = format(date, formatStr)
      dates.push(key)
      grouped.set(key, 0)
    }

    // Count fields by date
    fields.forEach((field) => {
      if (field.created_at) {
        const fieldDate = parseISO(field.created_at)
        if (fieldDate >= startDate) {
          const key = groupBy(field.created_at)
          const current = grouped.get(key) || 0
          grouped.set(key, current + 1)
        }
      }
    })

    // Convert to array format for chart
    return dates.reverse().map((date) => ({
      date,
      count: grouped.get(date) || 0,
    }))
  }, [fields, filterType, dateRange])

  const totalFields = fields.length
  const thisPeriodCount = chartData.reduce((sum, item) => sum + item.count, 0)

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="mb-3 sm:mb-0">
          <h3 className="text-base font-bold text-gray-900">Jumlah Lahan</h3>
          <p className="text-xs text-gray-500 mt-0.5">Lahan yang dibuat</p>
        </div>
        <div className="flex gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as FilterType)}
            className="px-2 py-1 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="day">Harian</option>
            <option value="month">Bulanan</option>
            <option value="year">Tahunan</option>
          </select>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(parseInt(e.target.value))}
            className="px-2 py-1 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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

      {/* Compact Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
          <p className="text-xs text-indigo-600 font-medium mb-1">Total</p>
          <p className="text-xl font-bold text-indigo-900">{totalFields}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3 border border-green-200">
          <p className="text-xs text-green-600 font-medium mb-1">Periode</p>
          <p className="text-xl font-bold text-green-900">{thisPeriodCount}</p>
        </div>
      </div>

      {/* Chart - Compact */}
      <div className="w-full flex-1 min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.2}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="date" 
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
            <Bar 
              dataKey="count" 
              fill="url(#colorCount)"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

