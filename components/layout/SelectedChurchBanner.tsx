"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { selectedChurchHeaders } from "@/lib/selected-church";

const supabase = createClient();

interface SelectedChurchBannerProps {
  isMasterAdmin: boolean;
}

export default function SelectedChurchBanner({ isMasterAdmin }: SelectedChurchBannerProps) {
  const router = useRouter();
  const [churchName, setChurchName] = useState<string | null>(null);
  const [hasSelectedChurch, setHasSelectedChurch] = useState(false);

  useEffect(() => {
    const selectedId = typeof window !== "undefined"
      ? localStorage.getItem("selected_church_id")
      : null;

    if (!isMasterAdmin || !selectedId) return;
    setHasSelectedChurch(true);

    async function fetchChurchName() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch("/api/auth/church-info", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          ...selectedChurchHeaders(),
        },
      });
      if (!res.ok) return;
      const d = await res.json();
      setChurchName(d.churchName ?? null);
    }

    fetchChurchName();
  }, [isMasterAdmin]);

  if (!isMasterAdmin || !hasSelectedChurch || !churchName) return null;

  function handleBack() {
    localStorage.removeItem("selected_church_id");
    router.push("/dashboard/master-admin/churches");
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 28px",
        background: "rgba(123,44,191,0.15)",
        borderBottom: "1px solid rgba(123,44,191,0.35)",
        gap: 12,
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(212,175,55,0.7)" }}>
          Viewing Church
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#ffffff" }}>
          {churchName}
        </span>
      </div>
      <button
        onClick={handleBack}
        style={{
          padding: "5px 14px",
          borderRadius: 8,
          border: "1px solid rgba(212,175,55,0.4)",
          background: "none",
          color: "#D4AF37",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        ← All Churches
      </button>
    </div>
  );
}
