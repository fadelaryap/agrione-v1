'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authAPI, User, fieldsAPI, Field } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import MapWrapper from '@/components/map/MapWrapper'
import FieldStatisticsChart from '@/components/charts/FieldStatisticsChart'
import FieldReportsChart from '@/components/charts/FieldReportsChart'
import DashboardStats from '@/components/dashboard/DashboardStats'

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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 pb-20 lg:pb-8">
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-600 mt-2">Selamat datang kembali, <span className="font-semibold text-indigo-600">{user.first_name}!</span></p>
              </div>
              <div className="hidden sm:flex items-center gap-4">
                <div className="bg-white rounded-lg shadow-sm px-4 py-2 border border-gray-200">
                  <p className="text-xs text-gray-500">Role</p>
                  <p className="text-sm font-semibold text-gray-900">{user.role}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Dashboard Stats - Real-time */}
          <div className="mb-8">
            <DashboardStats />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Field Statistics Chart */}
            <div className="lg:col-span-1">
              <FieldStatisticsChart fields={fields} />
            </div>

            {/* Field Reports Chart */}
            <div className="lg:col-span-1">
              <FieldReportsChart />
            </div>
          </div>

          {/* Map View - Read Only */}
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Overview Lahan</h2>
              <span className="text-sm text-gray-500">{fields.length} lahan terdaftar</span>
            </div>
            <div className="rounded-lg overflow-hidden border border-gray-200">
              <MapWrapper isEditMode={false} />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
