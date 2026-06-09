"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AppShell, { type NavItem } from "@/components/layout/AppShell";
import { MINISTRY_NAV_ITEMS } from "@/lib/ministry-config";

const supabase = createClient();

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
  { label: "🎉 Celebrations", href: "/dashboard/birthdays" },
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

const MODULE_CARDS = [
  { label: "Members", href: "/dashboard/members", desc: "Manage your congregation", emoji: "👥", gradient: "linear-gradient(135deg, #3b82f6, #1d4ed8)" },
  { label: "Departments", href: "/dashboard/departments", desc: "Ministries & teams", emoji: "🏛️", gradient: "linear-gradient(135deg, #a855f7, #7c3aed)" },
  { label: "Visitors", href: "/dashboard/visitors", desc: "Track & follow up visitors", emoji: "🆕", gradient: "linear-gradient(135deg, #8b5cf6, #6d28d9)" },
  { label: "Calendar", href: "/dashboard/calendar", desc: "Events & scheduling", emoji: "📅", gradient: "linear-gradient(135deg, #f59e0b, #d97706)" },
  { label: "Attendance", href: "/dashboard/attendance", desc: "Track service attendance", emoji: "✅", gradient: "linear-gradient(135deg, #14b8a6, #0f766e)" },
  { label: "Communication", href: "/dashboard/communication", desc: "Keep every ministry connected", emoji: "📢", gradient: "linear-gradient(135deg, #06b6d4, #0e7490)" },
  { label: "Annual Pastor Touch", href: "/dashboard/pastor-touch", desc: "Personal touch for every member", emoji: "🙏", gradient: "linear-gradient(135deg, #7c3aed, #4338ca)" },
  { label: "Visitation", href: "/dashboard/visitation", desc: "Member care & visits", emoji: "🏥", gradient: "linear-gradient(135deg, #fb7185, #be123c)" },
  { label: "Celebrations", href: "/dashboard/birthdays", desc: "Birthdays, spiritual birthdays, milestones & certificates", emoji: "🎉", gradient: "linear-gradient(135deg, #f59e0b, #92400e)" },
  { label: "Prayer", href: "/dashboard/prayer", desc: "Prayer requests & updates", emoji: "🙋", gradient: "linear-gradient(135deg, #D4AF37, #a07c10)" },
  { label: "Evangelism", href: "/dashboard/evangelism", desc: "Share the Gospel", emoji: "✝️", gradient: "linear-gradient(135deg, #ef4444, #991b1b)" },
  { label: "Ministry Rosters", href: "/dashboard/ministry/childrens", desc: "Roster, attendance & follow-up", emoji: "⛪", gradient: "linear-gradient(135deg, #6366f1, #4338ca)" },
  { label: "Bible Study Pods", href: "/dashboard/bible-study-pods", desc: "Small groups & curriculum", emoji: "🏠", gradient: "linear-gradient(135deg, #0ea5e9, #0369a1)" },
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

type Church = { id: string; name: string };

type Props = {
  userId: string;
  userEmail: string | null;
  churchId: string | null;
  churchName: string | null;
  isPlatformAdmin: boolean;
  allChurches: Church[];
};

export default function DashboardClient({
  userId,
  userEmail,
  churchId,
  churchName,
  isPlatformAdmin,
  allChurches,
}: Props) {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({ members: null, events: null, prayers: null });
  const [trialExpired, setTrialExpired] = useState(false);

  useEffect(() => {
    if (isPlatformAdmin || !churchId) return;
    fetch("/api/trial-status", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { expired: false }))
      .then((d) => { if (d.expired) setTrialExpired(true); })
      .catch(() => {});
  }, [isPlatformAdmin, churchId]);

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

  function handleChurchSelect(church: Church) {
    localStorage.setItem("selected_church_id", church.id);
    router.push(`/dashboard?churchId=${church.id}`);
  }

  // Platform admin all-churches view
  if (isPlatformAdmin && !churchId) {
    return (
      <AppShell navItems={navItems}>
        <div
          className="px-8 py-10"
          style={{ background: "linear-gradient(135deg, #08060D 0%, #1C0A30 100%)" }}
        >
          <p className="text-sm font-medium mb-1" style={{ color: "#D4AF37" }}>{formatDate()}</p>
          <h1 className="text-3xl font-bold text-white mb-1">Master Admin</h1>
          {userEmail && (
            <p className="text-sm mt-2" style={{ color: "#A9A9B8" }}>Signed in as {userEmail}</p>
          )}
        </div>

        <div className="px-8 py-8" style={{ backgroundColor: "#0A0814", minHeight: "100vh" }}>
          <h2 className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: "#A9A9B8" }}>
            All Churches ({allChurches.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allChurches.map((church) => (
              <button
                key={church.id}
                onClick={() => handleChurchSelect(church)}
                className="rounded-xl px-6 py-4 text-left w-full transition-all cursor-pointer"
                style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.2)" }}
              >
                <p className="font-semibold text-white">{church.name}</p>
                <p className="text-xs mt-0.5 font-mono" style={{ color: "#A9A9B8" }}>{church.id}</p>
              </button>
            ))}
            {allChurches.length === 0 && (
              <p className="text-sm col-span-full" style={{ color: "#A9A9B8" }}>No churches found.</p>
            )}
          </div>
        </div>
      </AppShell>
    );
  }

  if (trialExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#08060D" }}>
        <div className="rounded-2xl p-10 text-center max-w-md w-full" style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.2)" }}>
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-5"
            style={{ backgroundColor: "rgba(123,44,191,0.15)" }}
          >
            ⏰
          </div>
          <h1 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "Georgia, serif" }}>
            Your free trial has ended
          </h1>
          <p className="text-sm mb-6" style={{ color: "#A9A9B8" }}>
            To continue using ShepherdKids, please contact us to activate your subscription.
          </p>
          <a
            href="mailto:support@shepherdwell.com"
            className="inline-block px-7 py-2.5 rounded-xl font-semibold text-sm text-white hover:opacity-90 transition-opacity"
            style={{ background: "linear-gradient(135deg, #7B2CBF, #9D4EDD)" }}
          >
            Contact Support
          </a>
        </div>
      </div>
    );
  }

  return (
    <AppShell navItems={navItems}>
      <div
        className="px-8 py-10"
        style={{ background: "linear-gradient(135deg, #08060D 0%, #1C0A30 100%)" }}
      >
        {isPlatformAdmin && (
          <button
            onClick={() => {
              localStorage.removeItem("selected_church_id");
              router.push("/dashboard");
            }}
            className="text-sm mb-2 block transition-colors" style={{ color: "#D4AF37" }}
          >
            ← All Churches
          </button>
        )}
        <p className="text-green-200 text-sm font-medium mb-1">{formatDate()}</p>
        <h1 className="text-3xl font-bold text-white mb-1">
          {getGreeting()}{churchName ? `, ${churchName}` : ""}
        </h1>
        {userEmail && (
          <p className="text-sm mt-2" style={{ color: "#A9A9B8" }}>Signed in as {userEmail}</p>
        )}
      </div>

      <div className="px-8 py-8 bg-gray-50 min-h-screen">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 -mt-6">
          {[
            { label: "Total Members", value: stats.members, emoji: "👥", color: "#3b82f6" },
            { label: "Upcoming Events", value: stats.events, emoji: "📅", color: "#f59e0b" },
            { label: "Open Prayer Requests", value: stats.prayers, emoji: "🙏", color: "#a855f7" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl px-6 py-5 flex items-center gap-4"
              style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.2)", boxShadow: "0 4px 12px rgba(0,0,0,0.5)" }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
                style={{ backgroundColor: stat.color + "18" }}
              >
                {stat.emoji}
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {stat.value === null ? "—" : stat.value}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "#A9A9B8" }}>{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

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
