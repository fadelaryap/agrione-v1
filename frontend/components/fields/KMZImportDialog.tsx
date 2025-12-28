'use client'

import { useState, useRef, useEffect } from 'react'
import { fieldsAPI, User, usersAPI, plantTypesAPI, PlantType } from '@/lib/api'
import { Upload, X, CheckCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import dynamic from 'next/dynamic'

const KMZImportMapPreview = dynamic(() => import('./KMZImportMapPreview'), {
  ssr: false,
})

interface ParsedPolygon {
  name: string
  coordinates: number[][]
}

interface TemporaryImportedPolygon {
  id: string
  name: string
  coordinates: number[][]
  description?: string
  plantTypeId?: string
  userId?: string
}

interface KMZImportDialogProps {
  onClose: () => void
  onSuccess: () => void
}

export default function KMZImportDialog({ onClose, onSuccess }: KMZImportDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [parsedPolygons, setParsedPolygons] = useState<ParsedPolygon[]>([])
  const [temporaryPolygons, setTemporaryPolygons] = useState<TemporaryImportedPolygon[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [plantTypes, setPlantTypes] = useState<PlantType[]>([])
  const [editingPolygon, setEditingPolygon] = useState<TemporaryImportedPolygon | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
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

      // Convert to temporary polygons with unique IDs
      const tempPolygons: TemporaryImportedPolygon[] = result.polygons.map((poly, index) => ({
        id: `temp-${Date.now()}-${index}`,
        name: poly.name || `Field ${index + 1}`,
        coordinates: poly.coordinates,
        description: '',
        plantTypeId: '',
        userId: '',
      }))
      setTemporaryPolygons(tempPolygons)

      toast.success(`Successfully parsed ${result.count} polygon(s) from KMZ file`)
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to parse KMZ file')
      setFile(null)
    } finally {
      setLoading(false)
    }
  }

  const handlePolygonClick = (polygon: { id: string; name: string; coordinates: number[][] }) => {
    const tempPoly = temporaryPolygons.find(p => p.id === polygon.id)
    if (tempPoly) {
      setEditingPolygon(tempPoly)
      setIsEditDialogOpen(true)
    }
  }

  const handleUpdatePolygon = (updated: TemporaryImportedPolygon) => {
    setTemporaryPolygons(prev => prev.map(p => p.id === updated.id ? updated : p))
    setIsEditDialogOpen(false)
    setEditingPolygon(null)
  }

  const handleSubmit = async () => {
    // Validate all fields have names
    const invalidFields = temporaryPolygons.filter(f => !f.name.trim())
    if (invalidFields.length > 0) {
      toast.error(`Mohon beri nama untuk semua field (${invalidFields.length} belum memiliki nama)`)
      return
    }

    setSubmitting(true)
    try {
      const fieldsToCreate = temporaryPolygons.map(f => ({
        name: f.name.trim(),
        description: f.description?.trim() || undefined,
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

  // Convert temporary polygons to format expected by map preview
  const mapPreviewPolygons = temporaryPolygons.map(p => ({
    id: p.id,
    name: p.name,
    coordinates: p.coordinates,
  }))

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[2000] flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
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
              /* Map Preview and Configuration Section */
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900">Successfully parsed {parsedPolygons.length} field(s)</p>
                    <p className="text-sm text-green-700 mt-1">Klik polygon di peta untuk mengisi detail (nama, assignee, plant type)</p>
                    <p className="text-xs text-green-600 mt-1">
                      {temporaryPolygons.filter(p => p.name.trim() && p.name !== `Field ${temporaryPolygons.indexOf(p) + 1}`).length} dari {temporaryPolygons.length} sudah dikonfigurasi
                    </p>
                  </div>
                </div>

                {/* Map Preview */}
                <KMZImportMapPreview 
                  polygons={mapPreviewPolygons}
                  onPolygonClick={handlePolygonClick}
                />
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
                disabled={submitting || temporaryPolygons.some(f => !f.name.trim())}
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
                    Create {temporaryPolygons.length} Field(s)
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Edit Polygon Dialog */}
      {isEditDialogOpen && editingPolygon && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2100]">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">Edit Polygon Detail</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  value={editingPolygon.name}
                  onChange={(e) => setEditingPolygon({ ...editingPolygon, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Field name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={editingPolygon.description || ''}
                  onChange={(e) => setEditingPolygon({ ...editingPolygon, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                  placeholder="Field description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Plant Type</label>
                <select
                  value={editingPolygon.plantTypeId || ''}
                  onChange={(e) => setEditingPolygon({ ...editingPolygon, plantTypeId: e.target.value || undefined })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Select plant type</option>
                  {Array.isArray(plantTypes) && plantTypes.map((pt) => (
                    <option key={pt.id} value={pt.id}>
                      {pt.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Assign to User (Level 3/4)</label>
                <select
                  value={editingPolygon.userId || ''}
                  onChange={(e) => setEditingPolygon({ ...editingPolygon, userId: e.target.value || undefined })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">No assignment</option>
                  {Array.isArray(users) && users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} ({user.email}) - {user.role}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setIsEditDialogOpen(false)
                  setEditingPolygon(null)
                }}
                className="flex-1 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!editingPolygon.name.trim()) return
                  handleUpdatePolygon(editingPolygon)
                }}
                disabled={!editingPolygon.name.trim()}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
