import { createServerClient } from '@supabase/ssr'
import type { EmailOtpType } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type       = searchParams.get('type') as EmailOtpType | null
  const code       = searchParams.get('code')
  const next       = searchParams.get('next') ?? '/dashboard'

  // Cookies set during this request must be copied onto the redirect response.
  // Writing to cookieStore alone is insufficient because NextResponse.redirect()
  // creates a separate response object that wouldn't carry those cookies.
  const cookieStore = await cookies()
  const pendingCookies: Array<{
    name: string
    value: string
    options: Parameters<typeof cookieStore.set>[2]
  }> = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(c => pendingCookies.push(c))
        },
      },
    }
  )

  let verified = false

  // ── PKCE code exchange (newer Supabase email format: ?code=xxx) ───────────
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error('[auth/callback] exchangeCodeForSession error:', error.message)
    } else {
      verified = true
    }
  }

  // ── OTP token_hash flow (older / explicit OTP email format) ──────────────
  if (!verified && token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash })
    console.log('[auth/callback] verifyOtp:', {
      hasSession: !!data?.session,
      hasUser:    !!data?.user,
      error:      error?.message ?? null,
    })
    if (!error) verified = true
  }

  if (verified) {
    // Recovery links must always land on the password-update page regardless
    // of the `next` param so the user can never accidentally skip it.
    const destination = type === 'recovery' ? '/auth/reset-password' : next
    const redirectUrl = `${origin}${destination}`
    console.log('[auth/callback] redirecting to:', redirectUrl)

    const response = NextResponse.redirect(redirectUrl)
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma',        'no-cache')
    response.headers.set('Expires',       '0')

    // secure:true on HTTP (localhost) causes browsers to silently drop the
    // cookie, breaking the recovery flow entirely on local dev.
    const isSecure = process.env.NODE_ENV === 'production'

    pendingCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, {
        ...options,
        path:     '/',
        sameSite: 'lax',
        secure:   isSecure,
      })
    })

    console.log('[auth/callback] cookies set:', pendingCookies.map(c => c.name))
    return response
  }

  console.error('[auth/callback] no valid code or token_hash/type — redirecting to error')
  return NextResponse.redirect(`${origin}/?error=auth`)
}
