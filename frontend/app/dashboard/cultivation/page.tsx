'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { authAPI, User, fieldsAPI, Field, workOrdersAPI, WorkOrder, cultivationSeasonsAPI, CultivationSeason } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Plus, Calendar, FileText, Save, Download, Upload, GanttChart, Grid3x3, MapPin, Sparkles, Layers } from 'lucide-react'
import { toast } from 'sonner'
import CultivationGanttChart from '@/components/cultivation/CultivationGanttChart'
import CultivationCardView from '@/components/cultivation/CultivationCardView'
import BatchCultivationDialog from '@/components/cultivation/BatchCultivationDialog'
import { 
  CultivationActivityItem, 
  CultivationTemplate, 
  CultivationActivity,
  CULTIVATION_ACTIVITIES,
  getDefaultCultivationTemplate,
  calculateDateFromHST,
  calculateHSTFromDate
} from '@/lib/cultivation'

export default function CultivationPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [fields, setFields] = useState<Field[]>([])
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [cultivationSeasons, setCultivationSeasons] = useState<CultivationSeason[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'gantt' | 'card'>('gantt')
  const [selectedField, setSelectedField] = useState<number | null>(null)
  const [activities, setActivities] = useState<CultivationActivityItem[]>([])
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showCustomModal, setShowCustomModal] = useState(false)
  const [showPlanningModal, setShowPlanningModal] = useState(false)
  const [showBatchDialog, setShowBatchDialog] = useState(false)
  const [templates, setTemplates] = useState<CultivationTemplate[]>([])
  const [plantingDate, setPlantingDate] = useState<string>('')
  const [filter, setFilter] = useState<'all' | 'has-active' | 'no-active'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'area' | 'status'>('name')

  useEffect(() => {
    checkAuth()
    loadFields()
  }, [])

  useEffect(() => {
    if (user) {
      loadWorkOrders()
      loadCultivationSeasons()
    }
  }, [user])
  
  const loadCultivationSeasons = async () => {
    try {
      const data = await cultivationSeasonsAPI.listCultivationSeasons({ status: 'active' })
      setCultivationSeasons(data || [])
    } catch (err) {
      console.error('Failed to load cultivation seasons:', err)
      setCultivationSeasons([])
    }
  }

  useEffect(() => {
    if (plantingDate) {
      loadTemplates()
    }
  }, [plantingDate])

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

  const loadWorkOrders = async () => {
    try {
      const data = await workOrdersAPI.listWorkOrders({})
      setWorkOrders(data || [])
    } catch (err) {
      console.error('Failed to load work orders:', err)
      setWorkOrders([])
    }
  }

  const loadTemplates = async () => {
    try {
      const saved = localStorage.getItem('cultivation_templates')
      const savedTemplates = saved ? JSON.parse(saved) : []
      
      if (plantingDate) {
        const defaultTemplate = getDefaultCultivationTemplate(plantingDate)
        setTemplates([defaultTemplate, ...savedTemplates])
      } else {
        setTemplates(savedTemplates)
      }
    } catch (err) {
      console.error('Failed to load templates:', err)
      setTemplates([])
    }
  }

  // Check if field has active cultivation season
  const fieldHasActiveSeason = (fieldId: number): boolean => {
    return cultivationSeasons.some(season => season.field_id === fieldId && season.status === 'active')
  }

  // Calculate fields with cultivation season status
  const fieldsWithStatus = useMemo(() => {
    let filtered = fields.map(field => {
      const hasActiveSeason = fieldHasActiveSeason(field.id)
      const fieldWorkOrders = workOrders.filter(wo => wo.field_id === field.id)
      
      return {
        ...field,
        hasActiveSeason,
        workOrderCount: fieldWorkOrders.length,
        completedCount: fieldWorkOrders.filter(wo => wo.status === 'completed').length
      }
    })
    
    // Apply filter
    if (filter === 'has-active') {
      filtered = filtered.filter(f => f.hasActiveSeason)
    } else if (filter === 'no-active') {
      filtered = filtered.filter(f => !f.hasActiveSeason)
    }
    
    // Apply sort
    filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name)
      } else if (sortBy === 'area') {
        const areaA = a.area || 0
        const areaB = b.area || 0
        return areaB - areaA
      } else if (sortBy === 'status') {
        // Sort by hasActiveSeason (active first)
        if (a.hasActiveSeason !== b.hasActiveSeason) {
          return a.hasActiveSeason ? -1 : 1
        }
        return a.name.localeCompare(b.name)
      }
      return 0
    })
    
    return filtered
  }, [fields, workOrders, cultivationSeasons, filter, sortBy])

  const openPlanningModal = (fieldId: number) => {
    // Check if field has active cultivation season
    if (fieldHasActiveSeason(fieldId)) {
      toast.error('Lahan ini masih memiliki masa tanam yang aktif. Silakan selesaikan masa tanam terlebih dahulu sebelum membuat masa tanam baru.')
      return
    }
    
    setSelectedField(fieldId)
    setActivities([])
    setPlantingDate('')
    setShowPlanningModal(true)
  }

  const closePlanningModal = () => {
    setShowPlanningModal(false)
    setSelectedField(null)
    setActivities([])
    setPlantingDate('')
  }

  const isPlantingDateRequired = () => {
    return !plantingDate
  }

  const saveTemplate = (template: Omit<CultivationTemplate, 'id' | 'createdAt'>) => {
    const newTemplate: CultivationTemplate = {
      ...template,
      id: `template_${Date.now()}`,
      createdAt: new Date().toISOString()
    }
    const updated = [...templates, newTemplate]
    setTemplates(updated)
    localStorage.setItem('cultivation_templates', JSON.stringify(updated))
    toast.success('Template berhasil disimpan')
  }

  const loadTemplate = (template: CultivationTemplate) => {
    if (!plantingDate) {
      toast.error('Harap tentukan tanggal tanam (HST 0) terlebih dahulu')
      return
    }

    const templatePlantingDate = template.plantingDate || plantingDate
    const currentPlantingDate = plantingDate
    
    const idMap: Record<string, string> = {}
    template.activities.forEach(a => {
      idMap[a.id] = `activity_${Date.now()}_${Math.random()}_${a.id}`
    })
    
    const recalculatedActivities = template.activities.map(a => {
      const newId = idMap[a.id]
      
      let newStartDate = a.startDate
      let newEndDate = a.endDate
      
      if (a.hstMin !== undefined && a.hstMax !== undefined) {
        newStartDate = calculateDateFromHST(currentPlantingDate, a.hstMin)
        newEndDate = calculateDateFromHST(currentPlantingDate, a.hstMax)
      } else if (templatePlantingDate !== currentPlantingDate) {
        // If no HST but planting date changed, try to maintain relative dates
      }
      
      return {
        ...a,
        id: newId,
        startDate: newStartDate,
        endDate: newEndDate,
        parentId: a.parentId ? idMap[a.parentId] : undefined
      }
    })
    
    setActivities(recalculatedActivities)
    setShowTemplateModal(false)
    toast.success(`Template "${template.name}" dimuat`)
  }

  const generateWorkOrders = async () => {
    if (activities.length === 0) {
      toast.error('Tidak ada aktivitas untuk di-generate')
      return
    }

    if (!selectedField) {
      toast.error('Pilih lahan terlebih dahulu')
      return
    }

    // Check if field already has active cultivation season
    if (fieldHasActiveSeason(selectedField)) {
      toast.error('Lahan ini masih memiliki masa tanam yang aktif. Silakan selesaikan masa tanam terlebih dahulu.')
      return
    }

    try {
      const field = fields.find(f => f.id === selectedField)
      if (!field) {
        toast.error('Lahan tidak ditemukan')
        return
      }

      // Get assignee from field's assigned user or find Level 3/4 user
      let assigneeName = ''
      if (field.user_id) {
        try {
          const { usersAPI } = await import('@/lib/api')
          const usersData = await usersAPI.listUsers(1, 100)
          const assignedUser = Array.isArray(usersData?.users) 
            ? usersData.users.find(u => u.id === field.user_id)
            : null
          if (assignedUser) {
            assigneeName = `${assignedUser.first_name} ${assignedUser.last_name}`
          }
        } catch (err) {
          console.error('Failed to load user:', err)
        }
      }

      if (!assigneeName) {
        try {
          const { usersAPI } = await import('@/lib/api')
          const usersData = await usersAPI.listUsers(1, 100)
          const level34Users = Array.isArray(usersData?.users) 
            ? usersData.users.filter(u => u.role === 'Level 3' || u.role === 'Level 4')
            : []
          if (level34Users.length > 0) {
            assigneeName = `${level34Users[0].first_name} ${level34Users[0].last_name}`
          }
        } catch (err) {
          console.error('Failed to load users:', err)
        }
      }

      if (!assigneeName) {
        toast.error('Tidak ditemukan pengguna untuk ditugaskan. Silakan tetapkan pengguna ke lahan terlebih dahulu.')
        return
      }

      // Generate season name (e.g., "MT 1 2025")
      const plantingDateObj = new Date(plantingDate)
      const year = plantingDateObj.getFullYear()
      
      // Get existing seasons for this field to determine next season number
      const existingSeasons = await cultivationSeasonsAPI.listCultivationSeasons({ field_id: selectedField })
      const seasonNumber = existingSeasons.length + 1
      const seasonName = `MT ${seasonNumber} ${year}`

      // Create cultivation season first
      const season = await cultivationSeasonsAPI.createCultivationSeason({
        field_id: selectedField,
        name: seasonName,
        planting_date: plantingDate,
        notes: `Masa tanam dengan ${activities.length} aktivitas`,
        created_by: user?.email || '',
      })

      // Generate work orders untuk setiap activity and link to season
      const promises = activities.map(async (activity) => {
        const workOrderData: Partial<WorkOrder> = {
          title: activity.title || activity.activity,
          category: 'cultivation',
          activity: activity.activity,
          status: 'pending' as const,
          priority: (activity.priority || 'medium') as 'low' | 'medium' | 'high',
          assignee: assigneeName,
          field_id: selectedField,
          cultivation_season_id: season.id,
          start_date: activity.startDate,
          end_date: activity.endDate,
          description: activity.description || `Aktivitas: ${activity.activity}`,
          created_by: user?.email || '',
        }

        return workOrdersAPI.createWorkOrder(workOrderData)
      })

      await Promise.all(promises)
      toast.success(`Masa tanam "${seasonName}" dengan ${activities.length} work order berhasil dibuat`)
      
      // Reload cultivation seasons and work orders, then close modal
      await loadCultivationSeasons()
      await loadWorkOrders()
      closePlanningModal()
      router.push('/dashboard/work-orders')
    } catch (err: any) {
      console.error('Failed to generate work orders:', err)
      toast.error('Gagal membuat work order: ' + (err.response?.data?.error || err.message))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Memuat...</p>
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
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Perencanaan Budidaya</h1>
              <p className="text-sm text-gray-500 mt-1">Buat work order untuk masa tanam baru</p>
            </div>
            <button
              onClick={() => setShowBatchDialog(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <Layers className="w-4 h-4" />
              Batch Generate
            </button>
          </div>

          {/* Fields List */}
          {fieldsWithStatus.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {fieldsWithStatus.map((field) => (
                <div
                  key={field.id}
                  className={`bg-white rounded-lg shadow-lg p-6 border-2 transition-all hover:shadow-xl ${
                    field.hasActiveSeason 
                      ? 'border-amber-200 cursor-not-allowed opacity-75' 
                      : 'border-gray-200 hover:border-indigo-300 cursor-pointer'
                  }`}
                  onClick={() => {
                    if (!field.hasActiveSeason) {
                      openPlanningModal(field.id)
                    }
                  }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 flex-1">
                      <MapPin className="w-6 h-6 text-indigo-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-semibold text-gray-900 truncate">{field.name}</h2>
                        {field.description && (
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{field.description}</p>
                        )}
                        {field.area && (
                          <p className="text-xs text-gray-400 mt-1">{field.area.toFixed(2)} Ha</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {field.hasActiveSeason ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-sm font-medium text-amber-800 mb-1">Masa Tanam Aktif</p>
                        <p className="text-xs text-amber-700">
                          Lahan ini masih memiliki masa tanam yang aktif
                        </p>
                        <p className="text-xs text-amber-600 mt-1">
                          Selesaikan masa tanam terlebih dahulu sebelum membuat masa tanam baru
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200">
                        <div>
                          <p className="text-xs text-gray-500">Total Work Order</p>
                          <p className="text-lg font-semibold text-gray-900">{field.workOrderCount}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Selesai</p>
                          <p className="text-lg font-semibold text-green-600">{field.completedCount}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <div className="mb-4">
                        <Sparkles className="w-12 h-12 text-gray-400 mx-auto" />
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {field.workOrderCount > 0 ? 'Masa tanam selesai' : 'Belum ada masa tanam'}
                      </p>
                      <p className="text-xs text-gray-500 mb-4">
                        Klik untuk membuat perencanaan masa tanam baru
                      </p>
                      <div className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium inline-block">
                        Buat Perencanaan
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Tidak Ada Lahan</h3>
              <p className="text-gray-600">
                Buat lahan terlebih dahulu untuk membuat perencanaan budidaya.
              </p>
            </div>
          )}

          {/* Planning Modal */}
          {showPlanningModal && selectedField && (
            <PlanningModal
              field={fields.find(f => f.id === selectedField)!}
              plantingDate={plantingDate}
              setPlantingDate={setPlantingDate}
              activities={activities}
              setActivities={setActivities}
              viewMode={viewMode}
              setViewMode={setViewMode}
              onGenerate={generateWorkOrders}
              onClose={closePlanningModal}
              onOpenTemplate={() => {
                if (isPlantingDateRequired()) {
                  toast.error('Harap tentukan tanggal tanam (HST 0) terlebih dahulu')
                  return
                }
                setShowTemplateModal(true)
              }}
              onOpenCustom={() => {
                if (isPlantingDateRequired()) {
                  toast.error('Harap tentukan tanggal tanam (HST 0) terlebih dahulu')
                  return
                }
                setShowCustomModal(true)
              }}
              onSaveTemplate={saveTemplate}
            />
          )}

          {/* Template Modal */}
          {showTemplateModal && (
            <TemplateModal
              templates={templates}
              onSelect={loadTemplate}
              onClose={() => setShowTemplateModal(false)}
            />
          )}

          {/* Custom Activity Modal */}
          {showCustomModal && selectedField && (
            <CustomActivityModal
              field={fields.find(f => f.id === selectedField)!}
              plantingDate={plantingDate}
              onAdd={(activity) => {
                setActivities([...activities, activity])
                setShowCustomModal(false)
              }}
              onClose={() => setShowCustomModal(false)}
            />
          )}

          {/* Batch Cultivation Dialog */}
          {showBatchDialog && (
            <BatchCultivationDialog
              fields={fields.filter(f => !fieldHasActiveSeason(f.id))}
              onClose={() => setShowBatchDialog(false)}
              onSuccess={async () => {
                await loadCultivationSeasons()
                await loadWorkOrders()
                router.push('/dashboard/work-orders')
              }}
              userEmail={user?.email}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

// Planning Modal Component
function PlanningModal({
  field,
  plantingDate,
  setPlantingDate,
  activities,
  setActivities,
  viewMode,
  setViewMode,
  onGenerate,
  onClose,
  onOpenTemplate,
  onOpenCustom,
  onSaveTemplate
}: {
  field: Field
  plantingDate: string
  setPlantingDate: (date: string) => void
  activities: CultivationActivityItem[]
  setActivities: (activities: CultivationActivityItem[]) => void
  viewMode: 'gantt' | 'card'
  setViewMode: (mode: 'gantt' | 'card') => void
  onGenerate: () => void
  onClose: () => void
  onOpenTemplate: () => void
  onOpenCustom: () => void
  onSaveTemplate: (template: Omit<CultivationTemplate, 'id' | 'createdAt'>) => void
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Perencanaan Masa Tanam</h2>
              <p className="text-sm text-gray-500 mt-1">Lahan: {field.name}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ✕
            </button>
          </div>

          {/* Tanggal Tanam & Actions */}
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tanggal Tanam (HST 0) <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={plantingDate}
                onChange={(e) => {
                  setPlantingDate(e.target.value)
                  // Recalculate activities dates if they have HST
                  if (activities.length > 0) {
                    const updated = activities.map(a => {
                      if (a.hstMin !== undefined && a.hstMax !== undefined) {
                        return {
                          ...a,
                          startDate: calculateDateFromHST(e.target.value, a.hstMin),
                          endDate: calculateDateFromHST(e.target.value, a.hstMax)
                        }
                      }
                      return a
                    })
                    setActivities(updated)
                  }
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Semua activity akan dihitung relatif terhadap tanggal ini</p>
            </div>

            <div className="flex items-end gap-2">
              <button
                onClick={onOpenTemplate}
                disabled={!plantingDate}
                className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="w-4 h-4" />
                Template
              </button>
              
              <button
                onClick={onOpenCustom}
                disabled={!plantingDate}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                Tambah Activity
              </button>

              {activities.length > 0 && (
                <>
                  <button
                    onClick={() => {
                      const name = prompt('Nama template:')
                      if (name) {
                        onSaveTemplate({
                          name,
                          description: `Template dengan ${activities.length} aktivitas`,
                          activities,
                          plantingDate
                        })
                      }
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Simpan Template
                  </button>
                  
                  <button
                    onClick={onGenerate}
                    disabled={!plantingDate}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Calendar className="w-4 h-4" />
                    Buat Work Order
                  </button>
                </>
              )}
            </div>

            {/* View Mode Toggle */}
            {activities.length > 0 && (
              <div className="flex items-center gap-2 bg-white rounded-lg p-1 border border-gray-200 ml-auto">
                <button
                  onClick={() => setViewMode('gantt')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'gantt' 
                      ? 'bg-indigo-500 text-white' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Tampilan Gantt Chart"
                >
                  <GanttChart className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('card')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'card' 
                      ? 'bg-indigo-500 text-white' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Tampilan Kartu"
                >
                  <Grid3x3 className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Activities Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activities.length === 0 ? (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Belum ada activity</h3>
              <p className="text-sm text-gray-500 mb-6">Mulai dengan memilih template atau menambah activity</p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={onOpenTemplate}
                  disabled={!plantingDate}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Pilih Template
                </button>
                <button
                  onClick={onOpenCustom}
                  disabled={!plantingDate}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Tambah Activity
                </button>
              </div>
            </div>
          ) : (
            <>
              {viewMode === 'gantt' ? (
                <CultivationGanttChart
                  activities={activities}
                  setActivities={setActivities}
                  fields={[field]}
                />
              ) : (
                <CultivationCardView
                  activities={activities}
                  setActivities={setActivities}
                  fields={[field]}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Template Modal Component
function TemplateModal({ 
  templates, 
  onSelect, 
  onClose 
}: { 
  templates: CultivationTemplate[]
  onSelect: (template: CultivationTemplate) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Pilih Template</h2>
              <p className="text-sm text-gray-500 mt-1">Template akan dimuat berdasarkan tanggal tanam yang telah ditentukan</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {templates.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Belum ada template tersimpan</p>
              <p className="text-sm text-gray-400 mt-2">Buat activity custom dan simpan sebagai template</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => onSelect(template)}
                  className="text-left p-4 border border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
                >
                  <h3 className="font-semibold text-gray-900 mb-1">{template.name}</h3>
                  {template.description && (
                    <p className="text-sm text-gray-500 mb-2">{template.description}</p>
                  )}
                  <p className="text-xs text-gray-400">
                    {template.activities.length} aktivitas
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Custom Activity Modal Component
function CustomActivityModal({
  field,
  plantingDate,
  onAdd,
  onClose
}: {
  field: Field
  plantingDate: string
  onAdd: (activity: CultivationActivityItem) => void
  onClose: () => void
}) {
  const [formData, setFormData] = useState<Partial<CultivationActivityItem>>({
    activity: 'Pengolahan Tanah',
    title: '',
    startDate: plantingDate || new Date().toISOString().split('T')[0],
    endDate: plantingDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    priority: 'medium',
  })

  // Update dates when planting date changes
  useEffect(() => {
    if (plantingDate) {
      const defaultEnd = new Date(plantingDate)
      defaultEnd.setDate(defaultEnd.getDate() + 7)
      setFormData(prev => ({
        ...prev,
        startDate: prev.startDate || plantingDate,
        endDate: prev.endDate || defaultEnd.toISOString().split('T')[0]
      }))
    }
  }, [plantingDate])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.activity || !formData.startDate || !formData.endDate) {
      toast.error('Harap lengkapi semua field yang wajib')
      return
    }

    const activity: CultivationActivityItem = {
      id: `activity_${Date.now()}`,
      activity: formData.activity as CultivationActivity,
      title: formData.title || formData.activity,
      startDate: formData.startDate,
      endDate: formData.endDate,
      fieldId: field.id,
      fieldName: field.name,
      priority: formData.priority,
      description: formData.description,
      parameters: formData.parameters,
    }

    onAdd(activity)
    toast.success('Activity berhasil ditambahkan')
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Tambah Activity</h2>
              <p className="text-sm text-gray-500 mt-1">Lahan: {field.name}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Activity *</label>
              <select
                value={formData.activity || ''}
                onChange={(e) => setFormData({ ...formData, activity: e.target.value as CultivationActivity })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                {CULTIVATION_ACTIVITIES.map((activity) => (
                  <option key={activity} value={activity}>{activity}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Judul *</label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Contoh: Pengolahan Tanah Lahan A"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Mulai *</label>
                <input
                  type="date"
                  value={formData.startDate || ''}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
                {plantingDate && (
                  <p className="text-xs text-gray-500 mt-1">
                    HST: {calculateHSTFromDate(plantingDate, formData.startDate || '')}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Selesai *</label>
                <input
                  type="date"
                  value={formData.endDate || ''}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
                {plantingDate && (
                  <p className="text-xs text-gray-500 mt-1">
                    HST: {calculateHSTFromDate(plantingDate, formData.endDate || '')}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prioritas</label>
                <select
                  value={formData.priority || 'medium'}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'low' | 'medium' | 'high' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="low">Rendah</option>
                  <option value="medium">Sedang</option>
                  <option value="high">Tinggi</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Deskripsi activity..."
              />
            </div>

            {/* Activity-specific parameters */}
            {(formData.activity === 'Panen' || formData.activity === 'Forecasting Panen') && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div>
                  <label className="block text-sm font-medium text-amber-800 mb-1">Hasil Panen (Ton/Kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.parameters?.harvestQuantity || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      parameters: {
                        ...formData.parameters,
                        harvestQuantity: e.target.value ? parseFloat(e.target.value) : undefined
                      }
                    })}
                    className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-amber-800 mb-1">Kualitas</label>
                  <input
                    type="text"
                    value={formData.parameters?.harvestQuality || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      parameters: {
                        ...formData.parameters,
                        harvestQuality: e.target.value
                      }
                    })}
                    className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Contoh: Grade A"
                  />
                </div>
              </div>
            )}

            {formData.activity === 'Pemupukan' && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <div>
                  <label className="block text-sm font-medium text-green-800 mb-1">Jenis Pupuk</label>
                  <input
                    type="text"
                    value={formData.parameters?.fertilizerType || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      parameters: {
                        ...formData.parameters,
                        fertilizerType: e.target.value
                      }
                    })}
                    className="w-full px-3 py-2 border border-green-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Contoh: Urea, NPK"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-green-800 mb-1">Jumlah (Kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.parameters?.fertilizerAmount || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      parameters: {
                        ...formData.parameters,
                        fertilizerAmount: e.target.value ? parseFloat(e.target.value) : undefined
                      }
                    })}
                    className="w-full px-3 py-2 border border-green-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="0.00"
                  />
                </div>
              </div>
            )}

            {formData.activity === 'Pengolahan Tanah' && field.area && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Luas Lahan:</strong> {field.area.toFixed(2)} Ha
                </p>
                <p className="text-xs text-blue-600 mt-1">Luas lahan otomatis digunakan untuk activity ini</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
              >
                Tambah Activity
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

