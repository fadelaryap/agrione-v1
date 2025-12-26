'use client'

import { useState, useEffect } from 'react'
import { Bell, Menu, X } from 'lucide-react'
import { authAPI, User } from '@/lib/api'
import NotificationBell from '@/components/notifications/NotificationBell'
import LogoutButton from '@/components/LogoutButton'

interface LapanganHeaderProps {
  title?: string
}

export default function LapanganHeader({ title = 'Agrione' }: LapanganHeaderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    try {
      const profile = await authAPI.getProfile()
      setUser(profile)
    } catch (err) {
      console.error('Failed to load user:', err)
    }
  }

  return (
    <header className="bg-white border-b-2 border-green-200 shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900">{title}</h1>
            {user && (
              <span className="ml-3 text-sm text-gray-600 hidden sm:inline">
                {user.first_name} {user.last_name}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            {/* Notification Bell - for Level 3/4 */}
            {user && (user.role === 'Level 3' || user.role === 'Level 4') && (
              <NotificationBell userRole={user.role} />
            )}
            
            {/* Desktop Logout */}
            <div className="hidden sm:block">
              <LogoutButton />
            </div>
            
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-gray-200 py-4">
            <div className="flex flex-col gap-2">
              {user && (
                <div className="px-4 py-2 text-sm text-gray-600">
                  {user.first_name} {user.last_name} ({user.role})
                </div>
              )}
              <div className="px-4">
                <LogoutButton />
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

