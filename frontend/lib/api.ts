import axios from 'axios'

// NEXT_PUBLIC_API_URL should include /api (e.g., https://agrione.agrihub.id/api)
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

export const api = axios.create({
  baseURL: API_URL, // API_URL already includes /api
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token and CSRF token to requests if available
if (typeof window !== 'undefined') {
  // Get CSRF token from cookie or fetch from API
  const getCSRFToken = async (): Promise<string | null> => {
    // Try to get from cookie first
    const cookies = document.cookie.split(';')
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=')
      if (name === '_gorilla_csrf') {
        return decodeURIComponent(value)
      }
    }
    
    // If no token in cookie, fetch from API
    try {
      const response = await fetch(`${API_URL}/csrf`, {
        method: 'GET',
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        return data.token
      }
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error)
    }
    
    return null
  }
  
  api.interceptors.request.use(async (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // Add CSRF token for state-changing methods
    if (['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase() || '')) {
      const csrfToken = await getCSRFToken()
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken
      }
    }
    
    return config
  })

  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('token')
        window.location.href = '/login'
      }
      return Promise.reject(error)
    }
  )
}

export interface SignupData {
  email: string
  username: string
  first_name: string
  last_name: string
  password: string
}

export interface LoginData {
  email: string
  password: string
}

export interface AuthResponse {
  message: string
  token?: string
  user: {
    id: number
    email: string
    username: string
    first_name: string
    last_name: string
    role: string
    status?: string
  }
}

export interface User {
  id: number
  email: string
  username: string
  first_name: string
  last_name: string
  role: string
  status?: string
}

