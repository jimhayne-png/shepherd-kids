"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AppShell, { type NavItem } from "@/components/layout/AppShell";

const supabase = createClient();

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "ShepherdKids", href: "#", isSection: true },
  { label: "💛 Ministry Care", href: "/dashboard/children-ministry" },
  { label: "✅ Live Check-In", href: "/dashboard/children-ministry/checkin" },
  { label: "🏷️ Label Printing", href: "/dashboard/children-ministry/labels" },
  { label: "📊 Attendance Report", href: "/dashboard/children-ministry/attendance" },
  { label: "🧒 Children", href: "/dashboard/children-ministry/children" },
  { label: "👪 Parents", href: "/dashboard/children-ministry/parents" },
  { label: "📧 Parent Communication", href: "/dashboard/children-ministry/parent-update" },
  { label: "✝️ Faith Journey", href: "/dashboard/children-ministry/faith-journey" },
  { label: "🛡️ Family Safety Review", href: "/dashboard/children-ministry/family-safety-review" },
  { label: "🎉 Celebrations", href: "/dashboard/children-ministry/birthdays" },
  { label: "🎓 Certificates", href: "/dashboard/children-ministry/certificates/new" },
  { label: "⚙️ Check-In Setup", href: "/dashboard/children-ministry/checkin-setup" },
  { label: "👥 Volunteers", href: "/dashboard/children-ministry/volunteers" },
  { label: "Settings", href: "#", isSection: true },
  { label: "⚙️ Settings", href: "/dashboard/settings" },
  { label: "💳 Billing", href: "/dashboard/billing" },
  { label: "📖 Tutorials", href: "/dashboard/tutorials" },
];

const CARE_CARDS = [
  {
    title: "First-Time Families",
    desc: "Welcome and connect with new visitors.",
    href: "/dashboard/children-ministry/followup",
    action: "Welcome",
    emoji: "👋",
    countLabel: "families",
  },
  {
    title: "Returning Visitor Follow-Up",
    desc: "Families waiting for second-week follow-up",
    href: "/dashboard/children-ministry/visitor-journey",
    action: "View",
    emoji: "🏠",
    countLabel: "families",
  },
  {
    title: "Parent Communication",
    desc: "Send updates and messages to families",
    href: "/dashboard/children-ministry/parent-update",
    action: "Send",
    emoji: "📧",
    countLabel: "",
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
    title: "Promotion Sunday Ready",
    desc: "Children ready for next classroom",
    href: "/dashboard/children-ministry/children",
    action: "Review",
    emoji: "🎓",
    countLabel: "children",
  },
  {
    title: "Annual Family Safety Review",
    desc: "Confirm allergies, contacts, pickups, and care details",
    href: "/dashboard/children-ministry/family-safety-review",
    action: "Review",
    emoji: "🛡️",
    countLabel: "families",
  },
];

const PURPLE_GRADIENT = "linear-gradient(135deg, #7B2CBF, #9D4EDD)";

const QUICK_CARDS = [
  { label: "Check-In Setup", href: "/dashboard/children-ministry/checkin-setup", emoji: "✅", gradient: PURPLE_GRADIENT },
  { label: "Live Check-In",  href: "/dashboard/children-ministry/live-checkin",  emoji: "📋", gradient: PURPLE_GRADIENT },
  { label: "Follow-Up",      href: "/dashboard/children-ministry/followup",      emoji: "📞", gradient: PURPLE_GRADIENT },
  { label: "Birthdays",      href: "/dashboard/children-ministry/birthdays",     emoji: "🎂", gradient: PURPLE_GRADIENT },
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
  safetyReviewsDue: number | null;
  waitingVisitors: number | null;
};

type Church = { id: string; name: string };

