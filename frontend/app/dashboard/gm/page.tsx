'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authAPI, User } from '@/lib/api'
import { GreetingSection } from '@/components/dashboard/GreetingSection'
import { KPISection } from '@/components/dashboard/KPISection'
import { FieldIntelligence } from '@/components/dashboard/FieldIntelligence'
import { ProductionAnalytics } from '@/components/dashboard/ProductionAnalytics'
import { ProductionMap } from '@/components/dashboard/ProductionMap'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { Users } from 'lucide-react'
import Link from 'next/link'

export default function GMDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Skip auth check for now
    const mockUser: User = {
      id: 9990,
      email: 'gm@agrione.dev',
      username: 'gm',
      first_name: 'Kenichiro',
      last_name: 'Nugroho',
      role: 'Level 1',
      status: 'approved'
    }
    setUser(mockUser)
    setLoading(false)
    
    // Original auth check (commented out for development)
    /*
    const checkAuth = async () => {
      try {
        const profile = await authAPI.getProfile()
        if (profile.role !== 'Level 1') {
          router.push('/dashboard')
          return
        }
        setUser(profile)
      } catch (err) {
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
    */
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#2E4E2A' }}></div>
          <p className="mt-4 text-gray-600">Memuat...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {/* Greeting Section */}
        <GreetingSection userName={user.first_name} />
        
        {/* Quick Navigation to PM Dashboard */}
        <div className="flex items-center gap-3 mb-5">
          <Link
            href="/dashboard/pm"
            className="flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors"
            style={{ backgroundColor: '#2E4E2A' }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            <Users className="w-4 h-4" />
            Lihat Dashboard Project Manager
          </Link>
        </div>
        
        {/* Key Performance Indicators */}
        <KPISection />
        
        {/* Field Intelligence Section */}
        <FieldIntelligence />
        
        {/* Production Analytics Charts */}
        <ProductionAnalytics />
        
        {/* Production Map - Enlarged for better interaction */}
        <div className="mb-6">
          <ProductionMap />
        </div>
        
        {/* Quick Actions FAB */}
        <QuickActions />
      </div>
    </div>
  )
}
