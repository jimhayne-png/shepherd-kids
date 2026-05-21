"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    async function init() {
      // Check if session is already available (e.g. hash fragment already processed).
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push("/dashboard");
        return;
      }

      // Wait for the browser client to process the hash fragment and fire SIGNED_IN.
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_IN" && session) {
          subscription.unsubscribe();
          clearTimeout(timeout);
          router.push("/dashboard");
        }
      });

      // Safety fallback — if no session arrives within 5 seconds, go to login.
      timeout = setTimeout(() => {
        subscription.unsubscribe();
        router.push("/");
      }, 5000);
    }

    init();

    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "sans-serif" }}>
      <p style={{ color: "#6b7280", fontSize: "16px" }}>Signing you in…</p>
    </div>
  );
}
