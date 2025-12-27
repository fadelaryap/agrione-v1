'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Map, Home, User, LogOut, ClipboardList, FileText } from 'lucide-react'
import LogoutButton from '@/components/LogoutButton'

export default function MobileBottomNav() {
  const pathname = usePathname()

  const navItems = [
    { href: '/lapangan', label: 'Beranda', icon: Home, exact: true },
    { href: '/lapangan/work-orders', label: 'Tugas', icon: ClipboardList, exact: false },
    { href: '/lapangan/reports', label: 'Laporan', icon: FileText, exact: false },
    { href: '/lapangan/profile', label: 'Profil', icon: User, exact: false },
  ]

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' })
      window.location.href = '/login'
    } catch (err) {
      console.error('Logout failed:', err)
    }
  }

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-2xl z-50" style={{ position: 'fixed', bottom: 0 }}>
      <div className="flex justify-around items-center h-20 px-2" style={{ minHeight: '80px', paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}>
        {navItems.map((item) => {
          const Icon = item.icon
          // Fix: exact match for /lapangan, prefix match for others
          const isActive = item.exact 
            ? pathname === item.href
            : pathname === item.href || (pathname?.startsWith(item.href + '/') && pathname !== '/lapangan')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full rounded-xl transition-all ${
                isActive 
                  ? 'bg-gradient-to-b from-green-500 to-emerald-600 text-white shadow-lg transform scale-105' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className={`p-2 rounded-lg ${isActive ? 'bg-white bg-opacity-20' : ''}`}>
                <Icon className={`h-6 w-6 ${isActive ? 'text-white' : 'text-gray-500'}`} />
              </div>
              <span className={`text-xs mt-1 font-semibold ${isActive ? 'text-white' : 'text-gray-600'}`}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

