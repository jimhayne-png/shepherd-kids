"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/layout/AppShell";

const supabase = createClient();
const DARK_GREEN = "#1A4A2E";

type Sub = {
  status: string | null;
  admin_override_enabled: boolean;
  admin_override_reason: string | null;
  admin_override_until: string | null;
  discount_percent: number | null;
  discount_reason: string | null;
  discount_until: string | null;
};

type Church = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  email: string | null;
  phone: string | null;
  subscription_status: string | null;
  subscription_tier: string | null;
  trial_ends_at: string | null;
  created_at: string;
  sub: Sub | null;
};

type EffectiveStatus = "trial" | "expired_trial" | "active" | "suspended" | "none";
type SortKey = "default" | "name" | "trial_ending" | "days_left" | "created";

const STATUS_CONFIG: Record<EffectiveStatus, { label: string; bg: string; color: string }> = {
  trial:         { label: "Active Trial",  bg: "#dbeafe", color: "#1d4ed8" },
  expired_trial: { label: "Expired Trial", bg: "#fee2e2", color: "#dc2626" },
  active:        { label: "Paid / Active", bg: "#dcfce7", color: "#16a34a" },
  suspended:     { label: "Suspended",     bg: "#fee2e2", color: "#6b7280" },
  none:          { label: "Unknown",       bg: "#f9fafb", color: "#9ca3af" },
};

const TIER_MRR: Record<string, number> = {
  very_small: 97,
  small: 197,
  medium: 297,
  large: 497,
  enterprise: 997,
  paid: 197,
};

function getTierMRR(tier: string | null): number {
  if (!tier) return 197;
  return TIER_MRR[tier] ?? 197;
}

type Action = {
  key: string;
  label: string;
  destructive?: boolean;
  href?: (churchId: string) => string;
  disabled?: boolean;
  modal?: boolean;
};

const ACTIONS: Action[] = [
  { key: "reset_trial_30",   label: "🔄 Reset Trial (30 days)" },
  { key: "extend_trial_7",   label: "⏩ Extend Trial +7 days" },
  { key: "extend_trial_30",  label: "⏩ Extend Trial +30 days" },
  { key: "mark_paid",        label: "✅ Mark Paid" },
  { key: "suspend",          label: "🚫 Suspend", destructive: true },
  { key: "reactivate_trial", label: "↩️ Reactivate Trial" },
  { key: "billing_controls", label: "⚙️ Billing Controls", modal: true },
  { key: "open_dashboard",   label: "🏛️ Open Church Dashboard", href: (id) => `/dashboard?churchId=${id}` },
  { key: "login_as",         label: "🔑 Login as Church Admin", disabled: true },
];

const STATUS_FILTERS: { key: EffectiveStatus | "all"; label: string }[] = [
  { key: "all",          label: "All" },
  { key: "trial",        label: "Active Trial" },
  { key: "expired_trial",label: "Expired Trial" },
  { key: "active",       label: "Paid" },
  { key: "suspended",    label: "Suspended" },
];

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "default",      label: "Default" },
  { key: "name",         label: "Church Name" },
  { key: "trial_ending", label: "Trial Ending Soon" },
  { key: "days_left",    label: "Days Left" },
  { key: "created",      label: "Created Date" },
];

function getEffectiveStatus(c: Church): EffectiveStatus {
  if (c.subscription_status === "active") return "active";
  if (c.subscription_status === "suspended") return "suspended";
  if (c.subscription_status === "trial") {
    if (!c.trial_ends_at) return "trial";
    return new Date(c.trial_ends_at) > new Date() ? "trial" : "expired_trial";
  }
  return "none";
}

