'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Map, 
  BarChart3, 
  Brain,
  Zap,
  Menu,
  X
} from 'lucide-react'
import LogoutButton from '@/components/LogoutButton'
import NotificationBell from '@/components/notifications/NotificationBell'
import { authAPI, User } from '@/lib/api'

interface PMLayoutProps {
  children: React.ReactNode
}

export default function PMLayout({ children }: PMLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const pathname = usePathname()

  useEffect(() => {
    // Skip auth check for now - use mock user
    const mockUser: User = {
      id: 9992,
      email: 'pm@agrione.dev',
      username: 'pm',
      first_name: 'Project',
      last_name: 'Manager',
      role: 'Level 1',
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
    { href: '/dashboard/pm', label: 'Peta & NDVI', icon: Map },
    { href: '/dashboard/pm/analysis', label: 'Analisis Korelasi', icon: BarChart3 },
    { href: '/dashboard/pm/ai', label: 'AI & DSS', icon: Brain },
    { href: '/dashboard/pm/recommendations', label: 'Generator Rekomendasi', icon: Zap },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50">
      {/* Top Navbar */}
      <nav className="bg-gradient-to-r from-purple-600 to-indigo-600 shadow-lg fixed top-0 left-0 right-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-md text-white hover:bg-purple-700 transition-colors"
              >
                {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
              <h1 className="ml-2 lg:ml-0 text-xl font-bold text-white">Project Manager Dashboard</h1>
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
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50">
              <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Menu</p>
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
                        ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md'
                        : 'text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 hover:text-purple-700'
                    }`}
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
          <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50">
            <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Menu</p>
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
                      ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md'
                      : 'text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 hover:text-purple-700'
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

