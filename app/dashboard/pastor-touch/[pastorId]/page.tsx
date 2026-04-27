"use client";

import { use, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AppShell, { type NavItem } from "@/components/layout/AppShell";
import { MINISTRY_NAV_ITEMS } from "@/lib/ministry-config";

const ACCENT = "#F28C28";
const PURPLE = "#7c3aed";

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Members", href: "/dashboard/members" },
  { label: "Departments", href: "/dashboard/departments" },
  { label: "Attendance", href: "/dashboard/attendance" },
  { label: "Visitors", href: "/dashboard/visitors" },
  { label: "Calendar", href: "/dashboard/calendar" },
  { label: "Communication Hub", href: "/dashboard/communication" },
  { label: "Pastoral Care", href: "#", isSection: true },
  { label: "🙏 Annual Pastor Touch", href: "/dashboard/pastor-touch" },
  { label: "Prayer", href: "/dashboard/prayer" },
  { label: "Visitation", href: "/dashboard/visitation" },
  { label: "Shepherd Pipeline", href: "/dashboard/shepherd" },
  { label: "Birthdays", href: "/dashboard/birthdays" },
  { label: "Evangelism", href: "/dashboard/evangelism" },
  { label: "Ministry", href: "#", isSection: true },
  { label: "🧒 Children's Ministry", href: "/dashboard/children-ministry" },
  ...MINISTRY_NAV_ITEMS,
  { label: "Settings", href: "/dashboard/settings" },
];

type Assignment = {
  id: string; member_id: string; week_number: number;
  member: { first_name: string; last_name: string; phone: string | null; address: string | null; city: string | null; state: string | null } | null;
  log: { call_done: boolean; letter_done: boolean; prayer_done: boolean };
};

type LogModal = { memberId: string; memberName: string; type: 'call' | 'letter' | 'prayer' } | null;

type FilterType = 'all' | 'complete' | 'partial' | 'none';

