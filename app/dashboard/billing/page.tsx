"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import AppShell, { type NavItem } from "@/components/layout/AppShell";

// ── nav ───────────────────────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
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

// ── types ─────────────────────────────────────────────────────────────────────

type SubscriptionInfo = {
  hasAccess: boolean;
  source: "trial" | "stripe" | "none";
  status: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
};

// ── constants ─────────────────────────────────────────────────────────────────

const FEATURES = [
  "Check-In",
  "Labels",
  "Attendance",
  "Follow-Up",
  "Faith Journey",
  "Parent Communication",
  "Celebrations",
  "Certificates",
  "Parent Alert Texting",
];

// ── helpers ───────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  return Math.max(
    0,
    Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000)
  );
}

function fmt(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ── sub-components ────────────────────────────────────────────────────────────

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        padding: "2px 9px",
        borderRadius: 20,
        backgroundColor: `${color}26`,
        color,
        border: `1px solid ${color}55`,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function Flash({ type, text }: { type: "success" | "error"; text: string }) {
  const isOk = type === "success";
  return (
    <div
      style={{
        backgroundColor: isOk ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)",
        border: `1px solid ${isOk ? "rgba(74,222,128,0.35)" : "rgba(248,113,113,0.35)"}`,
        borderRadius: 10,
        padding: "12px 16px",
        marginBottom: 20,
        fontSize: 13,
        color: isOk ? "#4ade80" : "#f87171",
      }}
    >
      {text}
    </div>
  );
}

function ActionButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        padding: "13px 0",
        borderRadius: 12,
        fontSize: 14,
        fontWeight: 700,
        color: "#ffffff",
        background: "linear-gradient(135deg, #7B2CBF, #9D4EDD)",
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        transition: "opacity 0.15s",
      }}
    >
      {children}
    </button>
  );
}

// ── main content (needs Suspense for useSearchParams) ─────────────────────────

