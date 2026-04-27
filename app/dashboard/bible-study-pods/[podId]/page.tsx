"use client";

import { use, useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AppShell, { type NavItem } from "@/components/layout/AppShell";
import { MINISTRY_CONFIG, MINISTRY_NAV_ITEMS } from "@/lib/ministry-config";

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
const TABS = ["Overview", "Members", "Attendance", "Follow Up"];

type PodMember = { id: string; first_name: string; last_name: string; email: string | null; phone: string | null; joined_at: string | null; attendance_rate: number };
type FollowupMember = {
  id: string; first_name: string; last_name: string; phone: string | null;
  phone_call_done: boolean; phone_call_date: string | null; phone_call_note: string | null;
  two_on_one_done: boolean; two_on_one_date: string | null; two_on_one_note: string | null;
  letter_done: boolean; letter_date: string | null; letter_note: string | null;
  status: string;
};
type ContactModal = { member: FollowupMember; type: 'phone_call' | 'two_on_one' | 'letter' } | null;

function fmt(iso: string | null) {
  if (!iso) return "";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function fmtTime(t: string | null) {
  if (!t) return "";
  try { const [h, m] = t.split(":"); const d = new Date(); d.setHours(parseInt(h), parseInt(m)); return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); } catch { return t; }
}

export default function PodDetailPage({ params }: { params: Promise<{ podId: string }> }) {
  const { podId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") ?? "Overview";

  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [pod, setPod] = useState<any>(null);
  const [members, setMembers] = useState<PodMember[]>([]);
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [addError, setAddError] = useState("");

  // Edit form (Overview tab)
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [leaderSearch, setLeaderSearch] = useState("");

  // Attendance tab
  const [attMembers, setAttMembers] = useState<any[]>([]);
  const [attSessions, setAttSessions] = useState<string[]>([]);
  const [attRecords, setAttRecords] = useState<any[]>([]);
  const [attSessionDate, setAttSessionDate] = useState(new Date().toISOString().slice(0, 10));
  const [toggling, setToggling] = useState<string | null>(null);

  // Follow up tab
  const [followupMembers, setFollowupMembers] = useState<FollowupMember[]>([]);
  const [followupSummary, setFollowupSummary] = useState({ calls_done: 0, visits_done: 0, letters_done: 0, total: 0 });
  const [contactModal, setContactModal] = useState<ContactModal>(null);
  const [contactDate, setContactDate] = useState(new Date().toISOString().slice(0, 10));
  const [contactNote, setContactNote] = useState("");
  const [loggingContact, setLoggingContact] = useState(false);

  async function loadPod(t: string) {
    const res = await fetch(`/api/bible-study-pods/${podId}`, { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) return;
    const data = await res.json();
    setPod(data.pod);
    setMembers(data.members ?? []);
    setEditForm({ name: data.pod.name, description: data.pod.description ?? "", leader_member_id: data.pod.leader_member_id ?? "", location_description: data.pod.location_description ?? "", meeting_day: data.pod.meeting_day ?? "", meeting_time: data.pod.meeting_time ?? "", curriculum_name: data.pod.curriculum_name ?? "", ministry_type: data.pod.ministry_type ?? "", status: data.pod.status });
    if (data.pod.leader) setLeaderSearch(`${data.pod.leader.first_name} ${data.pod.leader.last_name}`);
  }

  async function loadAttendance(t: string) {
    const res = await fetch(`/api/bible-study-pods/${podId}/attendance`, { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) return;
    const data = await res.json();
    setAttMembers(data.members ?? []);
    setAttSessions(data.sessions ?? []);
    setAttRecords(data.records ?? []);
  }

  async function loadFollowup(t: string) {
    const res = await fetch(`/api/bible-study-pods/${podId}/followup`, { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) return;
    const data = await res.json();
    setFollowupMembers(data.members ?? []);
    setFollowupSummary(data.summary ?? { calls_done: 0, visits_done: 0, letters_done: 0, total: 0 });
  }

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/"); return; }
      const t = session.access_token;
      setToken(t);
      const [_, mRes] = await Promise.all([
        loadPod(t),
        fetch("/api/members", { headers: { Authorization: `Bearer ${t}` } }),
      ]);
      const mData = await mRes.json();
      setAllMembers(mData.members ?? []);
      if (activeTab === "Attendance") await loadAttendance(t);
      if (activeTab === "Follow Up") await loadFollowup(t);
      setLoading(false);
    }
    init();
  }, [podId, router]);

  // Load tab-specific data when tab changes
  useEffect(() => {
    if (!token) return;
    if (activeTab === "Attendance") loadAttendance(token);
    if (activeTab === "Follow Up") loadFollowup(token);
  }, [activeTab, token]);

  const attMap = useMemo(() => {
    const m: Record<string, boolean> = {};
    for (const r of attRecords) m[`${r.member_id}:${r.session_date}`] = r.present;
    return m;
  }, [attRecords]);

  const displaySessions = useMemo(() => {
    const s = new Set(attSessions);
    s.add(attSessionDate);
    return Array.from(s).sort().reverse().slice(0, 8);
  }, [attSessions, attSessionDate]);

  const existingMemberIds = new Set(members.map(m => m.id));
  const filteredAllMembers = allMembers.filter(m =>
    !existingMemberIds.has(m.id) &&
    `${m.first_name} ${m.last_name} ${m.email ?? ""}`.toLowerCase().includes(memberSearch.toLowerCase())
  ).slice(0, 8);

  const filteredLeaders = allMembers.filter(m =>
    `${m.first_name} ${m.last_name}`.toLowerCase().includes(leaderSearch.toLowerCase())
  ).slice(0, 5);

  async function addMember(memberId: string) {
    if (!token) return;
    setAddingMember(true); setAddError("");
    const res = await fetch(`/api/bible-study-pods/${podId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ member_id: memberId }),
    });
    setAddingMember(false);
    if (!res.ok) { const d = await res.json(); setAddError(d.error ?? "Error"); return; }
    setMemberSearch("");
    await loadPod(token);
  }

  async function removeMember(memberId: string) {
    if (!token || !confirm("Remove from pod?")) return;
    await fetch(`/api/bible-study-pods/${podId}/members/${memberId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    await loadPod(token);
  }

  async function savePod() {
    if (!token) return;
    setSaving(true);
    await fetch(`/api/bible-study-pods/${podId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(editForm),
    });
    setSaving(false);
    await loadPod(token);
  }

  async function toggleAtt(memberId: string, date: string) {
    if (!token || toggling) return;
    const key = `${memberId}:${date}`;
    setToggling(key);
    await fetch(`/api/bible-study-pods/${podId}/attendance`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ member_id: memberId, session_date: date, present: !(attMap[key] ?? false) }),
    });
    await loadAttendance(token);
    setToggling(null);
  }

  async function markAllPresent() {
    if (!token || !attMembers.length) return;
    await Promise.all(attMembers.map(m =>
      fetch(`/api/bible-study-pods/${podId}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ member_id: m.id, session_date: attSessionDate, present: true }),
      })
    ));
    await loadAttendance(token);
  }

  function exportCSV() {
    const headers = ["Name", ...displaySessions.map(fmt), "Rate"];
    const rows = attMembers.map(m => [
      `${m.first_name} ${m.last_name}`,
      ...displaySessions.map(s => attMap[`${m.id}:${s}`] ? "✓" : ""),
      members.find(pm => pm.id === m.id)?.attendance_rate ?? 0,
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${pod?.name ?? "pod"}-attendance.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  function openContact(member: FollowupMember, type: 'phone_call' | 'two_on_one' | 'letter') {
    const existing = member[`${type}_date` as keyof FollowupMember] as string | null;
    setContactDate(existing ?? new Date().toISOString().slice(0, 10));
    setContactNote((member[`${type}_note` as keyof FollowupMember] as string | null) ?? "");
    setContactModal({ member, type });
  }

  async function logContact() {
    if (!contactModal || !token) return;
    setLoggingContact(true);
    await fetch(`/api/bible-study-pods/${podId}/followup`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ member_id: contactModal.member.id, contact_type: contactModal.type, date: contactDate, note: contactNote }),
    });
    setLoggingContact(false);
    setContactModal(null);
    await loadFollowup(token);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-gray-400">Loading…</div></div>;
  if (!pod) return <AppShell navItems={navItems}><div className="p-8 text-gray-500">Pod not found.</div></AppShell>;

  const ministryCfg = pod.ministry_type ? MINISTRY_CONFIG[pod.ministry_type] : null;

  const contactTypeLabel: Record<string, string> = { phone_call: "📞 Phone Call", two_on_one: "🤝 Two-on-One", letter: "✉️ Letter" };

  function ContactCell({ member, ctype }: { member: FollowupMember; ctype: 'phone_call' | 'two_on_one' | 'letter' }) {
    const done = member[`${ctype}_done` as keyof FollowupMember] as boolean;
    const date = member[`${ctype}_date` as keyof FollowupMember] as string | null;
    return (
      <button onClick={() => openContact(member, ctype)} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 w-full text-left transition-colors">
        {done ? <><span className="text-green-500 text-base">✅</span><span className="text-xs text-gray-400">{fmt(date)}</span></> : <span className="w-5 h-5 rounded-full border-2 border-gray-200 flex-shrink-0" />}
      </button>
    );
  }

  return (
    <AppShell navItems={navItems}>
      {/* Hero */}
      <div className="px-8 py-8" style={{ background: `linear-gradient(135deg, #0369a1 0%, ${POD_BLUE} 100%)` }}>
        <Link href="/dashboard/bible-study-pods" className="text-sky-200 text-xs mb-1 block hover:text-white">← Bible Study Pods</Link>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>{pod.name}</h1>
            <p className="text-sky-200 text-sm mt-1">
              {pod.leader ? `Leader: ${pod.leader.first_name} ${pod.leader.last_name}` : "No leader set"}
              {ministryCfg && ` · ${ministryCfg.emoji} ${ministryCfg.name}`}
            </p>
          </div>
          <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${pod.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {pod.status === 'active' ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 px-8 pt-4 overflow-x-auto" style={{ borderBottom: "1px solid #e5e7eb", backgroundColor: "white" }}>
        {TABS.map(tab => (
          <Link key={tab} href={`/dashboard/bible-study-pods/${podId}?tab=${tab}`} className="px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors"
            style={{ borderColor: activeTab === tab ? POD_BLUE : "transparent", color: activeTab === tab ? POD_BLUE : "#6b7280" }}>
            {tab}
          </Link>
        ))}
      </div>

      <div className="px-8 py-8 bg-gray-50 min-h-screen">

        {/* OVERVIEW TAB */}
        {activeTab === "Overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="font-bold text-gray-800 mb-5" style={{ fontFamily: "Georgia, serif" }}>Pod Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Pod Name *</label>
                  <input value={editForm.name ?? ""} onChange={e => setEditForm((f: any) => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                  <textarea value={editForm.description ?? ""} onChange={e => setEditForm((f: any) => ({ ...f, description: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Leader (search to change)</label>
                  <input value={leaderSearch} onChange={e => setLeaderSearch(e.target.value)} placeholder="Search members…" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-1" />
                  {leaderSearch && leaderSearch !== `${pod.leader?.first_name ?? ""} ${pod.leader?.last_name ?? ""}`.trim() && filteredLeaders.length > 0 && (
                    <div className="border border-gray-100 rounded-xl overflow-hidden">
                      {filteredLeaders.map(m => (
                        <button key={m.id} onClick={() => { setEditForm((f: any) => ({ ...f, leader_member_id: m.id })); setLeaderSearch(`${m.first_name} ${m.last_name}`); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0">
                          {m.first_name} {m.last_name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
                  <input value={editForm.location_description ?? ""} onChange={e => setEditForm((f: any) => ({ ...f, location_description: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Meeting Day</label>
                    <select value={editForm.meeting_day ?? ""} onChange={e => setEditForm((f: any) => ({ ...f, meeting_day: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                      <option value="">— Select —</option>
                      {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Time</label>
                    <input type="time" value={editForm.meeting_time ?? ""} onChange={e => setEditForm((f: any) => ({ ...f, meeting_time: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Ministry Association</label>
                  <select value={editForm.ministry_type ?? ""} onChange={e => setEditForm((f: any) => ({ ...f, ministry_type: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                    <option value="">— None —</option>
                    {MINISTRY_TYPES.map(m => <option key={m.key} value={m.key}>{m.emoji} {m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                  <select value={editForm.status ?? "active"} onChange={e => setEditForm((f: any) => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <button onClick={savePod} disabled={saving} className="w-full py-2.5 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: POD_BLUE }}>
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>

            {/* Curriculum */}
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="font-bold text-gray-800 mb-5" style={{ fontFamily: "Georgia, serif" }}>Curriculum</h2>
              {pod.curriculum_name ? (
                <div className="bg-sky-50 rounded-2xl p-5 text-center">
                  <p className="text-lg font-bold text-sky-900" style={{ fontFamily: "Georgia, serif" }}>📖 {pod.curriculum_name}</p>
                  <p className="text-5xl font-black text-sky-700 my-4">{pod.curriculum_week}</p>
                  <p className="text-sm text-sky-500 mb-5">Current Week</p>
                  <div className="flex gap-3 justify-center">
                    <button onClick={async () => { if (token) { await fetch(`/api/bible-study-pods/${podId}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ curriculum_week: Math.max(1, pod.curriculum_week - 1) }) }); await loadPod(token); } }} className="px-6 py-2.5 rounded-xl border border-sky-200 text-sky-700 font-bold text-sm hover:bg-sky-100 transition-colors">← Back</button>
                    <button onClick={async () => { if (token) { await fetch(`/api/bible-study-pods/${podId}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ curriculum_week: pod.curriculum_week + 1 }) }); await loadPod(token); } }} className="px-6 py-2.5 rounded-xl text-white font-bold text-sm" style={{ backgroundColor: POD_BLUE }}>Advance Week →</button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400 text-sm mb-3">No curriculum set. Add one in the Details panel.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <input value={editForm.curriculum_name ?? ""} onChange={e => setEditForm((f: any) => ({ ...f, curriculum_name: e.target.value }))} placeholder="Curriculum name" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                    </div>
                    <button onClick={savePod} className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: POD_BLUE }}>Set</button>
                  </div>
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Stats</h3>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-gray-50 rounded-xl py-3">
                    <p className="text-2xl font-black text-gray-900">{members.length}</p>
                    <p className="text-xs text-gray-400">Members</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl py-3">
                    <p className="text-2xl font-black" style={{ color: POD_BLUE }}>{members.length > 0 ? Math.round(members.reduce((s, m) => s + m.attendance_rate, 0) / members.length) : 0}%</p>
                    <p className="text-xs text-gray-400">Avg Attendance</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MEMBERS TAB */}
        {activeTab === "Members" && (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-800 mb-3" style={{ fontFamily: "Georgia, serif" }}>Members ({members.length})</h2>
              <div className="flex gap-2">
                <input value={memberSearch} onChange={e => setMemberSearch(e.target.value)} placeholder="Search members to add…" className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm" />
              </div>
              {memberSearch && filteredAllMembers.length > 0 && (
                <div className="mt-2 border border-gray-100 rounded-xl overflow-hidden">
                  {filteredAllMembers.map(m => (
                    <button key={m.id} onClick={() => addMember(m.id)} disabled={addingMember} className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-sky-50 border-b border-gray-50 last:border-0 transition-colors">
                      <span className="font-medium text-gray-800">{m.first_name} {m.last_name} {m.email && <span className="text-gray-400 text-xs">· {m.email}</span>}</span>
                      <span className="text-xs font-bold" style={{ color: POD_BLUE }}>+ Add</span>
                    </button>
                  ))}
                </div>
              )}
              {addError && <p className="text-xs text-red-500 mt-1">{addError}</p>}
            </div>
            {members.length === 0 ? (
              <div className="p-8 text-center text-gray-400">No members yet. Search above to add your first member.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest hidden md:table-cell">Contact</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">Joined</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">Attendance</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {members.map(m => (
                    <tr key={m.id} className="border-b border-gray-50 hover:bg-sky-50 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: POD_BLUE }}>
                            {m.first_name[0]}{m.last_name[0]}
                          </div>
                          <p className="text-sm font-medium text-gray-900">{m.first_name} {m.last_name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-sm text-gray-500">{m.email ?? "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{m.joined_at ? fmt(m.joined_at.slice(0, 10)) : "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-bold" style={{ color: m.attendance_rate >= 80 ? "#22c55e" : m.attendance_rate >= 50 ? "#f59e0b" : "#ef4444" }}>{m.attendance_rate}%</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => removeMember(m.id)} className="text-xs text-red-400 hover:text-red-600 transition-colors">Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ATTENDANCE TAB */}
        {activeTab === "Attendance" && (
          <>
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <input type="date" value={attSessionDate} onChange={e => setAttSessionDate(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white" />
                <button onClick={markAllPresent} className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: POD_BLUE }}>✓ Mark All Present</button>
              </div>
              <button onClick={exportCSV} className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium bg-white">⬇️ Export CSV</button>
            </div>
            <div className="bg-white rounded-2xl shadow overflow-x-auto">
              {attMembers.length === 0 ? (
                <div className="p-8 text-center text-gray-400">No members yet. Add members in the Members tab.</div>
              ) : (
                <table className="w-full min-w-max">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest sticky left-0 bg-white">Member</th>
                      {displaySessions.map(s => (
                        <th key={s} className="px-3 py-3 text-xs font-semibold text-center whitespace-nowrap" style={{ color: s === attSessionDate ? POD_BLUE : "#9ca3af" }}>
                          {fmt(s)}{s === attSessionDate ? " ●" : ""}
                        </th>
                      ))}
                      <th className="px-4 py-3 text-xs font-semibold text-gray-400 text-center">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attMembers.map(m => {
                      const podMember = members.find(pm => pm.id === m.id);
                      return (
                        <tr key={m.id} className="border-b border-gray-50 hover:bg-sky-50">
                          <td className="px-5 py-3 sticky left-0 bg-white">
                            <p className="text-sm font-medium text-gray-900 whitespace-nowrap">{m.first_name} {m.last_name}</p>
                          </td>
                          {displaySessions.map(date => {
                            const key = `${m.id}:${date}`;
                            const present = attMap[key];
                            return (
                              <td key={date} className="px-3 py-3 text-center">
                                <button onClick={() => toggleAtt(m.id, date)} disabled={!!toggling} className="w-9 h-9 rounded-full flex items-center justify-center mx-auto transition-all hover:scale-110" style={{ backgroundColor: present === true ? POD_BLUE : present === false ? "#fee2e2" : date === attSessionDate ? "#f0f9ff" : "#f3f4f6", opacity: toggling === key ? 0.5 : 1, border: date === attSessionDate ? `2px solid ${POD_BLUE}44` : "2px solid transparent" }}>
                                  {present === true ? <span className="text-white text-sm font-bold">✓</span> : present === false ? <span className="text-red-400 text-sm">✗</span> : <span className="text-gray-300 text-sm">·</span>}
                                </button>
                              </td>
                            );
                          })}
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm font-bold" style={{ color: (podMember?.attendance_rate ?? 0) >= 80 ? "#22c55e" : (podMember?.attendance_rate ?? 0) >= 50 ? "#f59e0b" : "#9ca3af" }}>
                              {podMember?.attendance_rate ?? 0}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* FOLLOW UP TAB */}
        {activeTab === "Follow Up" && (
          <>
            {/* Summary */}
            <div className="bg-white rounded-2xl shadow p-5 mb-5">
              <div className="flex gap-6 flex-wrap">
                {[
                  { label: "Phone Calls", done: followupSummary.calls_done, emoji: "📞" },
                  { label: "Two-on-Ones", done: followupSummary.visits_done, emoji: "🤝" },
                  { label: "Letters", done: followupSummary.letters_done, emoji: "✉️" },
                ].map(s => (
                  <div key={s.label} className="flex-1 min-w-24">
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-gray-500">{s.emoji} {s.label}</span>
                      <span className="font-bold text-gray-900">{s.done}/{followupSummary.total}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className="h-2 rounded-full" style={{ width: followupSummary.total > 0 ? `${(s.done / followupSummary.total) * 100}%` : '0%', backgroundColor: ACCENT }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Checklist table */}
            <div className="bg-white rounded-2xl shadow overflow-hidden">
              {followupMembers.length === 0 ? (
                <div className="p-8 text-center text-gray-400">No members in this pod.</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">Member</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">📞 Call</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">🤝 Visit</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">✉️ Letter</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {followupMembers.map(m => {
                      const statusStyle: Record<string, string> = { complete: "bg-green-100 text-green-700", partial: "bg-amber-100 text-amber-700", none: "bg-gray-100 text-gray-500" };
                      const statusLabel: Record<string, string> = { complete: "✅ Complete", partial: "🟡 Partial", none: "⬜ Not Started" };
                      return (
                        <tr key={m.id} className="border-b border-gray-50 hover:bg-orange-50 transition-colors">
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: ACCENT }}>
                                {m.first_name[0]}{m.last_name[0]}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{m.first_name} {m.last_name}</p>
                                {m.phone && <p className="text-xs text-gray-400">{m.phone}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3"><ContactCell member={m} ctype="phone_call" /></td>
                          <td className="px-4 py-3"><ContactCell member={m} ctype="two_on_one" /></td>
                          <td className="px-4 py-3"><ContactCell member={m} ctype="letter" /></td>
                          <td className="px-4 py-3">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusStyle[m.status]}`}>{statusLabel[m.status]}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>

      {/* Log Contact Modal */}
      {contactModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={() => setContactModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: "Georgia, serif" }}>{contactTypeLabel[contactModal.type]}</h2>
              <p className="text-sm text-gray-500 mt-1">{contactModal.member.first_name} {contactModal.member.last_name}</p>
            </div>
            <div className="p-6 space-y-4">
              {contactModal.member[`${contactModal.type}_done` as keyof FollowupMember] && (
                <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3">
                  <p className="text-xs font-semibold text-green-700">Already logged on {fmt(contactModal.member[`${contactModal.type}_date` as keyof FollowupMember] as string | null)} — update below.</p>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
                <input type="date" value={contactDate} onChange={e => setContactDate(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
                <textarea value={contactNote} onChange={e => setContactNote(e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setContactModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">Cancel</button>
                <button onClick={logContact} disabled={loggingContact} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: ACCENT }}>
                  {loggingContact ? "Saving…" : "✅ Mark Done"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
