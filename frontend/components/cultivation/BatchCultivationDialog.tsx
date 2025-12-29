'use client'

import { useState, useEffect, useRef } from 'react'
import { fieldsAPI, Field, cultivationSeasonsAPI, workOrdersAPI, WorkOrder, usersAPI } from '@/lib/api'
import { X, MapPin, CheckSquare, Square, Calendar, FileText, Sparkles, Loader2, Layers } from 'lucide-react'
import { toast } from 'sonner'
import dynamic from 'next/dynamic'
import { 
  CultivationActivityItem, 
  CultivationTemplate, 
  getDefaultCultivationTemplate,
  calculateDateFromHST,
} from '@/lib/cultivation'

const FieldSelectionMap = dynamic(() => import('./FieldSelectionMap'), {
  ssr: false,
})

interface BatchCultivationDialogProps {
  fields: Field[]
  onClose: () => void
  onSuccess: () => void
  userEmail?: string
}

export default function BatchCultivationDialog({ fields, onClose, onSuccess, userEmail }: BatchCultivationDialogProps) {
  const [selectedFieldIds, setSelectedFieldIds] = useState<Set<number>>(new Set())
  const [plantingDate, setPlantingDate] = useState<string>('')
  const [activities, setActivities] = useState<CultivationActivityItem[]>([])
  const [showTemplateSelect, setShowTemplateSelect] = useState(false)
  const [templates, setTemplates] = useState<CultivationTemplate[]>([])
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (plantingDate) {
      loadTemplates()
    }
  }, [plantingDate])

  const loadTemplates = () => {
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
    setShowTemplateSelect(false)
    toast.success(`Template "${template.name}" dimuat`)
  }

  const handleToggleField = (fieldId: number) => {
    setSelectedFieldIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(fieldId)) {
        newSet.delete(fieldId)
      } else {
        newSet.add(fieldId)
      }
      return newSet
    })
  }

  const handleFieldsSelectByPolygon = (fieldIds: number[]) => {
    setSelectedFieldIds(prev => {
      const newSet = new Set(prev)
      fieldIds.forEach(id => newSet.add(id))
      return newSet
    })
  }

  const handleSelectAll = () => {
    // Fields are already filtered by parent component to exclude those with active seasons
    setSelectedFieldIds(new Set(fields.map(f => f.id)))
  }

  const handleDeselectAll = () => {
    setSelectedFieldIds(new Set())
  }

  const handleGenerate = async () => {
    if (selectedFieldIds.size === 0) {
      toast.error('Pilih setidaknya satu field untuk generate cultivation')
      return
    }

    if (!plantingDate) {
      toast.error('Harap tentukan tanggal tanam (HST 0) terlebih dahulu')
      return
    }

    if (activities.length === 0) {
      toast.error('Pilih template atau tambahkan activities terlebih dahulu')
      return
    }

    setGenerating(true)

    try {
      const selectedFields = fields.filter(f => selectedFieldIds.has(f.id))
      const plantingDateObj = new Date(plantingDate)
      const year = plantingDateObj.getFullYear()

      let successCount = 0
      let errorCount = 0

      for (const field of selectedFields) {
        try {
          // Check if field has active season
          const existingSeasons = await cultivationSeasonsAPI.listCultivationSeasons({ field_id: field.id })
          const hasActive = existingSeasons.some(s => s.status === 'active')
          
          if (hasActive) {
            console.warn(`Field ${field.name} already has active season, skipping`)
            errorCount++
            continue
          }

          // Get assignee
          let assigneeName = ''
          if (field.user_id) {
            try {
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
            console.warn(`No assignee found for field ${field.name}`)
            errorCount++
            continue
          }

          // Generate season name
          const seasonNumber = existingSeasons.length + 1
          const seasonName = `MT ${seasonNumber} ${year}`

          // Create cultivation season
          const season = await cultivationSeasonsAPI.createCultivationSeason({
            field_id: field.id,
            name: seasonName,
            planting_date: plantingDate,
            notes: `Masa tanam dengan ${activities.length} aktivitas (Batch generated)`,
            created_by: userEmail || '',
          })

          // Generate work orders
          const promises = activities.map(async (activity) => {
            const workOrderData: Partial<WorkOrder> = {
              title: activity.title || activity.activity,
              category: 'cultivation',
              activity: activity.activity,
              status: 'pending' as const,
              priority: (activity.priority || 'medium') as 'low' | 'medium' | 'high',
              assignee: assigneeName,
              field_id: field.id,
              cultivation_season_id: season.id,
              start_date: activity.startDate,
              end_date: activity.endDate,
              description: activity.description || `Aktivitas: ${activity.activity}`,
              created_by: userEmail || '',
            }

            return workOrdersAPI.createWorkOrder(workOrderData)
          })

          await Promise.all(promises)
          successCount++
        } catch (err: any) {
          console.error(`Failed to generate for field ${field.name}:`, err)
          errorCount++
        }
      }

      if (successCount > 0) {
        toast.success(`Berhasil generate cultivation untuk ${successCount} field(s)`)
      }
      if (errorCount > 0) {
        toast.warning(`${errorCount} field(s) gagal di-generate`)
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Failed to generate batch cultivation:', err)
      toast.error('Gagal generate cultivation: ' + (err.response?.data?.error || err.message))
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[2000] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Batch Generate Cultivation</h2>
            <p className="text-sm text-gray-500 mt-1">Pilih multiple fields dan generate cultivation untuk semua field sekaligus</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Selection Controls */}
          <div className="flex items-center justify-between bg-gray-50 rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-4">
              <div>
                <h3 className="font-semibold text-gray-900">Field Selection</h3>
                <p className="text-sm text-gray-600">{selectedFieldIds.size} field(s) selected</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSelectAll}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                <CheckSquare className="w-4 h-4" />
                Select All
              </button>
              <button
                onClick={handleDeselectAll}
                className="px-4 py-2 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
              >
                <Square className="w-4 h-4" />
                Deselect All
              </button>
            </div>
          </div>

          {/* Map */}
          <div className="h-[500px] rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
            <FieldSelectionMap
              fields={fields}
              selectedFieldIds={selectedFieldIds}
              onFieldToggle={handleToggleField}
              onFieldsSelectByPolygon={handleFieldsSelectByPolygon}
            />
          </div>

          {/* Settings */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-4">
            {/* Info Panel */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <Layers className="w-5 h-5" />
                Selection Methods
              </h3>
              <div className="text-sm text-blue-700 space-y-1">
                <p>• <strong>Click field</strong> to toggle select/deselect individually</p>
                <p>• <strong>Use polygon tool</strong> (button on map top-left) to draw a polygon and select all fields inside it</p>
                <p>• <strong>Select All / Deselect All</strong> buttons for quick selection</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Tanggal Tanam (HST 0) <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={plantingDate}
                  onChange={(e) => setPlantingDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FileText className="w-4 h-4 inline mr-1" />
                  Activities Template
                </label>
                {activities.length === 0 ? (
                  <button
                    onClick={() => {
                      if (plantingDate) {
                        loadTemplates()
                      }
                      setShowTemplateSelect(true)
                    }}
                    disabled={!plantingDate}
                    className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Pilih Template
                  </button>
                ) : (
                  <div className="bg-white rounded-lg border border-gray-200 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{activities.length} Activities Loaded</p>
                        <p className="text-xs text-gray-500 mt-0.5">Template ready for batch generation</p>
                      </div>
                      <button
                        onClick={() => setActivities([])}
                        className="px-3 py-1.5 text-xs bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating || selectedFieldIds.size === 0 || !plantingDate || activities.length === 0}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate for {selectedFieldIds.size} Field(s)
              </>
            )}
          </button>
        </div>
      </div>

      {/* Template Selection Modal */}
      {showTemplateSelect && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2100]" onClick={() => setShowTemplateSelect(false)}>
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Select Template</h3>
              <button
                onClick={() => setShowTemplateSelect(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-2">
              {templates.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No templates available. Create one from the cultivation planning page.</p>
              ) : (
                templates.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => loadTemplate(template)}
                    className="p-4 border border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 cursor-pointer transition-colors"
                  >
                    <h4 className="font-semibold text-gray-900">{template.name}</h4>
                    <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                    <p className="text-xs text-gray-400 mt-2">{template.activities.length} activities</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

