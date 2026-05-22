"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AppShell, { type NavItem } from "@/components/layout/AppShell";
import { MINISTRY_NAV_ITEMS } from "@/lib/ministry-config";

const supabase = createClient();

const ACCENT = "#F28C28";

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

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

const TOUCHES: { touch: 1 | 2 | 3; label: string; icon: string }[] = [
  { touch: 1, label: "Phone Call", icon: "📞" },
  { touch: 2, label: "Written Letter", icon: "✉️" },
  { touch: 3, label: "In-Person Visit", icon: "🤝" },
];

export default function HighSchoolFollowUpPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [followupMap, setFollowupMap] = useState<Record<string, any[]>>({});
  const [savingTouch, setSavingTouch] = useState<string | null>(null);

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

      const res = await fetch("/api/high-school-ministry/students", {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) { setLoading(false); return; }
      const d = await res.json();
      const allStudents: any[] = d.students ?? [];

      // Filter to students created within the last 90 days
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 90);
      const recent = allStudents.filter(s => {
        if (!s.created_at) return false;
        return new Date(s.created_at) >= cutoff;
      });

      setStudents(recent);

      // Fetch followup logs for first 20 students in parallel
      const toFetch = recent.slice(0, 20);
      const results = await Promise.all(
        toFetch.map(s =>
          fetch(`/api/high-school-ministry/students/${s.id}/followup`, {
            headers: { Authorization: `Bearer ${t}` },
          }).then(r => r.ok ? r.json() : { log: [] })
        )
      );
      const map: Record<string, any[]> = {};
      toFetch.forEach((s, i) => {
        map[s.id] = results[i].log ?? [];
      });
      setFollowupMap(map);
      setLoading(false);
    }
    init();
  }, [router]);

  async function logTouch(studentId: string, touch: 1 | 2 | 3, completed: boolean) {
    if (!token) return;
    const key = `${studentId}-${touch}`;
    setSavingTouch(key);
    await fetch(`/api/high-school-ministry/students/${studentId}/followup`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ touch, completed }),
    });
    setFollowupMap(prev => {
      const existing = prev[studentId] ?? [];
      const updated = existing.filter(e => e.touch_number !== touch);
      updated.push({
        touch_number: touch,
        completed,
        touch_date: new Date().toISOString().slice(0, 10),
      });
      return { ...prev, [studentId]: updated };
    });
    setSavingTouch(null);
  }

  function getTouchStatus(studentId: string, touch: 1 | 2 | 3): boolean {
    const log = followupMap[studentId] ?? [];
    const entry = log.find(e => e.touch_number === touch);
    return entry?.completed ?? false;
  }

  return (
    <AppShell navItems={navItems}>
      {/* Header */}
      <div className="px-8 py-10" style={{ background: `linear-gradient(135deg, #c2570a 0%, ${ACCENT} 100%)` }}>
        <Link href="/dashboard/ministry/high-school" className="text-orange-200 text-xs mb-1 block hover:text-white">
          ← Senior High
        </Link>
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>
          Follow Up
        </h1>
        <p className="text-orange-100 text-sm mt-1">First-visit student follow-up</p>
      </div>

      <div className="px-8 py-8 bg-gray-50 min-h-screen">
        {/* Info card */}
        <div className="bg-white rounded-2xl shadow border border-gray-100 p-5 mb-6 flex items-start gap-3">
          <div className="text-2xl flex-shrink-0">ℹ️</div>
          <div>
            <p className="font-semibold text-gray-800 text-sm mb-1">3-Touch Follow-Up System</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              For each new student, complete three follow-up touches: a <strong>Phone Call</strong> (Touch 1),
              a <strong>Written Letter</strong> (Touch 2), and an <strong>In-Person Visit</strong> (Touch 3).
              Students below were added in the last 90 days.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-gray-400 text-sm py-12 text-center">Loading students…</div>
        ) : students.length === 0 ? (
          <div className="bg-white rounded-2xl shadow border border-gray-100 p-12 text-center">
            <p className="text-gray-400">No recent new students to follow up with.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {students.map(s => {
              const allDone = TOUCHES.every(t => getTouchStatus(s.id, t.touch));
              return (
                <div
                  key={s.id}
                  className="bg-white rounded-2xl shadow border border-gray-100 p-5"
                  style={{ borderLeftWidth: 4, borderLeftColor: allDone ? "#10b981" : ACCENT }}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-900">
                          {s.first_name} {s.last_name}
                        </p>
                        {s.grade && (
                          <span
                            className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: ACCENT + "22", color: "#c2570a" }}
                          >
                            {s.grade} Grade
                          </span>
                        )}
                        {allDone && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                            Complete
                          </span>
                        )}
                      </div>
                      {s.parent_name && (
                        <p className="text-xs text-gray-500 mt-0.5">Parent: {s.parent_name}</p>
                      )}
                      {s.phone && (
                        <p className="text-xs text-gray-400">{s.phone}</p>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 flex-shrink-0 mt-1">
                      Since {fmtDate(s.created_at)}
                    </p>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {TOUCHES.map(({ touch, label, icon }) => {
                      const done = getTouchStatus(s.id, touch);
                      const key = `${s.id}-${touch}`;
                      const saving = savingTouch === key;
                      return done ? (
                        <div
                          key={touch}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-100 text-green-700"
                        >
                          ✅ {icon} {label}
                        </div>
                      ) : (
                        <button
                          key={touch}
                          onClick={() => logTouch(s.id, touch, true)}
                          disabled={saving}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
                        >
                          {saving ? "…" : `${icon} ${label}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
