'use client'

import { useEffect, useState } from 'react'
import { fieldsAPI } from '@/lib/api'
import MapWrapper from '@/components/map/MapWrapper'
import { Eye, Edit3, Upload } from 'lucide-react'
import KMZImportDialog from '@/components/fields/KMZImportDialog'

export default function PMFieldsPage() {
  const [isEditMode, setIsEditMode] = useState(false)
  const [isKMZDialogOpen, setIsKMZDialogOpen] = useState(false)

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Field Management</h1>
            <p className="text-gray-600 mt-2">Kelola lahan dan plot di peta secara interaktif</p>
          </div>
          
          {/* View/Edit Mode Toggle */}
          <div className="flex items-center gap-4">
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
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
              >
                <Upload className="w-4 h-4" />
                <span className="text-sm font-medium">Import KMZ</span>
              </button>
            )}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
          <MapWrapper isEditMode={isEditMode} />
        </div>
      </div>

      {/* KMZ Import Dialog */}
      {isKMZDialogOpen && (
        <KMZImportDialog
          onClose={() => setIsKMZDialogOpen(false)}
          onSuccess={() => {
            setIsKMZDialogOpen(false)
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}

