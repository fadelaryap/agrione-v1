'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authAPI, User, fieldsAPI, Field } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import FieldStatisticsChart from '@/components/charts/FieldStatisticsChart'

export default function AnalyticsPage() {
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
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-2">Field statistics and insights</p>
        </div>

        <FieldStatisticsChart fields={fields} />
      </div>
    </DashboardLayout>
  )
}

