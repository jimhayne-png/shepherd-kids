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

const CARE_CARDS = [
  {
    title: "First-Time Families",
    desc: "Welcome and connect with new visitors.",
    href: "/dashboard/children-ministry/children",
    action: "Welcome",
    emoji: "👋",
    countLabel: "families",
  },
  {
    title: "Families Needing Encouragement",
    desc: "Missed 3 or more Sundays",
    href: "/dashboard/children-ministry",
    action: "View",
    emoji: "🤝",
    countLabel: "families",
  },
  {
    title: "Birthdays This Week",
    desc: "Celebrate children and families",
    href: "/dashboard/birthdays",
    action: "View",
    emoji: "🎂",
    countLabel: "upcoming",
  },
  {
    title: "Upcoming Spiritual Birthdays",
    desc: "Celebrate faith milestones",
    href: "/dashboard/birthdays",
    action: "View",
    emoji: "✝️",
    countLabel: "upcoming",
  },
  {
    title: "Promotion Sunday Ready",
    desc: "Children ready for next classroom",
    href: "/dashboard/children-ministry/children",
    action: "Review",
    emoji: "🎓",
    countLabel: "children",
  },
  {
    title: "Parent Updates Overdue",
    desc: "Allergies, pickups, or family info",
    href: "/dashboard/children-ministry/children",
    action: "Review",
    emoji: "📋",
    countLabel: "parents",
  },
];

