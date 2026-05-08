"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import MinistryShell from "@/components/layout/MinistryShell";

const ACCENT = "#F28C28";

type SessionOption = { id: string; service_name: string; date: string; scheduled_time: string | null; status: string };
type ReportChild = { child_name: string; parent_name: string; parent_phone: string; checked_in_at: string; checked_out_at: string | null; is_new_visitor: boolean; allergies: string[]; allergy_other: string | null; visit_count: number };
type ReportRoom = { room_id: string; room_name: string; children: ReportChild[] };
type Report = {
  session: SessionOption;
  summary: { totalChildren: number; roomsUsed: number; newVisitors: number; returning: number };
  rooms: ReportRoom[];
  visitorJourney: { new: number; returning: number; regular: number };
};

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function visitLabel(count: number) {
  if (count === 1) return "1st";
  if (count === 2) return "2nd";
  if (count === 3) return "3rd";
  return `${count}th`;
}
function visitColor(count: number) {
  if (count === 1) return "#3b82f6";
  if (count === 2) return "#8b5cf6";
  if (count === 3) return ACCENT;
  return "#16a34a";
}

function exportCSV(report: Report) {
  const rows: string[][] = [["Room", "Child Name", "Parent Name", "Check-In Time", "Check-Out Time", "New Visitor", "Visit #", "Allergies"]];
  for (const room of report.rooms) {
    for (const c of room.children) {
      rows.push([
        room.room_name,
        c.child_name,
        c.parent_name,
        fmtTime(c.checked_in_at),
        c.checked_out_at ? fmtTime(c.checked_out_at) : "",
        c.is_new_visitor ? "Yes" : "No",
        String(c.visit_count),
        [...c.allergies, c.allergy_other].filter(Boolean).join("; "),
      ]);
    }
  }
  const csv = rows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `attendance-${report.session.date}-${report.session.service_name.replace(/\s+/g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AttendanceReportPage() {
  const router = useRouter();
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/"); return; }
      const token = session.access_token;
      setAuthToken(token);
      const res = await fetch("/api/checkin/attendance-report", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const d = await res.json(); setSessions(d.sessions ?? []); }
    }
    init();
  }, [router]);

  async function loadReport(sessionId: string) {
    if (!authToken || !sessionId) return;
    setLoadingReport(true);
    setReport(null);
    const res = await fetch(`/api/checkin/attendance-report?sessionId=${sessionId}`, { headers: { Authorization: `Bearer ${authToken}` } });
    if (res.ok) { const d = await res.json(); setReport(d); }
    setLoadingReport(false);
  }

  return (
    <MinistryShell type="childrens">
      <div className="px-8 py-10" style={{ background: `linear-gradient(135deg, #c2570a 0%, ${ACCENT} 100%)` }}>
        <p className="text-orange-100 text-sm mb-1">Children's Ministry</p>
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>📊 Attendance Reports</h1>
      </div>

      <div className="px-8 py-8 bg-gray-50 min-h-screen">
        {/* Session selector */}
        <div className="bg-white rounded-2xl shadow p-6 mb-6 border border-gray-100">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-2">Select Session</label>
          <div className="flex gap-3">
            <select
              value={selectedId}
              onChange={e => { setSelectedId(e.target.value); loadReport(e.target.value); }}
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm"
            >
              <option value="">— Choose a session —</option>
              {sessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.service_name} · {fmtDate(s.date)}{s.status === "open" ? " (Open)" : ""}
                </option>
              ))}
            </select>
            {report && (
              <button
                onClick={() => exportCSV(report)}
                className="px-5 py-3 rounded-xl text-sm font-bold text-white"
                style={{ backgroundColor: ACCENT }}
              >
                ⬇ Export CSV
              </button>
            )}
          </div>
        </div>

        {loadingReport && (
          <div className="bg-white rounded-2xl shadow p-12 text-center"><div className="text-gray-400">Loading report…</div></div>
        )}

        {report && !loadingReport && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Total Children", value: report.summary.totalChildren, emoji: "👧" },
                { label: "Rooms Used", value: report.summary.roomsUsed, emoji: "🏠" },
                { label: "New Visitors", value: report.summary.newVisitors, emoji: "🆕" },
                { label: "Returning", value: report.summary.returning, emoji: "🔄" },
              ].map(card => (
                <div key={card.label} className="bg-white rounded-2xl shadow p-5 border border-gray-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0" style={{ backgroundColor: ACCENT + "22" }}>{card.emoji}</div>
                  <div>
                    <div className="text-2xl font-black text-gray-900">{card.value}</div>
                    <div className="text-xs text-gray-400">{card.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Visitor Journey */}
            <div className="bg-white rounded-2xl shadow p-6 mb-6 border border-gray-100">
              <h2 className="font-bold text-gray-800 mb-4" style={{ fontFamily: "Georgia, serif" }}>Visitor Journey</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-xl" style={{ backgroundColor: "#eff6ff" }}>
                  <div className="text-3xl font-black" style={{ color: "#3b82f6" }}>{report.visitorJourney.new}</div>
                  <div className="text-sm font-semibold mt-1" style={{ color: "#3b82f6" }}>🆕 New</div>
                  <div className="text-xs text-gray-400 mt-0.5">1st visit</div>
                </div>
                <div className="text-center p-4 rounded-xl" style={{ backgroundColor: "#fef3c7" }}>
                  <div className="text-3xl font-black" style={{ color: "#d97706" }}>{report.visitorJourney.returning}</div>
                  <div className="text-sm font-semibold mt-1" style={{ color: "#d97706" }}>🔄 Returning</div>
                  <div className="text-xs text-gray-400 mt-0.5">2–3 visits</div>
                </div>
                <div className="text-center p-4 rounded-xl" style={{ backgroundColor: "#f0fdf4" }}>
                  <div className="text-3xl font-black" style={{ color: "#16a34a" }}>{report.visitorJourney.regular}</div>
                  <div className="text-sm font-semibold mt-1" style={{ color: "#16a34a" }}>⭐ Regular</div>
                  <div className="text-xs text-gray-400 mt-0.5">4+ visits</div>
                </div>
              </div>
            </div>

            {/* Per-room breakdown */}
            <h2 className="font-bold text-gray-800 mb-4 text-lg" style={{ fontFamily: "Georgia, serif" }}>Room Breakdown</h2>
            {report.rooms.map(room => (
              <div key={room.room_id} className="bg-white rounded-2xl shadow border border-gray-100 mb-4 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between" style={{ backgroundColor: ACCENT + "0d" }}>
                  <h3 className="font-bold text-gray-900">{room.room_name}</h3>
                  <span className="text-sm font-bold px-3 py-1 rounded-full text-white" style={{ backgroundColor: ACCENT }}>
                    {room.children.length} {room.children.length === 1 ? "child" : "children"}
                  </span>
                </div>
                <div className="divide-y divide-gray-50">
                  {room.children.map((child, i) => (
                    <div key={i} className="px-6 py-3 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 text-sm">{child.child_name}</span>
                          {child.is_new_visitor && <span className="text-xs px-2 py-0.5 rounded-full font-bold text-white" style={{ backgroundColor: ACCENT }}>🆕 NEW</span>}
                          <span className="text-xs px-1.5 py-0.5 rounded font-bold text-white" style={{ backgroundColor: visitColor(child.visit_count) }}>
                            {visitLabel(child.visit_count)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">{child.parent_name} · {fmtTime(child.checked_in_at)}{child.checked_out_at ? ` → ${fmtTime(child.checked_out_at)}` : " (still checked in)"}</div>
                        {(child.allergies.length > 0 || child.allergy_other) && (
                          <div className="text-xs text-red-500 font-semibold mt-0.5">⚠️ {[...child.allergies, child.allergy_other].filter(Boolean).join(", ")}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {!loadingReport && !report && selectedId && (
          <div className="bg-white rounded-2xl shadow p-12 text-center"><p className="text-gray-400">No records found for this session.</p></div>
        )}

        {!selectedId && !loadingReport && (
          <div className="bg-white rounded-2xl shadow p-12 text-center">
            <div className="text-5xl mb-4">📊</div>
            <p className="text-gray-500 font-semibold">Select a session above to view the report.</p>
          </div>
        )}
      </div>
    </MinistryShell>
  );
}
