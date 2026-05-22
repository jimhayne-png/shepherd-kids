"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    let redirected = false;

    async function handleSession(userId: string) {
      if (redirected) return;
      redirected = true;

      const { data: cu } = await supabase
        .from("church_users")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (cu?.role === "ministry_leader") {
        const { data: dl } = await supabase
          .from("department_leaders")
          .select("department_id")
          .eq("user_id", userId)
          .maybeSingle();
        if (dl?.department_id) {
          router.replace(`/shepherd/${dl.department_id}`);
          return;
        }
      }

      router.replace("/dashboard");
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session) {
        handleSession(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-500">Signing you in…</p>
    </div>
  );
}
