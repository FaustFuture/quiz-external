import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired - required for Server Components
  const { data: { user } } = await supabase.auth.getUser()

  console.log("[Proxy] Path:", request.nextUrl.pathname);
  console.log("[Proxy] User:", user?.id);

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/auth']
  const isPublicRoute = publicRoutes.some(route => request.nextUrl.pathname.startsWith(route))

  console.log("[Proxy] Is public route:", isPublicRoute);

  // If not authenticated and trying to access protected route, redirect to login
  if (!user && !isPublicRoute && request.nextUrl.pathname !== '/') {
    console.log("[Proxy] Not authenticated, redirecting to login");
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If authenticated, check if user needs onboarding
  if (user && !isPublicRoute && request.nextUrl.pathname !== '/onboarding') {
    console.log("[Proxy] Checking if user needs onboarding");
    
    // Check if user has any companies
    const { data: memberships, error } = await supabase
      .from('companies_users')
      .select('company_id')
      .eq('user_id', user.id)
      .limit(1)

    console.log("[Proxy] Memberships query:", { memberships, error });
    console.log("[Proxy] Has memberships:", memberships && memberships.length > 0);

    // If no companies, redirect to onboarding (unless already on root or discover)
    if (!memberships || memberships.length === 0) {
      if (request.nextUrl.pathname !== '/' && !request.nextUrl.pathname.startsWith('/discover')) {
        console.log("[Proxy] No memberships, redirecting to onboarding");
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }
    }
  }

  console.log("[Proxy] Proceeding to requested page");

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
