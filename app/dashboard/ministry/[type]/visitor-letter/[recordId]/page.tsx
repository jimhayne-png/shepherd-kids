"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

const supabase = createClient();

const ACCENT = "#F28C28";

type LetterData = {
  record: { visitor_name: string; visitor_phone: string | null; visitor_email: string | null; checked_in_at: string };
  session: { service_name: string; date: string } | null;
  followupLog: { personalized_message: string | null } | null;
  churchName: string;
  ministryName: string;
};

export default function VisitorLetterPage({ params }: { params: Promise<{ type: string; recordId: string }> }) {
  const { type, recordId } = use(params);
  const router = useRouter();
  const [data, setData] = useState<LetterData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!user || error) {
        console.log("Dashboard client user unavailable:", error?.message ?? null);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`/api/ministry/${type}/visitor-letter/${recordId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) { setError("Letter not found."); return; }
      setData(await res.json());
    }
    load();
  }, [type, recordId, router]);

  if (error) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif" }}>
      <div style={{ textAlign: "center" }}><p style={{ color: "#dc2626", fontSize: 18 }}>{error}</p><Link href={`/dashboard/ministry/${type}/attendance`} style={{ color: ACCENT }}>← Back</Link></div>
    </div>
  );

  if (!data) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#9ca3af", fontFamily: "Georgia, serif" }}>Loading…</div>
    </div>
  );

  const { record, session, followupLog, churchName, ministryName } = data;
  const visitorFirstName = record.visitor_name?.split(" ")[0] ?? record.visitor_name ?? "Friend";
  const serviceDate = session?.date
    ? new Date(session.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : "Sunday";
  const todayStr = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const personalizedMsg = followupLog?.personalized_message ?? null;

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; }
        }
        @media screen {
          body { background: #f3f4f6; }
        }
      `}</style>

      {/* Screen-only controls */}
      <div className="no-print" style={{ background: ACCENT, padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href={`/dashboard/ministry/${type}/attendance`} style={{ color: "white", fontFamily: "Georgia, serif", fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
          ← Back to Attendance
        </Link>
        <button
          onClick={() => window.print()}
          style={{ background: "white", color: ACCENT, fontWeight: 800, fontSize: 15, padding: "10px 24px", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "Georgia, serif" }}
        >
          🖨️ Print Letter
        </button>
      </div>

      {/* Letter */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "48px 60px 80px", background: "white", minHeight: "100vh", fontFamily: "Georgia, serif", color: "#1f2937" }}>
        {/* Letterhead */}
        <div style={{ borderBottom: `3px solid ${ACCENT}`, paddingBottom: 20, marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: "bold" }}>{churchName}</div>
            <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 2 }}>{ministryName}</div>
          </div>
          <div style={{ fontSize: 14, color: "#6b7280" }}>{todayStr}</div>
        </div>

        <p style={{ fontSize: 16, marginBottom: 24 }}>Dear {record.visitor_name ?? "Friend"},</p>

        <p style={{ fontSize: 15, lineHeight: 1.8, marginBottom: 16, color: "#374151" }}>
          On behalf of our entire {ministryName} team, we want to sincerely welcome you to {churchName}.
          It was a true blessing to have you with us on <strong>{serviceDate}</strong>, and we hope you
          felt the warmth and love of our community.
        </p>

        {personalizedMsg && (
          <div style={{ borderLeft: `4px solid ${ACCENT}`, paddingLeft: 20, margin: "24px 0", background: "#fff7ed", padding: "16px 20px", borderRadius: "0 8px 8px 0" }}>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.8, color: "#9a3412" }}>{personalizedMsg}</p>
          </div>
        )}

        <p style={{ fontSize: 15, lineHeight: 1.8, marginBottom: 16, color: "#374151" }}>
          You are always welcome here. Our {ministryName} meets regularly, and we believe there is
          a place for you in this family. We would be overjoyed to see you again soon.
        </p>

        <p style={{ fontSize: 15, lineHeight: 1.8, marginBottom: 40, color: "#374151" }}>
          If you have any questions or would like to learn more about our ministry, please don't
          hesitate to reach out. We are here for you.
        </p>

        <div style={{ marginTop: 40 }}>
          <p style={{ margin: 0, fontSize: 15, color: "#374151" }}>With love and blessings,</p>
          <p style={{ margin: "8px 0 0", fontWeight: "bold", color: "#1f2937", fontSize: 16 }}>{churchName}</p>
          <p style={{ margin: "2px 0 0", fontSize: 14, color: "#6b7280" }}>{ministryName}</p>
        </div>
      </div>
    </>
  );
}
