"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AppShell, { type NavItem } from "@/components/layout/AppShell";
import { MINISTRY_CONFIG, MINISTRY_NAV_ITEMS } from "@/lib/ministry-config";

const supabase = createClient();

const ACCENT = "#F28C28";
const POD_BLUE = "#0ea5e9";

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Members", href: "/dashboard/members" },
  { label: "Departments", href: "/dashboard/departments" },
  { label: "Attendance", href: "/dashboard/attendance" },
  { label: "Visitors", href: "/dashboard/visitors" },
  { label: "Calendar", href: "/dashboard/calendar" },
  { label: "Prayer", href: "/dashboard/prayer" },
  { label: "Communication Hub", href: "/dashboard/communication" },
  { label: "Visitation", href: "/dashboard/visitation" },
  { label: "Shepherd Pipeline", href: "/dashboard/shepherd" },
  { label: "Evangelism", href: "/dashboard/evangelism" },
  { label: "Birthdays", href: "/dashboard/birthdays" },
  { label: "🧒 Children's Ministry", href: "/dashboard/children-ministry" },
  ...MINISTRY_NAV_ITEMS,
  { label: "Settings", href: "/dashboard/settings" },
];

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MINISTRY_TYPES = Object.entries(MINISTRY_CONFIG).map(([key, cfg]) => ({ key, name: cfg.name, emoji: cfg.emoji }));

type Pod = {
  id: string; name: string; description: string | null; status: string;
  leader: { first_name: string; last_name: string } | null;
  leader_member_id: string | null;
  location_description: string | null;
  meeting_day: string | null; meeting_time: string | null;
  curriculum_name: string | null; curriculum_week: number;
  ministry_type: string | null;
  member_count: number; last_attendance_date: string | null; attendance_rate: number;
};

type AllMember = { id: string; first_name: string; last_name: string; email: string | null };

function AttBar({ rate }: { rate: number }) {
  const color = rate >= 80 ? "#22c55e" : rate >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${rate}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-bold w-8 text-right" style={{ color }}>{rate}%</span>
    </div>
  );
}

