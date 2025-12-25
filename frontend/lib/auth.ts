import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'

export interface Session {
  userID: number
  email?: string
  username?: string
  firstName?: string
  lastName?: string
  role?: string
}

export async function getServerSession(): Promise<Session | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value

  if (!token) {
    return null
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload
    return {
      userID: decoded.user_id as number,
      email: decoded.email as string,
    }
  } catch (error) {
    return null
  }
}

export async function setAuthToken(token: string) {
  const cookieStore = await cookies()
  cookieStore.set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })
}

export async function clearAuthToken() {
  const cookieStore = await cookies()
  cookieStore.delete('token')
}