function BillingContent() {
  const searchParams = useSearchParams();
  const [info, setInfo] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [flash, setFlash] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Show redirect feedback from Stripe
  useEffect(() => {
    if (searchParams.get("success") === "1") {
      setFlash({ type: "success", text: "You're subscribed! Welcome to ShepherdKids." });
    } else if (searchParams.get("canceled") === "1") {
      setFlash({ type: "error", text: "Checkout was canceled. Nothing was changed." });
    }
  }, [searchParams]);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/billing/status", { credentials: "include" });
      if (res.ok) setInfo(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  async function handleSubscribe() {
    setWorking(true);
    setFlash(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setFlash({ type: "error", text: data.error ?? "Could not start checkout. Please try again." });
      }
    } catch {
      setFlash({ type: "error", text: "Something went wrong. Please try again." });
    } finally {
      setWorking(false);
    }
  }

  async function handlePortal() {
    setWorking(true);
    setFlash(null);
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setFlash({ type: "error", text: data.error ?? "Could not open billing portal. Please try again." });
      }
    } catch {
      setFlash({ type: "error", text: "Something went wrong. Please try again." });
    } finally {
      setWorking(false);
    }
  }

  // ── derived display state ───────────────────────────────────────────────────

  const status = info?.status ?? null;

  function renderBadge() {
    if (!status) return null;
    if (status === "active")             return <Badge color="#4ade80">Active</Badge>;
    if (status === "trialing")           return <Badge color="#facc15">Trialing</Badge>;
    if (status === "trial")              return <Badge color="#facc15">Trial</Badge>;
    if (status === "past_due")           return <Badge color="#f87171">Past Due</Badge>;
    if (status === "canceled")           return <Badge color="#9ca3af">Canceled</Badge>;
    if (status === "expired")            return <Badge color="#f87171">Expired</Badge>;
    if (status === "incomplete")         return <Badge color="#a78bfa">Pending</Badge>;
    return null;
  }

  function renderStatusDetail() {
    if (!info) return null;
    if (status === "trial" && info.trialEndsAt) {
      const days = daysUntil(info.trialEndsAt);
      return (
        <p style={{ color: days <= 3 ? "#fbbf24" : "#D8D8E8", fontSize: 13, margin: "8px 0 0" }}>
          {days === 0
            ? "Your trial ends today."
            : `${days} day${days !== 1 ? "s" : ""} remaining in your free trial.`}
        </p>
      );
    }
    if (status === "expired") {
      return <p style={{ color: "#f87171", fontSize: 13, margin: "8px 0 0" }}>Your trial has expired. Subscribe to continue.</p>;
    }
    if (status === "trialing" && info.trialEndsAt) {
      return <p style={{ color: "#D8D8E8", fontSize: 13, margin: "8px 0 0" }}>Trial ends {fmt(info.trialEndsAt)}. No charge until then.</p>;
    }
    if (status === "active" && info.currentPeriodEnd) {
      return info.cancelAtPeriodEnd
        ? <p style={{ color: "#fbbf24", fontSize: 13, margin: "8px 0 0" }}>Cancels {fmt(info.currentPeriodEnd)}. Access continues until then.</p>
        : <p style={{ color: "#D8D8E8", fontSize: 13, margin: "8px 0 0" }}>Next billing {fmt(info.currentPeriodEnd)}.</p>;
    }
    if (status === "past_due") {
      return <p style={{ color: "#f87171", fontSize: 13, margin: "8px 0 0" }}>Payment failed — please update your payment method to restore access.</p>;
    }
    if (status === "canceled") {
      return <p style={{ color: "#9ca3af", fontSize: 13, margin: "8px 0 0" }}>Subscription canceled. Subscribe below to restore access.</p>;
    }
    return null;
  }

  // Show portal for subscriptions Stripe manages; otherwise show checkout
  const hasStripeSubscription = !!info?.stripeSubscriptionId;
  const usePortal = hasStripeSubscription && (status === "active" || status === "trialing" || status === "past_due");

  function renderAction() {
    if (loading) {
      return <div style={{ textAlign: "center", color: "#A9A9B8", fontSize: 13, padding: "12px 0" }}>Loading…</div>;
    }
    if (usePortal) {
      const label = status === "past_due" ? "Update Payment Method" : "Manage Subscription";
      return <ActionButton onClick={handlePortal} disabled={working}>{working ? "Loading…" : label}</ActionButton>;
    }
    return <ActionButton onClick={handleSubscribe} disabled={working}>{working ? "Loading…" : "Subscribe Now — $49 / month"}</ActionButton>;
  }

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Page header */}
      <div className="px-8 py-8" style={{ background: "linear-gradient(135deg, #08060D 0%, #1C0A30 100%)" }}>
        <Link href="/dashboard/settings" className="text-sm transition-colors block mb-2" style={{ color: "#D4AF37" }}>
          ← Settings
        </Link>
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>
          Subscription &amp; Billing
        </h1>
        <p className="text-sm mt-1" style={{ color: "#D8D8E8" }}>
          Manage your ShepherdKids subscription
        </p>
      </div>

      {/* Body */}
      <div className="px-8 py-12" style={{ backgroundColor: "#0A0814", minHeight: "100vh" }}>
        <div style={{ maxWidth: 480 }}>
          {flash && <Flash type={flash.type} text={flash.text} />}

          {/* Plan card */}
          <div
            style={{
              background: "#120A1F",
              border: "1px solid rgba(212,175,55,0.3)",
              borderRadius: 18,
              padding: 32,
            }}
          >
            {/* Plan header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#D4AF37", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>
                  Current Plan
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <h2 style={{ fontSize: 22, fontWeight: 700, color: "#ffffff", margin: 0, fontFamily: "Georgia, serif" }}>
                    ShepherdKids
                  </h2>
                  {renderBadge()}
                </div>
                {renderStatusDetail()}
              </div>
              <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 16 }}>
                <p style={{ fontSize: 28, fontWeight: 700, color: "#ffffff", margin: 0, lineHeight: 1 }}>$49</p>
                <p style={{ fontSize: 12, color: "#A9A9B8", margin: "3px 0 0" }}>/month</p>
              </div>
            </div>

            <div style={{ borderTop: "1px solid rgba(212,175,55,0.15)", marginBottom: 20 }} />

            {/* Feature list */}
            <p style={{ fontSize: 11, fontWeight: 700, color: "#A9A9B8", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 12px" }}>
              What&apos;s Included
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", display: "flex", flexDirection: "column", gap: 10 }}>
              {FEATURES.map((f) => (
                <li key={f} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#D8D8E8" }}>
                  <span style={{ color: "#4ade80", flexShrink: 0, fontSize: 15 }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>

            {renderAction()}
          </div>
        </div>
      </div>
    </>
  );
}

// ── page export ───────────────────────────────────────────────────────────────

export default function BillingPage() {
  return (
    <AppShell navItems={NAV_ITEMS}>
      <Suspense fallback={null}>
        <BillingContent />
      </Suspense>
    </AppShell>
  );
}
