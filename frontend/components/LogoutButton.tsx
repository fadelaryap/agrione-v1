'use client'

import { useRouter } from 'next/navigation'
import { authAPI } from '@/lib/api'

export default function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await authAPI.logout()
      localStorage.removeItem('token')
      router.push('/login')
    } catch (error) {
      // Even if API call fails, clear local storage and redirect
      localStorage.removeItem('token')
      router.push('/login')
    }
  }

  return (
    <button
      onClick={handleLogout}
      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
    >
      Logout
    </button>
  )
}





