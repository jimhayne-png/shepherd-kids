"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import MinistryShell from "@/components/layout/MinistryShell";
import AppShell, { type NavItem } from "@/components/layout/AppShell";
import { MINISTRY_CONFIG, MINISTRY_NAV_ITEMS } from "@/lib/ministry-config";
import { ProLockedOverlay } from "@/components/ProLockedOverlay";

const supabase = createClient();

const YOUTH_NAV_ITEMS: NavItem[] = [
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

// ── Youth-specific helpers ────────────────────────────────────────────────────

function calcUpcomingBirthdays(students: any[], days = 30) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const results: { student: any; next: Date; daysAway: number }[] = [];
  for (const s of students) {
    if (!s.date_of_birth) continue;
    const dob = new Date(s.date_of_birth + "T00:00:00");
    const next = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
    if (next < today) next.setFullYear(today.getFullYear() + 1);
    const daysAway = Math.round((next.getTime() - today.getTime()) / 86400000);
    if (daysAway <= days) results.push({ student: s, next, daysAway });
  }
  return results.sort((a, b) => a.daysAway - b.daysAway);
}

function getYouthSections(ministryType: string) {
  const studentsHref = ministryType === 'middle-school'
    ? '/dashboard/middle-school-ministry/students'
    : '/dashboard/high-school-ministry/students';
  const parentsHref = ministryType === 'middle-school'
    ? '/dashboard/middle-school-ministry/parents'
    : '/dashboard/high-school-ministry/parents';
  const permissionsHref = ministryType === 'middle-school'
    ? '/dashboard/middle-school-ministry/permissions'
    : '/dashboard/high-school-ministry/permissions';
  const checkinSetupHref = ministryType === 'middle-school'
    ? '/dashboard/middle-school-ministry/checkin-setup'
    : '/dashboard/high-school-ministry/checkin-setup';
  const liveCheckinHref = ministryType === 'middle-school'
    ? '/dashboard/middle-school-ministry/live-checkin'
    : '/dashboard/high-school-ministry/live-checkin';
  const attendanceReportHref = ministryType === 'middle-school'
    ? '/dashboard/middle-school-ministry/attendance-report'
    : '/dashboard/high-school-ministry/attendance-report';
  const rosterHref = ministryType === 'middle-school'
    ? '/dashboard/middle-school-ministry/roster'
    : '/dashboard/high-school-ministry/roster';
  const attendanceHref = ministryType === 'middle-school'
    ? '/dashboard/middle-school-ministry/attendance'
    : '/dashboard/high-school-ministry/attendance';
  const followupHref = ministryType === 'middle-school'
    ? '/dashboard/middle-school-ministry/followup'
    : '/dashboard/high-school-ministry/followup';
  return [
    { label: "👥 Members & Visitors", href: rosterHref,            desc: "Student roster & new visitors" },
    { label: "✅ Attendance",          href: attendanceHref,         desc: "Session attendance records" },
    { label: "🔄 Follow Up",           href: followupHref,           desc: "Student & family follow-up" },
    { label: "📋 Check-In Setup",      href: checkinSetupHref,       desc: "Manage sessions" },
    { label: "⚡ Live Check-In",        href: liveCheckinHref,        desc: "View who's checked in now" },
    { label: "📊 Attendance Reports",  href: attendanceReportHref,   desc: "Historical attendance data" },
    { label: "👤 Students",            href: studentsHref,            desc: "Student directory & profiles" },
    { label: "👨‍👩‍👧 Parents",             href: parentsHref,             desc: "All registered families" },
    { label: "📝 Permission Forms",    href: permissionsHref,         desc: "Student activity permissions" },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────

export default function MinistryOverviewPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = use(params);
  const router = useRouter();
  const cfg = MINISTRY_CONFIG[type];

  const [loading, setLoading] = useState(true);
  const [hasPro, setHasPro] = useState<boolean | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [totalMembers, setTotalMembers] = useState(0);
  const [presentLastSession, setPresentLastSession] = useState<number | null>(null);
  const [lastSessionDate, setLastSessionDate] = useState<string | null>(null);
  const [pipelineHealth, setPipelineHealth] = useState<number | null>(null);
  const [recentJoins, setRecentJoins] = useState<any[]>([]);

  // Youth-specific state (only populated when type is middle-school / high-school)
  const [youthStudents, setYouthStudents] = useState<any[]>([]);
  const [youthSessions, setYouthSessions] = useState<any[]>([]);
  const [youthLoading, setYouthLoading] = useState(true);

  useEffect(() => {
    if (type === 'middle-school' || type === 'high-school') {
      async function initYouth() {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (!user || error) {
          console.log("Dashboard client user unavailable:", error?.message ?? null);
          return;
        }
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const headers = { Authorization: `Bearer ${session.access_token}` };
        const studentsEndpoint = type === 'middle-school'
          ? '/api/middle-school-ministry/students'
          : '/api/high-school-ministry/students';
        const [studentsRes, sessionsRes] = await Promise.all([
          fetch(studentsEndpoint, { headers }),
          fetch('/api/youth-checkin/sessions', { headers }),
        ]);
        if (studentsRes.ok) { const d = await studentsRes.json(); setYouthStudents(d.students ?? []); }
        if (sessionsRes.ok) { const d = await sessionsRes.json(); setYouthSessions(d.sessions ?? []); }
        setYouthLoading(false);
      }
      initYouth();
      return;
    }

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

      const [proRes, rosterRes, attRes] = await Promise.all([
        type === "drama"
          ? fetch("/api/addons/ministry-pro", { headers: { Authorization: `Bearer ${t}` } })
          : Promise.resolve(null),
        fetch(`/api/ministry/${type}/roster`, { headers: { Authorization: `Bearer ${t}` } }),
        fetch(`/api/ministry/${type}/attendance?sessions=1`, { headers: { Authorization: `Bearer ${t}` } }),
      ]);

      if (proRes) {
        const pd = proRes.ok ? await proRes.json() : { active: false };
        setHasPro(pd.active ?? false);
      } else {
        setHasPro(true);
      }

      const rosterData = await rosterRes.json();
      const attData = await attRes.json();

      const roster: any[] = rosterData.roster ?? [];
      setTotalMembers(roster.length);
      setRecentJoins(roster.slice(0, 5));

      // Pipeline health: % past stage index 1 (Regular)
      if (cfg && roster.length > 0) {
        const advancedCount = roster.filter((r: any) => {
          const idx = cfg.stages.indexOf(r.pipeline_stage ?? "");
          return idx >= 2;
        }).length;
        setPipelineHealth(Math.round((advancedCount / roster.length) * 100));
      }

      // Last session attendance
      const sessions: string[] = attData.sessions ?? [];
      const records: any[] = attData.records ?? [];
      if (sessions.length > 0) {
        const latest = sessions[0];
        setLastSessionDate(latest);
        const presentCount = records.filter((r: any) => r.session_date === latest && r.present).length;
        setPresentLastSession(presentCount);
      }

      setLoading(false);
    }
    init();
  }, [type, router, cfg]);

  // ── Custom Youth overview (mirrors children-ministry/page.tsx exactly) ───────
  if (type === 'middle-school' || type === 'high-school') {
    const ministryName = type === 'middle-school' ? 'Middle School Ministry' : 'Senior High Ministry';
    const gradeRange   = type === 'middle-school' ? '6th–8th Grade' : '9th–12th Grade';
    const birthdays    = calcUpcomingBirthdays(youthStudents);
    const recentCheckins = youthSessions.slice(0, 4);

    if (youthLoading) return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400" style={{ fontFamily: "Georgia, serif" }}>Loading…</div>
      </div>
    );

    return (
      <AppShell navItems={YOUTH_NAV_ITEMS}>
        <div className="px-8 py-10" style={{ background: `linear-gradient(135deg, #c2570a 0%, ${ACCENT} 100%)` }}>
          <p className="text-orange-100 text-sm font-medium mb-1">Youth Ministry · {gradeRange}</p>
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>{ministryName}</h1>
          <p className="text-orange-100 text-sm mt-1">{youthStudents.length} students enrolled</p>
        </div>

        <div className="px-8 py-8 bg-gray-50 min-h-screen">
          {/* Stat cards — identical markup to children-ministry/page.tsx */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
            {[
              { label: "Total Students",     value: youthStudents.length,  emoji: "👤" },
              { label: "Upcoming Birthdays", value: birthdays.length,       emoji: "🎂", sub: "next 30 days" },
              { label: "Recent Sessions",    value: recentCheckins.length,  emoji: "📋" },
            ].map(card => (
              <div key={card.label} className="bg-white rounded-xl shadow-md px-5 py-4 flex items-center gap-3 border border-gray-100">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0" style={{ backgroundColor: ACCENT + "22" }}>
                  {card.emoji}
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{card.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Links — identical markup to children-ministry/page.tsx */}
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3">Sections</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            {getYouthSections(type).map(s => (
              <Link
                key={s.href}
                href={s.href}
                className="bg-white rounded-xl shadow border border-gray-100 px-5 py-4 hover:border-orange-200 hover:shadow-md transition-all block"
              >
                <p className="font-bold text-gray-900 text-sm mb-0.5">{s.label}</p>
                <p className="text-xs text-gray-400">{s.desc}</p>
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upcoming Birthdays — identical markup to children-ministry/page.tsx */}
            <div className="bg-white rounded-2xl shadow p-6 border border-gray-100">
              <h2 className="font-bold text-gray-800 mb-4" style={{ fontFamily: "Georgia, serif" }}>🎂 Upcoming Birthdays</h2>
              {birthdays.length === 0 ? (
                <p className="text-sm text-gray-400">No birthdays in the next 30 days.</p>
              ) : (
                <div className="space-y-1">
                  {birthdays.map(({ student, next, daysAway }) => (
                    <div key={student.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{student.first_name} {student.last_name}</p>
                        <p className="text-xs text-gray-400">{next.toLocaleDateString("en-US", { month: "long", day: "numeric" })}{student.grade ? ` · ${student.grade} Grade` : ""}</p>
                      </div>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{
                        backgroundColor: daysAway === 0 ? "#fef9c3" : daysAway <= 7 ? "#fef3c7" : "#f0fdf4",
                        color: daysAway === 0 ? "#713f12" : daysAway <= 7 ? "#92400e" : "#166534",
                      }}>
                        {daysAway === 0 ? "Today! 🎉" : daysAway === 1 ? "Tomorrow" : `${daysAway} days`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Check-Ins — identical markup to children-ministry/page.tsx */}
            <div className="bg-white rounded-2xl shadow p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-800" style={{ fontFamily: "Georgia, serif" }}>📋 Recent Check-Ins</h2>
                <Link href={type === 'middle-school' ? '/dashboard/middle-school-ministry/checkin-setup' : '/dashboard/high-school-ministry/checkin-setup'} className="text-xs font-medium" style={{ color: ACCENT }}>View all →</Link>
              </div>
              {recentCheckins.length === 0 ? (
                <p className="text-sm text-gray-400">
                  No sessions yet.{" "}
                  <Link href={type === 'middle-school' ? '/dashboard/middle-school-ministry/checkin-setup' : '/dashboard/high-school-ministry/checkin-setup'} className="underline" style={{ color: ACCENT }}>Set one up →</Link>
                </p>
              ) : (
                <div className="space-y-1">
                  {recentCheckins.map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(s.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                        </p>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${s.status === "open" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {s.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </AppShell>
    );
  }
  // ─────────────────────────────────────────────────────────────────────────────

  if (!cfg) return (
    <MinistryShell type={type}>
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Ministry type "{type}" not found.</p>
      </div>
    </MinistryShell>
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-gray-400">Loading…</div>
    </div>
  );

  if (hasPro === false && type === "drama") {
    return (
      <MinistryShell type={type}>
        <div className="px-8 py-8" style={{ background: "linear-gradient(135deg, #1a2e1a 0%, #2d5a2d 100%)" }}>
          <p className="text-green-300 text-sm mb-1">Overview</p>
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>
            {cfg.emoji} {cfg.name}
          </h1>
        </div>
        <ProLockedOverlay />
      </MinistryShell>
    );
  }

  return (
    <MinistryShell type={type}>
      {/* Hero */}
      <div className="px-8 py-8" style={{ background: `linear-gradient(135deg, #1a2e1a 0%, #2d5a2d 100%)` }}>
        <p className="text-green-300 text-sm mb-1">Overview</p>
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>
          {cfg.emoji} {cfg.name}
        </h1>
        <p className="text-green-200 text-sm mt-1">This ministry is active</p>
      </div>

      <div className="px-8 py-8 bg-gray-50 min-h-screen">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Members", value: totalMembers, emoji: "👥" },
            { label: "Present Last Session", value: presentLastSession ?? "—", emoji: "✅" },
            { label: "Active Follow Ups", value: 0, emoji: "📋" },
            { label: "Shepherd Pipeline Health", value: pipelineHealth !== null ? `${pipelineHealth}%` : "—", emoji: "📈" },
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="font-bold text-gray-800 mb-4" style={{ fontFamily: "Georgia, serif" }}>Quick Actions</h2>
            <div className="space-y-3">
              {[
                { label: "👥  View Roster", href: `/dashboard/ministry/${type}/roster` },
                { label: "📋  Mark Attendance", href: `/dashboard/ministry/${type}/attendance` },
                { label: "📞  Follow Up", href: `/dashboard/ministry/${type}/followup` },
                { label: "📣  Communication", href: `/dashboard/ministry/${type}/communication` },
              ].map(a => (
                <Link key={a.href} href={a.href} className="block w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90" style={{ backgroundColor: ACCENT }}>
                  {a.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="font-bold text-gray-800 mb-4" style={{ fontFamily: "Georgia, serif" }}>Recent Joins</h2>
            {recentJoins.length === 0 ? (
              <p className="text-gray-400 text-sm">No members on this roster yet.</p>
            ) : (
              <div className="space-y-2">
                {recentJoins.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: ACCENT }}>
                        {r.member?.first_name?.[0]}{r.member?.last_name?.[0]}
                      </div>
                      <p className="text-sm font-medium text-gray-800">{r.member?.first_name} {r.member?.last_name}</p>
                    </div>
                    <span className="text-xs text-gray-400">{r.joined_date ? new Date(r.joined_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}</span>
                  </div>
                ))}
              </div>
            )}
            {lastSessionDate && (
              <p className="text-xs text-gray-400 mt-4">
                Last session: {new Date(lastSessionDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                {presentLastSession !== null && ` · ${presentLastSession} present`}
              </p>
            )}
          </div>
        </div>
      </div>
    </MinistryShell>
  );
}
