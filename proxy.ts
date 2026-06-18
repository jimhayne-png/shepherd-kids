import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  // Build a mutable response so @supabase/ssr can write refreshed session
  // cookies back to the browser on every request.
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Write onto both the mutated request and the response so downstream
          // server components always see the freshest session.
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Always call getSession() so @supabase/ssr can silently refresh an expiring
  // access token and write the new cookie back to the browser.
  const { data: { session } } = await supabase.auth.getSession()

  const { pathname } = request.nextUrl

  // ─── Public auth routes ───────────────────────────────────────────────────
  // /auth/callback exchanges the Supabase OTP / PKCE code for a session and
  // sets the session cookie.  /auth/reset-password reads that fresh session
  // so the user can type and save a new password.  Both routes MUST be
  // reachable without a pre-existing session — blocking either one permanently
  // breaks password recovery for every user on every device.
  // ─────────────────────────────────────────────────────────────────────────

  // Only /dashboard/* requires authentication.  Everything else — login, kiosk,
  // bulletin, join links, prayer pages, and all /auth/* routes — is public.
  if (!session && pathname.startsWith('/dashboard')) {
    const loginUrl = new URL('/', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Run on every path except:
     *   /kiosk/:path*       — public kiosk check-in pages (no session needed)
     *   /api/kiosk/:path*   — public kiosk API routes
     *   _next/static        — static assets
     *   _next/image         — image optimisation
     *   favicon.ico / static image files
     */
    '/((?!kiosk|api/kiosk|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
