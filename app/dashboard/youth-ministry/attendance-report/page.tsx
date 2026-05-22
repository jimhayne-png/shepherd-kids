"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AppShell, { type NavItem } from "@/components/layout/AppShell";
import { MINISTRY_NAV_ITEMS } from "@/lib/ministry-config";

const supabase = createClient();

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

type Session = { id: string; name: string; date: string; ministry_type: string; status: string };
type CheckinRecord = {
  id: string;
  student_id: string;
  is_new_visitor: boolean;
  checked_in_at: string;
  student: { first_name: string; last_name: string; grade: string | null } | null;
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AttendanceReportPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [ministryType, setMinistryType] = useState<"middle-school" | "high-school">("middle-school");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [records, setRecords] = useState<CheckinRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);

  const loadSessions = useCallback(async (t: string, mt: string) => {
    const res = await fetch(`/api/youth-checkin/sessions?ministry_type=${mt}`, {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (res.ok) {
      const d = await res.json();
      const list: Session[] = d.sessions ?? [];
      setSessions(list);
      if (list.length > 0) {
        setSelectedSessionId(list[0].id);
      } else {
        setSelectedSessionId("");
        setRecords([]);
      }
    }
  }, []);

  const loadRecords = useCallback(async (t: string, sessionId: string, mt: string) => {
    if (!sessionId) return;
    setLoadingRecords(true);
    const res = await fetch(`/api/youth-checkin/live?sessionId=${sessionId}&ministry_type=${mt}`, {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (res.ok) {
      const d = await res.json();
      setRecords(d.records ?? []);
    }
    setLoadingRecords(false);
  }, []);

  useEffect(() => {
    async function init() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!user || error) {
        console.log("Dashboard client user unavailable:", error?.message ?? null);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const t = session.access_token;
      setToken(t);
      await loadSessions(t, "middle-school");
      setLoading(false);
    }
    init();
  }, [router, loadSessions]);

  // When ministry type changes, reload sessions
  useEffect(() => {
    if (!token) return;
    setRecords([]);
    loadSessions(token, ministryType);
  }, [ministryType, token, loadSessions]);

  // When selected session changes, load records
  useEffect(() => {
    if (!token || !selectedSessionId) return;
    loadRecords(token, selectedSessionId, ministryType);
  }, [selectedSessionId, token, ministryType, loadRecords]);

  const totalCount = records.length;
  const newCount = records.filter(r => r.is_new_visitor).length;
  const returningCount = totalCount - newCount;

  function handleExportCsv() {
    const selectedSession = sessions.find(s => s.id === selectedSessionId);
    const rows = [
      ["Name", "Grade", "Check-In Time", "Type"],
      ...records.map(r => [
        r.student ? `${r.student.first_name} ${r.student.last_name}` : "Unknown",
        r.student?.grade ?? "",
        fmtTime(r.checked_in_at),
        r.is_new_visitor ? "New Visitor" : "Returning",
      ]),
    ];
    const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${selectedSession?.name ?? "report"}-${selectedSession?.date ?? ""}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell navItems={navItems}>
      <div className="px-8 py-10" style={{ background: `linear-gradient(135deg, #c2570a 0%, ${ACCENT} 100%)` }}>
        <Link href="/dashboard/youth-ministry" className="text-orange-200 text-xs mb-1 block hover:text-white">← Youth Ministry</Link>
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>Attendance Reports</h1>
        <p className="text-orange-100 text-sm mt-1">Review check-in history by session</p>
      </div>

      <div className="px-8 py-8 bg-gray-50 min-h-screen space-y-6">
        {/* Ministry type toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setMinistryType("middle-school")}
            className="px-4 py-2 rounded-xl text-sm font-semibold border transition-all"
            style={ministryType === "middle-school"
              ? { backgroundColor: ACCENT, color: "white", borderColor: ACCENT }
              : { backgroundColor: "white", color: "#6b7280", borderColor: "#e5e7eb" }}
          >
            🎒 Middle School
          </button>
          <button
            onClick={() => setMinistryType("high-school")}
            className="px-4 py-2 rounded-xl text-sm font-semibold border transition-all"
            style={ministryType === "high-school"
              ? { backgroundColor: ACCENT, color: "white", borderColor: ACCENT }
              : { backgroundColor: "white", color: "#6b7280", borderColor: "#e5e7eb" }}
          >
            🎓 Senior High
          </button>
        </div>

        {/* Session selector */}
        <div className="bg-white rounded-2xl shadow border border-gray-100 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Session</label>
              {loading ? (
                <p className="text-sm text-gray-400">Loading sessions…</p>
              ) : sessions.length === 0 ? (
                <p className="text-sm text-gray-400">No sessions found for this ministry type.</p>
              ) : (
                <select
                  value={selectedSessionId}
                  onChange={e => setSelectedSessionId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white"
                >
                  {sessions.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {fmtDate(s.date)} ({s.status})
                    </option>
                  ))}
                </select>
              )}
            </div>
            {records.length > 0 && (
              <button
                onClick={handleExportCsv}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-white whitespace-nowrap"
                style={{ backgroundColor: ACCENT }}
              >
                ⬇ Export CSV
              </button>
            )}
          </div>
        </div>

        {/* Stat cards */}
        {selectedSessionId && !loadingRecords && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total", value: totalCount, emoji: "👤" },
              { label: "New Visitors", value: newCount, emoji: "🆕" },
              { label: "Returning", value: returningCount, emoji: "🔁" },
            ].map(stat => (
              <div key={stat.label} className="bg-white rounded-xl shadow-sm px-5 py-4 flex items-center gap-3 border border-gray-100">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0" style={{ backgroundColor: ACCENT + "22" }}>
                  {stat.emoji}
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Records table */}
        {selectedSessionId && (
          <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
            {loadingRecords ? (
              <div className="py-12 text-center text-sm text-gray-400">Loading records…</div>
            ) : records.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-2xl mb-2">📋</p>
                <p className="text-sm text-gray-400">No check-ins recorded for this session.</p>
              </div>
            ) : (
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
                    <tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-orange-50 transition-colors">
                      <td className="px-6 py-3 font-medium text-gray-900 text-sm">
                        {r.student ? `${r.student.first_name} ${r.student.last_name}` : "Unknown"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {r.student?.grade ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {fmtTime(r.checked_in_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${r.is_new_visitor ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"}`}>
                          {r.is_new_visitor ? "🆕 New Visitor" : "🔁 Returning"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
