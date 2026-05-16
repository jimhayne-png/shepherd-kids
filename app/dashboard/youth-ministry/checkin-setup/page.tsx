"use client";

import { useEffect, useState, useCallback } from "react";
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
  const [token, setToken] = useState<string | null>(null);
  const [msSessions, setMsSessions] = useState<Session[]>([]);
  const [hsSessions, setHsSessions] = useState<Session[]>([]);
  const [showMsForm, setShowMsForm] = useState(false);
  const [showHsForm, setShowHsForm] = useState(false);
  const [msName, setMsName] = useState("");
  const [hsName, setHsName] = useState("");
  const [msDate, setMsDate] = useState(new Date().toISOString().slice(0, 10));
  const [hsDate, setHsDate] = useState(new Date().toISOString().slice(0, 10));
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [creatingMs, setCreatingMs] = useState(false);
  const [creatingHs, setCreatingHs] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadMs = useCallback(async (t: string) => {
    const res = await fetch("/api/youth-checkin/sessions?ministry_type=middle-school", {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (res.ok) { const d = await res.json(); setMsSessions(d.sessions ?? []); }
  }, []);

  const loadHs = useCallback(async (t: string) => {
    const res = await fetch("/api/youth-checkin/sessions?ministry_type=high-school", {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (res.ok) { const d = await res.json(); setHsSessions(d.sessions ?? []); }
  }, []);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/"); return; }
      const t = session.access_token;
      setToken(t);
      await Promise.all([loadMs(t), loadHs(t)]);
      setLoading(false);
    }
    init();
  }, [router, loadMs, loadHs]);

  async function handleCreateMs() {
    if (!token || !msName.trim() || !msDate) return;
    setCreatingMs(true);
    const res = await fetch("/api/youth-checkin/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: msName.trim(), date: msDate, ministryType: "middle-school" }),
    });
    if (res.ok) {
      setShowMsForm(false);
      setMsName("");
      await loadMs(token);
    }
    setCreatingMs(false);
  }

  async function handleCreateHs() {
    if (!token || !hsName.trim() || !hsDate) return;
    setCreatingHs(true);
    const res = await fetch("/api/youth-checkin/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: hsName.trim(), date: hsDate, ministryType: "high-school" }),
    });
    if (res.ok) {
      setShowHsForm(false);
      setHsName("");
      await loadHs(token);
    }
    setCreatingHs(false);
  }

  async function handleToggle(session: Session) {
    if (!token) return;
    setTogglingId(session.id);
    const res = await fetch("/api/youth-checkin/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "toggle", sessionId: session.id, ministryType: session.ministry_type }),
    });
    if (res.ok) {
      if (session.ministry_type === "middle-school") await loadMs(token);
      else await loadHs(token);
    }
    setTogglingId(null);
  }

  function SessionPanel({
    emoji,
    title,
    ministryType,
    sessions,
    showForm,
    setShowForm,
    name,
    setName,
    date,
    setDate,
    creating,
    onCreate,
  }: {
    emoji: string;
    title: string;
    ministryType: string;
    sessions: Session[];
    showForm: boolean;
    setShowForm: (v: boolean) => void;
    name: string;
    setName: (v: string) => void;
    date: string;
    setDate: (v: string) => void;
    creating: boolean;
    onCreate: () => void;
  }) {
    return (
      <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden flex flex-col">
        {/* Panel header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 flex items-center gap-2" style={{ fontFamily: "Georgia, serif" }}>
            <span>{emoji}</span>
            {title}
          </h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-white"
            style={{ backgroundColor: ACCENT }}
          >
            + New Session
          </button>
        </div>

        {/* Inline create form */}
        {showForm && (
          <div className="px-6 py-4 border-b border-gray-100 bg-orange-50">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Session Name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Sunday Service"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 bg-white"
                >
                  Cancel
                </button>
                <button
                  onClick={onCreate}
                  disabled={creating || !name.trim()}
                  className="flex-1 py-2 rounded-lg text-xs font-bold text-white transition-opacity"
                  style={{ backgroundColor: ACCENT, opacity: creating || !name.trim() ? 0.6 : 1 }}
                >
                  {creating ? "Creating…" : "Create"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Session list */}
        {sessions.length === 0 ? (
          <div className="flex-1 px-6 py-10 text-center">
            <p className="text-2xl mb-2">📋</p>
            <p className="text-sm font-medium text-gray-500">No sessions yet</p>
            <p className="text-xs text-gray-400 mt-1">Create the first session above</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">Session</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {sessions.map(s => (
                  <tr key={s.id} className="border-b border-gray-50 last:border-0 hover:bg-orange-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-gray-900 text-sm">{s.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{fmtDate(s.date)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${s.status === "open" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {s.status === "open" ? "🟢 Open" : "⚫ Closed"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <Link
                          href={`/youth-kiosk/${s.id}`}
                          target="_blank"
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                          style={{ backgroundColor: ACCENT }}
                        >
                          🖥️ Open Kiosk
                        </Link>
                        <button
                          onClick={() => handleToggle(s)}
                          disabled={togglingId === s.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50"
                        >
                          {togglingId === s.id ? "…" : s.status === "open" ? "Close" : "Reopen"}
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
    );
  }

  return (
    <AppShell navItems={navItems}>
      <div className="px-8 py-10" style={{ background: `linear-gradient(135deg, #c2570a 0%, ${ACCENT} 100%)` }}>
        <Link href="/dashboard/youth-ministry" className="text-orange-200 text-xs mb-1 block hover:text-white">← Youth Ministry</Link>
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>Check-In Setup</h1>
        <p className="text-orange-100 text-sm mt-1">Create sessions and launch the student kiosk</p>
      </div>

      <div className="px-8 py-8 bg-gray-50 min-h-screen">
        {loading ? (
          <div className="text-gray-400 text-sm py-16 text-center">Loading sessions…</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SessionPanel
              emoji="🎒"
              title="Middle School Sessions"
              ministryType="middle-school"
              sessions={msSessions}
              showForm={showMsForm}
              setShowForm={setShowMsForm}
              name={msName}
              setName={setMsName}
              date={msDate}
              setDate={setMsDate}
              creating={creatingMs}
              onCreate={handleCreateMs}
            />
            <SessionPanel
              emoji="🎓"
              title="Senior High Sessions"
              ministryType="high-school"
              sessions={hsSessions}
              showForm={showHsForm}
              setShowForm={setShowHsForm}
              name={hsName}
              setName={setHsName}
              date={hsDate}
              setDate={setHsDate}
              creating={creatingHs}
              onCreate={handleCreateHs}
            />
          </div>
        )}
      </div>
    </AppShell>
  );
}
