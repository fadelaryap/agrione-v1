'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { authAPI, User, attendanceAPI, Attendance, usersAPI, AttendanceStats } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Calendar, MapPin, User as UserIcon, Clock, Camera, AlertCircle, Filter, ArrowUpDown, Map, X, Eye, EyeOff } from 'lucide-react'
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { id } from 'date-fns/locale'
import { toast } from 'sonner'
import dynamic from 'next/dynamic'

// Dynamically import Leaflet map components to avoid SSR issues
const AttendanceMap = dynamic(() => import('@/components/attendance/AttendanceMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] flex items-center justify-center bg-gray-100 rounded-lg">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p className="mt-4 text-gray-600">Memuat peta...</p>
      </div>
    </div>
  ),
})

export default function AttendancePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [attendances, setAttendances] = useState<Attendance[]>([])
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  
  // Filters
  const [selectedUserId, setSelectedUserId] = useState<number | 'all'>('all')
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  })
  const [sessionFilter, setSessionFilter] = useState<'all' | 'pagi' | 'sore'>('all')
  const [hasIssueFilter, setHasIssueFilter] = useState<'all' | 'yes' | 'no'>('all')
  const [sortBy, setSortBy] = useState<'date' | 'user' | 'session'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
  const [selectedAttendance, setSelectedAttendance] = useState<Attendance | null>(null)
  const [showImageModal, setShowImageModal] = useState<{ url: string; title: string } | null>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (user && (user.role === 'Level 1' || user.role === 'Level 2')) {
      loadAttendanceStats()
      loadUsers()
    }
  }, [user])

  useEffect(() => {
    if (user && (user.role === 'Level 1' || user.role === 'Level 2') && users.length > 0) {
      loadAllAttendances()
    }
  }, [user, users, dateRange, selectedUserId])

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

  const loadUsers = async () => {
    try {
      const usersResponse = await usersAPI.listUsers(1, 1000) // Get all users
      const allUsers = usersResponse.users || []
      const level34Users = allUsers.filter(u => u.role === 'Level 3' || u.role === 'Level 4')
      setUsers(level34Users)
    } catch (err) {
      console.error('Failed to load users:', err)
      toast.error('Gagal memuat daftar pengguna')
    }
  }

  const loadAttendanceStats = async () => {
    try {
      const stats = await attendanceAPI.getAttendanceStats()
      setAttendanceStats(stats)
    } catch (err) {
      console.error('Failed to load attendance stats:', err)
    }
  }

  const loadAllAttendances = async () => {
    try {
      setLoading(true)
      // Use listAllAttendances API which is designed for admin/Level 1-2 users
      const allAttendances = await attendanceAPI.listAllAttendances({
        start_date: dateRange.start,
        end_date: dateRange.end,
        user_id: selectedUserId === 'all' ? undefined : selectedUserId as number,
      })
      
      setAttendances(allAttendances || [])
    } catch (err) {
      console.error('Failed to load attendances:', err)
      toast.error('Gagal memuat data absen')
      setAttendances([])
    } finally {
      setLoading(false)
    }
  }

  // Get attendances from stats (alternative approach)
  const getAttendancesFromStats = useMemo(() => {
    if (!attendanceStats || !attendanceStats.attendance_by_user) {
      return []
    }
    
    // Extract all attendances from stats
    const allAtt: any[] = []
    attendanceStats.attendance_by_user.forEach(userStats => {
      // We need actual attendance data, not just counts
      // This requires backend modification to return actual attendance records
    })
    
    return allAtt
  }, [attendanceStats])

  // Filtered and sorted attendances
  const filteredAttendances = useMemo(() => {
    let filtered = [...attendances]
    
    // Filter by user
    if (selectedUserId !== 'all') {
      filtered = filtered.filter(a => a.user_id === selectedUserId)
    }
    
    // Filter by session
    if (sessionFilter !== 'all') {
      filtered = filtered.filter(a => a.session === sessionFilter)
    }
    
    // Filter by has_issue
    if (hasIssueFilter !== 'all') {
      filtered = filtered.filter(a => 
        hasIssueFilter === 'yes' ? a.has_issue : !a.has_issue
      )
    }
    
    // Sort
    filtered.sort((a, b) => {
      let comparison = 0
      if (sortBy === 'date') {
        const aDate = a.date ? parseISO(a.date) : new Date(0)
        const bDate = b.date ? parseISO(b.date) : new Date(0)
        comparison = aDate.getTime() - bDate.getTime()
      } else if (sortBy === 'user') {
        const aUser = users.find(u => u.id === a.user_id)?.first_name || ''
        const bUser = users.find(u => u.id === b.user_id)?.first_name || ''
        comparison = aUser.localeCompare(bUser)
      } else if (sortBy === 'session') {
        comparison = a.session.localeCompare(b.session)
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })
    
    return filtered
  }, [attendances, selectedUserId, sessionFilter, hasIssueFilter, sortBy, sortOrder, users])

  // Get attendances with GPS coordinates for map
  const attendancesWithLocation = useMemo(() => {
    return filteredAttendances.filter(a => a.latitude && a.longitude)
  }, [filteredAttendances])

  const getUserName = (userId: number) => {
    const foundUser = users.find(u => u.id === userId)
    return foundUser ? `${foundUser.first_name} ${foundUser.last_name}` : `User ID: ${userId}`
  }

  const getSessionLabel = (session: string) => {
    return session === 'pagi' ? 'Pagi' : 'Sore'
  }

  const getStatusBadge = (status: string) => {
    const styles: { [key: string]: { bg: string; text: string } } = {
      'hadir': { bg: 'bg-green-100', text: 'text-green-800' },
      'tidak_hadir': { bg: 'bg-red-100', text: 'text-red-800' },
      'izin': { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    }
    const style = styles[status] || { bg: 'bg-gray-100', text: 'text-gray-800' }
    const labels: { [key: string]: string } = {
      'hadir': 'Hadir',
      'tidak_hadir': 'Tidak Hadir',
      'izin': 'Izin',
    }
    
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${style.bg} ${style.text}`}>
        {labels[status] || status}
      </span>
    )
  }

  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Memuat...</p>
        </div>
      </div>
    )
  }

  if (!user || (user.role !== 'Level 1' && user.role !== 'Level 2')) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-8 w-8 text-indigo-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Data Absensi</h1>
                  <p className="text-sm text-gray-600 mt-1">Kelola dan pantau data absensi karyawan</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    viewMode === 'map'
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {viewMode === 'map' ? <Eye className="h-5 w-5" /> : <Map className="h-5 w-5" />}
                  {viewMode === 'map' ? 'Tampilkan List' : 'Tampilkan Peta'}
                </button>
              </div>
            </div>

            {/* Stats Summary */}
            {attendanceStats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                  <div className="text-sm text-blue-600 font-medium">Total Karyawan</div>
                  <div className="text-2xl font-bold text-blue-900 mt-1">{attendanceStats.total_users || 0}</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                  <div className="text-sm text-green-600 font-medium">Absen Hari Ini</div>
                  <div className="text-2xl font-bold text-green-900 mt-1">{attendanceStats.today_attendance || 0}</div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                  <div className="text-sm text-purple-600 font-medium">Absen Minggu Ini</div>
                  <div className="text-2xl font-bold text-purple-900 mt-1">{attendanceStats.this_week_attendance || 0}</div>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
                  <div className="text-sm text-orange-600 font-medium">Absen Bulan Ini</div>
                  <div className="text-2xl font-bold text-orange-900 mt-1">{attendanceStats.this_month_attendance || 0}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* User Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Karyawan</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">Semua Karyawan</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.first_name} {u.last_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Mulai</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Akhir</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Session Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sesi</label>
              <select
                value={sessionFilter}
                onChange={(e) => setSessionFilter(e.target.value as 'all' | 'pagi' | 'sore')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">Semua</option>
                <option value="pagi">Pagi</option>
                <option value="sore">Sore</option>
              </select>
            </div>

            {/* Has Issue Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Kendala</label>
              <select
                value={hasIssueFilter}
                onChange={(e) => setHasIssueFilter(e.target.value as 'all' | 'yes' | 'no')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">Semua</option>
                <option value="yes">Ada Kendala</option>
                <option value="no">Tidak Ada Kendala</option>
              </select>
            </div>
          </div>

          {/* Sort Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Urutkan Berdasarkan</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'user' | 'session')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="date">Tanggal</option>
                <option value="user">Karyawan</option>
                <option value="session">Sesi</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Urutan</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSortOrder('asc')}
                  className={`flex-1 px-3 py-2 rounded-lg font-medium transition-colors ${
                    sortOrder === 'asc'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Naik
                </button>
                <button
                  onClick={() => setSortOrder('desc')}
                  className={`flex-1 px-3 py-2 rounded-lg font-medium transition-colors ${
                    sortOrder === 'desc'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Turun
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {viewMode === 'list' ? (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Data Absensi ({filteredAttendances.length})
              </h2>
            </div>

            {filteredAttendances.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Tidak Ada Data</h3>
                <p className="text-gray-600">Tidak ada data absensi yang sesuai dengan filter yang dipilih.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAttendances.map((attendance) => (
                  <div
                    key={attendance.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <UserIcon className="h-5 w-5 text-gray-400" />
                          <h3 className="text-lg font-semibold text-gray-900">
                            {getUserName(attendance.user_id)}
                          </h3>
                          {getStatusBadge(attendance.status || 'hadir')}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>{attendance.date ? format(parseISO(attendance.date), 'dd MMM yyyy', { locale: id }) : '-'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>{getSessionLabel(attendance.session)}</span>
                          </div>
                          {attendance.check_in_time && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <span>Check-in: {format(parseISO(attendance.check_in_time), 'HH:mm', { locale: id })}</span>
                            </div>
                          )}
                          {attendance.latitude && attendance.longitude && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              <span className="text-xs">{attendance.latitude.toFixed(6)}, {attendance.longitude.toFixed(6)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Images */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {attendance.selfie_image && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Kamera Depan</label>
                          <img
                            src={attendance.selfie_image}
                            alt="Selfie"
                            className="w-full h-48 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setShowImageModal({ url: attendance.selfie_image, title: 'Kamera Depan' })}
                          />
                        </div>
                      )}
                      {attendance.back_camera_image && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Kamera Belakang</label>
                          <img
                            src={attendance.back_camera_image}
                            alt="Back Camera"
                            className="w-full h-48 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setShowImageModal({ url: attendance.back_camera_image!, title: 'Kamera Belakang' })}
                          />
                        </div>
                      )}
                    </div>

                    {/* Issue and Description */}
                    {attendance.has_issue && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="h-5 w-5 text-red-600" />
                          <span className="font-semibold text-red-900">Ada Kendala</span>
                        </div>
                        {attendance.description && (
                          <p className="text-sm text-red-800">{attendance.description}</p>
                        )}
                      </div>
                    )}

                    {/* Notes */}
                    {attendance.notes && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Catatan:</span> {attendance.notes}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Trajectory Absensi ({attendancesWithLocation.length} lokasi)
            </h2>
            <AttendanceMap attendances={attendancesWithLocation} users={users} />
          </div>
        )}

        {/* Image Modal */}
        {showImageModal && (
          <div
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setShowImageModal(null)}
          >
            <button
              onClick={() => setShowImageModal(null)}
              className="fixed top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 z-10 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="relative max-w-7xl max-h-full">
              <img
                src={showImageModal.url}
                alt={showImageModal.title}
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
              <p className="text-white text-center mt-2 text-sm">{showImageModal.title}</p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

