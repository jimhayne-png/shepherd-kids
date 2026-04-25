"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AppShell, { type NavItem } from "@/components/layout/AppShell";
import { MINISTRY_NAV_ITEMS } from "@/lib/ministry-config";

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Members", href: "/dashboard/members" },
  { label: "Departments", href: "/dashboard/departments" },
  { label: "Attendance", href: "/dashboard/attendance" },
  { label: "Visitors", href: "/dashboard/visitors" },
  { label: "Calendar", href: "/dashboard/calendar" },
  { label: "Prayer", href: "/dashboard/prayer" },
  { label: "Bulletin", href: "/dashboard/bulletin" },
  { label: "Communication Hub", href: "/dashboard/communication" },
  { label: "Visitation", href: "/dashboard/visitation" },
  { label: "Shepherd Pipeline", href: "/dashboard/shepherd" },
  { label: "Reviews", href: "/dashboard/reviews" },
  { label: "Evangelism", href: "/dashboard/evangelism" },
  { label: "Birthdays", href: "/dashboard/birthdays" },
  { label: "🧒 Children's Ministry", href: "/dashboard/children-ministry" },
  ...MINISTRY_NAV_ITEMS,
  { label: "Tutorials", href: "/dashboard/tutorials" },
  { label: "Settings", href: "/dashboard/settings" },
];

