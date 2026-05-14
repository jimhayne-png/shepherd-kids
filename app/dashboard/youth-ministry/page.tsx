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

const TILES = [
  { emoji: "📋", label: "Check-In Setup", href: "/dashboard/youth-ministry/checkin-setup", desc: "Create sessions & launch kiosk" },
  { emoji: "👤", label: "Students", href: "/dashboard/youth-ministry/students", desc: "View & manage student roster" },
  { emoji: "👨‍👩‍👧", label: "Parents", href: "/dashboard/youth-ministry/parents", desc: "Parent contact directory" },
  { emoji: "🔄", label: "Shepherd Pipeline", href: "/dashboard/ministry/middle_school", desc: "Middle School pipeline" },
  { emoji: "🎓", label: "Senior High Pipeline", href: "/dashboard/ministry/senior_high", desc: "Senior High pipeline" },
  { emoji: "✉️", label: "Follow Up", href: "/dashboard/ministry/middle_school/followup", desc: "First visit follow-up letters" },
  { emoji: "📢", label: "Communication", href: "/dashboard/communication", desc: "Email & announcements" },
  { emoji: "🎂", label: "Birthdays", href: "/dashboard/birthdays", desc: "Student birthdays & cards" },
];

export default function YouthMinistryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [stats, setStats] = useState({ totalStudents: 0, recentSessions: 0 });

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/"); return; }
      const t = session.access_token;
      setToken(t);
      const [studentsRes, sessionsRes] = await Promise.all([
        fetch('/api/youth-ministry/students', { headers: { Authorization: `Bearer ${t}` } }),
        fetch('/api/youth-checkin/sessions', { headers: { Authorization: `Bearer ${t}` } }),
      ]);
      const studentsData = studentsRes.ok ? await studentsRes.json() : { students: [] };
      const sessionsData = sessionsRes.ok ? await sessionsRes.json() : { sessions: [] };
      setStats({
        totalStudents: studentsData.students?.length ?? 0,
        recentSessions: sessionsData.sessions?.slice(0, 30).length ?? 0,
      });
      setLoading(false);
    }
    init();
  }, [router]);

  // suppress unused var warning
  void token;

  return (
    <AppShell navItems={navItems}>
      <div className="px-8 py-10" style={{ background: `linear-gradient(135deg, #c2570a 0%, ${ACCENT} 100%)` }}>
        <Link href="/dashboard" className="text-orange-200 text-xs mb-1 block hover:text-white">← Dashboard</Link>
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>Youth Ministry</h1>
        <p className="text-orange-100 text-sm mt-1">Middle School &amp; Senior High</p>
      </div>

      <div className="px-8 py-8 bg-gray-50 min-h-screen">
        {!loading && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: "Total Students", value: stats.totalStudents, color: ACCENT },
              { label: "Sessions (last 30)", value: stats.recentSessions, color: "#6366f1" },
              { label: "Ministry Types", value: 2, color: "#22c55e" },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl shadow border border-gray-100 p-5 text-center">
                <p className="text-3xl font-black" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs text-gray-400 mt-1 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TILES.map(tile => (
            <Link
              key={tile.label}
              href={tile.href}
              className="bg-white rounded-2xl shadow border border-gray-100 p-6 hover:shadow-md hover:border-orange-200 transition-all group"
            >
              <div className="text-3xl mb-3">{tile.emoji}</div>
              <h3 className="font-bold text-gray-900 text-base mb-1 group-hover:text-orange-600 transition-colors">{tile.label}</h3>
              <p className="text-sm text-gray-500">{tile.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