export default function BibleStudyPodsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [pods, setPods] = useState<Pod[]>([]);
  const [stats, setStats] = useState({ total_pods: 0, total_members: 0, active_this_week: 0, avg_attendance_rate: 0 });
  const [filter, setFilter] = useState<string>("all");
  const [allMembers, setAllMembers] = useState<AllMember[]>([]);

  // Attendance modal
  const [attPod, setAttPod] = useState<Pod | null>(null);
  const [attMembers, setAttMembers] = useState<any[]>([]);
  const [attSessions, setAttSessions] = useState<string[]>([]);
  const [attRecords, setAttRecords] = useState<any[]>([]);
  const [attSessionDate, setAttSessionDate] = useState(new Date().toISOString().slice(0, 10));
  const [toggling, setToggling] = useState<string | null>(null);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", leader_member_id: "", location_description: "", meeting_day: "", meeting_time: "", curriculum_name: "", curriculum_week: "1", ministry_type: "", memberSearch: "" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  async function load(t: string) {
    const res = await fetch("/api/bible-study-pods", { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) return;
    const data = await res.json();
    setPods(data.pods ?? []);
    setStats({ total_pods: data.total_pods, total_members: data.total_members, active_this_week: data.active_this_week, avg_attendance_rate: data.avg_attendance_rate });
  }

  async function openAttendance(pod: Pod) {
    if (!token) return;
    setAttPod(pod); setAttSessionDate(new Date().toISOString().slice(0, 10));
    const res = await fetch(`/api/bible-study-pods/${pod.id}/attendance`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setAttMembers(data.members ?? []);
    setAttSessions(data.sessions ?? []);
    setAttRecords(data.records ?? []);
  }

  const attMap = useMemo(() => {
    const m: Record<string, boolean> = {};
    for (const r of attRecords) m[`${r.member_id}:${r.session_date}`] = r.present;
    return m;
  }, [attRecords]);

  async function toggleAtt(memberId: string, date: string) {
    if (!attPod || !token || toggling) return;
    const key = `${memberId}:${date}`;
    setToggling(key);
    await fetch(`/api/bible-study-pods/${attPod.id}/attendance`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ member_id: memberId, session_date: date, present: !(attMap[key] ?? false) }),
    });
    const res = await fetch(`/api/bible-study-pods/${attPod.id}/attendance`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setAttRecords(data.records ?? []);
    setAttSessions(data.sessions ?? []);
    setToggling(null);
  }

  async function markAllPresent() {
    if (!attPod || !token || !attMembers.length) return;
    await Promise.all(attMembers.map(m =>
      fetch(`/api/bible-study-pods/${attPod.id}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ member_id: m.id, session_date: attSessionDate, present: true }),
      })
    ));
    const res = await fetch(`/api/bible-study-pods/${attPod.id}/attendance`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setAttRecords(data.records ?? []);
    setAttSessions(data.sessions ?? []);
  }

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
      const [_, mRes] = await Promise.all([
        load(t),
        fetch("/api/members", { headers: { Authorization: `Bearer ${t}` } }),
      ]);
      const mData = await mRes.json();
      setAllMembers(mData.members ?? []);
      setLoading(false);
    }
    init();
  }, [router]);

  async function advanceCurriculum(pod: Pod, delta: number) {
    if (!token) return;
    const newWeek = Math.max(1, pod.curriculum_week + delta);
    await fetch(`/api/bible-study-pods/${pod.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ curriculum_week: newWeek }),
    });
    if (token) await load(token);
  }

  async function createPod() {
    if (!form.name.trim()) { setCreateError("Pod name required"); return; }
    setCreating(true); setCreateError("");
    const res = await fetch("/api/bible-study-pods", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...form, curriculum_week: parseInt(form.curriculum_week) || 1 }),
    });
    if (!res.ok) { const d = await res.json(); setCreateError(d.error ?? "Error"); setCreating(false); return; }
    setCreating(false); setShowCreate(false);
    setForm({ name: "", description: "", leader_member_id: "", location_description: "", meeting_day: "", meeting_time: "", curriculum_name: "", curriculum_week: "1", ministry_type: "", memberSearch: "" });
    if (token) await load(token);
  }

  const filteredPods = useMemo(() => {
    if (filter === "all") return pods.filter(p => p.status === "active");
    if (filter === "inactive") return pods.filter(p => p.status === "inactive");
    return pods.filter(p => p.ministry_type === filter && p.status === "active");
  }, [pods, filter]);

  const filteredMembers = useMemo(() =>
    allMembers.filter(m => `${m.first_name} ${m.last_name} ${m.email ?? ""}`.toLowerCase().includes(form.memberSearch.toLowerCase())).slice(0, 8),
    [allMembers, form.memberSearch]
  );

  const displaySessions = useMemo(() => {
    const s = new Set(attSessions);
    s.add(attSessionDate);
    return Array.from(s).sort().reverse().slice(0, 8);
  }, [attSessions, attSessionDate]);

  function fmtDate(iso: string) {
    return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  function fmtTime(t: string | null) {
    if (!t) return "";
    try {
      const [h, m] = t.split(":");
      const d = new Date(); d.setHours(parseInt(h), parseInt(m));
      return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    } catch { return t; }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-gray-400">Loading…</div></div>;

  return (
    <AppShell navItems={navItems}>
      {/* Hero */}
      <div className="px-8 py-10" style={{ background: `linear-gradient(135deg, #0369a1 0%, ${POD_BLUE} 100%)` }}>
        <p className="text-sky-200 text-sm mb-1">Ministry</p>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>🏠 Bible Study Pods</h1>
          <button onClick={() => setShowCreate(true)} className="px-5 py-2.5 rounded-xl font-bold text-sm bg-white" style={{ color: POD_BLUE }}>
            + Create Pod
          </button>
        </div>
      </div>

      <div className="px-8 py-8 bg-gray-50 min-h-screen">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 -mt-6">
          {[
            { label: "Total Pods", value: stats.total_pods, emoji: "🏠" },
            { label: "Total Members", value: stats.total_members, emoji: "👥" },
            { label: "Active This Week", value: stats.active_this_week, emoji: "✅" },
            { label: "Avg Attendance", value: `${stats.avg_attendance_rate}%`, emoji: "📊" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl shadow-md px-5 py-4 flex items-center gap-3 border border-gray-100">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0" style={{ backgroundColor: POD_BLUE + "22" }}>{s.emoji}</div>
              <div>
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 mb-6 flex-wrap">
          {[{ key: "all", label: "All Active" }, ...MINISTRY_TYPES.map(m => ({ key: m.key, label: `${m.emoji} ${m.name}` })), { key: "inactive", label: "Inactive" }].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} className="px-3.5 py-2 rounded-xl text-xs font-medium transition-colors whitespace-nowrap" style={{ backgroundColor: filter === f.key ? POD_BLUE : "white", color: filter === f.key ? "white" : "#6b7280", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Pod cards */}
        {filteredPods.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-12 text-center">
            <div className="text-5xl mb-4">🏠</div>
            <p className="text-gray-400">No pods found. Create your first Bible Study Pod to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredPods.map(pod => {
              const ministryCfg = pod.ministry_type ? MINISTRY_CONFIG[pod.ministry_type] : null;
              return (
                <div key={pod.id} className="bg-white rounded-2xl shadow overflow-hidden group">
                  {/* Color accent bar */}
                  <div className="h-1.5" style={{ background: `linear-gradient(135deg, #0369a1, ${POD_BLUE})` }} />

                  <div className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="font-bold text-gray-900 text-lg truncate" style={{ fontFamily: "Georgia, serif" }}>{pod.name}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0 ${pod.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {pod.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        {pod.leader && <p className="text-sm text-gray-500">Leader: <strong>{pod.leader.first_name} {pod.leader.last_name}</strong></p>}
                      </div>
                      {ministryCfg && (
                        <span className="text-xs px-2 py-1 rounded-full bg-orange-50 text-orange-700 font-medium flex-shrink-0 ml-2">
                          {ministryCfg.emoji} {ministryCfg.name}
                        </span>
                      )}
                    </div>

                    {/* Details */}
                    <div className="space-y-1.5 mb-4 text-sm text-gray-500">
                      {pod.location_description && <p>📍 {pod.location_description}</p>}
                      {(pod.meeting_day || pod.meeting_time) && (
                        <p>🗓️ {[pod.meeting_day, fmtTime(pod.meeting_time)].filter(Boolean).join(" · ")}</p>
                      )}
                    </div>

                    {/* Curriculum */}
                    {pod.curriculum_name && (
                      <div className="flex items-center justify-between mb-4 bg-sky-50 rounded-xl px-3 py-2">
                        <div>
                          <p className="text-xs font-semibold text-sky-800">📖 {pod.curriculum_name}</p>
                          <p className="text-xs text-sky-600">Week {pod.curriculum_week}</p>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => advanceCurriculum(pod, -1)} className="w-6 h-6 rounded-full bg-white text-sky-600 text-xs font-bold border border-sky-200 hover:bg-sky-100 transition-colors">−</button>
                          <button onClick={() => advanceCurriculum(pod, 1)} className="w-6 h-6 rounded-full bg-sky-600 text-white text-xs font-bold hover:bg-sky-700 transition-colors">+</button>
                        </div>
                      </div>
                    )}

                    {/* Stats row */}
                    <div className="flex items-center gap-3 mb-4 text-xs text-gray-400">
                      <span>👥 {pod.member_count} members</span>
                      {pod.last_attendance_date && <span>Last: {fmtDate(pod.last_attendance_date)}</span>}
                    </div>

                    {/* Attendance rate */}
                    <div className="mb-4">
                      <p className="text-xs text-gray-400 mb-1">Attendance rate (last 4 sessions)</p>
                      <AttBar rate={pod.attendance_rate} />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Link href={`/dashboard/bible-study-pods/${pod.id}`} className="flex-1 py-2 rounded-xl text-xs font-bold text-white text-center transition-opacity hover:opacity-90" style={{ backgroundColor: POD_BLUE }}>
                        Manage
                      </Link>
                      <button onClick={() => openAttendance(pod)} className="flex-1 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                        📋 Attendance
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Attendance Modal */}
      {attPod && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={() => setAttPod(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="font-bold text-gray-900" style={{ fontFamily: "Georgia, serif" }}>{attPod.name} — Attendance</h2>
              </div>
              <div className="flex items-center gap-2">
                <input type="date" value={attSessionDate} onChange={e => setAttSessionDate(e.target.value)} className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs" />
                <button onClick={markAllPresent} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ backgroundColor: POD_BLUE }}>✓ All Present</button>
                <button onClick={() => setAttPod(null)} className="text-gray-400 hover:text-gray-600 ml-1">✕</button>
              </div>
            </div>
            <div className="overflow-x-auto overflow-y-auto flex-1">
              {attMembers.length === 0 ? (
                <div className="p-8 text-center text-gray-400">No members in this pod.</div>
              ) : (
                <table className="w-full min-w-max">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest sticky left-0 bg-white">Member</th>
                      {displaySessions.map(s => (
                        <th key={s} className="px-3 py-3 text-xs font-semibold text-center whitespace-nowrap" style={{ color: s === attSessionDate ? POD_BLUE : "#9ca3af" }}>
                          {fmtDate(s)}{s === attSessionDate ? " ●" : ""}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {attMembers.map(m => (
                      <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-5 py-3 sticky left-0 bg-white">
                          <p className="text-sm font-medium text-gray-900 whitespace-nowrap">{m.first_name} {m.last_name}</p>
                        </td>
                        {displaySessions.map(date => {
                          const key = `${m.id}:${date}`;
                          const present = attMap[key];
                          return (
                            <td key={date} className="px-3 py-3 text-center">
                              <button onClick={() => toggleAtt(m.id, date)} disabled={!!toggling} className="w-8 h-8 rounded-full flex items-center justify-center mx-auto transition-all hover:scale-110" style={{ backgroundColor: present === true ? POD_BLUE : present === false ? "#fee2e2" : date === attSessionDate ? "#f0f9ff" : "#f3f4f6", opacity: toggling === key ? 0.5 : 1, border: date === attSessionDate ? `2px solid ${POD_BLUE}44` : "2px solid transparent" }}>
                                {present === true ? <span className="text-white text-xs font-bold">✓</span> : present === false ? <span className="text-red-400 text-xs">✗</span> : <span className="text-gray-300 text-xs">·</span>}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Pod Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 sticky top-0 bg-white">
              <h2 className="text-xl font-bold" style={{ fontFamily: "Georgia, serif" }}>Create Bible Study Pod</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Pod Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Tuesday Morning Men's Study" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Leader (search members)</label>
                <input value={form.memberSearch} onChange={e => setForm(f => ({ ...f, memberSearch: e.target.value }))} placeholder="Search by name…" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-2" />
                {form.memberSearch && (
                  <div className="border border-gray-100 rounded-xl overflow-hidden max-h-32 overflow-y-auto">
                    {filteredMembers.map(m => (
                      <button key={m.id} onClick={() => setForm(f => ({ ...f, leader_member_id: m.id, memberSearch: `${m.first_name} ${m.last_name}` }))} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0">
                        {m.first_name} {m.last_name} {m.email && <span className="text-xs text-gray-400">· {m.email}</span>}
                      </button>
                    ))}
                  </div>
                )}
                {form.leader_member_id && !form.memberSearch.includes(" ") === false && (
                  <p className="text-xs text-green-600 mt-1">✓ Leader selected</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
                <input value={form.location_description} onChange={e => setForm(f => ({ ...f, location_description: e.target.value }))} placeholder="Home of Pastor Mike" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Meeting Day</label>
                  <select value={form.meeting_day} onChange={e => setForm(f => ({ ...f, meeting_day: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                    <option value="">— Select —</option>
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Time</label>
                  <input type="time" value={form.meeting_time} onChange={e => setForm(f => ({ ...f, meeting_time: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Curriculum Name</label>
                  <input value={form.curriculum_name} onChange={e => setForm(f => ({ ...f, curriculum_name: e.target.value }))} placeholder="Romans" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Starting Week</label>
                  <input type="number" min="1" value={form.curriculum_week} onChange={e => setForm(f => ({ ...f, curriculum_week: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Ministry Association (optional)</label>
                <select value={form.ministry_type} onChange={e => setForm(f => ({ ...f, ministry_type: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  <option value="">— None —</option>
                  {MINISTRY_TYPES.map(m => <option key={m.key} value={m.key}>{m.emoji} {m.name}</option>)}
                </select>
              </div>

              {createError && <p className="text-sm text-red-600">{createError}</p>}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">Cancel</button>
                <button onClick={createPod} disabled={creating} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: POD_BLUE }}>
                  {creating ? "Creating…" : "Create Pod"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