type WizardState = { current_step: number; completed_steps: number[]; is_complete: boolean };

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
  const [stats, setStats] = useState<Stats>({ members: null, events: null, prayers: null, safetyReviewsDue: null, waitingVisitors: null });
  const [trialExpired, setTrialExpired] = useState(false);
  const [wizard, setWizard] = useState<WizardState | null>(null);

  useEffect(() => {
    if (isPlatformAdmin && churchId) {
      localStorage.setItem("selected_church_id", churchId);
    }
  }, [isPlatformAdmin, churchId]);

  useEffect(() => {
    if (isPlatformAdmin || !churchId) return;
    fetch("/api/trial-status", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { expired: false }))
      .then((d) => {
        if (d.needsBilling) {
          router.push("/dashboard/billing");
        } else if (d.expired) {
          setTrialExpired(true);
        }
      })
      .catch(() => {});
  }, [isPlatformAdmin, churchId, router]);

  // Wizard check: new admins get redirected automatically on first load.
  useEffect(() => {
    if (isPlatformAdmin || !churchId) return;
    fetch("/api/setup-wizard", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.wizard) return;
        setWizard(d.wizard);
        if (!d.wizard.is_complete) {
          router.push("/dashboard/setup-wizard");
        }
      })
      .catch(() => {});
  }, [isPlatformAdmin, churchId, router]);

  useEffect(() => {
    if (!churchId) return;

    async function fetchStats() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers: Record<string, string> = {
        Authorization: `Bearer ${session.access_token}`,
      };
      if (isPlatformAdmin && churchId) {
        headers["x-selected-church-id"] = churchId;
      }

      const res = await fetch("/api/dashboard/stats", { headers });
      if (!res.ok) return;

      const d = await res.json();
      setStats({
        members:          d.activeFamilies          ?? 0,
        events:           d.totalChildren           ?? 0,
        prayers:          d.familyCareNeeds         ?? 0,
        safetyReviewsDue: d.familySafetyReviewsDue  ?? 0,
        waitingVisitors:  d.waitingVisitors          ?? 0,
      });
    }

    fetchStats();
  }, [churchId, isPlatformAdmin]);

  function handleChurchSelect(church: Church) {
    localStorage.setItem("selected_church_id", church.id);
    router.push(`/dashboard?churchId=${church.id}`);
  }

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
            className="text-sm mb-2 block transition-colors"
            style={{ color: "#D4AF37" }}
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
        {/* Setup wizard progress card — shown while wizard is incomplete */}
        {wizard && !wizard.is_complete && (
          <div
            style={{
              background: "#120A1F", border: "1px solid rgba(212,175,55,0.28)", borderRadius: 16,
              padding: "20px 24px", marginBottom: 24, marginTop: -24,
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20,
            }}
          >
            <div style={{ flex: 1 }}>
              <p style={{ color: "#D4AF37", fontWeight: 700, fontSize: 14, margin: "0 0 4px" }}>
                ⭐ Getting Started — {wizard.completed_steps.length} of 8 steps complete
              </p>
              <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 4, marginTop: 8 }}>
                <div style={{ height: "100%", borderRadius: 4, background: "linear-gradient(90deg, #7B2CBF, #9D4EDD)", width: `${(wizard.completed_steps.length / 8) * 100}%`, transition: "width 0.4s ease" }} />
              </div>
            </div>
            <a
              href="/dashboard/setup-wizard"
              style={{ flexShrink: 0, padding: "9px 18px", borderRadius: 9, background: "linear-gradient(135deg, #7B2CBF, #9D4EDD)", color: "#fff", fontWeight: 700, fontSize: 13, textDecoration: "none" }}
            >
              Continue →
            </a>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 -mt-6">
          {[
            { label: "Active Families", value: stats.members, emoji: "👨‍👩‍👧‍👦", color: "#7B2CBF" },
            { label: "Total Children", value: stats.events, emoji: "🧒", color: "#9D4EDD" },
            { label: "Family Care Needs", value: stats.prayers, emoji: "💛", color: "#D4AF37" },
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

        {/* Quick-access operational cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {QUICK_CARDS.map((card) => (
            <a
              key={card.href}
              href={card.href}
              className="group block rounded-2xl p-5 text-white transition-transform duration-150 hover:-translate-y-1 hover:shadow-xl shadow-md"
              style={{ background: card.gradient }}
            >
              <div className="text-3xl mb-3">{card.emoji}</div>
              <p className="font-bold text-base leading-tight">{card.label}</p>
            </a>
          ))}
        </div>

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
            {CARE_CARDS.map((card) => {
              const count =
                card.title === "Annual Family Safety Review"
                  ? (stats.safetyReviewsDue ?? 0)
                  : card.title === "Returning Visitor Follow-Up"
                  ? (stats.waitingVisitors ?? 0)
                  : 0;
              return (
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
                        {count}
                      </p>
                      <p style={{ color: "rgba(212,175,55,0.6)", fontSize: "10px", margin: "2px 0 0", fontWeight: 500 }}>
                        {card.countLabel}
                      </p>
                    </div>
                  </div>

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
              );
            })}
          </div>
        </div>

      </div>
    </AppShell>
  );
}