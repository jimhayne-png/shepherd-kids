"use client";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  useEffect(() => {
    async function handleCallback() {
      const errorParam = new URLSearchParams(window.location.search).get("error");
      if (errorParam) {
        console.error("Auth callback error:", errorParam, new URLSearchParams(window.location.search).get("error_description"));
        window.location.href = "/";
        return;
      }

      // PKCE flow — ?code=... query param
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) console.error("exchangeCodeForSession error:", error);
        window.location.href = error ? "/" : "/dashboard";
        return;
      }

      // Implicit flow — #access_token=...&refresh_token=... hash fragment
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (error) console.error("setSession error:", error);
        window.location.href = error ? "/" : "/dashboard";
        return;
      }

      // Fallback — session may already be set (e.g. OAuth provider redirected back)
      const { data: { session } } = await supabase.auth.getSession();
      window.location.href = session ? "/dashboard" : "/";
    }

    handleCallback();
  }, []);

  return (
    <p style={{ textAlign: "center", marginTop: "40vh", fontFamily: "sans-serif" }}>
      Signing you in…
    </p>
  );
}