function getDaysRemaining(c: Church): number | null {
  if (!c.trial_ends_at) return null;
  return Math.ceil((new Date(c.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function defaultSort(a: Church, b: Church): number {
  const sa = getEffectiveStatus(a);
  const sb = getEffectiveStatus(b);
  if (sa === "expired_trial" && sb !== "expired_trial") return -1;
  if (sb === "expired_trial" && sa !== "expired_trial") return 1;
  if (sa === "trial" && sb === "trial") {
    const da = getDaysRemaining(a) ?? Infinity;
    const db = getDaysRemaining(b) ?? Infinity;
    return da - db;
  }
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtDateInput(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function StatusBadge({ status }: { status: EffectiveStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      style={{
        backgroundColor: cfg.bg,
        color: cfg.color,
        padding: "3px 10px",
        borderRadius: 9999,
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {cfg.label}
    </span>
  );
}

function OverrideBadge() {
  return (
    <span
      style={{
        backgroundColor: "#fef9c3",
        color: "#92400e",
        padding: "2px 7px",
        borderRadius: 9999,
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
        border: "1px solid #fde68a",
      }}
    >
      Override
    </span>
  );
}

function DiscountBadge({ pct }: { pct: number }) {
  return (
    <span
      style={{
        backgroundColor: "#ede9fe",
        color: "#5b21b6",
        padding: "2px 7px",
        borderRadius: 9999,
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
        border: "1px solid #c4b5fd",
      }}
    >
      {pct}% off
    </span>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number | string;
  icon: string;
  color: string;
}) {
  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        padding: "14px 18px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 24, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>{label}</div>
    </div>
  );
}

const TH_STYLE: React.CSSProperties = {
  padding: "10px 12px",
  textAlign: "left",
  fontSize: 11,
  fontWeight: 700,
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  whiteSpace: "nowrap",
  backgroundColor: "#f9fafb",
  borderBottom: "1px solid #e5e7eb",
};

const TD_STYLE: React.CSSProperties = {
  padding: "10px 12px",
  borderBottom: "1px solid #f3f4f6",
  fontSize: 13,
  verticalAlign: "middle",
};

// ── Billing Controls Modal ────────────────────────────────────────────────────

function BillingControlsModal({
  church,
  token,
  onClose,
  onSave,
}: {
  church: Church;
  token: string;
  onClose: () => void;
  onSave: (updated: Church) => void;
}) {
  const sub = church.sub;
  const [overrideEnabled, setOverrideEnabled] = useState(sub?.admin_override_enabled ?? false);
  const [overrideReason, setOverrideReason] = useState(sub?.admin_override_reason ?? "");
  const [overrideUntil, setOverrideUntil] = useState(fmtDateInput(sub?.admin_override_until ?? null));
  const [discountPercent, setDiscountPercent] = useState<string>(sub?.discount_percent != null ? String(sub.discount_percent) : "");
  const [discountReason, setDiscountReason] = useState(sub?.discount_reason ?? "");
  const [discountUntil, setDiscountUntil] = useState(fmtDateInput(sub?.discount_until ?? null));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");

    const pct = discountPercent.trim() === "" ? null : parseInt(discountPercent, 10);
    if (pct !== null && (isNaN(pct) || pct < 0 || pct > 100)) {
      setError("Discount percent must be 0–100.");
      setSaving(false);
      return;
    }

    const res = await fetch("/api/master-admin/subscriptions", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        churchId: church.id,
        action: "set_billing_controls",
        overrideEnabled,
        overrideReason: overrideReason.trim() || null,
        overrideUntil: overrideUntil || null,
        discountPercent: pct,
        discountReason: discountReason.trim() || null,
        discountUntil: discountUntil || null,
      }),
    });

    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError((d as { error?: string }).error ?? "Save failed. Please try again.");
      setSaving(false);
      return;
    }

    const d = await res.json();
    onSave((d as { church: Church }).church);
    onClose();
  }

  function handleClearDiscount() {
    setDiscountPercent("");
    setDiscountReason("");
    setDiscountUntil("");
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.50)", zIndex: 50, padding: 16, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}
    >
      <div
        style={{ backgroundColor: "white", borderRadius: 16, width: "100%", maxWidth: 480, padding: 32, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>
          ⚙️ Billing Controls
        </h2>
        <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 24px" }}>{church.name}</p>

        {error && (
          <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", color: "#dc2626", fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Override section */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 12px" }}>
            Billing Override
          </p>

          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 14 }}>
            <input
              type="checkbox"
              checked={overrideEnabled}
              onChange={(e) => setOverrideEnabled(e.target.checked)}
              style={{ width: 16, height: 16, cursor: "pointer" }}
            />
            <span style={{ fontSize: 14, color: "#111827", fontWeight: 600 }}>Enable billing override</span>
          </label>

          {overrideEnabled && (
            <p style={{ fontSize: 12, color: "#92400e", backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "8px 12px", margin: "0 0 14px" }}>
              Church will bypass all Stripe billing checks and retain full access.
            </p>
          )}

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>
              Reason / Internal Note
            </label>
            <textarea
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              rows={2}
              placeholder="e.g. Comp account, partnership, grace period"
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, resize: "vertical", boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>
              Override expires (leave blank = never)
            </label>
            <input
              type="date"
              value={overrideUntil}
              onChange={(e) => setOverrideUntil(e.target.value)}
              style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13 }}
            />
          </div>
        </div>

        <div style={{ height: 1, backgroundColor: "#f3f4f6", margin: "0 0 24px" }} />

        {/* Discount section */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.07em", margin: 0 }}>
              Internal Discount
            </p>
            <button
              type="button"
              onClick={handleClearDiscount}
              style={{ fontSize: 12, color: "#9ca3af", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
            >
              Clear discount
            </button>
          </div>

          <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 12px" }}>
            Stored for reference only. Does not automatically change Stripe pricing.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>
                Discount %
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                placeholder="e.g. 20"
                style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>
                Discount Reason
              </label>
              <input
                type="text"
                value={discountReason}
                onChange={(e) => setDiscountReason(e.target.value)}
                placeholder="e.g. Partner church, referral"
                style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>
              Discount expires (leave blank = no expiry)
            </label>
            <input
              type="date"
              value={discountUntil}
              onChange={(e) => setDiscountUntil(e.target.value)}
              style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13 }}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: 11, borderRadius: 10, border: "1px solid #e5e7eb", backgroundColor: "white", fontSize: 14, fontWeight: 500, color: "#374151", cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ flex: 2, padding: 11, borderRadius: 10, border: "none", backgroundColor: DARK_GREEN, color: "white", fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Confirm Modals ────────────────────────────────────────────────────────────

function ConfirmModal({
  icon,
  title,
  body,
  confirmLabel,
  confirmColor,
  onCancel,
  onConfirm,
}: {
  icon: string;
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  confirmColor: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.50)", zIndex: 50, padding: 16 }}
      onClick={onCancel}
    >
      <div
        style={{ backgroundColor: "white", borderRadius: 16, width: "100%", maxWidth: 420, padding: 32, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 36, marginBottom: 12 }}>{icon}</div>
        <h2 style={{ fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 700, color: "#111827", margin: "0 0 10px" }}>{title}</h2>
        <div style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6, marginBottom: 24 }}>{body}</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onCancel}
            style={{ flex: 1, padding: 11, borderRadius: 10, border: "1px solid #e5e7eb", backgroundColor: "white", fontSize: 14, fontWeight: 500, color: "#374151", cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{ flex: 1, padding: 11, borderRadius: 10, border: "none", backgroundColor: confirmColor, color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SubscriptionsPage() {
  const [churches, setChurches] = useState<Church[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<EffectiveStatus | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("default");

  const [openMenu, setOpenMenu] = useState<{ id: string; right: number; top: number } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  const [confirmSuspend, setConfirmSuspend] = useState<{ id: string; name: string } | null>(null);
  const [confirmMarkPaid, setConfirmMarkPaid] = useState<{ id: string; name: string } | null>(null);
  const [billingModal, setBillingModal] = useState<Church | null>(null);

  async function load(t: string) {
    setPageError("");
    setAccessDenied(false);
    const res = await fetch("/api/master-admin/subscriptions", {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (res.status === 403) { setAccessDenied(true); return; }
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setPageError((d as { error?: string }).error ?? "Failed to load. Please try again.");
      return;
    }
    const d = await res.json();
    setChurches(d.churches ?? []);
  }

  useEffect(() => {
    async function init() {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (!user || authErr) { setPageError("Not authenticated."); setLoading(false); return; }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setPageError("No session found."); setLoading(false); return; }
      const t = session.access_token;
      setToken(t);
      await load(t);
      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function doAction(churchId: string, action: string) {
    if (!token) return;
    setActionLoading(churchId);
    setActionError("");
    setOpenMenu(null);

    const res = await fetch("/api/master-admin/subscriptions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ churchId, action }),
    });

    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setActionError((d as { error?: string }).error ?? "Action failed. Please try again.");
    } else {
      const d = await res.json();
      setChurches((prev) => prev.map((c) => (c.id === churchId ? (d as { church: Church }).church : c)));
    }
    setActionLoading(null);
  }

  function isOverrideActive(sub: Sub | null): boolean {
    if (!sub?.admin_override_enabled) return false;
    if (!sub.admin_override_until) return true;
    return new Date(sub.admin_override_until) > new Date();
  }

  function isDiscountActive(sub: Sub | null): boolean {
    if (sub?.discount_percent == null) return false;
    if (!sub.discount_until) return true;
    return new Date(sub.discount_until) > new Date();
  }

  // Summary stats
  const now = new Date();
  const activeTrialCount = churches.filter(
    (c) => c.subscription_status === "trial" && c.trial_ends_at && new Date(c.trial_ends_at) > now,
  ).length;
  const paidCount = churches.filter((c) => c.subscription_status === "active").length;
  const expiredCount = churches.filter(
    (c) => c.subscription_status === "trial" && (!c.trial_ends_at || new Date(c.trial_ends_at) <= now),
  ).length;
  const suspendedCount = churches.filter((c) => c.subscription_status === "suspended").length;
  const expiringIn7Count = churches.filter((c) => {
    const days = getDaysRemaining(c);
    return c.subscription_status === "trial" && days !== null && days >= 0 && days <= 7;
  }).length;
  const overrideCount = churches.filter((c) => isOverrideActive(c.sub)).length;
  const estimatedMRR = churches
    .filter((c) => c.subscription_status === "active")
    .reduce((sum, c) => sum + getTierMRR(c.subscription_tier), 0);

  const displayed = useMemo(() => {
    const filtered = churches.filter((c) => {
      if (statusFilter !== "all" && getEffectiveStatus(c) !== statusFilter) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return [c.name, c.city, c.state, c.email, c.phone, c.subscription_status, c.subscription_tier]
        .some((v) => v?.toLowerCase().includes(q));
    });

    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "name": return a.name.localeCompare(b.name);
        case "created": return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "trial_ending":
        case "days_left": {
          const da = getDaysRemaining(a) ?? Infinity;
          const db = getDaysRemaining(b) ?? Infinity;
          return da - db;
        }
        default: return defaultSort(a, b);
      }
    });
  }, [churches, search, statusFilter, sortKey]);

  if (!loading && accessDenied) {
    return (
      <AppShell navItems={[]}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
          <div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 26, fontWeight: 700, color: "#111827", margin: "0 0 10px", textAlign: "center" }}>
            Access Denied
          </h1>
          <p className="text-gray-500 text-sm text-center max-w-sm">
            You do not have permission to view this page. This area is restricted to master administrators only.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell navItems={[]}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${DARK_GREEN} 0%, #2D6B42 100%)`, padding: "32px 40px" }}>
        <p className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: "#86efac" }}>
          Master Admin
        </p>
        <h1 style={{ color: "white", fontSize: 32, fontWeight: 700, fontFamily: "Georgia, serif", margin: "0 0 8px" }}>
          Subscription Management
        </h1>
        <p style={{ color: "#bbf7d0", fontSize: 14, margin: 0 }}>
          Manage subscriptions, trials, billing overrides, and discounts across ShepherdKids.
        </p>
      </div>

      <div className="min-h-screen bg-gray-50" style={{ padding: "28px 32px" }}>
        {/* Summary cards */}
        {!loading && !pageError && !accessDenied && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
            <SummaryCard label="Total Churches"    value={churches.length}  icon="🏛️" color="#374151" />
            <SummaryCard label="Active Trials"     value={activeTrialCount} icon="⏳" color="#1d4ed8" />
            <SummaryCard label="Expired Trials"    value={expiredCount}     icon="⚠️" color="#dc2626" />
            <SummaryCard label="Paid Churches"     value={paidCount}        icon="✅" color="#16a34a" />
            <SummaryCard label="Suspended"         value={suspendedCount}   icon="🚫" color="#9ca3af" />
            <SummaryCard label="Expiring ≤ 7 Days" value={expiringIn7Count} icon="🔔" color="#d97706" />
            <SummaryCard label="Overrides Active"  value={overrideCount}    icon="🔓" color="#92400e" />
            <SummaryCard label="Est. MRR" value={"$" + estimatedMRR.toLocaleString()} icon="💰" color="#15803d" />
          </div>
        )}

        {loading && <div className="text-center py-16 text-gray-400">Loading…</div>}

        {pageError && !loading && (
          <div className="rounded-xl border border-red-300 bg-red-50 text-red-700 font-medium" style={{ padding: "14px 20px" }}>
            {pageError}
          </div>
        )}

        {actionError && (
          <div
            className="rounded-xl flex items-center justify-between"
            style={{ backgroundColor: "#fff7ed", border: "1px solid #fdba74", padding: "10px 16px", color: "#c2410c", fontSize: 13, marginBottom: 16 }}
          >
            <span>{actionError}</span>
            <button
              onClick={() => setActionError("")}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#c2410c", fontWeight: 700, fontSize: 16, lineHeight: 1 }}
            >
              ×
            </button>
          </div>
        )}

        {/* Search + Filter + Sort */}
        {!loading && !pageError && !accessDenied && (
          <div className="flex flex-col gap-3 mb-4">
            <input
              type="text"
              placeholder="Search church, city, email, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-800"
              style={{ padding: "10px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            />

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap gap-1.5">
                {STATUS_FILTERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setStatusFilter(f.key)}
                    style={{
                      padding: "5px 14px", borderRadius: 9999, fontSize: 12, fontWeight: 600, border: "1px solid", cursor: "pointer", transition: "all 0.1s",
                      borderColor: statusFilter === f.key ? DARK_GREEN : "#d1d5db",
                      backgroundColor: statusFilter === f.key ? DARK_GREEN : "white",
                      color: statusFilter === f.key ? "white" : "#6b7280",
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 500, whiteSpace: "nowrap" }}>Sort:</span>
                <div className="flex flex-wrap gap-1">
                  {SORT_OPTIONS.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => setSortKey(s.key)}
                      style={{
                        padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500, border: "1px solid", cursor: "pointer", transition: "all 0.1s",
                        borderColor: sortKey === s.key ? DARK_GREEN : "#d1d5db",
                        backgroundColor: sortKey === s.key ? "#f0fdf4" : "white",
                        color: sortKey === s.key ? "#14532d" : "#6b7280",
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        {!loading && !pageError && !accessDenied && (
          <div className="bg-white rounded-2xl border border-gray-200" style={{ overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Church", "City / State", "Email", "Status", "Billing", "Trial Ends", "Days Left", "Created", "Actions"].map((h) => (
                      <th key={h} style={TH_STYLE}>{h}</th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {displayed.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center text-gray-400" style={{ ...TD_STYLE, padding: 48 }}>
                        {churches.length === 0 ? "No churches found." : "No churches match your search or filter."}
                      </td>
                    </tr>
                  )}

                  {displayed.map((church) => {
                    const status = getEffectiveStatus(church);
                    const days = getDaysRemaining(church);
                    const isActing = actionLoading === church.id;
                    const overrideOn = isOverrideActive(church.sub);
                    const discountOn = isDiscountActive(church.sub);

                    return (
                      <tr key={church.id} style={{ backgroundColor: isActing ? "#fafafa" : "white", transition: "background-color 0.1s" }}>
                        {/* Church name */}
                        <td style={{ ...TD_STYLE, fontWeight: 700, color: "#111827", whiteSpace: "nowrap" }}>
                          {church.name}
                        </td>

                        {/* City / State */}
                        <td style={{ ...TD_STYLE, color: "#6b7280", whiteSpace: "nowrap" }}>
                          {[church.city, church.state].filter(Boolean).join(", ") || "—"}
                        </td>

                        {/* Email */}
                        <td style={{ ...TD_STYLE, color: "#6b7280" }}>
                          {church.email ? (
                            <a href={`mailto:${church.email}`} style={{ color: "#2563eb", textDecoration: "none" }}>
                              {church.email}
                            </a>
                          ) : "—"}
                        </td>

                        {/* Status */}
                        <td style={TD_STYLE}>
                          <StatusBadge status={status} />
                        </td>

                        {/* Billing override / discount */}
                        <td style={{ ...TD_STYLE, whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {overrideOn && <OverrideBadge />}
                            {discountOn && church.sub?.discount_percent != null && (
                              <DiscountBadge pct={church.sub.discount_percent} />
                            )}
                            {!overrideOn && !discountOn && <span style={{ color: "#d1d5db" }}>—</span>}
                          </div>
                        </td>

                        {/* Trial ends */}
                        <td style={{ ...TD_STYLE, color: "#6b7280", whiteSpace: "nowrap" }}>
                          {fmtDate(church.trial_ends_at)}
                        </td>

                        {/* Days remaining */}
                        <td style={{ ...TD_STYLE, whiteSpace: "nowrap" }}>
                          {days === null ? (
                            <span style={{ color: "#9ca3af" }}>—</span>
                          ) : days === 0 ? (
                            <span style={{ color: "#f59e0b", fontWeight: 700 }}>0d</span>
                          ) : days < 0 ? (
                            <span style={{ color: "#dc2626", fontWeight: 700 }}>{days}d</span>
                          ) : (
                            <span style={{ color: days <= 7 ? "#f59e0b" : "#16a34a", fontWeight: 600 }}>{days}d</span>
                          )}
                        </td>

                        {/* Created */}
                        <td style={{ ...TD_STYLE, color: "#9ca3af", whiteSpace: "nowrap" }}>
                          {fmtDate(church.created_at)}
                        </td>

                        {/* Actions */}
                        <td style={TD_STYLE}>
                          {isActing ? (
                            <span style={{ color: "#9ca3af", fontSize: 12 }}>Working…</span>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (openMenu?.id === church.id) { setOpenMenu(null); return; }
                                const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                                setOpenMenu({ id: church.id, right: window.innerWidth - rect.right, top: rect.bottom + 4 });
                              }}
                              style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #e5e7eb", backgroundColor: openMenu?.id === church.id ? "#f3f4f6" : "white", cursor: "pointer", fontSize: 13, fontWeight: 500, color: "#374151", whiteSpace: "nowrap" }}
                            >
                              Actions ▾
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center text-xs text-gray-400" style={{ padding: "10px 14px", borderTop: "1px solid #f3f4f6" }}>
              Showing <strong className="text-gray-600 mx-1">{displayed.length}</strong> of{" "}
              <strong className="text-gray-600 mx-1">{churches.length}</strong>{" "}
              {churches.length === 1 ? "church" : "churches"}
            </div>
          </div>
        )}
      </div>

      {/* Fixed-position dropdown — rendered outside the table so overflow:hidden never clips it */}
      {openMenu && (() => {
        const menuChurch = churches.find((c) => c.id === openMenu.id);
        if (!menuChurch) return null;
        return (
          <>
            <div style={{ position: "fixed", inset: 0, zIndex: 9998 }} onClick={() => setOpenMenu(null)} />
            <div
              style={{ position: "fixed", right: openMenu.right, top: openMenu.top, zIndex: 9999, backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", minWidth: 240, overflow: "hidden" }}
              onClick={(e) => e.stopPropagation()}
            >
              {ACTIONS.map((action, i) => (
                <div key={action.key}>
                  {i === 6 && <div style={{ height: 1, backgroundColor: "#e5e7eb", margin: "2px 0" }} />}
                  {i === 7 && <div style={{ height: 1, backgroundColor: "#e5e7eb", margin: "2px 0" }} />}

                  {action.href ? (
                    <a
                      href={action.href(menuChurch.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setOpenMenu(null)}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", fontSize: 13, color: "#374151", textDecoration: "none", backgroundColor: "white", boxSizing: "border-box", width: "100%" }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f9fafb"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "white"; }}
                    >
                      {action.label}
                    </a>
                  ) : action.disabled ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", fontSize: 13, color: "#d1d5db", cursor: "not-allowed" }}>
                      {action.label}
                      <span style={{ marginLeft: "auto", fontSize: 10, backgroundColor: "#f3f4f6", color: "#9ca3af", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>Soon</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setOpenMenu(null);
                        if (action.key === "suspend") {
                          setConfirmSuspend({ id: menuChurch.id, name: menuChurch.name });
                        } else if (action.key === "mark_paid") {
                          setConfirmMarkPaid({ id: menuChurch.id, name: menuChurch.name });
                        } else if (action.key === "billing_controls") {
                          setBillingModal(menuChurch);
                        } else {
                          doAction(menuChurch.id, action.key);
                        }
                      }}
                      style={{ width: "100%", padding: "10px 16px", textAlign: "left", fontSize: 13, border: "none", backgroundColor: "white", cursor: "pointer", color: action.destructive ? "#dc2626" : "#374151", fontWeight: action.destructive ? 600 : 400, display: "flex", alignItems: "center", gap: 8 }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f9fafb"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "white"; }}
                    >
                      {action.label}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        );
      })()}

      {/* Billing Controls Modal */}
      {billingModal && token && (
        <BillingControlsModal
          church={billingModal}
          token={token}
          onClose={() => setBillingModal(null)}
          onSave={(updated) => {
            setChurches((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
            setBillingModal(null);
          }}
        />
      )}

      {/* Suspend Confirmation */}
      {confirmSuspend && (
        <ConfirmModal
          icon="🚫"
          title="Suspend Church?"
          body={<>This will suspend <strong style={{ color: "#111827" }}>{confirmSuspend.name}</strong>. Their access will be restricted immediately. You can reactivate them at any time.</>}
          confirmLabel="Yes, Suspend"
          confirmColor="#dc2626"
          onCancel={() => setConfirmSuspend(null)}
          onConfirm={() => { doAction(confirmSuspend.id, "suspend"); setConfirmSuspend(null); }}
        />
      )}

      {/* Mark Paid Confirmation */}
      {confirmMarkPaid && (
        <ConfirmModal
          icon="✅"
          title="Mark as Paid?"
          body={<>This will mark <strong style={{ color: "#111827" }}>{confirmMarkPaid.name}</strong> as a paid subscriber and set their status to <strong style={{ color: "#111827" }}>Paid / Active</strong>.</>}
          confirmLabel="Yes, Mark Paid"
          confirmColor="#16a34a"
          onCancel={() => setConfirmMarkPaid(null)}
          onConfirm={() => { doAction(confirmMarkPaid.id, "mark_paid"); setConfirmMarkPaid(null); }}
        />
      )}
    </AppShell>
  );
}
