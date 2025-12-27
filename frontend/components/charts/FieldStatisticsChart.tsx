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
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">Field Statistics</h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Filter:</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FilterType)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="day">By Day</option>
              <option value="month">By Month</option>
              <option value="year">By Year</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Range:</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {filterType === 'day' && (
                <>
                  <option value="7">Last 7 days</option>
                  <option value="14">Last 14 days</option>
                  <option value="30">Last 30 days</option>
                </>
              )}
              {filterType === 'month' && (
                <>
                  <option value="6">Last 6 months</option>
                  <option value="12">Last 12 months</option>
                  <option value="24">Last 24 months</option>
                </>
              )}
              {filterType === 'year' && (
                <>
                  <option value="5">Last 5 years</option>
                  <option value="10">Last 10 years</option>
                </>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <p className="text-sm text-indigo-600 font-medium">Total Fields</p>
          <p className="text-3xl font-bold text-indigo-900">{totalFields}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium">Fields in Period</p>
          <p className="text-3xl font-bold text-green-900">{thisPeriodCount}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="w-full h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              angle={-45}
              textAnchor="end"
              height={80}
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
            <Bar 
              dataKey="count" 
              fill="#4f46e5" 
              name="Fields Created"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

