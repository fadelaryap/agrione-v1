'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authAPI, User, fieldsAPI } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import MapWrapper from '@/components/map/MapWrapper'
import { Eye, Edit3, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import KMZImportDialog from '@/components/fields/KMZImportDialog'

export default function DashboardFieldsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isKMZDialogOpen, setIsKMZDialogOpen] = useState(false)

  useEffect(() => {
    checkAuth()
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
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
      <div className="py-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Field Management</h1>
              <p className="text-gray-600 mt-1">Kelola lahan dan plot di peta</p>
            </div>
            
            {/* View/Edit Mode Toggle - Tab Style */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setIsEditMode(false)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all duration-200 ${
                    !isEditMode 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  <span className="text-sm font-medium">View Mode</span>
                </button>
                <button
                  onClick={() => setIsEditMode(true)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all duration-200 ${
                    isEditMode 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Edit3 className="w-4 h-4" />
                  <span className="text-sm font-medium">Edit Mode</span>
                </button>
              </div>
              {isEditMode && (
                <button
                  onClick={() => setIsKMZDialogOpen(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  <Upload className="w-4 h-4" />
                  <span className="text-sm font-medium">Import KMZ</span>
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <MapWrapper isEditMode={isEditMode} />
        </div>

        {/* KMZ Import Dialog */}
        {isKMZDialogOpen && (
          <KMZImportDialog
            onClose={() => setIsKMZDialogOpen(false)}
            onSuccess={() => {
              setIsKMZDialogOpen(false)
              window.location.reload() // Reload to show new fields
            }}
          />
        )}
      </div>
    </DashboardLayout>
  )
}

