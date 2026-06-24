import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;

  const token_hash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";

  const cookieStore = await cookies();

  const pendingCookies: Array<{
    name: string;
    value: string;
    options: Parameters<typeof cookieStore.set>[2];
  }> = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach((cookie) => {
            pendingCookies.push(cookie);
          });
        },
      },
    }
  );

  let verified = false;
  let isRecovery = type === "recovery";

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[auth/callback] exchangeCodeForSession error:", error.message);
    } else {
      verified = true;

      if (next === "/auth/reset-password") {
        isRecovery = true;
      }
    }
  }

  if (!verified && token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    console.log("[auth/callback] verifyOtp:", {
      hasSession: !!data?.session,
      hasUser: !!data?.user,
      type,
      error: error?.message ?? null,
    });

    if (!error) {
      verified = true;
      isRecovery = type === "recovery";
    }
  }

  if (!verified) {
    // The browser may be carrying tokens in the URL hash fragment (implicit flow).
    // Server Route Handlers never see hash fragments, so we return a tiny HTML page
    // that forwards window.location.hash to /auth/confirm where a client component
    // can call setSession() with the tokens.
    console.log("[auth/callback] no server params — returning hash-forward shim");
    return new Response(
      `<!doctype html><html><head><meta charset="utf-8"></head><body><script>
        var h = window.location.hash;
        if (h) { window.location.replace('/auth/confirm' + h); }
        else    { window.location.replace('/?error=auth'); }
      <\/script></body></html>`,
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const destination = isRecovery ? "/auth/reset-password" : next;
  const response = NextResponse.redirect(`${origin}${destination}`);

  response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");

  const isSecure = process.env.NODE_ENV === "production";

  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, {
      ...options,
      path: "/",
      sameSite: "lax",
      secure: isSecure,
    });
  });

  console.log("[auth/callback] redirecting to:", `${origin}${destination}`);
  console.log("[auth/callback] cookies set:", pendingCookies.map((c) => c.name));

  return response;
}