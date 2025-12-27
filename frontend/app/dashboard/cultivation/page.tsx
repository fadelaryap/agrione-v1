'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authAPI, User, fieldsAPI, Field, workOrdersAPI, WorkOrder } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Plus, Calendar, FileText, Save, Download, Upload, GanttChart, Grid3x3 } from 'lucide-react'
import { toast } from 'sonner'
import CultivationGanttChart from '@/components/cultivation/CultivationGanttChart'
import CultivationCardView from '@/components/cultivation/CultivationCardView'
import { 
  CultivationActivityItem, 
  CultivationTemplate, 
  CultivationActivity,
  CULTIVATION_ACTIVITIES,
  getDefaultCultivationTemplate,
  calculateDateFromHST 
} from '@/lib/cultivation'

export default function CultivationPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [fields, setFields] = useState<Field[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'gantt' | 'card'>('gantt')
  const [selectedField, setSelectedField] = useState<number | null>(null)
  const [activities, setActivities] = useState<CultivationActivityItem[]>([])
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showCustomModal, setShowCustomModal] = useState(false)
  const [templates, setTemplates] = useState<CultivationTemplate[]>([])
  const [plantingDate, setPlantingDate] = useState<string>('')
  const [fieldHasWorkOrders, setFieldHasWorkOrders] = useState<boolean>(false)

  // Check if planting date is required
  const isPlantingDateRequired = () => {
    return !plantingDate
  }

  useEffect(() => {
    checkAuth()
    loadFields()
  }, [])

  useEffect(() => {
    loadTemplates()
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

  const loadTemplates = async () => {
    // Load templates from localStorage (bisa diubah ke backend nanti)
    try {
      const saved = localStorage.getItem('cultivation_templates')
      const savedTemplates = saved ? JSON.parse(saved) : []
      
      // Add default template only if planting date is set
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

  // Check if selected field already has work orders
  useEffect(() => {
    const checkFieldWorkOrders = async () => {
      if (!selectedField) {
        setFieldHasWorkOrders(false)
        return
      }

      try {
        const existingWorkOrders = await workOrdersAPI.listWorkOrders({ field_id: selectedField })
        setFieldHasWorkOrders(existingWorkOrders.length > 0)
      } catch (err) {
        console.error('Failed to check field work orders:', err)
        setFieldHasWorkOrders(false)
      }
    }

    checkFieldWorkOrders()
  }, [selectedField])

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

    // Recalculate dates based on HST
    const templatePlantingDate = template.plantingDate || plantingDate
    const currentPlantingDate = plantingDate
    
    // Create ID mapping first
    const idMap: Record<string, string> = {}
    template.activities.forEach(a => {
      idMap[a.id] = `activity_${Date.now()}_${Math.random()}_${a.id}`
    })
    
    const recalculatedActivities = template.activities.map(a => {
      const newId = idMap[a.id]
      
      // Recalculate dates based on HST
      let newStartDate = a.startDate
      let newEndDate = a.endDate
      
      if (a.hstMin !== undefined && a.hstMax !== undefined) {
        newStartDate = calculateDateFromHST(currentPlantingDate, a.hstMin)
        newEndDate = calculateDateFromHST(currentPlantingDate, a.hstMax)
      } else if (templatePlantingDate !== currentPlantingDate) {
        // If no HST but planting date changed, try to maintain relative dates
        // This is a fallback - ideally all activities should have HST
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

    // Check if field already has work orders
    try {
      const existingWorkOrders = await workOrdersAPI.listWorkOrders({ field_id: selectedField })
      if (existingWorkOrders.length > 0) {
        toast.error(`Lahan ini sudah memiliki ${existingWorkOrders.length} work order. Satu lahan hanya bisa memiliki satu set work order. Silakan hapus work order yang ada terlebih dahulu jika ingin membuat yang baru.`)
        return
      }
    } catch (err) {
      console.error('Failed to check existing work orders:', err)
    }

    try {
      const field = fields.find(f => f.id === selectedField)
      if (!field) {
        toast.error('Lahan tidak ditemukan')
        return
      }

      // Generate work orders untuk setiap activity
      const promises = activities.map(async (activity) => {
        const workOrderData: Partial<WorkOrder> = {
          title: activity.title || activity.activity,
          category: 'cultivation',
          activity: activity.activity,
          status: 'pending' as const,
          priority: (activity.priority || 'medium') as 'low' | 'medium' | 'high',
          assignee: activity.assignee || '',
          field_id: selectedField,
          start_date: activity.startDate,
          end_date: activity.endDate,
          description: activity.description || `Aktivitas: ${activity.activity}`,
          created_by: user?.email || '',
        }

        return workOrdersAPI.createWorkOrder(workOrderData)
      })

      await Promise.all(promises)
      toast.success(`${activities.length} work order berhasil dibuat`)
      
      // Reset activities
      setActivities([])
      setFieldHasWorkOrders(true)
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
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Perencanaan Budidaya</h1>
                <p className="text-sm text-gray-500 mt-1">Rencanakan aktivitas budidaya untuk lahan</p>
              </div>
              <div className="flex items-center gap-3">
                {/* View Mode Toggle */}
                <div className="flex items-center gap-2 bg-white rounded-lg p-1 border border-gray-200">
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
              </div>
            </div>
          </div>

          {/* Field Selection & Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-wrap items-end gap-4 flex-1">
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
                    className="w-full sm:w-auto min-w-[180px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Wajib diisi sebelum menambah activity</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Lahan</label>
                  <select
                    value={selectedField || ''}
                    onChange={(e) => setSelectedField(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full sm:w-auto min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Pilih Lahan --</option>
                    {fields.map((field) => (
                      <option key={field.id} value={field.id}>
                        {field.name} {field.area ? `(${field.area.toFixed(2)} Ha)` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Load Template */}
                <button
                  onClick={() => setShowTemplateModal(true)}
                  className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Template
                </button>
                
                {/* Add Activity (Custom) */}
                <button
                  onClick={() => {
                    if (isPlantingDateRequired()) {
                      toast.error('Harap tentukan tanggal tanam (HST 0) terlebih dahulu')
                      return
                    }
                    setShowCustomModal(true)
                  }}
                  disabled={isPlantingDateRequired()}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Activity
                </button>
                
                {/* Save as Template */}
                {activities.length > 0 && (
                  <button
                    onClick={() => {
                      const name = prompt('Nama template:')
                      if (name) {
                        saveTemplate({
                          name,
                          description: `Template dengan ${activities.length} aktivitas`,
                          activities
                        })
                      }
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Simpan Template
                  </button>
                )}
                
                {/* Generate Work Orders */}
                <button
                  onClick={generateWorkOrders}
                  disabled={activities.length === 0 || !selectedField}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Calendar className="w-4 h-4" />
                  Buat Work Order
                </button>
              </div>
            </div>
          </div>

          {/* Activities View */}
          {activities.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Belum ada activity</h3>
              <p className="text-sm text-gray-500 mb-6">Mulai dengan memilih template atau menambah activity</p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => {
                    if (isPlantingDateRequired()) {
                      toast.error('Harap tentukan tanggal tanam (HST 0) terlebih dahulu')
                      return
                    }
                    setShowTemplateModal(true)
                  }}
                  disabled={isPlantingDateRequired()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Pilih Template
                </button>
                <button
                  onClick={() => {
                    if (isPlantingDateRequired()) {
                      toast.error('Harap tentukan tanggal tanam (HST 0) terlebih dahulu')
                      return
                    }
                    setShowCustomModal(true)
                  }}
                  disabled={isPlantingDateRequired()}
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
                  fields={fields}
                />
              ) : (
                <CultivationCardView
                  activities={activities}
                  setActivities={setActivities}
                  fields={fields}
                />
              )}
            </>
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
          {showCustomModal && (
            <CustomActivityModal
              fields={fields}
              onAdd={(activity) => {
                setActivities([...activities, activity])
                setShowCustomModal(false)
              }}
              onClose={() => setShowCustomModal(false)}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
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
              <h2 className="text-xl font-bold text-gray-900">Pilih Template</h2>
              <p className="text-sm text-gray-500 mt-1">Template akan dimuat berdasarkan tanggal tanam yang telah ditentukan</p>
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
  fields,
  onAdd,
  onClose
}: {
  fields: Field[]
  onAdd: (activity: CultivationActivityItem) => void
  onClose: () => void
}) {
  const [formData, setFormData] = useState<Partial<CultivationActivityItem>>({
    activity: 'Pengolahan Tanah',
    title: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    priority: 'medium',
  })

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
      fieldId: formData.fieldId,
      fieldName: fields.find(f => f.id === formData.fieldId)?.name,
      assignee: formData.assignee,
      priority: formData.priority,
      description: formData.description,
      parameters: formData.parameters,
    }

    // Calculate dates relative to planting date if not provided
    if (!formData.startDate || !formData.endDate) {
      const today = new Date().toISOString().split('T')[0]
      activity.startDate = formData.startDate || today
      activity.endDate = formData.endDate || today
    }

    onAdd(activity)
    toast.success('Activity berhasil ditambahkan')
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Tambah Activity</h2>
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
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lahan</label>
              <select
                value={formData.fieldId || ''}
                onChange={(e) => setFormData({ ...formData, fieldId: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Pilih Lahan (Opsional) --</option>
                {fields.map((field) => (
                  <option key={field.id} value={field.id}>
                    {field.name} {field.area ? `(${field.area.toFixed(2)} Ha)` : ''}
                  </option>
                ))}
              </select>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
                <input
                  type="text"
                  value={formData.assignee || ''}
                  onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                  placeholder="Email atau nama user"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
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

            {formData.activity === 'Pengolahan Tanah' && formData.fieldId && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Luas Lahan:</strong> {fields.find(f => f.id === formData.fieldId)?.area?.toFixed(2) || '0.00'} Ha
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

