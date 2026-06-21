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
        className="px-8 py-12"
        style={{ backgroundColor: "#0A0814", minHeight: "100vh" }}
      >
        <div style={{ maxWidth: "480px" }}>
          {/* Plan card */}
          <div
            style={{
              background: "#120A1F",
              border: "1px solid rgba(212,175,55,0.3)",
              borderRadius: "18px",
              padding: "32px",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px" }}>
              <div>
                <p style={{ fontSize: "11px", fontWeight: 700, color: "#D4AF37", textTransform: "uppercase" as const, letterSpacing: "0.08em", margin: "0 0 6px" }}>
                  Current Plan
                </p>
                <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#ffffff", margin: 0, fontFamily: "Georgia, serif" }}>
                  ShepherdKids
                </h2>
              </div>
              <div style={{ textAlign: "right" as const, flexShrink: 0 }}>
                <p style={{ fontSize: "28px", fontWeight: 700, color: "#ffffff", margin: 0, lineHeight: 1 }}>$49</p>
                <p style={{ fontSize: "12px", color: "#A9A9B8", margin: "3px 0 0" }}>/month</p>
              </div>
            </div>

            {/* Divider */}
            <div style={{ borderTop: "1px solid rgba(212,175,55,0.15)", marginBottom: "20px" }} />

            {/* Features */}
            <p style={{ fontSize: "11px", fontWeight: 700, color: "#A9A9B8", textTransform: "uppercase" as const, letterSpacing: "0.08em", margin: "0 0 12px" }}>
              What&apos;s Included
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", display: "flex", flexDirection: "column" as const, gap: "10px" }}>
              {[
                "Check-In",
                "Labels",
                "Attendance",
                "Follow-Up",
                "Faith Journey",
                "Parent Communication",
                "Celebrations",
                "Certificates",
                "Parent Alert Texting",
              ].map((feature) => (
                <li key={feature} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", color: "#D8D8E8" }}>
                  <span style={{ color: "#4ade80", flexShrink: 0, fontSize: "15px" }}>✓</span>
                  {feature}
                </li>
              ))}
            </ul>

            {/* Action button */}
            <button
              style={{
                width: "100%",
                padding: "13px 0",
                borderRadius: "12px",
                fontSize: "14px",
                fontWeight: 700,
                color: "#ffffff",
                background: "linear-gradient(135deg, #7B2CBF, #9D4EDD)",
                border: "none",
                cursor: "pointer",
              }}
            >
              Manage Subscription
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}