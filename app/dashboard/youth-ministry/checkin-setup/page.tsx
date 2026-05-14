"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

type Session = { id: string; name: string; date: string; ministry_type: string; status: string };

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function CheckinSetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [toggling, setToggling] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [newType, setNewType] = useState("middle_school");
  const [creating, setCreating] = useState(false);

  async function load(t: string) {
    const res = await fetch('/api/youth-checkin/sessions', { headers: { Authorization: `Bearer ${t}` } });
    if (res.ok) { const d = await res.json(); setSessions(d.sessions ?? []); }
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
  }, [router]);

  async function handleCreate() {
    if (!token || !newName.trim() || !newDate) return;
    setCreating(true);
    const res = await fetch('/api/youth-checkin/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: newName.trim(), date: newDate, ministryType: newType }),
    });
    if (res.ok) {
      setShowForm(false);
      setNewName("");
      await load(token);
    }
    setCreating(false);
  }

  async function handleToggle(sessionId: string) {
    if (!token) return;
    setToggling(sessionId);
    const res = await fetch('/api/youth-checkin/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'toggle', sessionId }),
    });
    if (res.ok) { await load(token); }
    setToggling(null);
  }

  const ministryLabel = (t: string) => t === 'middle_school' ? 'Middle School' : t === 'senior_high' ? 'Senior High' : t;

  return (
    <AppShell navItems={navItems}>
      <div className="px-8 py-10" style={{ background: `linear-gradient(135deg, #c2570a 0%, ${ACCENT} 100%)` }}>
        <Link href="/dashboard/youth-ministry" className="text-orange-200 text-xs mb-1 block hover:text-white">← Youth Ministry</Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>Check-In Setup</h1>
            <p className="text-orange-100 text-sm mt-1">Create sessions and launch the student kiosk</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-5 py-2.5 rounded-xl text-sm font-bold bg-white"
            style={{ color: ACCENT }}
          >
            + New Session
          </button>
        </div>
      </div>

      <div className="px-8 py-8 bg-gray-50 min-h-screen">
        {showForm && (
          <div className="bg-white rounded-2xl shadow border border-gray-100 p-6 mb-6 max-w-xl">
            <h2 className="font-bold text-gray-900 mb-4">New Session</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Session Name</label>
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Sunday Youth Service" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Date</label>
                  <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Ministry Type</label>
                  <select value={newType} onChange={e => setNewType(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white">
                    <option value="middle_school">Middle School</option>
                    <option value="senior_high">Senior High</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600">Cancel</button>
                <button onClick={handleCreate} disabled={creating || !newName.trim()} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: ACCENT, opacity: creating || !newName.trim() ? 0.6 : 1 }}>
                  {creating ? "Creating…" : "Create Session"}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-gray-400 text-sm py-12 text-center">Loading sessions…</div>
        ) : sessions.length === 0 ? (
          <div className="bg-white rounded-2xl shadow border border-gray-100 p-12 text-center">
            <p className="text-3xl mb-3">📋</p>
            <p className="font-semibold text-gray-700 mb-1">No sessions yet</p>
            <p className="text-sm text-gray-400">Create your first session to get started.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">Session</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {sessions.map(s => (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-orange-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-gray-900 text-sm">{s.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{ministryLabel(s.ministry_type)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{fmtDate(s.date)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${s.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {s.status === 'open' ? '🟢 Open' : '⚫ Closed'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        {s.status === 'open' && (
                          <Link
                            href={`/youth-kiosk/${s.id}`}
                            target="_blank"
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                            style={{ backgroundColor: ACCENT }}
                          >
                            🖥️ Open Kiosk
                          </Link>
                        )}
                        <button
                          onClick={() => handleToggle(s.id)}
                          disabled={toggling === s.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50"
                        >
                          {toggling === s.id ? "…" : s.status === 'open' ? 'Close' : 'Reopen'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
