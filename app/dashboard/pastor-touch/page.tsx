"use client";

import { useEffect, useState } from "react";
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

function ProgressRing({ pct, size = 200, stroke = 18 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={ACCENT} strokeWidth={stroke}
        strokeDasharray={`${circ}`} strokeDashoffset={offset}
        strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="middle"
        style={{ fill: "#1f2937", fontSize: 38, fontWeight: 900, fontFamily: "Georgia,serif", transform: "rotate(90deg)", transformOrigin: `${size / 2}px ${size / 2}px` }}>
        {pct}%
      </text>
      <text x={size / 2} y={size / 2 + 28} textAnchor="middle"
        style={{ fill: "#9ca3af", fontSize: 13, transform: "rotate(90deg)", transformOrigin: `${size / 2}px ${size / 2}px` }}>
        complete
      </text>
    </svg>
  );
}

type Pastor = { id: string; name: string; title: string | null; assigned_count: number; complete_count: number; pct_complete: number };
type Assignment = { id: string; member_id: string; week_number: number; member: { first_name: string; last_name: string; phone: string | null; address: string | null; city: string | null } | null; log: { call_done: boolean; letter_done: boolean; prayer_done: boolean } };

export default function PastorTouchPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [overview, setOverview] = useState<{ pastors: Pastor[]; total_assigned: number; total_complete: number; pct_complete: number; current_week: number; year: number } | null>(null);
  const [weekAssignments, setWeekAssignments] = useState<Assignment[]>([]);
  const [logging, setLogging] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/"); return; }
      const t = session.access_token;
      setToken(t);

      const [ovRes, waRes] = await Promise.all([
        fetch("/api/pastor-touch/overview", { headers: { Authorization: `Bearer ${t}` } }),
        fetch("/api/pastor-touch/assignments?week=current", { headers: { Authorization: `Bearer ${t}` } }),
      ]);

      if (ovRes.ok) setOverview(await ovRes.json());
      if (waRes.ok) {
        const d = await waRes.json();
        setWeekAssignments(d.assignments ?? []);
      }
      setLoading(false);
    }
    init();
  }, [router]);

  async function logTouch(memberId: string, touchType: 'call' | 'letter' | 'prayer') {
    if (!token) return;
    setLogging(`${memberId}:${touchType}`);
    await fetch(`/api/pastor-touch/log/${memberId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ touch_type: touchType, date: new Date().toISOString().slice(0, 10) }),
    });
    setLogging(null);
    // Refresh week assignments
    const res = await fetch("/api/pastor-touch/assignments?week=current", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) { const d = await res.json(); setWeekAssignments(d.assignments ?? []); }
    // Refresh overview
    const ovRes = await fetch("/api/pastor-touch/overview", { headers: { Authorization: `Bearer ${token}` } });
    if (ovRes.ok) setOverview(await ovRes.json());
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-gray-400">Loading…</div></div>;

  const noSetup = !overview || overview.total_assigned === 0;

  return (
    <AppShell navItems={navItems}>
      {/* Hero */}
      <div className="px-8 py-10" style={{ background: `linear-gradient(135deg, #4338ca 0%, ${PURPLE} 100%)` }}>
        <p className="text-purple-200 text-sm mb-1">Pastoral Care</p>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>🙏 Annual Pastor Touch</h1>
            <p className="text-purple-200 text-sm mt-1">{overview?.year ?? new Date().getFullYear()} · Personal touch for every member</p>
          </div>
          <Link href="/dashboard/pastor-touch/setup" className="px-5 py-2.5 rounded-xl font-bold text-sm bg-white" style={{ color: PURPLE }}>
            ⚙️ Setup
          </Link>
        </div>
      </div>

      <div className="px-8 py-8 bg-gray-50 min-h-screen">
        {noSetup ? (
          <div className="max-w-xl mx-auto bg-white rounded-2xl shadow p-12 text-center">
            <div className="text-6xl mb-4">🙏</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3" style={{ fontFamily: "Georgia, serif" }}>Set Up Annual Pastor Touch</h2>
            <p className="text-gray-500 mb-6">Add your pastoral staff, then auto-assign all members across the year — 2 per week, every week, fully systematized.</p>
            <Link href="/dashboard/pastor-touch/setup" className="inline-block px-8 py-3.5 rounded-xl font-bold text-white text-base" style={{ backgroundColor: PURPLE }}>
              Get Started →
            </Link>
          </div>
        ) : (
          <>
            {/* Progress + Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Ring */}
              <div className="bg-white rounded-2xl shadow p-6 flex flex-col items-center justify-center">
                <ProgressRing pct={overview!.pct_complete} />
                <p className="text-sm text-gray-400 mt-2">{overview!.total_complete} of {overview!.total_assigned} members touched</p>
              </div>

              {/* Stats */}
              <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { label: "Total Members", value: overview!.total_assigned, emoji: "👥", color: "#6366f1" },
                  { label: "Fully Touched", value: overview!.total_complete, emoji: "✅", color: "#22c55e" },
                  { label: "Remaining", value: overview!.total_assigned - overview!.total_complete, emoji: "⏳", color: ACCENT },
                  { label: "Current Week", value: `Week ${overview!.current_week}`, emoji: "📅", color: PURPLE },
                  { label: "This Week", value: weekAssignments.length, emoji: "📋", color: "#0ea5e9" },
                  { label: "Active Pastors", value: overview!.pastors.length, emoji: "🙏", color: "#ec4899" },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-xl shadow-sm px-5 py-4 border border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{s.emoji}</span>
                      <p className="text-xl font-black text-gray-900">{s.value}</p>
                    </div>
                    <p className="text-xs text-gray-400">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* This Week's Batch */}
            {weekAssignments.length > 0 && (
              <div className="bg-white rounded-2xl shadow mb-6">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-gray-800" style={{ fontFamily: "Georgia, serif" }}>This Week — Week {overview!.current_week} of 52</h2>
                    <p className="text-sm text-gray-400 mt-0.5">{weekAssignments.length} member{weekAssignments.length !== 1 ? 's' : ''} this week</p>
                  </div>
                  <button
                    onClick={() => weekAssignments.forEach(a => window.open(`/dashboard/letters/pastor-touch/${a.member_id}`, '_blank'))}
                    className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-600 hover:border-purple-200 transition-colors"
                  >
                    🖨️ Print All Letters
                  </button>
                </div>
                <div className="divide-y divide-gray-50">
                  {weekAssignments.map(a => {
                    const m = a.member;
                    if (!m) return null;
                    const log = a.log ?? { call_done: false, letter_done: false, prayer_done: false };
                    const allDone = log.call_done && log.letter_done && log.prayer_done;
                    return (
                      <div key={a.id} className={`px-6 py-4 flex items-center gap-4 ${allDone ? 'bg-green-50' : ''}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {allDone && <span className="text-green-500 text-sm">✅</span>}
                            <p className="font-medium text-gray-900">{m.first_name} {m.last_name}</p>
                          </div>
                          {m.phone && <p className="text-xs text-gray-400">{m.phone}</p>}
                          {(m.address || m.city) && <p className="text-xs text-gray-400">{[m.address, m.city].filter(Boolean).join(', ')}</p>}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {(['call', 'letter', 'prayer'] as const).map(type => {
                            const done = log[`${type}_done` as keyof typeof log];
                            const labels = { call: "📞", letter: "✉️", prayer: "🙏" };
                            const key = `${a.member_id}:${type}`;
                            return done ? (
                              <span key={type} className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-green-100 text-green-700">{labels[type]} Done</span>
                            ) : (
                              <button key={type} onClick={() => logTouch(a.member_id, type)} disabled={logging === key} className="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors" style={{ opacity: logging === key ? 0.5 : 1 }}>
                                {labels[type]} Log
                              </button>
                            );
                          })}
                          <Link href={`/dashboard/letters/pastor-touch/${a.member_id}`} target="_blank" className="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-gray-200 text-gray-600 hover:border-purple-200 transition-colors">🖨️</Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* All Pastors Overview */}
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">Pastoral Staff Overview</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {overview!.pastors.map(pastor => (
                <Link key={pastor.id} href={`/dashboard/pastor-touch/${pastor.id}`} className="bg-white rounded-2xl shadow p-5 hover:shadow-md transition-shadow block">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-gray-900" style={{ fontFamily: "Georgia, serif" }}>{pastor.name}</p>
                      {pastor.title && <p className="text-xs text-gray-400">{pastor.title}</p>}
                    </div>
                    <span className="text-xl font-black" style={{ color: pastor.pct_complete >= 80 ? "#22c55e" : pastor.pct_complete >= 40 ? ACCENT : "#9ca3af" }}>
                      {pastor.pct_complete}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 mb-3 overflow-hidden">
                    <div className="h-2 rounded-full transition-all" style={{ width: `${pastor.pct_complete}%`, backgroundColor: pastor.pct_complete >= 80 ? "#22c55e" : ACCENT }} />
                  </div>
                  <p className="text-xs text-gray-400">{pastor.complete_count} of {pastor.assigned_count} members fully touched</p>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
