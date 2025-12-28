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

export interface MaterialRequirement {
  item_id: number
  quantity: number
  warehouse_id?: number
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
  cultivation_season_id?: number
  start_date: string
  end_date: string
  progress: number
  description?: string
  requirements?: string[]
  material_requirements?: MaterialRequirement[]
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

export interface CultivationSeason {
  id: number
  field_id: number
  field_name?: string
  name: string
  planting_date: string
  status: 'active' | 'completed'
  completed_date?: string
  notes?: string
  created_by: string
  created_at: string
  updated_at: string
}

export const cultivationSeasonsAPI = {
  listCultivationSeasons: async (params?: {
    field_id?: number
    status?: string
  }): Promise<CultivationSeason[]> => {
    const queryParams = new URLSearchParams()
    if (params?.field_id) queryParams.append('field_id', params.field_id.toString())
    if (params?.status) queryParams.append('status', params.status)
    
    const url = `/cultivation-seasons${queryParams.toString() ? '?' + queryParams.toString() : ''}`
    const response = await api.get<CultivationSeason[]>(url)
    return Array.isArray(response.data) ? response.data : []
  },
  getCultivationSeason: async (id: number): Promise<CultivationSeason> => {
    const response = await api.get<CultivationSeason>(`/cultivation-seasons/${id}`)
    return response.data
  },
  createCultivationSeason: async (data: {
    field_id: number
    name: string
    planting_date: string
    notes?: string
    created_by: string
  }): Promise<CultivationSeason> => {
    const response = await api.post<CultivationSeason>('/cultivation-seasons', data)
    return response.data
  },
  updateCultivationSeason: async (id: number, data: {
    name?: string
    status?: 'active' | 'completed'
    completed_date?: string
    notes?: string
  }): Promise<CultivationSeason> => {
    const response = await api.put<CultivationSeason>(`/cultivation-seasons/${id}`, data)
    return response.data
  },
  deleteCultivationSeason: async (id: number): Promise<void> => {
    await api.delete(`/cultivation-seasons/${id}`)
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

    try {
      const response = await fetch('/upload', {
        method: 'POST',
        body: formData,
        // Don't use signal to avoid AbortSignal errors
        credentials: 'same-origin',
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: errorText || 'Failed to upload file' }
        }
        throw new Error(errorData.error || errorData.details || 'Failed to upload file')
      }

      const data = await response.json()
      return data.url
    } catch (error: any) {
      // Handle specific AbortSignal errors
      if (error.name === 'AbortError' || error.message?.includes('AbortSignal')) {
        throw new Error('Upload dibatalkan. Silakan coba lagi.')
      }
      throw error
    }
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
  listAllAttendances: async (params?: { start_date?: string; end_date?: string; user_id?: number }): Promise<Attendance[]> => {
    const queryParams = new URLSearchParams()
    if (params?.start_date) {
      queryParams.append('start_date', params.start_date)
    }
    if (params?.end_date) {
      queryParams.append('end_date', params.end_date)
    }
    if (params?.user_id) {
      queryParams.append('user_id', params.user_id.toString())
    }
    const response = await api.get<Attendance[]>(`/attendance/all?${queryParams.toString()}`)
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

// Inventory Interfaces
export interface InventoryItem {
  id: number
  sku: string
  name: string
  category: string
  unit: string
  reorder_point: number
  status: string
  avg_cost: number
  description?: string
  suppliers: string[]
  created_at?: string
  updated_at?: string
}

export interface StockLot {
  id: number
  lot_id: string
  item: InventoryItem
  warehouse: {
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
  batch_no: string
  quantity: number
  unit_cost: number
  total_cost: number
  expiry_date?: string
  supplier: string
  status: string
  notes?: string
  received_date: string
  created_at?: string
  updated_at?: string
}

export interface StockMovement {
  id: number
  movement_id: string
  item: InventoryItem
  lot?: StockLot
  warehouse: {
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
  type: 'in' | 'out' | 'transfer' | 'adjustment'
  quantity: number
  unit_cost: number
  total_cost: number
  reason: string
  reference?: string
  performed_by: string
  notes?: string
  created_at?: string
  updated_at?: string
}

export interface InventoryStats {
  total_items: number
  stock_value: number
  total_warehouses: number
  low_stock_count: number
  recent_movements: number
}

export interface Warehouse {
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

export const inventoryAPI = {
  // Inventory Items
  listItems: async (params?: { search?: string; category?: string; page?: number; limit?: number }): Promise<InventoryItem[]> => {
    const queryParams = new URLSearchParams()
    if (params?.search) queryParams.append('search', params.search)
    if (params?.category && params.category !== 'all') queryParams.append('category', params.category)
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    const response = await api.get<InventoryItem[]>(`/inventory/items?${queryParams.toString()}`)
    return Array.isArray(response.data) ? response.data : []
  },
  getItem: async (id: number): Promise<InventoryItem> => {
    const response = await api.get<InventoryItem>(`/inventory/items/${id}`)
    return response.data
  },
  createItem: async (data: {
    sku: string
    name: string
    category: string
    unit: string
    reorder_point: number
    status?: string
    avg_cost?: number
    description?: string
    suppliers?: string[]
  }): Promise<InventoryItem> => {
    const response = await api.post<InventoryItem>('/inventory/items', data)
    return response.data
  },
  updateItem: async (id: number, data: Partial<InventoryItem>): Promise<InventoryItem> => {
    const response = await api.put<InventoryItem>(`/inventory/items/${id}`, data)
    return response.data
  },
  deleteItem: async (id: number): Promise<void> => {
    await api.delete(`/inventory/items/${id}`)
  },

  // Stock Lots
  listStockLots: async (params?: { search?: string; warehouse?: string; status?: string; page?: number; limit?: number }): Promise<StockLot[]> => {
    const queryParams = new URLSearchParams()
    if (params?.search) queryParams.append('search', params.search)
    if (params?.warehouse && params.warehouse !== 'all') queryParams.append('warehouse', params.warehouse)
    if (params?.status && params.status !== 'all') queryParams.append('status', params.status)
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    const response = await api.get<StockLot[]>(`/inventory/stock-lots?${queryParams.toString()}`)
    return Array.isArray(response.data) ? response.data : []
  },
  createStockLot: async (data: {
    item_id: number
    warehouse_id: number
    batch_no: string
    quantity: number
    unit_cost: number
    expiry_date?: string
    supplier: string
    notes?: string
  }): Promise<StockLot> => {
    const response = await api.post<StockLot>('/inventory/stock-lots', data)
    return response.data
  },
  removeStock: async (data: {
    lot_id: number
    quantity: number
    reason: string
    reference?: string
    performed_by: string
    notes?: string
  }): Promise<void> => {
    await api.post('/inventory/stock-lots/remove', data)
  },

  // Stock Movements
  listMovements: async (params?: { search?: string; type?: string; item_id?: number; warehouse_id?: number; page?: number; limit?: number }): Promise<StockMovement[]> => {
    const queryParams = new URLSearchParams()
    if (params?.search) queryParams.append('search', params.search)
    if (params?.type && params.type !== 'all') queryParams.append('type', params.type)
    if (params?.item_id) queryParams.append('item_id', params.item_id.toString())
    if (params?.warehouse_id) queryParams.append('warehouse_id', params.warehouse_id.toString())
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    const response = await api.get<StockMovement[]>(`/inventory/stock-movements?${queryParams.toString()}`)
    return Array.isArray(response.data) ? response.data : []
  },

  // Stats
  getStats: async (): Promise<InventoryStats> => {
    const response = await api.get<InventoryStats>('/inventory/stats')
    return response.data
  },

  // Warehouses
  listWarehouses: async (params?: { search?: string }): Promise<Warehouse[]> => {
    const queryParams = new URLSearchParams()
    if (params?.search) queryParams.append('search', params.search)
    const response = await api.get<Warehouse[]>(`/inventory/warehouses?${queryParams.toString()}`)
    return Array.isArray(response.data) ? response.data : []
  },
}

// Stock Requests Interfaces
export interface StockRequest {
  id: number
  request_id: string
  work_order_id: number
  work_order_title?: string
  item: InventoryItem
  quantity: number
  warehouse_id?: number
  warehouse?: Warehouse
  status: 'pending' | 'approved' | 'rejected' | 'fulfilled' | 'cancelled'
  requested_by: string
  approved_by?: string
  approved_at?: string
  rejection_reason?: string
  fulfilled_at?: string
  notes?: string
  available_stock?: number
  created_at?: string
  updated_at?: string
}

export interface CreateStockRequestData {
  work_order_id: number
  item_id: number
  quantity: number
  warehouse_id?: number
  notes?: string
  requested_by: string
}

export interface ApproveStockRequestData {
  approved_by: string
  notes?: string
}

export interface RejectStockRequestData {
  rejected_by: string
  rejection_reason: string
}

export const stockRequestsAPI = {
  listStockRequests: async (params?: {
    work_order_id?: number
    status?: string
    item_id?: number
    page?: number
    limit?: number
  }): Promise<StockRequest[]> => {
    const queryParams = new URLSearchParams()
    if (params?.work_order_id) queryParams.append('work_order_id', params.work_order_id.toString())
    if (params?.status && params.status !== 'all') queryParams.append('status', params.status)
    if (params?.item_id) queryParams.append('item_id', params.item_id.toString())
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    const response = await api.get<StockRequest[]>(`/inventory/stock-requests?${queryParams.toString()}`)
    return Array.isArray(response.data) ? response.data : []
  },
  getStockRequest: async (id: number): Promise<StockRequest> => {
    const response = await api.get<StockRequest>(`/inventory/stock-requests/${id}`)
    return response.data
  },
  createStockRequest: async (data: CreateStockRequestData): Promise<StockRequest> => {
    const response = await api.post<StockRequest>('/inventory/stock-requests', data)
    return response.data
  },
  approveStockRequest: async (id: number, data: ApproveStockRequestData): Promise<StockRequest> => {
    const response = await api.post<StockRequest>(`/inventory/stock-requests/${id}/approve`, data)
    return response.data
  },
  rejectStockRequest: async (id: number, data: RejectStockRequestData): Promise<StockRequest> => {
    const response = await api.post<StockRequest>(`/inventory/stock-requests/${id}/reject`, data)
    return response.data
  },
  fulfillStockRequest: async (id: number): Promise<StockRequest> => {
    const response = await api.post<StockRequest>(`/inventory/stock-requests/${id}/fulfill`, {})
    return response.data
  },
}

