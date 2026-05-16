"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AppShell, { type NavItem } from "@/components/layout/AppShell";
import { MINISTRY_NAV_ITEMS } from "@/lib/ministry-config";

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Church Family", href: "#", isSection: true },
  { label: "👥 Members", href: "/dashboard/members" },
  { label: "🏛️ Departments", href: "/dashboard/departments" },
  { label: "🆕 Visitors", href: "/dashboard/visitors" },
  { label: "Engagement", href: "#", isSection: true },
  { label: "📅 Calendar", href: "/dashboard/calendar" },
  { label: "✅ Attendance", href: "/dashboard/attendance" },
  { label: "📋 Bulletin", href: "/dashboard/bulletin" },
  { label: "📢 Communication Hub", href: "/dashboard/communication" },
  { label: "Pastoral Care", href: "#", isSection: true },
  { label: "🙏 Annual Pastor Touch", href: "/dashboard/pastor-touch" },
  { label: "🏥 Visitation", href: "/dashboard/visitation" },
  { label: "🎂 Birthdays", href: "/dashboard/birthdays" },
  { label: "🔄 Shepherd Pipeline", href: "/dashboard/shepherd" },
  { label: "🙋 Prayer", href: "/dashboard/prayer" },
  { label: "Ministry", href: "#", isSection: true },
  ...MINISTRY_NAV_ITEMS,
  { label: "Outreach", href: "#", isSection: true },
  { label: "✝️ Evangelism", href: "/dashboard/evangelism" },
  { label: "📧 Visitor Onboarding", href: "/dashboard/visitors/sequences" },
  { label: "Marketing", href: "#", isSection: true },
  { label: "⭐ Review Campaign", href: "/dashboard/reviews" },
  { label: "Settings", href: "#", isSection: true },
  { label: "⚙️ Settings", href: "/dashboard/settings" },
  { label: "💳 Billing", href: "/dashboard/billing" },
  { label: "📖 Tutorials", href: "/dashboard/tutorials" },
];

type Session = { id: string; name: string; date: string; status: string };

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

export default function HSLiveCheckinPage() {
  const [token, setToken] = useState<string | null>(null);
  const [openSession, setOpenSession] = useState<Session | null>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchRecords = useCallback(async (tok: string, sessionId: string) => {
    const res = await fetch(`/api/high-school-ministry/live?sessionId=${sessionId}`, {
      headers: { Authorization: `Bearer ${tok}` },
    });
    if (res.ok) {
      const d = await res.json();
      setRecords(d.records ?? []);
      setLastRefresh(new Date());
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const t = session.access_token;
      setToken(t);

      const res = await fetch("/api/high-school-ministry/checkin-sessions", {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        const d = await res.json();
        const sessions: Session[] = d.sessions ?? [];
        const open = sessions.find(s => s.status === "open") ?? null;
        setOpenSession(open);
        if (open) {
          await fetchRecords(t, open.id);
        }
      }
      setLoading(false);
    });
  }, [fetchRecords]);

  useEffect(() => {
    if (!token || !openSession) return;
    const interval = setInterval(() => {
      fetchRecords(token, openSession.id);
    }, 30000);
    return () => clearInterval(interval);
  }, [token, openSession, fetchRecords]);

  return (
    <AppShell navItems={navItems}>
      {/* Orange header */}
      <div style={{ background: "linear-gradient(135deg, #c2570a 0%, #F28C28 100%)", padding: "28px 32px" }}>
        <Link href="/dashboard/ministry/high-school" style={{ color: "rgba(255,255,255,0.8)", fontSize: 14, textDecoration: "none", display: "inline-block", marginBottom: 6 }}>
          ← Senior High
        </Link>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: "white" }}>Live Check-In</h1>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.75)" }}>
            Last refreshed: {lastRefresh.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
          </p>
        </div>
      </div>

      <div style={{ padding: "32px", maxWidth: 900, margin: "0 auto" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 48, color: "#9ca3af" }}>Loading…</div>
        ) : !openSession ? (
          <div style={{ backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: "18px 22px", color: "#92400e", fontSize: 15 }}>
            No open session. Create one in{" "}
            <Link href="/dashboard/high-school-ministry/checkin-setup" style={{ color: "#92400e", fontWeight: 700, textDecoration: "underline" }}>
              Check-In Setup
            </Link>.
          </div>
        ) : (
          <>
            {/* Session info */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <span style={{ backgroundColor: "#dcfce7", color: "#166534", borderRadius: 20, padding: "6px 16px", fontSize: 14, fontWeight: 700 }}>
                {openSession.name}
              </span>
              <span style={{ backgroundColor: "#eff6ff", color: "#1d4ed8", borderRadius: 20, padding: "6px 16px", fontSize: 14, fontWeight: 700 }}>
                {records.length} checked in
              </span>
            </div>

            {/* Records table */}
            <div style={{ backgroundColor: "white", borderRadius: 16, boxShadow: "0 1px 6px rgba(0,0,0,0.08)", border: "1px solid #e5e7eb", overflow: "hidden" }}>
              {records.length === 0 ? (
                <div style={{ padding: 48, textAlign: "center" }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
                  <p style={{ fontSize: 16, color: "#9ca3af", margin: 0 }}>No check-ins yet this session.</p>
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                      {["Name", "Grade", "Time", "Type"].map(h => (
                        <th key={h} style={{ padding: "14px 20px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r: any) => (
                      <tr key={r.id} style={{ borderBottom: "1px solid #f9fafb" }}>
                        <td style={{ padding: "13px 20px", fontSize: 14, fontWeight: 600, color: "#111827" }}>
                          {r.student ? `${r.student.first_name} ${r.student.last_name}` : "Unknown"}
                        </td>
                        <td style={{ padding: "13px 20px", fontSize: 14, color: "#6b7280" }}>
                          {r.student?.grade ? `${r.student.grade} Grade` : "—"}
                        </td>
                        <td style={{ padding: "13px 20px", fontSize: 14, color: "#6b7280" }}>
                          {fmtTime(r.checked_in_at)}
                        </td>
                        <td style={{ padding: "13px 20px" }}>
                          {r.is_new_visitor ? (
                            <span style={{ backgroundColor: "#dcfce7", color: "#166534", borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>
                              🆕 New Visitor
                            </span>
                          ) : (
                            <span style={{ backgroundColor: "#f3f4f6", color: "#6b7280", borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600 }}>
                              ↩️ Returning
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <p style={{ marginTop: 14, fontSize: 12, color: "#9ca3af", textAlign: "right" }}>
              Auto-refreshes every 30 seconds
            </p>
          </>
        )}
      </div>
    </AppShell>
  );
}
