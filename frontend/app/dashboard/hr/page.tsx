'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authAPI, User, attendanceAPI, AttendanceStats, UserAttendanceStats, fieldsAPI, Field } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Users, MapPin, Calendar, TrendingUp, Clock, CheckCircle, XCircle, Mail, User as UserIcon, Building2 } from 'lucide-react'
import { toast } from 'sonner'

export default function HRPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [stats, setStats] = useState<AttendanceStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<UserAttendanceStats | null>(null)
  const [userFields, setUserFields] = useState<Field[]>([])

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (user) {
      loadStats()
    }
  }, [user])

  useEffect(() => {
    if (selectedUser) {
      loadUserFields(selectedUser.user_id)
    }
  }, [selectedUser])

  const checkAuth = async () => {
    try {
      const profile = await authAPI.getProfile()
      if (profile.role !== 'Level 1' && profile.role !== 'Level 2') {
        router.push('/dashboard')
        return
      }
      setUser(profile)
    } catch (err) {
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const data = await attendanceAPI.getAttendanceStats()
      setStats(data)
    } catch (err) {
      console.error('Failed to load attendance stats:', err)
      toast.error('Gagal memuat statistik absensi')
    }
  }

  const loadUserFields = async (userId: number) => {
    try {
      const fields = await fieldsAPI.listFields(userId)
      setUserFields(fields || [])
    } catch (err) {
      console.error('Failed to load user fields:', err)
      setUserFields([])
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!user || !stats) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8">
        {/* Header */}
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <Building2 className="h-8 w-8 text-indigo-600" />
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Manajemen HR</h1>
                <p className="text-gray-600 mt-1">Kelola karyawan Level 3 & 4 dan statistik absensi</p>
              </div>
            </div>
          </div>
        </div>

        {/* Overall Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Karyawan</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total_users}</p>
              </div>
              <Users className="w-12 h-12 text-blue-500 opacity-50" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Absen Hari Ini</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.today_attendance}</p>
              </div>
              <Calendar className="w-12 h-12 text-green-500 opacity-50" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Absen Minggu Ini</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.this_week_attendance}</p>
              </div>
              <TrendingUp className="w-12 h-12 text-purple-500 opacity-50" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-indigo-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Absen Bulan Ini</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.this_month_attendance}</p>
              </div>
              <Clock className="w-12 h-12 text-indigo-500 opacity-50" />
            </div>
          </div>
        </div>

        {/* User List */}
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            Daftar Karyawan (Level 3 & 4)
          </h2>

          {stats.attendance_by_user.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">Tidak ada karyawan Level 3 atau 4</p>
            </div>
          ) : (
            <div className="space-y-4">
              {stats.attendance_by_user.map((userStat) => (
                <div
                  key={userStat.user_id}
                  className={`border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${
                    selectedUser?.user_id === userStat.user_id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200'
                  }`}
                  onClick={() => setSelectedUser(userStat)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                          <UserIcon className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{userStat.user_name}</h3>
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            {userStat.user_email}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          userStat.user_role === 'Level 3'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {userStat.user_role}
                        </span>
                      </div>

                      {/* Assigned Fields */}
                      {userStat.assigned_fields && userStat.assigned_fields.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          {userStat.assigned_fields.map((field) => (
                            <span
                              key={field.id}
                              className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                            >
                              {field.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Attendance Stats */}
                    <div className="flex flex-col gap-2 text-right">
                      <div className="text-sm">
                        <span className="text-gray-600">Total: </span>
                        <span className="font-semibold text-gray-900">{userStat.total_attendance}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-600">Hari ini: </span>
                        <span className={`font-semibold ${
                          userStat.today_attendance > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {userStat.today_attendance}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-600">Minggu ini: </span>
                        <span className="font-semibold text-gray-900">{userStat.this_week_attendance}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-600">Bulan ini: </span>
                        <span className="font-semibold text-gray-900">{userStat.this_month_attendance}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected User Details Modal */}
        {selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900">Detail Karyawan</h3>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">{selectedUser.user_name}</h4>
                    <p className="text-sm text-gray-600">{selectedUser.user_email}</p>
                    <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${
                      selectedUser.user_role === 'Level 3'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {selectedUser.user_role}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">Total Absen</p>
                      <p className="text-2xl font-bold text-gray-900">{selectedUser.total_attendance}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">Absen Hari Ini</p>
                      <p className={`text-2xl font-bold ${
                        selectedUser.today_attendance > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {selectedUser.today_attendance}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">Absen Minggu Ini</p>
                      <p className="text-2xl font-bold text-gray-900">{selectedUser.this_week_attendance}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">Absen Bulan Ini</p>
                      <p className="text-2xl font-bold text-gray-900">{selectedUser.this_month_attendance}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-indigo-600" />
                      Field yang Ditugaskan
                    </h4>
                    {userFields.length === 0 ? (
                      <p className="text-sm text-gray-500">Tidak ada field yang ditugaskan</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {userFields.map((field) => (
                          <div
                            key={field.id}
                            className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer"
                            onClick={() => router.push(`/dashboard/fields`)}
                          >
                            <p className="font-medium text-gray-900">{field.name}</p>
                            {field.description && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{field.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

