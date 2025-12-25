import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Allow public routes
  const publicPaths = ['/login', '/signup', '/']
  const isPublicPath = publicPaths.some(path => request.nextUrl.pathname === path)

  if (isPublicPath) {
    return NextResponse.next()
  }

  // For protected routes, let client-side handle auth check
  // Middleware will not redirect, client-side will check localStorage
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}




