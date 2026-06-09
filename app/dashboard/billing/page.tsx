"use client";

import Link from "next/link";
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

export default function BillingPage() {
  return (
    <AppShell navItems={navItems}>
      <div className="px-8 py-8" style={{ background: "linear-gradient(135deg, #08060D 0%, #1C0A30 100%)" }}>
        <Link href="/dashboard/settings" className="text-sm transition-colors block mb-2" style={{ color: "#D4AF37" }}>← Settings</Link>
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>Subscription & Billing</h1>
        <p className="text-sm mt-1" style={{ color: "#D8D8E8" }}>Manage your ShepherdKids subscription</p>
      </div>

      <div className="px-8 py-16 flex items-start" style={{ backgroundColor: "#0A0814", minHeight: "100vh" }}>
        <div className="rounded-xl p-10 text-center max-w-md w-full" style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.2)" }}>
          <div className="text-4xl mb-4">💳</div>
          <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "Georgia, serif" }}>Billing Management</h2>
          <p className="text-sm" style={{ color: "#D8D8E8" }}>Billing management coming soon.</p>
        </div>
      </div>
    </AppShell>
  );
}
