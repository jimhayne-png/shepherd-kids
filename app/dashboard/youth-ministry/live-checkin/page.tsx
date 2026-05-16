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

export default function LiveCheckinPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [msSession, setMsSession] = useState<Session | null>(null);
  const [hsSession, setHsSession] = useState<Session | null>(null);
  const [msRecords, setMsRecords] = useState<CheckinRecord[]>([]);
  const [hsRecords, setHsRecords] = useState<CheckinRecord[]>([]);

  const fetchData = useCallback(async (t: string) => {
    const headers = { Authorization: `Bearer ${t}` };

    const [msRes, hsRes] = await Promise.all([
      fetch("/api/youth-checkin/sessions?ministry_type=middle-school", { headers }),
      fetch("/api/youth-checkin/sessions?ministry_type=high-school", { headers }),
    ]);

    let msOpen: Session | null = null;
    let hsOpen: Session | null = null;

    if (msRes.ok) {
      const d = await msRes.json();
      msOpen = (d.sessions ?? []).find((s: Session) => s.status === "open") ?? null;
      setMsSession(msOpen);
    }
    if (hsRes.ok) {
      const d = await hsRes.json();
      hsOpen = (d.sessions ?? []).find((s: Session) => s.status === "open") ?? null;
      setHsSession(hsOpen);
    }

    const recordFetches: Promise<void>[] = [];

    if (msOpen) {
      recordFetches.push(
        fetch(`/api/youth-checkin/live?sessionId=${msOpen.id}&ministry_type=middle-school`, { headers })
          .then(r => r.ok ? r.json() : { records: [] })
          .then(d => setMsRecords(d.records ?? []))
      );
    } else {
      setMsRecords([]);
    }

    if (hsOpen) {
      recordFetches.push(
        fetch(`/api/youth-checkin/live?sessionId=${hsOpen.id}&ministry_type=high-school`, { headers })
          .then(r => r.ok ? r.json() : { records: [] })
          .then(d => setHsRecords(d.records ?? []))
      );
    } else {
      setHsRecords([]);
    }

    await Promise.all(recordFetches);
  }, []);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/"); return; }
      const t = session.access_token;
      setToken(t);
      await fetchData(t);
      setLoading(false);
    }
    init();
  }, [router, fetchData]);

  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => fetchData(token), 30000);
    return () => clearInterval(interval);
  }, [token, fetchData]);

  function SessionPanel({
    emoji,
    title,
    session,
    records,
  }: {
    emoji: string;
    title: string;
    session: Session | null;
    records: CheckinRecord[];
  }) {
    return (
      <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{emoji}</span>
            <h2 className="font-bold text-gray-900" style={{ fontFamily: "Georgia, serif" }}>{title}</h2>
          </div>
          {session && (
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-green-100 text-green-700">
              {records.length} checked in
            </span>
          )}
        </div>

        {!session ? (
          <div className="px-6 py-10 text-center">
            <p className="text-3xl mb-2">📋</p>
            <p className="text-sm font-medium text-gray-500">No open session</p>
            <p className="text-xs text-gray-400 mt-1">Start a session in Check-In Setup</p>
          </div>
        ) : (
          <div className="px-6 py-4">
            <div className="mb-4">
              <p className="font-semibold text-gray-800 text-sm">{session.name}</p>
              <p className="text-xs text-gray-400">{fmtDate(session.date)}</p>
            </div>

            {records.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No check-ins yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 text-xs font-semibold text-gray-400 uppercase tracking-widest">Student</th>
                      <th className="text-left py-2 text-xs font-semibold text-gray-400 uppercase tracking-widest">Grade</th>
                      <th className="text-left py-2 text-xs font-semibold text-gray-400 uppercase tracking-widest">Time</th>
                      <th className="py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {records.map(r => (
                      <tr key={r.id} className="border-b border-gray-50 last:border-0">
                        <td className="py-2.5 font-medium text-gray-900">
                          {r.student ? `${r.student.first_name} ${r.student.last_name}` : "Unknown"}
                        </td>
                        <td className="py-2.5 text-gray-500 text-xs">
                          {r.student?.grade ?? "—"}
                        </td>
                        <td className="py-2.5 text-gray-500 text-xs">
                          {fmtTime(r.checked_in_at)}
                        </td>
                        <td className="py-2.5 text-right">
                          {r.is_new_visitor && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                              🆕 New
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <AppShell navItems={navItems}>
      <div className="px-8 py-10" style={{ background: `linear-gradient(135deg, #c2570a 0%, ${ACCENT} 100%)` }}>
        <Link href="/dashboard/youth-ministry" className="text-orange-200 text-xs mb-1 block hover:text-white">← Youth Ministry</Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>Live Check-In</h1>
            <p className="text-orange-100 text-sm mt-1">Middle School &amp; Senior High</p>
          </div>
          <div className="flex items-center gap-2 text-white text-xs">
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block animate-pulse" />
            Auto-refreshes every 30s
          </div>
        </div>
      </div>

      <div className="px-8 py-8 bg-gray-50 min-h-screen">
        {loading ? (
          <div className="text-gray-400 text-sm py-16 text-center">Loading sessions…</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SessionPanel
              emoji="🎒"
              title="Middle School"
              session={msSession}
              records={msRecords}
            />
            <SessionPanel
              emoji="🎓"
              title="Senior High"
              session={hsSession}
              records={hsRecords}
            />
          </div>
        )}
      </div>
    </AppShell>
  );
}
