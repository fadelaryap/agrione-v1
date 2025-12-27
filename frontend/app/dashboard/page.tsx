'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authAPI, User, fieldsAPI, Field } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import MapWrapper from '@/components/map/MapWrapper'
import FieldStatisticsChart from '@/components/charts/FieldStatisticsChart'
import FieldReportsChart from '@/components/charts/FieldReportsChart'
import HectaresChart from '@/components/charts/HectaresChart'
import DashboardStats from '@/components/dashboard/DashboardStats'
import HarvestStats from '@/components/dashboard/HarvestStats'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [fields, setFields] = useState<Field[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
    loadFields()
  }, [])

  const checkAuth = async () => {
    try {
      const profile = await authAPI.getProfile()
      if (profile.role === 'superadmin') {
        router.push('/suadm')
        return
      }
      if (profile.role === 'Level 3' || profile.role === 'Level 4') {
        router.push('/lapangan')
        return
      }
      setUser(profile)
    } catch (err) {
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const loadFields = async () => {
    try {
      const data = await fieldsAPI.listFields()
      setFields(data)
    } catch (err) {
      console.error('Failed to load fields:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 pb-20 lg:pb-8">
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Header - Compact */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-sm text-gray-500 mt-1">Selamat datang, <span className="font-medium text-gray-700">{user.first_name}</span></p>
              </div>
              <div className="hidden sm:flex items-center gap-3">
                <div className="bg-white rounded-lg px-3 py-1.5 border border-gray-200 shadow-sm">
                  <p className="text-xs text-gray-500">Role</p>
                  <p className="text-sm font-semibold text-gray-900">{user.role}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Compact Stats Grid - 2 rows, multiple columns */}
          <div className="mb-6">
            <DashboardStats />
          </div>

          {/* Harvest Stats - Only show if there are harvest reports */}
          <div className="mb-6">
            <HarvestStats />
          </div>

          {/* Charts Grid - Modern Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            {/* Hectares Chart - Full width on mobile, 2 columns on desktop */}
            <div className="lg:col-span-2">
              <HectaresChart fields={fields} />
            </div>

            {/* Field Statistics Chart - Compact */}
            <div className="lg:col-span-1">
              <FieldStatisticsChart fields={fields} />
            </div>
          </div>

          {/* Second Row Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Field Reports Chart */}
            <div className="lg:col-span-2">
              <FieldReportsChart />
            </div>
          </div>

          {/* Map View - Compact */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">Overview Lahan</h2>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{fields.length} lahan</span>
            </div>
            <div className="rounded-lg overflow-hidden border border-gray-200 h-96">
              <MapWrapper isEditMode={false} />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
