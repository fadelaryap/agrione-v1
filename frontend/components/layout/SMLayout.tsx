'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Inbox, 
  MapPin, 
  Lightbulb,
  Calendar,
  Menu,
  X
} from 'lucide-react'
import LogoutButton from '@/components/LogoutButton'
import NotificationBell from '@/components/notifications/NotificationBell'
import { authAPI, User } from '@/lib/api'

interface SMLayoutProps {
  children: React.ReactNode
}

export default function SMLayout({ children }: SMLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const pathname = usePathname()

  useEffect(() => {
    // Skip auth check for now - use mock user
    const mockUser: User = {
      id: 9991,
      email: 'sm@agrione.dev',
      username: 'sm',
      first_name: 'Site',
      last_name: 'Manager',
      role: 'Level 2',
      status: 'approved'
    }
    setUser(mockUser)
    
    // Original auth check (commented out for development)
    /*
    loadUser()
    const loadUser = async () => {
      try {
        const profile = await authAPI.getProfile()
        setUser(profile)
      } catch (err) {
        console.error('Failed to load user:', err)
      }
    }
    */
  }, [])

  const navItems = [
    { href: '/dashboard/sm', label: 'Inbox Laporan', icon: Inbox },
    { href: '/dashboard/sm/site', label: 'Ringkasan Site', icon: MapPin },
    { href: '/dashboard/sm/recommendations', label: 'Rekomendasi PM', icon: Lightbulb },
    { href: '/dashboard/sm/timeline', label: 'Timeline Musim', icon: Calendar },
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Top Navbar */}
      <nav className="shadow-lg fixed top-0 left-0 right-0 z-40" style={{ backgroundColor: '#2E4E2A' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-md text-white transition-colors"
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
              <h1 className="ml-2 lg:ml-0 text-xl font-bold text-white">Site Manager Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <NotificationBell userRole={user?.role} />
              <LogoutButton />
            </div>
          </div>
        </div>
      </nav>

      <div className="flex pt-16">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:flex lg:flex-shrink-0">
          <div className="w-64 bg-white shadow-xl border-r border-gray-200 min-h-[calc(100vh-4rem)]">
            <div className="p-4 border-b border-gray-200" style={{ backgroundColor: 'rgba(46, 78, 42, 0.1)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#2E4E2A' }}>Menu</p>
            </div>
            <nav className="mt-4 px-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'text-white shadow-md'
                        : 'text-gray-700'
                    }`}
                    style={isActive ? { backgroundColor: '#2E4E2A' } : {}}
                    onMouseEnter={(e) => !isActive && (e.currentTarget.style.backgroundColor = 'rgba(46, 78, 42, 0.1)')}
                    onMouseLeave={(e) => !isActive && (e.currentTarget.style.backgroundColor = '')}
                  >
                    <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Mobile Sidebar */}
        <aside
          className={`fixed top-16 left-0 z-50 h-full w-64 bg-white shadow-2xl border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:hidden ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-blue-50">
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Menu</p>
          </div>
          <nav className="mt-4 px-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-md'
                      : 'text-gray-700 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-blue-50 hover:text-indigo-700'
                  }`}
                >
                  <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-0 w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}



