import { createServerClient } from '@supabase/ssr'
import type { EmailOtpType } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/dashboard'

  if (token_hash && type) {
    const cookieStore = await cookies()

    // Collect cookies Supabase wants to set so we can copy them onto the
    // redirect response. Writing to cookieStore alone is not enough because
    // NextResponse.redirect() creates a separate response object.
    const pendingCookies: Array<{ name: string; value: string; options: Parameters<typeof cookieStore.set>[2] }> = []

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

    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash })

    console.log('verifyOtp result:', {
      hasSession: !!data?.session,
      hasUser: !!data?.user,
      error: error?.message ?? null,
    })

    if (!error) {
      const redirectUrl = `${origin}${next}`
      console.log('Redirecting to:', redirectUrl)

      const response = NextResponse.redirect(redirectUrl)

      // Copy session cookies onto the redirect response so the browser receives them.
      pendingCookies.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options)
      })

      return response
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth`)
}