const MODULE_CARDS = [
  {
    label: "Members",
    href: "/dashboard/members",
    desc: "Manage your congregation",
    emoji: "👥",
    gradient: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
  },
  {
    label: "Departments",
    href: "/dashboard/departments",
    desc: "Ministries & teams",
    emoji: "🏛️",
    gradient: "linear-gradient(135deg, #a855f7, #7c3aed)",
  },
  {
    label: "Attendance",
    href: "/dashboard/attendance",
    desc: "Track service attendance",
    emoji: "📋",
    gradient: "linear-gradient(135deg, #14b8a6, #0f766e)",
  },
  {
    label: "Visitors",
    href: "/dashboard/visitors",
    desc: "Onboarding & follow-up sequences",
    emoji: "🤝",
    gradient: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
  },
  {
    label: "Calendar",
    href: "/dashboard/calendar",
    desc: "Events & scheduling",
    emoji: "📅",
    gradient: "linear-gradient(135deg, #f59e0b, #d97706)",
  },
  {
    label: "Prayer",
    href: "/dashboard/prayer",
    desc: "Prayer requests & updates",
    emoji: "🙏",
    gradient: "linear-gradient(135deg, #22c55e, #15803d)",
  },
  {
    label: "Bulletin",
    href: "/dashboard/bulletin",
    desc: "Weekly bulletins",
    emoji: "📰",
    gradient: "linear-gradient(135deg, #f97316, #c2410c)",
  },
  {
    label: "Communication",
    href: "/dashboard/communication",
    desc: "Keep every ministry connected",
    emoji: "📣",
    gradient: "linear-gradient(135deg, #06b6d4, #0e7490)",
  },
  {
    label: "Visitation",
    href: "/dashboard/visitation",
    desc: "Member care & visits",
    emoji: "🏠",
    gradient: "linear-gradient(135deg, #fb7185, #be123c)",
  },
  {
    label: "Reviews",
    href: "/dashboard/reviews",
    desc: "Feedback & testimonials",
    emoji: "⭐",
    gradient: "linear-gradient(135deg, #6366f1, #4338ca)",
  },
  {
    label: "Evangelism",
    href: "/dashboard/evangelism",
    desc: "Share the Gospel",
    emoji: "✝️",
    gradient: "linear-gradient(135deg, #ef4444, #991b1b)",
  },
  {
    label: "Birthdays",
    href: "/dashboard/birthdays",
    desc: "Birthdays, anniversaries & letters",
    emoji: "🎂",
    gradient: "linear-gradient(135deg, #f59e0b, #92400e)",
  },
  {
    label: "Children's Ministry",
    href: "/dashboard/children-ministry",
    desc: "3rd–6th grade · teams & points",
    emoji: "🧒",
    gradient: "linear-gradient(135deg, #F28C28, #c2570a)",
  },
  {
    label: "Ministry Rosters",
    href: "/dashboard/ministry/childrens",
    desc: "Roster, attendance & follow-up",
    emoji: "⛪",
    gradient: "linear-gradient(135deg, #6366f1, #4338ca)",
  },
  {
    label: "Tutorials",
    href: "/dashboard/tutorials",
    desc: "Learn ShepherdWell",
    emoji: "🎓",
    gradient: "linear-gradient(135deg, #eab308, #a16207)",
  },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

type Stats = {
  members: number | null;
  events: number | null;
  prayers: number | null;
};

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [churchName, setChurchName] = useState<string | null>(null);
  const [churchId, setChurchId] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({ members: null, events: null, prayers: null });

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/");
        return;
      }

      setUserEmail(session.user.email ?? null);

      const { data: churchUser } = await supabase
        .from("church_users")
        .select("church_id, churches(name)")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!churchUser) {
        router.replace("/onboarding");
        return;
      }

      const churches = churchUser.churches as unknown as { name: string } | null;
      setChurchName(churches?.name ?? null);
      setChurchId(churchUser.church_id);
      setLoading(false);
    }

    init();
  }, [router]);

  useEffect(() => {
    if (!churchId) return;

    async function fetchStats() {
      const [membersRes, eventsRes, prayersRes] = await Promise.all([
        supabase
          .from("members")
          .select("id", { count: "exact", head: true })
          .eq("church_id", churchId),
        supabase
          .from("events")
          .select("id", { count: "exact", head: true })
          .eq("church_id", churchId)
          .gt("starts_at", new Date().toISOString()),
        supabase
          .from("prayer_requests")
          .select("id", { count: "exact", head: true })
          .eq("church_id", churchId)
          .eq("status", "open"),
      ]);

      setStats({
        members: membersRes.count ?? 0,
        events: eventsRes.count ?? 0,
        prayers: prayersRes.count ?? 0,
      });
    }

    fetchStats();
  }, [churchId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading…</div>
      </div>
    );
  }

  return (
    <AppShell navItems={navItems}>
      {/* Hero Banner */}
      <div
        className="px-8 py-10"
        style={{
          background: "linear-gradient(135deg, #1A4A2E 0%, #2D6B42 100%)",
        }}
      >
        <p className="text-green-200 text-sm font-medium mb-1">{formatDate()}</p>
        <h1 className="text-3xl font-bold text-white mb-1">
          {getGreeting()}{churchName ? `, ${churchName}` : ""}
        </h1>
        {userEmail && (
          <p className="text-green-300 text-sm mt-2">Signed in as {userEmail}</p>
        )}
      </div>

      <div className="px-8 py-8 bg-gray-50 min-h-screen">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 -mt-6">
          {[
            { label: "Total Members", value: stats.members, emoji: "👥", color: "#3b82f6" },
            { label: "Upcoming Events", value: stats.events, emoji: "📅", color: "#f59e0b" },
            { label: "Open Prayer Requests", value: stats.prayers, emoji: "🙏", color: "#22c55e" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-xl shadow-md px-6 py-5 flex items-center gap-4 border border-gray-100"
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
                style={{ backgroundColor: stat.color + "18" }}
              >
                {stat.emoji}
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {stat.value === null ? "—" : stat.value}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Module Cards */}
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">
          Modules
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {MODULE_CARDS.map((card) => (
            <a
              key={card.href}
              href={card.href}
              className="group block rounded-2xl p-5 text-white transition-transform duration-150 hover:-translate-y-1 hover:shadow-xl shadow-md"
              style={{ background: card.gradient }}
            >
              <div className="text-3xl mb-3">{card.emoji}</div>
              <p className="font-bold text-base leading-tight">{card.label}</p>
              <p className="text-xs mt-1 opacity-75 leading-snug">{card.desc}</p>
            </a>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
