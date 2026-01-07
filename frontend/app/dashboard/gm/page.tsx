'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { authAPI, User, fieldsAPI, Field } from '@/lib/api'
import { 
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Target,
  BarChart3,
  Activity,
  CheckCircle,
  XCircle,
  ArrowUp,
  ArrowDown,
  TrendingDown,
  PieChart,
  Calendar,
  Users
} from 'lucide-react'
import { format, subMonths, subDays } from 'date-fns'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

// Mock production data
interface ProductionMetrics {
  totalProduction: number // tons
  productivity: number // tons/ha
  totalArea: number // ha
  previousPeriodProduction: number
  productionGrowth: number // percentage
}

// Mock financial data
interface FinancialMetrics {
  totalCost: number
  costPerHa: number
  totalRevenue: number
  revenuePerHa: number
  margin: number
  marginPercentage: number
  budgetDeviation: number // percentage
}

// Mock risk data
interface RiskMetrics {
  atRiskFields: number
  atRiskPercentage: number
  problemSites: string[]
  predictedFailures: number
}

// Mock execution status
interface ExecutionStatus {
  totalRecommendations: number
  executedRecommendations: number
  executionRate: number
  impactOnResults: string
}

export default function GMDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [fields, setFields] = useState<Field[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month')

  useEffect(() => {
    // Skip auth check for now
    const mockUser: User = {
      id: 9990,
      email: 'gm@agrione.dev',
      username: 'gm',
      first_name: 'General',
      last_name: 'Manager',
      role: 'Level 1',
      status: 'approved'
    }
    setUser(mockUser)
    loadFields()
    setLoading(false)
    
    // Original auth check (commented out for development)
    /*
    checkAuth()
    const checkAuth = async () => {
      try {
        const profile = await authAPI.getProfile()
        if (profile.role !== 'Level 1') {
          router.push('/dashboard')
          return
        }
        setUser(profile)
        await loadFields()
      } catch (err) {
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }
    */
  }, [])

  const loadFields = async () => {
    try {
      const data = await fieldsAPI.listFields()
      setFields(data || [])
    } catch (err) {
      console.error('Failed to load fields:', err)
    }
  }

  // Mock production metrics
  const productionMetrics: ProductionMetrics = useMemo(() => {
    const totalArea = fields.reduce((sum, f) => sum + (f.area || 0), 0)
    const totalProduction = 1250 + Math.random() * 250 // 1250-1500 tons
    const previousProduction = 1100
    const productivity = totalArea > 0 ? totalProduction / totalArea : 0
    const productionGrowth = ((totalProduction - previousProduction) / previousProduction) * 100

    return {
      totalProduction,
      productivity,
      totalArea,
      previousPeriodProduction: previousProduction,
      productionGrowth
    }
  }, [fields])

  // Mock financial metrics
  const financialMetrics: FinancialMetrics = useMemo(() => {
    const totalArea = fields.reduce((sum, f) => sum + (f.area || 0), 0)
    const totalCost = 8500000000 // 8.5B IDR
    const costPerHa = totalArea > 0 ? totalCost / totalArea : 0
    const totalRevenue = 12000000000 // 12B IDR
    const revenuePerHa = totalArea > 0 ? totalRevenue / totalArea : 0
    const margin = totalRevenue - totalCost
    const marginPercentage = (margin / totalRevenue) * 100
    const budgetDeviation = -2.5 // -2.5% under budget

    return {
      totalCost,
      costPerHa,
      totalRevenue,
      revenuePerHa,
      margin,
      marginPercentage,
      budgetDeviation
    }
  }, [fields])

  // Mock risk metrics
  const riskMetrics: RiskMetrics = useMemo(() => {
    const atRiskFields = Math.floor(fields.length * 0.15)
    return {
      atRiskFields,
      atRiskPercentage: fields.length > 0 ? (atRiskFields / fields.length) * 100 : 0,
      problemSites: ['Site A', 'Site C'],
      predictedFailures: 2
    }
  }, [fields])

  // Mock execution status
  const executionStatus: ExecutionStatus = useMemo(() => {
    return {
      totalRecommendations: 45,
      executedRecommendations: 38,
      executionRate: 84.4,
      impactOnResults: 'Meningkatkan produktivitas 8%'
    }
  }, [])

  // Chart data: Production trend (monthly)
  const productionTrendData = useMemo(() => {
    const months = []
    for (let i = 11; i >= 0; i--) {
      const date = subMonths(new Date(), i)
      months.push({
        month: format(date, 'MMM'),
        production: 1200 + Math.random() * 400,
        cost: 8500 + Math.random() * 1000,
        revenue: 12000 + Math.random() * 1500
      })
    }
    return months
  }, [])

  // Chart data: Site comparison
  const siteComparisonData = useMemo(() => {
    return [
      { site: 'Site A', production: 620, productivity: 6.2, cost: 4200, revenue: 5800 },
      { site: 'Site B', production: 580, productivity: 5.8, cost: 4100, revenue: 5500 },
      { site: 'Site C', production: 550, productivity: 5.5, cost: 4000, revenue: 5200 },
      { site: 'Site D', production: 480, productivity: 4.8, cost: 3800, revenue: 4800 }
    ]
  }, [])

  // Chart data: Risk distribution
  const riskDistributionData = useMemo(() => {
    return [
      { name: 'Sehat', value: 85, color: '#10b981' },
      { name: 'Sedang', value: 10, color: '#f59e0b' },
      { name: 'Berisiko', value: 5, color: '#ef4444' }
    ]
  }, [])

  // Chart data: Financial trend
  const financialTrendData = useMemo(() => {
    const months = []
    for (let i = 11; i >= 0; i--) {
      const date = subMonths(new Date(), i)
      months.push({
        month: format(date, 'MMM'),
        revenue: 12000 + Math.random() * 1500,
        cost: 8500 + Math.random() * 1000,
        margin: 3500 + Math.random() * 500
      })
    }
    return months
  }, [])

  // Chart data: Execution status over time
  const executionTrendData = useMemo(() => {
    const weeks = []
    for (let i = 11; i >= 0; i--) {
      const date = subDays(new Date(), i * 7)
      weeks.push({
        week: format(date, 'dd MMM'),
        executed: 30 + Math.random() * 10,
        pending: 10 + Math.random() * 5
      })
    }
    return weeks
  }, [])

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  // Format number
  const formatNumber = (value: number, decimals: number = 1) => {
    return value.toFixed(decimals)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Memuat...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="rounded-2xl shadow-xl p-6 text-white" style={{ backgroundColor: '#2E4E2A' }}>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">Executive Dashboard</h1>
                <p className="text-blue-100">
                  Strategic Monitoring & KPIs • {format(new Date(), 'EEEE, dd MMMM yyyy')}
                </p>
              </div>
              <div className="flex gap-2">
                {['week', 'month', 'quarter', 'year'].map(period => (
                  <button
                    key={period}
                    onClick={() => setSelectedPeriod(period as any)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedPeriod === period
                        ? 'bg-white text-blue-600'
                        : 'bg-blue-500/30 text-white hover:bg-blue-500/50'
                    }`}
                  >
                    {period === 'week' ? 'Minggu' :
                     period === 'month' ? 'Bulan' :
                     period === 'quarter' ? 'Kuartal' : 'Tahun'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Production & Productivity Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-green-600" />
              Produksi & Produktivitas
            </h2>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-700 font-medium">Total Produksi</p>
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-green-900 mb-2">
                {formatNumber(productionMetrics.totalProduction, 0)} ton
              </p>
              <div className="flex items-center gap-2">
                {productionMetrics.productionGrowth > 0 ? (
                  <ArrowUp className="w-4 h-4 text-green-600" />
                ) : (
                  <ArrowDown className="w-4 h-4 text-red-600" />
                )}
                <span className={`text-sm font-medium ${
                  productionMetrics.productionGrowth > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {productionMetrics.productionGrowth > 0 ? '+' : ''}{formatNumber(productionMetrics.productionGrowth)}%
                </span>
                <span className="text-xs text-gray-600">vs periode sebelumnya</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-700 font-medium">Produktivitas</p>
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-blue-900 mb-2">
                {formatNumber(productionMetrics.productivity, 1)} ton/ha
              </p>
              <p className="text-xs text-gray-600">Rata-rata per hektar</p>
            </div>

            <div className="border-2 rounded-xl p-6" style={{ backgroundColor: 'rgba(46, 78, 42, 0.1)', borderColor: '#2E4E2A' }}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-700 font-medium">Total Area</p>
                <Target className="w-6 h-6" style={{ color: '#2E4E2A' }} />
              </div>
              <p className="text-3xl font-bold mb-2" style={{ color: '#2E4E2A' }}>
                {formatNumber(productionMetrics.totalArea, 2)} ha
              </p>
              <p className="text-xs text-gray-600">Lahan aktif</p>
            </div>

            <div className="border-2 rounded-xl p-6" style={{ backgroundColor: 'rgba(46, 78, 42, 0.1)', borderColor: '#2E4E2A' }}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-700 font-medium">Perbandingan</p>
                <BarChart3 className="w-6 h-6" style={{ color: '#2E4E2A' }} />
              </div>
              <p className="text-lg font-bold mb-2" style={{ color: '#2E4E2A' }}>
                Site A: {formatNumber(6.2, 1)} ton/ha
              </p>
              <p className="text-sm text-gray-600">Terbaik</p>
              <p className="text-xs text-gray-500 mt-1">
                Site B: {formatNumber(5.8, 1)} ton/ha • Site C: {formatNumber(5.5, 1)} ton/ha
              </p>
            </div>
          </div>
        </div>

        {/* Financial Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-green-600" />
              Finansial
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-700 font-medium">Total Revenue</p>
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-900 mb-2">
                {formatCurrency(financialMetrics.totalRevenue)}
              </p>
              <p className="text-sm text-gray-600">
                {formatCurrency(financialMetrics.revenuePerHa)} / ha
              </p>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-700 font-medium">Total Cost</p>
                <DollarSign className="w-6 h-6 text-red-600" />
              </div>
              <p className="text-2xl font-bold text-red-900 mb-2">
                {formatCurrency(financialMetrics.totalCost)}
              </p>
              <p className="text-sm text-gray-600">
                {formatCurrency(financialMetrics.costPerHa)} / ha
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className={`text-sm font-medium ${
                  financialMetrics.budgetDeviation < 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {financialMetrics.budgetDeviation > 0 ? '+' : ''}{formatNumber(financialMetrics.budgetDeviation)}%
                </span>
                <span className="text-xs text-gray-600">deviasi anggaran</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-700 font-medium">Margin</p>
                <PieChart className="w-6 h-6 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-900 mb-2">
                {formatCurrency(financialMetrics.margin)}
              </p>
              <p className="text-lg font-semibold text-blue-700">
                {formatNumber(financialMetrics.marginPercentage, 1)}%
              </p>
              <p className="text-xs text-gray-600 mt-1">Margin percentage</p>
            </div>
          </div>
        </div>

        {/* Risk & Alerts Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Risk Metrics */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                Risiko & Alert Strategis
              </h2>
            </div>

            <div className="space-y-4">
              <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-700 font-medium">Lahan Berisiko</p>
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <p className="text-3xl font-bold text-red-900 mb-2">
                  {riskMetrics.atRiskFields} lahan
                </p>
                <p className="text-sm text-gray-600">
                  {formatNumber(riskMetrics.atRiskPercentage, 1)}% dari total
                </p>
              </div>

              <div className="bg-amber-50 border-l-4 border-amber-500 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-5 h-5 text-amber-600" />
                  <h4 className="font-semibold text-amber-900">Site Bermasalah</h4>
                </div>
                <ul className="space-y-1">
                  {riskMetrics.problemSites.map((site, idx) => (
                    <li key={idx} className="text-sm text-amber-700">• {site}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                  <h4 className="font-semibold text-red-900">Prediksi Gagal Panen</h4>
                </div>
                <p className="text-sm text-red-700">
                  {riskMetrics.predictedFailures} lahan berpotensi gagal panen tanpa intervensi
                </p>
              </div>
            </div>
          </div>

          {/* Execution Status */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-green-600" />
                Status Eksekusi Rekomendasi
              </h2>
            </div>

            <div className="space-y-4">
              <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-700 font-medium">Eksekusi Rate</p>
                  <Target className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-3xl font-bold text-green-900 mb-2">
                  {formatNumber(executionStatus.executionRate, 1)}%
                </p>
                <p className="text-sm text-gray-600">
                  {executionStatus.executedRecommendations} / {executionStatus.totalRecommendations} rekomendasi
                </p>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <h4 className="font-semibold text-blue-900">Dampak terhadap Hasil</h4>
                </div>
                <p className="text-sm text-blue-700">{executionStatus.impactOnResults}</p>
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>Progress Eksekusi</span>
                  <span>{formatNumber(executionStatus.executionRate, 1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className="bg-gradient-to-r from-green-500 to-green-600 h-4 rounded-full transition-all"
                    style={{ width: `${executionStatus.executionRate}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Production Trend Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-green-600" />
            Trend Produksi 12 Bulan Terakhir
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={productionTrendData}>
                <defs>
                  <linearGradient id="colorProduction" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  formatter={(value: number | undefined) => value !== undefined ? `${formatNumber(value, 0)} ton` : ''}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="production" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorProduction)"
                  name="Produksi (ton)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Site Comparison Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <BarChart3 className="w-6 h-6" style={{ color: '#2E4E2A' }} />
            Perbandingan Antar Site
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={siteComparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="site" tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Legend />
                <Bar dataKey="production" fill="#6366f1" name="Produksi (ton)" />
                <Bar dataKey="productivity" fill="#10b981" name="Produktivitas (ton/ha)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Financial Trend Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-green-600" />
            Trend Finansial 12 Bulan Terakhir
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={financialTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  formatter={(value: number | undefined) => value !== undefined ? formatCurrency(value) : ''}
                />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} name="Revenue (IDR)" />
                <Line type="monotone" dataKey="cost" stroke="#ef4444" strokeWidth={3} name="Cost (IDR)" />
                <Line type="monotone" dataKey="margin" stroke="#3b82f6" strokeWidth={3} name="Margin (IDR)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Distribution & Execution Trend */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Risk Distribution Pie Chart */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <PieChart className="w-6 h-6 text-red-600" />
              Distribusi Risiko Lahan
            </h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={riskDistributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => percent !== undefined ? `${name} ${(percent * 100).toFixed(0)}%` : name}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {riskDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Execution Trend Chart */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Activity className="w-6 h-6 text-green-600" />
              Trend Eksekusi Rekomendasi
            </h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={executionTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="week" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 10, fill: '#6b7280' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Bar dataKey="executed" fill="#10b981" name="Dieksekusi" />
                  <Bar dataKey="pending" fill="#f59e0b" name="Pending" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Trend Comparison - Season */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <BarChart3 className="w-6 h-6" style={{ color: '#2E4E2A' }} />
            Trend Produksi (Perbandingan Musim)
          </h2>
          <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-8 border-2 border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { season: 'MT 1 2024', production: 5.2, status: 'completed' },
                { season: 'MT 2 2024', production: 5.5, status: 'completed' },
                { season: 'MT 1 2025', production: 5.8, status: 'in-progress' },
                { season: 'MT 2 2025', production: 6.1, status: 'projected' }
              ].map((item, idx) => (
                <div key={idx} className="text-center">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-white ${
                    item.status === 'completed' ? 'bg-green-500' :
                    item.status === 'in-progress' ? 'bg-blue-500' :
                    'bg-gray-400'
                  }`}>
                    {item.status === 'completed' ? '✓' : item.status === 'in-progress' ? '●' : '?'}
                  </div>
                  <p className="text-sm font-semibold text-gray-900 mb-2">{item.season}</p>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(item.production, 1)} ton/ha</p>
                  {item.status === 'projected' && (
                    <p className="text-xs text-gray-500 mt-1">Proyeksi</p>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-6 pt-6 border-t border-gray-300">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span>Trend positif: +{((6.1 - 5.2) / 5.2 * 100).toFixed(1)}% peningkatan dalam 4 musim</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

