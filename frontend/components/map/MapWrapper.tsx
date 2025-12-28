'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'

const MapComponent = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p className="mt-4 text-gray-600">Loading map...</p>
      </div>
    </div>
  ),
})

interface MapWrapperProps {
  isEditMode?: boolean
  userId?: number // For filtering fields by user
}

export default function MapWrapper({ isEditMode = true, userId }: MapWrapperProps) {
  return (
    <Suspense
      fallback={
        <div className="w-full h-full flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">Loading map...</p>
          </div>
        </div>
      }
    >
      <MapComponent isEditMode={isEditMode} userId={userId} />
    </Suspense>
  )
}