export interface UsersListResponse {
  users: User[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export const authAPI = {
  signup: async (data: SignupData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/signup', data)
    return response.data
  },
  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/login', data)
    return response.data
  },
  logout: async (): Promise<void> => {
    await api.post('/logout')
  },
  getProfile: async () => {
    const response = await api.get('/profile')
    return response.data
  },
}

export interface Field {
  id: number
  name: string
  description?: string
  area?: number
  coordinates: any
  draw_type: string
  plant_type_id?: number
  soil_type_id?: number
  user_id?: number
  user_name?: string // First name + Last name
  created_at?: string
  updated_at?: string
}

export interface Plot {
  id: number
  name: string
  description?: string
  type: string
  apikey: string
  coordinates: any
  field_ref?: number
  created_at?: string
  updated_at?: string
}

export interface PlantType {
  id: number
  name: string
  created_at?: string
  updated_at?: string
}

export interface WorkOrder {
  id: number
  title: string
  category: string
  activity: string
  status: 'pending' | 'in-progress' | 'completed' | 'overdue' | 'cancelled'
  priority: 'low' | 'medium' | 'high'
  assignee: string
  field_id?: number
  field_name?: string
  start_date: string
  end_date: string
  progress: number
  description?: string
  requirements?: string[]
  actual_hours?: number
  notes?: string
  created_by: string
  last_updated_by?: string
  completed_date?: string
  created_at?: string
  updated_at?: string
}

export const usersAPI = {
  listUsers: async (page: number = 1, pageSize: number = 10): Promise<UsersListResponse> => {
    const response = await api.get<UsersListResponse>(`/users?page=${page}&page_size=${pageSize}`)
    return response.data
  },
  updateUserRole: async (userId: number, role: string): Promise<User> => {
    const response = await api.put<User>(`/users/${userId}/role`, { role })
    return response.data
  },
  updateUserStatus: async (userId: number, status: string): Promise<User> => {
    const response = await api.put<User>(`/users/${userId}/status`, { status })
    return response.data
  },
}

export const fieldsAPI = {
  listFields: async (userId?: number): Promise<Field[]> => {
    const url = userId ? `/fields?user_id=${userId}` : '/fields'
    const response = await api.get<Field[]>(url)
    return Array.isArray(response.data) ? response.data : []
  },
  getField: async (id: number): Promise<Field> => {
    const response = await api.get<Field>(`/fields/${id}`)
    return response.data
  },
  createField: async (data: Partial<Field>): Promise<Field> => {
    const response = await api.post<Field>('/fields', data)
    return response.data
  },
  updateField: async (id: number, data: Partial<Field>): Promise<Field> => {
    const response = await api.put<Field>(`/fields/${id}`, data)
    return response.data
  },
  deleteField: async (id: number): Promise<void> => {
    await api.delete(`/fields/${id}`)
  },
  assignFieldToUser: async (fieldId: number, userId: number | null): Promise<Field> => {
    const response = await api.put<Field>(`/fields/${fieldId}/assign`, { user_id: userId })
    return response.data
  },
}

export const plotsAPI = {
  listPlots: async (): Promise<Plot[]> => {
    const response = await api.get<Plot[]>('/plots')
    return Array.isArray(response.data) ? response.data : []
  },
  getPlot: async (id: number): Promise<Plot> => {
    const response = await api.get<Plot>(`/plots/${id}`)
    return response.data
  },
  createPlot: async (data: Partial<Plot>): Promise<Plot> => {
    const response = await api.post<Plot>('/plots', data)
    return response.data
  },
  updatePlot: async (id: number, data: Partial<Plot>): Promise<Plot> => {
    const response = await api.put<Plot>(`/plots/${id}`, data)
    return response.data
  },
  deletePlot: async (id: number): Promise<void> => {
    await api.delete(`/plots/${id}`)
  },
}

export const plantTypesAPI = {
  listPlantTypes: async (): Promise<PlantType[]> => {
    const response = await api.get<PlantType[]>('/plant-types')
    return Array.isArray(response.data) ? response.data : []
  },
  getPlantType: async (id: number): Promise<PlantType> => {
    const response = await api.get<PlantType>(`/plant-types/${id}`)
    return response.data
  },
  createPlantType: async (data: { name: string }): Promise<PlantType> => {
    const response = await api.post<PlantType>('/plant-types', data)
    return response.data
  },
  updatePlantType: async (id: number, data: { name: string }): Promise<PlantType> => {
    const response = await api.put<PlantType>(`/plant-types/${id}`, data)
    return response.data
  },
  deletePlantType: async (id: number): Promise<void> => {
    await api.delete(`/plant-types/${id}`)
  },
}

export const workOrdersAPI = {
  listWorkOrders: async (params?: {
    status?: string
    category?: string
    search?: string
    field_id?: number
    assignee?: string
  }): Promise<WorkOrder[]> => {
    const queryParams = new URLSearchParams()
    if (params?.status) queryParams.append('status', params.status)
    if (params?.category) queryParams.append('category', params.category)
    if (params?.search) queryParams.append('search', params.search)
    if (params?.field_id) queryParams.append('field_id', params.field_id.toString())
    if (params?.assignee) queryParams.append('assignee', params.assignee)
    
    const url = `/work-orders${queryParams.toString() ? '?' + queryParams.toString() : ''}`
    const response = await api.get<WorkOrder[]>(url)
    return Array.isArray(response.data) ? response.data : []
  },
  getWorkOrder: async (id: number): Promise<WorkOrder> => {
    const response = await api.get<WorkOrder>(`/work-orders/${id}`)
    return response.data
  },
  createWorkOrder: async (data: Partial<WorkOrder>): Promise<WorkOrder> => {
    const response = await api.post<WorkOrder>('/work-orders', data)
    return response.data
  },
  updateWorkOrder: async (id: number, data: Partial<WorkOrder>): Promise<WorkOrder> => {
    const response = await api.put<WorkOrder>(`/work-orders/${id}`, data)
    return response.data
  },
  deleteWorkOrder: async (id: number): Promise<void> => {
    await api.delete(`/work-orders/${id}`)
  },
}

export interface FieldReport {
  id: number
  title: string
  description?: string
  condition: string
  coordinates: { latitude: number; longitude: number }
  notes?: string
  submitted_by: string
  work_order_id?: number
  progress?: number
  media: Array<{
    type: 'photo' | 'video'
    url: string
    filename: string
    size: number
    uploadedAt: string
  }>
  status: 'pending' | 'approved' | 'rejected'
  approved_by?: string
  approved_at?: string
  rejection_reason?: string
  harvest_quantity?: number // For Panen activity (in ton/kg)
  harvest_quality?: string // For Panen activity
  created_at: string
  updated_at: string
  comments?: FieldReportComment[]
}

export interface FieldReportComment {
  id: number
  field_report_id: number
  comment: string
  commented_by: string
  created_at: string
  updated_at: string
}

export interface Attendance {
  id: number
  user_id: number
  date: string
  session: 'pagi' | 'sore'
  selfie_image: string
  back_camera_image?: string
  has_issue: boolean
  description?: string
  latitude?: number
  longitude?: number
  check_in_time: string
  check_out_time?: string
  status: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface AttendanceStats {
  total_users: number
  total_attendance: number
  today_attendance: number
  this_week_attendance: number
  this_month_attendance: number
  attendance_by_user: UserAttendanceStats[]
}

export interface UserAttendanceStats {
  user_id: number
  user_name: string
  user_email: string
  user_role: string
  total_attendance: number
  today_attendance: number
  this_week_attendance: number
  this_month_attendance: number
  assigned_fields: FieldInfo[]
}

export interface FieldInfo {
  id: number
  name: string
}

export const fieldReportsAPI = {
  listFieldReports: async (params?: { work_order_id?: number; include_comments?: boolean }): Promise<FieldReport[]> => {
    const queryParams = new URLSearchParams()
    if (params?.work_order_id) {
      queryParams.append('work_order_id', params.work_order_id.toString())
    }
    if (params?.include_comments) {
      queryParams.append('include_comments', 'true')
    }
    const response = await api.get<FieldReport[]>(`/field-reports?${queryParams.toString()}`)
    return Array.isArray(response.data) ? response.data : []
  },
  getFieldReport: async (id: number): Promise<FieldReport> => {
    const response = await api.get<FieldReport>(`/field-reports/${id}`)
    return response.data
  },
  createFieldReport: async (data: Partial<FieldReport>): Promise<FieldReport> => {
    const response = await api.post<FieldReport>('/field-reports', data)
    return response.data
  },
  updateFieldReport: async (id: number, data: Partial<FieldReport>): Promise<FieldReport> => {
    const response = await api.put<FieldReport>(`/field-reports/${id}`, data)
    return response.data
  },
  deleteFieldReport: async (id: number): Promise<void> => {
    await api.delete(`/field-reports/${id}`)
  },
  addComment: async (fieldReportId: number, comment: string, commentedBy: string): Promise<FieldReportComment> => {
    const response = await api.post<FieldReportComment>(`/field-reports/${fieldReportId}/comments`, {
      comment,
      commented_by: commentedBy,
    })
    return response.data
  },
  approveFieldReport: async (id: number, approvedBy: string): Promise<FieldReport> => {
    const response = await api.post<FieldReport>(`/field-reports/${id}/approve`, {
      approved_by: approvedBy,
    })
    return response.data
  },
  rejectFieldReport: async (id: number, rejectedBy: string, rejectionReason: string): Promise<FieldReport> => {
    const response = await api.post<FieldReport>(`/field-reports/${id}/reject`, {
      rejected_by: rejectedBy,
      rejection_reason: rejectionReason,
    })
    return response.data
  },
}

export const uploadAPI = {
  // Upload file via Next.js API route (simple approach)
  // Using /upload instead of /api/upload to avoid conflict with Go backend
  uploadFile: async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/upload', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to upload file')
    }

