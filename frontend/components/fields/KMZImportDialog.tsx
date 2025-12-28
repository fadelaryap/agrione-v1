'use client'

import { useState, useRef, useEffect } from 'react'
import { fieldsAPI, User, usersAPI, plantTypesAPI, PlantType } from '@/lib/api'
import { Upload, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ParsedPolygon {
  name: string
  coordinates: number[][]
}

interface FieldData {
  name: string
  description: string
  coordinates: number[][]
  plantTypeId: string
  userId: string
}

interface KMZImportDialogProps {
  onClose: () => void
  onSuccess: () => void
}

export default function KMZImportDialog({ onClose, onSuccess }: KMZImportDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [parsedPolygons, setParsedPolygons] = useState<ParsedPolygon[]>([])
  const [fieldsData, setFieldsData] = useState<FieldData[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [plantTypes, setPlantTypes] = useState<PlantType[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load users and types
  useEffect(() => {
    const loadData = async () => {
      try {
        const [usersData, plantTypesData] = await Promise.all([
          usersAPI.listUsers(1, 100),
          plantTypesAPI.listPlantTypes(),
        ])
        setUsers(usersData.users?.filter(u => u.role === 'Level 3' || u.role === 'Level 4') || [])
        setPlantTypes(plantTypesData)
      } catch (err) {
        console.error('Failed to load data:', err)
      }
    }
    loadData()
  }, [])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.toLowerCase().endsWith('.kmz')) {
      toast.error('File must be a KMZ file (.kmz)')
      return
    }

    setFile(selectedFile)
    setLoading(true)

    try {
      const result = await fieldsAPI.importKMZ(selectedFile)
      
      if (!result.polygons || result.polygons.length === 0) {
        toast.error('No polygons found in KMZ file. Please check the file format.')
        setFile(null)
        return
      }
      
      setParsedPolygons(result.polygons)

      // Initialize field data with parsed polygons
      const initialFieldsData: FieldData[] = result.polygons.map((polygon) => ({
        name: polygon.name || '',
        description: '',
        coordinates: polygon.coordinates,
        plantTypeId: '',
        userId: '',
      }))
      setFieldsData(initialFieldsData)

      toast.success(`Successfully parsed ${result.count} polygon(s) from KMZ file`)
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to parse KMZ file')
      setFile(null)
    } finally {
      setLoading(false)
    }
  }

  const handleFieldChange = (index: number, field: Partial<FieldData>) => {
    setFieldsData(prev => prev.map((f, i) => i === index ? { ...f, ...field } : f))
  }

  const handleSubmit = async () => {
    // Validate all fields have names
    const invalidFields = fieldsData.filter(f => !f.name.trim())
    if (invalidFields.length > 0) {
      toast.error('Please fill in names for all fields')
      return
    }

    setSubmitting(true)
    try {
      const fieldsToCreate = fieldsData.map(f => ({
        name: f.name.trim(),
        description: f.description.trim() || undefined,
        coordinates: f.coordinates,
        plant_type_id: f.plantTypeId ? parseInt(f.plantTypeId) : undefined,
        user_id: f.userId ? parseInt(f.userId) : undefined,
      }))

      const result = await fieldsAPI.batchCreateFields(fieldsToCreate)

      if (result.errors && result.errors.length > 0) {
        toast.warning(`Created ${result.count} field(s), but ${result.errors.length} error(s) occurred`)
        console.error('Errors:', result.errors)
      } else {
        toast.success(`Successfully created ${result.count} field(s)`)
      }

      onSuccess()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create fields')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[2000] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Import Fields from KMZ</h2>
            <p className="text-sm text-gray-500 mt-1">Upload a KMZ file to import multiple fields at once</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {parsedPolygons.length === 0 ? (
            /* File Upload Section */
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-indigo-400 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept=".kmz"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload KMZ File</h3>
              <p className="text-gray-600 mb-4">Select a KMZ file containing polygon data</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Choose File
                  </>
                )}
              </button>
              {file && (
                <p className="text-sm text-gray-500 mt-4">Selected: {file.name}</p>
              )}
            </div>
          ) : (
            /* Field Configuration Section */
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900">Successfully parsed {parsedPolygons.length} field(s)</p>
                  <p className="text-sm text-green-700 mt-1">Please fill in the details for each field below</p>
                </div>
              </div>

              <div className="space-y-6">
                {fieldsData.map((field, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <h3 className="font-semibold text-gray-900 mb-4">Field {index + 1}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={field.name}
                          onChange={(e) => handleFieldChange(index, { name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="Field name"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Assign to User
                        </label>
                        <select
                          value={field.userId}
                          onChange={(e) => handleFieldChange(index, { userId: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                          <option value="">Select user...</option>
                          {users.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.first_name} {user.last_name} ({user.role})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Plant Type
                        </label>
                        <select
                          value={field.plantTypeId}
                          onChange={(e) => handleFieldChange(index, { plantTypeId: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                          <option value="">Select plant type...</option>
                          {plantTypes.map((type) => (
                            <option key={type.id} value={type.id}>
                              {type.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <textarea
                          value={field.description}
                          onChange={(e) => handleFieldChange(index, { description: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          rows={2}
                          placeholder="Field description (optional)"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-xs text-gray-500">
                          Coordinates: {field.coordinates.length} points
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {parsedPolygons.length > 0 && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || fieldsData.some(f => !f.name.trim())}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Fields...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Create {fieldsData.length} Field(s)
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
