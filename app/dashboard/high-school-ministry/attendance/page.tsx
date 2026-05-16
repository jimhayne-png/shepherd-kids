"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AppShell, { type NavItem } from "@/components/layout/AppShell";
import { MINISTRY_NAV_ITEMS } from "@/lib/ministry-config";

const ACCENT = "#F28C28";

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}
function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

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

export default function HighSchoolAttendancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [records, setRecords] = useState<any[]>([]);
  const [stats, setStats] = useState<{ total: number; newVisitors: number; returning: number }>({
    total: 0,
    newVisitors: 0,
    returning: 0,
  });
  const [loadingRecords, setLoadingRecords] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/"); return; }
      const t = session.access_token;
      setToken(t);
      const res = await fetch("/api/high-school-ministry/attendance", {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        const d = await res.json();
        const sess: any[] = d.sessions ?? [];
        setSessions(sess);
        if (sess.length > 0) setSelectedSessionId(sess[0].id);
      }
      setLoading(false);
    }
    init();
  }, [router]);

  useEffect(() => {
    if (!selectedSessionId || !token) return;
    async function loadRecords() {
      setLoadingRecords(true);
      const res = await fetch(`/api/high-school-ministry/attendance?sessionId=${selectedSessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setRecords(d.records ?? []);
        setStats(d.stats ?? { total: 0, newVisitors: 0, returning: 0 });
      }
      setLoadingRecords(false);
    }
    loadRecords();
  }, [selectedSessionId, token]);

  function exportCsv() {
    const rows = [
      ["Name", "Grade", "Time", "Type"],
      ...records.map(r => [
        r.student ? `${r.student.first_name} ${r.student.last_name}` : "Unknown",
        r.student?.grade ?? "",
        fmtTime(r.checked_in_at),
        r.is_new_visitor ? "New Visitor" : "Returning",
      ]),
    ];
    const csv = rows.map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hs-attendance-${selectedSessionId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const selectedSession = sessions.find(s => s.id === selectedSessionId);

  return (
    <AppShell navItems={navItems}>
      {/* Header */}
      <div className="px-8 py-10" style={{ background: `linear-gradient(135deg, #c2570a 0%, ${ACCENT} 100%)` }}>
        <Link href="/dashboard/ministry/high-school" className="text-orange-200 text-xs mb-1 block hover:text-white">
          ← Senior High
        </Link>
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>
          Attendance
        </h1>
        {selectedSession && (
          <p className="text-orange-100 text-sm mt-1">{selectedSession.name} — {fmtDate(selectedSession.date)}</p>
        )}
      </div>

      <div className="px-8 py-8 bg-gray-50 min-h-screen">
        {loading ? (
          <div className="text-gray-400 text-sm py-12 text-center">Loading sessions…</div>
        ) : sessions.length === 0 ? (
          <div className="bg-white rounded-2xl shadow border border-gray-100 p-12 text-center">
            <p className="text-gray-500 font-medium mb-1">No sessions yet.</p>
            <p className="text-gray-400 text-sm">
              Create one in{" "}
              <Link href="/dashboard/high-school-ministry/checkin-setup" className="underline" style={{ color: ACCENT }}>
                Check-In Setup
              </Link>
              .
            </p>
          </div>
        ) : (
          <>
            {/* Session selector */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                Select Session
              </label>
              <select
                value={selectedSessionId}
                onChange={e => setSelectedSessionId(e.target.value)}
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 min-w-[280px]"
              >
                {sessions.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {fmtDate(s.date)}
                  </option>
                ))}
              </select>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: "Total", value: stats.total, color: "#3b82f6" },
                { label: "New Visitors", value: stats.newVisitors, color: ACCENT },
                { label: "Returning", value: stats.returning, color: "#10b981" },
              ].map(card => (
                <div key={card.label} className="bg-white rounded-xl shadow border border-gray-100 px-5 py-4">
                  <p className="text-2xl font-bold" style={{ color: card.color }}>{card.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{card.label}</p>
                </div>
              ))}
            </div>

            {/* Records */}
            {loadingRecords ? (
              <div className="text-gray-400 text-sm py-12 text-center">Loading records…</div>
            ) : records.length === 0 ? (
              <div className="bg-white rounded-2xl shadow border border-gray-100 p-12 text-center">
                <p className="text-gray-400">No check-in records for this session.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Check-In Records</h2>
                  <button
                    onClick={exportCsv}
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
                    style={{ backgroundColor: ACCENT }}
                  >
                    📥 Export CSV
                  </button>
                </div>
                <div className="bg-white rounded-2xl shadow overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">Student Name</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">Grade</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">Check-In Time</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map(r => (
                        <tr key={r.id} className="border-b border-gray-50 hover:bg-orange-50 transition-colors">
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                                style={{ backgroundColor: r.is_new_visitor ? "#10b981" : ACCENT }}
                              >
                                {r.student
                                  ? `${r.student.first_name[0]}${r.student.last_name[0]}`
                                  : "?"}
                              </div>
                              <span className="font-medium text-sm text-gray-900">
                                {r.student ? `${r.student.first_name} ${r.student.last_name}` : "Unknown"}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{r.student?.grade ?? "—"}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{fmtTime(r.checked_in_at)}</td>
                          <td className="px-4 py-3">
                            <span
                              className="text-xs font-semibold px-2.5 py-1 rounded-full"
                              style={{
                                backgroundColor: r.is_new_visitor ? "#dcfce7" : "#eff6ff",
                                color: r.is_new_visitor ? "#166534" : "#1e40af",
                              }}
                            >
                              {r.is_new_visitor ? "New Visitor" : "Returning"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