    const data = await response.json()
    return data.url
  },
}

export interface Notification {
  id: number
  type: string
  title: string
  message: string
  link: string
  read: boolean
  created_at: string
}

export interface NotificationsResponse {
  notifications: Notification[]
  unread_count: number
}

export const notificationsAPI = {
  getNotifications: async (): Promise<NotificationsResponse> => {
    const response = await api.get<NotificationsResponse>('/notifications')
    return response.data
  },
  markAsRead: async (notificationId: number): Promise<void> => {
    await api.put(`/notifications/${notificationId}/read`)
  },
  markAllAsRead: async (): Promise<void> => {
    await api.put('/notifications/read-all')
  },
}

export const attendanceAPI = {
  getTodayAttendance: async (): Promise<Attendance[]> => {
    const response = await api.get<Attendance[]>('/attendance/today')
    return Array.isArray(response.data) ? response.data : []
  },
  getAttendanceStats: async (): Promise<AttendanceStats> => {
    const response = await api.get<AttendanceStats>('/attendance/stats')
    return response.data
  },
  listAttendance: async (params?: { start_date?: string; end_date?: string }): Promise<Attendance[]> => {
    const queryParams = new URLSearchParams()
    if (params?.start_date) {
      queryParams.append('start_date', params.start_date)
    }
    if (params?.end_date) {
      queryParams.append('end_date', params.end_date)
    }
    const response = await api.get<Attendance[]>(`/attendance?${queryParams.toString()}`)
    return Array.isArray(response.data) ? response.data : []
  },
  getAttendance: async (id: number): Promise<Attendance> => {
    const response = await api.get<Attendance>(`/attendance/${id}`)
    return response.data
  },
  createAttendance: async (data: { 
    session: 'pagi' | 'sore'
    selfie_image: string
    back_camera_image?: string
    has_issue: boolean
    description?: string
    latitude?: number
    longitude?: number
    notes?: string
  }): Promise<Attendance> => {
    const response = await api.post<Attendance>('/attendance', data)
    return response.data
  },
}

