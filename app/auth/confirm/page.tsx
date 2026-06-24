"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { EmailOtpType } from "@supabase/supabase-js";

export default function ConfirmPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    async function handle() {
      // ── 1. Implicit flow: tokens in hash fragment ──────────────────────────
      // e.g. /auth/confirm#access_token=xxx&refresh_token=yyy&type=recovery
      const hash = typeof window !== "undefined" ? window.location.hash.slice(1) : "";
      if (hash) {
        const hp = new URLSearchParams(hash);
        const accessToken  = hp.get("access_token");
        const refreshToken = hp.get("refresh_token");
        const hashType     = hp.get("type");

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (!error) {
            router.replace(hashType === "recovery" ? "/auth/reset-password" : "/dashboard");
            return;
          }
        }
      }

      // ── 2. PKCE code flow: ?code=xxx ──────────────────────────────────────
      const sp   = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
      const code = sp.get("code");
      const next = sp.get("next") ?? "/dashboard";

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          router.replace(next);
          return;
        }
      }

      // ── 3. OTP token_hash flow: ?token_hash=xxx&type=recovery ─────────────
      const tokenHash = sp.get("token_hash");
      const otpType   = sp.get("type") as EmailOtpType | null;

      if (tokenHash && otpType) {
        const { error } = await supabase.auth.verifyOtp({ type: otpType, token_hash: tokenHash });
        if (!error) {
          router.replace(otpType === "recovery" ? "/auth/reset-password" : next);
          return;
        }
      }

      // ── Nothing worked ─────────────────────────────────────────────────────
      router.replace("/?error=auth");
    }

    handle();
  }, [router]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f9fafb" }}>
      <p style={{ fontSize: "14px", color: "#6b7280" }}>Verifying your link…</p>
    </div>
  );
}
