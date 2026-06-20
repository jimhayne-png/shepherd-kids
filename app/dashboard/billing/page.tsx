"use client";

import Link from "next/link";
import AppShell, { type NavItem } from "@/components/layout/AppShell";

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "ShepherdKids", href: "#", isSection: true },
  { label: "🧒 Ministry Care", href: "/dashboard/children-ministry" },
  { label: "✅ Live Check-In", href: "/dashboard/children-ministry/live-checkin" },
  { label: "🏷️ Label Printing", href: "/dashboard/children-ministry/print-station" },
  { label: "📊 Attendance Report", href: "/dashboard/children-ministry/attendance-report" },
  { label: "👦 Children", href: "/dashboard/children-ministry/children" },
  { label: "👪 Parents", href: "/dashboard/children-ministry/parents" },
  { label: "📧 Parent Communication", href: "/dashboard/children-ministry/parent-update" },
  { label: "🌱 Faith Journey", href: "/dashboard/children-ministry/faith-journey" },
  { label: "🎉 Celebrations", href: "/dashboard/children-ministry/celebrations" },
  { label: "📜 Certificates", href: "/dashboard/children-ministry/certificates" },
  { label: "⚙️ Check-In Setup", href: "/dashboard/children-ministry/checkin-setup" },
  { label: "Account", href: "#", isSection: true },
  { label: "💳 Subscription & Billing", href: "/dashboard/billing" },
  { label: "⚙️ Settings", href: "/dashboard/settings" },
];

export default function BillingPage() {
  return (
    <AppShell navItems={navItems}>
      <div
        className="px-8 py-8"
        style={{
          background: "linear-gradient(135deg, #08060D 0%, #1C0A30 100%)",
        }}
      >
        <Link
          href="/dashboard/settings"
          className="text-sm transition-colors block mb-2"
          style={{ color: "#D4AF37" }}
        >
          ← Settings
        </Link>

        <h1
          className="text-3xl font-bold text-white"
          style={{ fontFamily: "Georgia, serif" }}
        >
          Subscription & Billing
        </h1>

        <p className="text-sm mt-1" style={{ color: "#D8D8E8" }}>
          Manage your ShepherdKids subscription
        </p>
      </div>

      <div
        className="px-8 py-16 flex items-start"
        style={{ backgroundColor: "#0A0814", minHeight: "100vh" }}
      >
        <div
          className="rounded-xl p-10 text-center max-w-md w-full"
          style={{
            background: "#120A1F",
            border: "1px solid rgba(212,175,55,0.2)",
          }}
        >
          <div className="text-4xl mb-4">💳</div>

          <h2
            className="text-xl font-bold text-white mb-2"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Billing Management
          </h2>

          <p className="text-sm" style={{ color: "#D8D8E8" }}>
            Billing management coming soon.
          </p>
        </div>
      </div>
    </AppShell>
  );
}