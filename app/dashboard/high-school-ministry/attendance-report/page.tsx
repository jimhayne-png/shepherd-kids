"use client";

import { useEffect, useState } from "react";
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

const ACCENT = "#F28C28";

type Session = { id: string; name: string; date: string; status: string };
type Stats = { total: number; newVisitors: number; returning: number };

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

export default function HSAttendanceReportPage() {
  const [token, setToken] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [records, setRecords] = useState<any[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      const t = session.access_token;
      setToken(t);
      fetch("/api/high-school-ministry/attendance", {
        headers: { Authorization: `Bearer ${t}` },
      })
        .then(r => r.json())
        .then(d => { setSessions(d.sessions ?? []); setLoading(false); })
        .catch(() => setLoading(false));
    });
  }, []);

  useEffect(() => {
    if (!token || !selectedSessionId) return;
    setLoadingRecords(true);
    fetch(`/api/high-school-ministry/attendance?sessionId=${selectedSessionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => {
        setRecords(d.records ?? []);
        setStats(d.stats ?? null);
        setLoadingRecords(false);
      })
      .catch(() => setLoadingRecords(false));
  }, [token, selectedSessionId]);

  function exportCSV() {
    if (records.length === 0) return;
    const header = "Name,Grade,Check-In Time,Type\n";
    const rows = records.map((r: any) => {
      const name = r.student ? `${r.student.first_name} ${r.student.last_name}` : "Unknown";
      const grade = r.student?.grade ? `${r.student.grade} Grade` : "";
      const time = fmtTime(r.checked_in_at);
      const type = r.is_new_visitor ? "New Visitor" : "Returning";
      return `"${name}","${grade}","${time}","${type}"`;
    });
    const csv = header + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hs-attendance-${selectedSessionId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell navItems={navItems}>
      {/* Orange header */}
      <div style={{ background: "linear-gradient(135deg, #c2570a 0%, #F28C28 100%)", padding: "28px 32px" }}>
        <Link href="/dashboard/ministry/high-school" style={{ color: "rgba(255,255,255,0.8)", fontSize: 14, textDecoration: "none", display: "inline-block", marginBottom: 6 }}>
          ← Senior High
        </Link>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: "white" }}>Attendance Reports</h1>
      </div>

      <div style={{ padding: "32px", maxWidth: 900, margin: "0 auto" }}>
        {/* Session selector */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Select Session</label>
          {loading ? (
            <p style={{ color: "#9ca3af", fontSize: 14 }}>Loading sessions…</p>
          ) : (
            <select
              value={selectedSessionId}
              onChange={e => setSelectedSessionId(e.target.value)}
              style={{ padding: "10px 14px", borderRadius: 10, border: "1.5px solid #e5e7eb", fontSize: 14, backgroundColor: "white", minWidth: 300 }}
            >
              <option value="">— Choose a session —</option>
              {sessions.map(s => (
                <option key={s.id} value={s.id}>{s.name} — {fmtDate(s.date)}</option>
              ))}
            </select>
          )}
        </div>

        {!selectedSessionId ? (
          <div style={{ textAlign: "center", padding: 48, color: "#9ca3af" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>📊</div>
            <p style={{ fontSize: 16, margin: 0 }}>Select a session to view records.</p>
          </div>
        ) : loadingRecords ? (
          <div style={{ textAlign: "center", padding: 48, color: "#9ca3af" }}>Loading records…</div>
        ) : (
          <>
            {/* Stats cards */}
            {stats && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
                {[
                  { label: "Total", value: stats.total, color: "#1d4ed8", bg: "#eff6ff" },
                  { label: "New Visitors", value: stats.newVisitors, color: "#c2570a", bg: "#fff7ed" },
                  { label: "Returning", value: stats.returning, color: "#065f46", bg: "#ecfdf5" },
                ].map(card => (
                  <div key={card.label} style={{ backgroundColor: card.bg, borderRadius: 14, padding: "18px 22px", border: `1px solid ${card.bg}` }}>
                    <p style={{ margin: "0 0 4px", fontSize: 28, fontWeight: 900, color: card.color }}>{card.value}</p>
                    <p style={{ margin: 0, fontSize: 13, color: card.color, fontWeight: 600, opacity: 0.8 }}>{card.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Records table */}
            <div style={{ backgroundColor: "white", borderRadius: 16, boxShadow: "0 1px 6px rgba(0,0,0,0.08)", border: "1px solid #e5e7eb", overflow: "hidden", marginBottom: 16 }}>
              {records.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>No check-in records for this session.</div>
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

            {records.length > 0 && (
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  onClick={exportCSV}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 10, border: "none", backgroundColor: ACCENT, color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
                >
                  📥 Export CSV
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
