"use client";

import { useEffect, useState, useMemo } from "react";
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

const TILES = [
  { emoji: "📋", label: "Check-In Setup",      href: "/dashboard/youth-ministry/checkin-setup",       desc: "Manage sessions" },
  { emoji: "🖥️", label: "Live Check-In",        href: "/dashboard/youth-ministry/live-checkin",        desc: "View who's checked in now" },
  { emoji: "📊", label: "Attendance Reports",   href: "/dashboard/youth-ministry/attendance-report",   desc: "Historical attendance data" },
  { emoji: "👤", label: "Students",             href: "/dashboard/youth-ministry/students",            desc: "Student directory & profiles" },
  { emoji: "👨‍👩‍👧", label: "Parents",              href: "/dashboard/youth-ministry/parents",             desc: "All registered families" },
  { emoji: "🔄", label: "Shepherd Pipeline",    href: "/dashboard/ministry/middle-school/pipeline",    desc: "Track student spiritual journey" },
  { emoji: "✉️", label: "Follow Up",             href: "/dashboard/ministry/middle-school/followup",   desc: "Student & family follow-up" },
  { emoji: "📢", label: "Communication",        href: "/dashboard/ministry/middle-school/communication", desc: "Send announcements" },
  { emoji: "🎂", label: "Birthdays",            href: "/dashboard/ministry/middle-school/birthdays",   desc: "Upcoming student birthdays" },
  { emoji: "📝", label: "Permission Forms",     href: "/dashboard/youth-ministry/permissions",         desc: "Student activity permissions" },
];

type Student = {
  id: string; first_name: string; last_name: string;
  date_of_birth: string | null; grade: string | null;
};

type Session = {
  id: string; name: string; date: string; ministry_type: string; status: string;
};

function calcAge(dob: string): number {
  const d = new Date(dob + "T00:00:00");
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  if (today.getMonth() < d.getMonth() || (today.getMonth() === d.getMonth() && today.getDate() < d.getDate())) age--;
  return age;
}

function getUpcomingBirthdays(students: Student[], withinDays = 30) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return students
    .filter(s => !!s.date_of_birth)
    .map(s => {
      const dob = new Date(s.date_of_birth! + "T00:00:00");
      const next = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
      if (next < today) next.setFullYear(today.getFullYear() + 1);
      const daysUntil = Math.round((next.getTime() - today.getTime()) / 86400000);
      return { ...s, daysUntil, nextBirthday: next };
    })
    .filter(s => s.daysUntil <= withinDays)
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function ministryLabel(t: string) {
  return t === "middle-school" ? "Middle School" : t === "high-school" ? "Senior High" : t;
}

export default function YouthMinistryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/"); return; }
      const t = session.access_token;
      const headers = { Authorization: `Bearer ${t}` };
      const [studentsRes, sessionsRes] = await Promise.all([
        fetch("/api/youth-ministry/students", { headers }),
        fetch("/api/youth-checkin/sessions", { headers }),
      ]);
      if (studentsRes.ok) { const d = await studentsRes.json(); setStudents(d.students ?? []); }
      if (sessionsRes.ok) { const d = await sessionsRes.json(); setSessions(d.sessions ?? []); }
      setLoading(false);
    }
    init();
  }, [router]);

  const msCount = students.length; // total (grade-split not available without extra query)
  const recentSessions = sessions.slice(0, 5);
  const upcomingBirthdays = useMemo(() => getUpcomingBirthdays(students, 30), [students]);

  return (
    <AppShell navItems={navItems}>
      {/* Hero */}
      <div className="px-8 py-10" style={{ background: `linear-gradient(135deg, #c2570a 0%, ${ACCENT} 100%)` }}>
        <Link href="/dashboard" className="text-orange-200 text-xs mb-1 block hover:text-white">← Dashboard</Link>
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>Youth Ministry</h1>
        <p className="text-orange-100 text-sm mt-1">Middle School &amp; Senior High</p>
      </div>

      <div className="px-8 py-8 bg-gray-50 min-h-screen space-y-8">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Students", value: loading ? "—" : msCount, emoji: "👤" },
            { label: "Sessions Logged", value: loading ? "—" : sessions.length, emoji: "📋" },
            { label: "Upcoming Birthdays", value: loading ? "—" : upcomingBirthdays.length, emoji: "🎂" },
            { label: "Ministry Types", value: 2, emoji: "⛪" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl shadow-sm px-5 py-4 flex items-center gap-3 border border-gray-100">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0" style={{ backgroundColor: ACCENT + "22" }}>
                {s.emoji}
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tiles grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {TILES.map(tile => (
            <Link
              key={tile.label}
              href={tile.href}
              className="bg-white rounded-2xl shadow border border-gray-100 p-5 hover:shadow-md hover:border-orange-200 transition-all group"
            >
              <div className="text-3xl mb-3">{tile.emoji}</div>
              <h3 className="font-bold text-gray-900 text-sm mb-1 group-hover:text-orange-600 transition-colors">{tile.label}</h3>
              <p className="text-xs text-gray-500">{tile.desc}</p>
            </Link>
          ))}
        </div>

        {/* Bottom sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Upcoming Birthdays */}
          <div className="bg-white rounded-2xl shadow border border-gray-100 p-6">
            <h2 className="font-bold text-gray-800 mb-4" style={{ fontFamily: "Georgia, serif" }}>🎂 Upcoming Birthdays</h2>
            {loading ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : upcomingBirthdays.length === 0 ? (
              <p className="text-sm text-gray-400">No birthdays in the next 30 days.</p>
            ) : (
              <div className="space-y-2">
                {upcomingBirthdays.slice(0, 6).map(s => (
                  <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: ACCENT }}>
                        {s.first_name[0]}{s.last_name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{s.first_name} {s.last_name}</p>
                        {s.grade && <p className="text-xs text-gray-400">{s.grade} Grade · turning {calcAge(s.date_of_birth!) + 1}</p>}
                      </div>
                    </div>
                    <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: ACCENT + "18", color: ACCENT }}>
                      {s.daysUntil === 0 ? "Today! 🎉" : `in ${s.daysUntil}d`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Check-Ins */}
          <div className="bg-white rounded-2xl shadow border border-gray-100 p-6">
            <h2 className="font-bold text-gray-800 mb-4" style={{ fontFamily: "Georgia, serif" }}>📋 Recent Sessions</h2>
            {loading ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : recentSessions.length === 0 ? (
              <p className="text-sm text-gray-400">No sessions recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {recentSessions.map(s => (
                  <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{s.name}</p>
                      <p className="text-xs text-gray-400">{ministryLabel(s.ministry_type)} · {fmtDate(s.date)}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${s.status === "open" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {s.status === "open" ? "Open" : "Closed"}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <Link href="/dashboard/youth-ministry/checkin-setup" className="block mt-4 text-xs font-semibold text-orange-600 hover:text-orange-700">
              View all sessions →
            </Link>
          </div>

        </div>
      </div>
    </AppShell>
  );
}