export default function PastorDetailPage({ params }: { params: Promise<{ pastorId: string }> }) {
  const { pastorId } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [filter, setFilter] = useState<FilterType>('all');
  const [logging, setLogging] = useState<string | null>(null);
  const [logModal, setLogModal] = useState<LogModal>(null);
  const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10));
  const [logNote, setLogNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load(t: string) {
    const res = await fetch(`/api/pastor-touch/assignments?pastor_id=${pastorId}`, { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) return;
    const d = await res.json();
    setAssignments(d.assignments ?? []);
    setCurrentWeek(d.current_week ?? 1);
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
  }, [pastorId, router]);

  function getStatus(log: Assignment['log']): FilterType {
    const done = [log.call_done, log.letter_done, log.prayer_done].filter(Boolean).length;
    return done === 3 ? 'complete' : done > 0 ? 'partial' : 'none';
  }

  const filtered = useMemo(() => {
    if (filter === 'all') return assignments;
    return assignments.filter(a => getStatus(a.log) === filter);
  }, [assignments, filter]);

  // Group by week
  const byWeek = useMemo(() => {
    const m: Record<number, Assignment[]> = {};
    for (const a of filtered) {
      if (!m[a.week_number]) m[a.week_number] = [];
      m[a.week_number].push(a);
    }
    return Object.entries(m).map(([w, list]) => ({ week: parseInt(w), list })).sort((a, b) => a.week - b.week);
  }, [filtered]);

  const total = assignments.length;
  const complete = assignments.filter(a => getStatus(a.log) === 'complete').length;
  const partial = assignments.filter(a => getStatus(a.log) === 'partial').length;
  const none = assignments.filter(a => getStatus(a.log) === 'none').length;

  async function quickLog(memberId: string, touchType: 'call' | 'letter' | 'prayer') {
    if (!token) return;
    const key = `${memberId}:${touchType}`;
    setLogging(key);
    await fetch(`/api/pastor-touch/log/${memberId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ touch_type: touchType, date: new Date().toISOString().slice(0, 10) }),
    });
    setLogging(null);
    await load(token);
  }

  async function submitLog() {
    if (!logModal || !token) return;
    setSubmitting(true);
    await fetch(`/api/pastor-touch/log/${logModal.memberId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ touch_type: logModal.type, date: logDate, note: logNote }),
    });
    setSubmitting(false);
    setLogModal(null);
    await load(token);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-gray-400">Loading…</div></div>;

  const statusStyle: Record<FilterType, string> = { all: "", complete: "bg-green-100 text-green-700", partial: "bg-amber-100 text-amber-700", none: "bg-gray-100 text-gray-500" };
  const touchEmoji = { call: "📞", letter: "✉️", prayer: "🙏" };

  return (
    <AppShell navItems={navItems}>
      <div className="px-8 py-10" style={{ background: `linear-gradient(135deg, #4338ca 0%, ${PURPLE} 100%)` }}>
        <Link href="/dashboard/pastor-touch" className="text-purple-200 text-xs mb-1 block hover:text-white">← Annual Pastor Touch</Link>
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>Pastor's Member List</h1>
        <p className="text-purple-200 text-sm mt-1">{total} members assigned · Week {currentWeek} of 52</p>
      </div>

      <div className="px-8 py-8 bg-gray-50 min-h-screen">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[{ label: "Total", v: total, c: "#6366f1" }, { label: "Complete", v: complete, c: "#22c55e" }, { label: "Partial", v: partial, c: ACCENT }, { label: "Not Started", v: none, c: "#9ca3af" }].map(s => (
            <div key={s.label} className="bg-white rounded-xl shadow-sm px-4 py-3 text-center border border-gray-100">
              <p className="text-2xl font-black" style={{ color: s.c }}>{s.v}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="flex gap-1.5 mb-5 flex-wrap">
          {(['all', 'complete', 'partial', 'none'] as FilterType[]).map(f => (
            <button key={f} onClick={() => setFilter(f)} className="px-4 py-2 rounded-xl text-xs font-medium transition-colors capitalize" style={{ backgroundColor: filter === f ? PURPLE : "white", color: filter === f ? "white" : "#6b7280", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
              {f === 'none' ? 'Not Started' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Assignments grouped by week */}
        {byWeek.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-8 text-center text-gray-400">No assignments found.</div>
        ) : (
          <div className="space-y-4">
            {byWeek.map(({ week, list }) => (
              <div key={week} className="bg-white rounded-2xl shadow overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3" style={{ backgroundColor: week === currentWeek ? "#faf5ff" : "white" }}>
                  <span className="text-sm font-bold" style={{ color: week === currentWeek ? PURPLE : "#9ca3af" }}>
                    Week {week}{week === currentWeek ? " ← This Week" : ""}
                  </span>
                  <span className="text-xs text-gray-400">{list.length} member{list.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {list.map(a => {
                    const m = a.member;
                    const log = a.log;
                    if (!m) return null;
                    const status = getStatus(log);
                    return (
                      <div key={a.id} className="px-5 py-3 flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{m.first_name} {m.last_name}</p>
                          {m.phone && <p className="text-xs text-gray-400">{m.phone}</p>}
                          {(m.address || m.city) && <p className="text-xs text-gray-400">{[m.address, [m.city, m.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}</p>}
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0 ${statusStyle[status]}`}>
                          {status === 'complete' ? '✅ Done' : status === 'partial' ? '🟡 Partial' : '⬜ Pending'}
                        </span>
                        <div className="flex gap-1.5 flex-shrink-0">
                          {(['call', 'letter', 'prayer'] as const).map(type => {
                            const done = log[`${type}_done` as keyof typeof log];
                            return done ? (
                              <span key={type} className="text-lg" title={`${type} done`}>✅</span>
                            ) : (
                              <button key={type} onClick={() => { setLogModal({ memberId: a.member_id, memberName: `${m.first_name} ${m.last_name}`, type }); setLogDate(new Date().toISOString().slice(0, 10)); setLogNote(""); }} className="px-2 py-1 rounded-lg text-xs border border-gray-200 hover:bg-gray-50 transition-colors" title={`Log ${type}`}>
                                {touchEmoji[type]}
                              </button>
                            );
                          })}
                          <Link href={`/dashboard/letters/pastor-touch/${a.member_id}`} target="_blank" className="px-2 py-1 rounded-lg text-xs border border-gray-200 hover:border-purple-200 transition-colors" title="Print letter">🖨️</Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Log Modal */}
      {logModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={() => setLogModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold" style={{ fontFamily: "Georgia, serif" }}>
                Log {touchEmoji[logModal.type]} {logModal.type.charAt(0).toUpperCase() + logModal.type.slice(1)}
              </h2>
              <p className="text-sm text-gray-500 mt-1">{logModal.memberName}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
                <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
                <textarea value={logNote} onChange={e => setLogNote(e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setLogModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">Cancel</button>
                <button onClick={submitLog} disabled={submitting} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: PURPLE }}>
                  {submitting ? "Saving…" : "✅ Mark Done"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
