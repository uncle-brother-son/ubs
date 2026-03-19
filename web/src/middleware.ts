import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const isAuthenticated = request.cookies.get('preview_auth')?.value === '1'

  if (!isAuthenticated) {
    const url = request.nextUrl.clone()
    url.pathname = '/holding'
    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
}

export const config = {
  // Only run on the root path — API routes, static files, holding page, fonts all bypass
  matcher: ['/'],
}