const MODULE_CARDS = [
  { label: "Ministry Care",         href: "/dashboard/children-ministry",                desc: "Families needing encouragement",               emoji: "👨‍👩‍👧", gradient: "linear-gradient(135deg, #7B2CBF, #5b21b6)" },
  { label: "Families",              href: "/dashboard/children-ministry/parents",        desc: "Households, parents & pickups",                emoji: "👪",   gradient: "linear-gradient(135deg, #16a34a, #15803d)" },
  { label: "ShepherdKids",          href: "/dashboard/children-ministry/children",       desc: "Child directory & profiles",                   emoji: "🧒",   gradient: "linear-gradient(135deg, #6366f1, #4338ca)" },
  { label: "Parent Communication",  href: "/dashboard/children-ministry/parent-update",  desc: "Email updates & family messages",              emoji: "📧",   gradient: "linear-gradient(135deg, #e11d48, #be123c)" },
  { label: "Check-In",              href: "/dashboard/children-ministry/checkin-setup",  desc: "Rooms, sessions & live dashboard",             emoji: "✅",   gradient: "linear-gradient(135deg, #0ea5e9, #0369a1)" },
  { label: "Celebrations",          href: "/dashboard/birthdays",                       desc: "Birthdays, spiritual birthdays & certificates",  emoji: "🎉",   gradient: "linear-gradient(135deg, #D4AF37, #a07c10)" },
  { label: "Faith Journey",         href: "/dashboard/children-ministry/faith-journey", desc: "Spiritual milestones",                          emoji: "✝️",  gradient: "linear-gradient(135deg, #a855f7, #7c3aed)" },
  { label: "Volunteers",            href: "/dashboard/children-ministry/volunteers",    desc: "Team management",                              emoji: "🙋",   gradient: "linear-gradient(135deg, #14b8a6, #0f766e)" },
  { label: "Label Printing",        href: "/dashboard/children-ministry/print-station", desc: "Name tags & pickup labels",                    emoji: "🏷️",  gradient: "linear-gradient(135deg, #f59e0b, #b45309)" },
  { label: "Reports",               href: "/dashboard/children-ministry/attendance-report", desc: "Attendance & trends",                      emoji: "📊",   gradient: "linear-gradient(135deg, #3b82f6, #1d4ed8)" },
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
            <p className="text-sm mt-2" style={{ color: "#D8D8E8" }}>Signed in as {userEmail}</p>
          )}
        </div>

        <div className="px-8 py-8" style={{ backgroundColor: "#0A0814", minHeight: "100vh" }}>
          <h2 className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: "#D8D8E8" }}>
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
                <p className="text-xs mt-0.5 font-mono" style={{ color: "#D8D8E8" }}>{church.id}</p>
              </button>
            ))}
            {allChurches.length === 0 && (
              <p className="text-sm col-span-full" style={{ color: "#D8D8E8" }}>No churches found.</p>
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
          <p className="text-sm mb-6" style={{ color: "#D8D8E8" }}>
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
        <p className="text-sm font-medium mb-1" style={{ color: "#D4AF37" }}>{formatDate()}</p>
        <h1 className="text-3xl font-bold text-white mb-1">
          {getGreeting()}{churchName ? `, ${churchName}` : ""}
        </h1>
        {userEmail && (
          <p className="text-sm mt-2" style={{ color: "#D8D8E8" }}>Signed in as {userEmail}</p>
        )}
      </div>

      <div className="px-8 py-8" style={{ backgroundColor: "#0A0814", minHeight: "100vh" }}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 -mt-6">
          {[
            { label: "Active Families",   value: stats.members, emoji: "👨‍👩‍👧‍👦", color: "#7B2CBF" },
            { label: "Total Children",    value: stats.events,  emoji: "🧒",        color: "#9D4EDD" },
            { label: "Family Care Needs", value: stats.prayers, emoji: "💛",        color: "#D4AF37" },
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
                <p className="text-xs mt-0.5" style={{ color: "#D8D8E8" }}>{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Ministry Care Today */}
        <div className="mb-10">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>
              Ministry Care Today
            </h2>
            <p className="text-sm mt-1" style={{ color: "#D8D8E8" }}>
              Actionable care items to help you shepherd every child and family.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CARE_CARDS.map((card) => (
              <div
                key={card.title}
                style={{
                  background: "#120A1F",
                  border: "1px solid rgba(212,175,55,0.28)",
                  borderRadius: "16px",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                {/* Title row with count */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "5px" }}>
                      <span style={{ fontSize: "17px", flexShrink: 0 }}>{card.emoji}</span>
                      <p style={{ fontWeight: 700, color: "#ffffff", fontSize: "13px", lineHeight: 1.3, margin: 0 }}>
                        {card.title}
                      </p>
                    </div>
                    <p style={{ color: "#D8D8E8", fontSize: "12px", lineHeight: 1.5, margin: 0 }}>
                      {card.desc}
                    </p>
                  </div>
                  <div style={{ flexShrink: 0, textAlign: "right" }}>
                    <p style={{ color: "#D4AF37", fontSize: "30px", fontWeight: 700, lineHeight: 1, margin: 0 }}>
                      0
                    </p>
                    <p style={{ color: "rgba(212,175,55,0.6)", fontSize: "10px", margin: "2px 0 0", fontWeight: 500 }}>
                      {card.countLabel}
                    </p>
                  </div>
                </div>

                {/* Action button */}
                <a
                  href={card.href}
                  style={{
                    alignSelf: "flex-start",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#ffffff",
                    background: "linear-gradient(135deg, #7B2CBF, #9D4EDD)",
                    borderRadius: "8px",
                    padding: "5px 12px",
                    textDecoration: "none",
                  }}
                >
                  {card.action} →
                </a>
              </div>
            ))}
          </div>
        </div>

        <h2 className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: "#D8D8E8" }}>
          Modules
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {MODULE_CARDS.map((card) => (
            <a
              key={card.href}
              href={card.href}
              className="group block rounded-2xl p-5 text-white transition-transform duration-150 hover:-translate-y-1 hover:shadow-xl shadow-md"
              style={{ background: card.gradient }}
            >
              <div className="text-3xl mb-3">{card.emoji}</div>
              <p className="font-bold text-base leading-tight">{card.label}</p>
              <p className="text-xs mt-1 leading-snug" style={{ opacity: 0.9 }}>{card.desc}</p>
            </a>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
