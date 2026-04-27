"use client";

import { use, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import MinistryShell from "@/components/layout/MinistryShell";
import { MINISTRY_CONFIG } from "@/lib/ministry-config";

const ACCENT = "#F28C28";


type AttendanceMember = { id: string; first_name: string; last_name: string; pipeline_stage: string | null };
type AttendanceRecord = { member_id: string; session_date: string; present: boolean; consecutive_weeks: number };

function fmt(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function AttendancePage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = use(params);
  const router = useRouter();
  const cfg = MINISTRY_CONFIG[type];

  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [members, setMembers] = useState<AttendanceMember[]>([]);
  const [sessions, setSessions] = useState<string[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10));
  const [toggling, setToggling] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const attendanceMap = useMemo(() => {
    const m: Record<string, boolean> = {};
    for (const r of records) m[`${r.member_id}:${r.session_date}`] = r.present;
    return m;
  }, [records]);

  const streakMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of records) {
      if (m[r.member_id] === undefined) m[r.member_id] = r.consecutive_weeks;
    }
    return m;
  }, [records]);

  // Sessions to display: DB sessions + today if not included
  const displaySessions = useMemo(() => {
    const s = new Set(sessions);
    s.add(sessionDate);
    return Array.from(s).sort().reverse().slice(0, 8);
  }, [sessions, sessionDate]);

  async function load(t: string) {
    const res = await fetch(`/api/ministry/${type}/attendance?sessions=8`, { headers: { Authorization: `Bearer ${t}` } });
    const data = await res.json();
    setMembers(data.members ?? []);
    setSessions(data.sessions ?? []);
    setRecords(data.records ?? []);
  }

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/"); return; }
      const t = session.access_token;
      setToken(t);
      await load(t);
      setLoading(false);
    }
    init();
  }, [type, router]);

  async function toggleAttendance(memberId: string, date: string) {
    if (!token || toggling) return;
    const key = `${memberId}:${date}`;
    const current = attendanceMap[key] ?? false;
    setToggling(key);

    const res = await fetch(`/api/ministry/${type}/attendance`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ member_id: memberId, session_date: date, present: !current }),
    });

    if (res.ok) await load(token);
    setToggling(null);
  }

  async function markAllPresent() {
    if (!token || markingAll || members.length === 0) return;
    setMarkingAll(true);
    await Promise.all(members.map(m =>
      fetch(`/api/ministry/${type}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ member_id: m.id, session_date: sessionDate, present: true }),
      })
    ));
    await load(token);
    setMarkingAll(false);
  }

  function exportCSV() {
    const headers = ["Name", "Pipeline Stage", ...displaySessions.map(fmt), "Streak"];
    const rows = members.map(m => [
      `${m.first_name} ${m.last_name}`,
      m.pipeline_stage ?? "",
      ...displaySessions.map(s => (attendanceMap[`${m.id}:${s}`] ? "✓" : "")),
      streakMap[m.id] ?? 0,
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${type}-attendance.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  // Stats for today's session
  const todayPresent = members.filter(m => attendanceMap[`${m.id}:${sessionDate}`] === true).length;
  const todayPct = members.length > 0 ? Math.round((todayPresent / members.length) * 100) : 0;

  if (!cfg) return <MinistryShell type={type}><div className="p-8 text-gray-500">Ministry not found.</div></MinistryShell>;
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-gray-400">Loading…</div></div>;

  return (
    <MinistryShell type={type}>
      {/* Hero */}
      <div className="px-8 py-8" style={{ background: `linear-gradient(135deg, #c2570a 0%, ${ACCENT} 100%)` }}>
        <Link href={`/dashboard/ministry/${type}`} className="text-orange-200 text-xs mb-1 block hover:text-white">← {cfg.name}</Link>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>Attendance</h1>
          <div className="flex items-center gap-3">
            <input type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)} className="px-3 py-2 rounded-xl text-sm border-0 bg-white/20 text-white placeholder-orange-100 focus:outline-none focus:bg-white/30" />
            <button onClick={markAllPresent} disabled={markingAll || members.length === 0} className="px-4 py-2 rounded-xl text-sm font-bold bg-white" style={{ color: ACCENT }}>
              {markingAll ? "Marking…" : "✓ Mark All Present"}
            </button>
            <button onClick={exportCSV} className="px-4 py-2 rounded-xl text-sm font-medium border border-white/30 text-white hover:bg-white/10">
              ⬇️ CSV
            </button>
          </div>
        </div>
      </div>


      <div className="px-8 py-8 bg-gray-50 min-h-screen">
        {/* Stats bar */}
        <div className="flex gap-4 mb-6 flex-wrap">
          <div className="bg-white rounded-xl px-5 py-3 shadow-sm border border-gray-100 flex items-center gap-2">
            <span className="text-sm text-gray-500">Today:</span>
            <span className="text-sm font-bold text-gray-900">{todayPresent} / {members.length}</span>
            <span className="text-sm font-bold" style={{ color: ACCENT }}>({todayPct}%)</span>
          </div>
          <div className="bg-white rounded-xl px-5 py-3 shadow-sm border border-gray-100 flex items-center gap-2">
            <span className="text-sm text-gray-500">Session date:</span>
            <span className="text-sm font-bold text-gray-900">{fmt(sessionDate)}</span>
          </div>
        </div>

        {members.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-12 text-center">
            <p className="text-gray-400">No active members on this roster. <Link href={`/dashboard/ministry/${type}/roster`} style={{ color: ACCENT }} className="underline">Add members to the roster →</Link></p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow overflow-x-auto">
            <table className="w-full min-w-max">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest sticky left-0 bg-white min-w-[180px]">Member</th>
                  {displaySessions.map(s => (
                    <th key={s} className="px-3 py-3 text-xs font-semibold text-center whitespace-nowrap" style={{ color: s === sessionDate ? ACCENT : "#9ca3af" }}>
                      {fmt(s)}{s === sessionDate && " ●"}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-xs font-semibold text-gray-400 text-center">Streak</th>
                </tr>
              </thead>
              <tbody>
                {members.map(member => (
                  <tr key={member.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 sticky left-0 bg-white">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: ACCENT }}>
                          {member.first_name[0]}{member.last_name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 whitespace-nowrap">
                            {(streakMap[member.id] ?? 0) >= 3 && <span className="mr-1">🔥</span>}
                            {member.first_name} {member.last_name}
                          </p>
                          {member.pipeline_stage && <p className="text-xs text-gray-400">{member.pipeline_stage}</p>}
                        </div>
                      </div>
                    </td>
                    {displaySessions.map(date => {
                      const key = `${member.id}:${date}`;
                      const present = attendanceMap[key];
                      const isToggling = toggling === key;
                      const isToday = date === sessionDate;
                      return (
                        <td key={date} className="px-3 py-3 text-center">
                          <button
                            onClick={() => toggleAttendance(member.id, date)}
                            disabled={!!toggling}
                            className="w-9 h-9 rounded-full flex items-center justify-center mx-auto transition-all hover:scale-110"
                            style={{
                              backgroundColor: present === true ? ACCENT : present === false ? "#fee2e2" : isToday ? "#fff7ed" : "#f3f4f6",
                              opacity: isToggling ? 0.5 : 1,
                              border: isToday ? `2px solid ${ACCENT}44` : "2px solid transparent",
                            }}
                          >
                            {present === true && <span className="text-white text-sm font-bold">✓</span>}
                            {present === false && <span className="text-red-400 text-sm font-bold">✗</span>}
                            {present === undefined && <span className="text-gray-300 text-sm">·</span>}
                          </button>
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-center">
                      {(streakMap[member.id] ?? 0) >= 1 ? (
                        <span className="text-sm font-bold" style={{ color: ACCENT }}>
                          {(streakMap[member.id] ?? 0) >= 3 && "🔥"} {streakMap[member.id]}
                        </span>
                      ) : <span className="text-gray-300 text-sm">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </MinistryShell>
  );
}
