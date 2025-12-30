// Development authentication bypass utility
// Usage: Add ?dev=skip123&role=Level1 to any URL to bypass login
// Example: /login?dev=skip123&role=Level1
// Example: /dashboard?dev=skip123&role=Level2
// Example: /lapangan?dev=skip123&role=Level3

import type { User } from './api'

const DEV_SECRET = 'skip123' // Change this to your secret
const DEV_TOKEN = 'dev-token-bypass'

interface DevAuthParams {
  secret: string
  role?: 'Level 1' | 'Level 2' | 'Level 3' | 'Level 4' | 'superadmin'
  email?: string
}

// Mock users for different roles
const mockUsers: Record<string, User> = {
  'Level 1': {
    id: 9991,
    email: 'dev.level1@agrione.dev',
    username: 'dev_level1',
    first_name: 'Dev',
    last_name: 'Level 1',
    role: 'Level 1',
    status: 'approved',
  },
  'Level 2': {
    id: 9992,
    email: 'dev.level2@agrione.dev',
    username: 'dev_level2',
    first_name: 'Dev',
    last_name: 'Level 2',
    role: 'Level 2',
    status: 'approved',
  },
  'Level 3': {
    id: 9993,
    email: 'dev.level3@agrione.dev',
    username: 'dev_level3',
    first_name: 'Dev',
    last_name: 'Level 3',
    role: 'Level 3',
    status: 'approved',
  },
  'Level 4': {
    id: 9994,
    email: 'dev.level4@agrione.dev',
    username: 'dev_level4',
    first_name: 'Dev',
    last_name: 'Level 4',
    role: 'Level 4',
    status: 'approved',
  },
  'superadmin': {
    id: 9999,
    email: 'dev.admin@agrione.dev',
    username: 'dev_admin',
    first_name: 'Dev',
    last_name: 'Admin',
    role: 'superadmin',
    status: 'approved',
  },
}

export function isDevModeActive(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('dev_mode') === 'true'
}

export function activateDevMode(role: string = 'Level 1'): void {
  if (typeof window === 'undefined') return
  
  const user = mockUsers[role] || mockUsers['Level 1']
  localStorage.setItem('dev_mode', 'true')
  localStorage.setItem('dev_role', role)
  localStorage.setItem('token', DEV_TOKEN)
  localStorage.setItem('dev_user', JSON.stringify(user))
  
  // Also set cookie for compatibility
  document.cookie = `token=${DEV_TOKEN}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`
}

export function deactivateDevMode(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('dev_mode')
  localStorage.removeItem('dev_role')
  localStorage.removeItem('dev_user')
  localStorage.removeItem('token')
  document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
}

export function getDevUser(): User | null {
  if (typeof window === 'undefined' || !isDevModeActive()) return null
  
  const userStr = localStorage.getItem('dev_user')
  if (!userStr) return null
  
  try {
    return JSON.parse(userStr)
  } catch {
    return null
  }
}

export function checkDevAuth(urlParams: URLSearchParams): boolean {
  const secret = urlParams.get('dev')
  const role = urlParams.get('role') || 'Level 1'
  
  // Check if secret matches
  if (secret === DEV_SECRET) {
    // Activate dev mode
    activateDevMode(role as any)
    return true
  }
  
  // Also check if dev mode is already active
  return isDevModeActive()
}

// Get redirect path based on role
export function getDevRedirectPath(role: string): string {
  if (role === 'superadmin') return '/suadm'
  if (role === 'Level 1' || role === 'Level 2') return '/dashboard'
  if (role === 'Level 3' || role === 'Level 4') return '/lapangan'
  return '/dashboard'
}

