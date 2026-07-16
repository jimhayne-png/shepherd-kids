"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/layout/AppShell";

const supabase = createClient();

// ── Design tokens ─────────────────────────────────────────────────────────────
const BG     = "#08060D";
const CARD   = "#120A1F";
const BORDER = "rgba(212,175,55,0.18)";
const GOLD   = "#D4AF37";
const PURPLE = "#7B2CBF";
const TEXT   = "#ffffff";
const MUTED  = "rgba(255,255,255,0.5)";

// ── Types ─────────────────────────────────────────────────────────────────────

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
  trial:         { label: "Active Trial",  bg: "rgba(59,130,246,0.15)",  color: "#93c5fd" },
  expired_trial: { label: "Expired Trial", bg: "rgba(239,68,68,0.15)",   color: "#f87171" },
  active:        { label: "Paid / Active", bg: "rgba(22,163,74,0.15)",   color: "#4ade80" },
  suspended:     { label: "Suspended",     bg: "rgba(107,114,128,0.15)", color: "#9ca3af" },
  none:          { label: "Unknown",       bg: "rgba(107,114,128,0.10)", color: "#6b7280" },
};

const TIER_MRR: Record<string, number> = {
  very_small: 97, small: 197, medium: 297, large: 497, enterprise: 997, paid: 197,
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
  { key: "all",           label: "All" },
  { key: "trial",         label: "Active Trial" },
  { key: "expired_trial", label: "Expired Trial" },
  { key: "active",        label: "Paid" },
  { key: "suspended",     label: "Suspended" },
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
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtDateInput(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

// ── Badge components ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: EffectiveStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span style={{ backgroundColor: cfg.bg, color: cfg.color, padding: "3px 10px", borderRadius: 9999, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
      {cfg.label}
    </span>
  );
}

function OverrideBadge() {
  return (
    <span style={{ backgroundColor: "rgba(251,191,36,0.15)", color: "#fbbf24", padding: "2px 7px", borderRadius: 9999, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", border: "1px solid rgba(251,191,36,0.3)" }}>
      Override
    </span>
  );
}

function DiscountBadge({ pct }: { pct: number }) {
  return (
    <span style={{ backgroundColor: "rgba(123,44,191,0.15)", color: "#c084fc", padding: "2px 7px", borderRadius: 9999, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", border: "1px solid rgba(123,44,191,0.3)" }}>
      {pct}% off
    </span>
  );
}

// ── Table styles ──────────────────────────────────────────────────────────────

const TH_STYLE: React.CSSProperties = {
  padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700,
  color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em",
  whiteSpace: "nowrap", backgroundColor: "rgba(0,0,0,0.3)", borderBottom: `1px solid ${BORDER}`,
};

const TD_STYLE: React.CSSProperties = {
  padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 13, verticalAlign: "middle",
};

// ── Modal shared styles ───────────────────────────────────────────────────────

const MODAL_LABEL: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 4,
};
const MODAL_INPUT: React.CSSProperties = {
  width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8,
  fontSize: 13, boxSizing: "border-box", color: "#111827", backgroundColor: "white",
};

// ── Billing Controls Modal ────────────────────────────────────────────────────

function BillingControlsModal({
  church, token, onClose, onSave,
}: {
  church: Church; token: string; onClose: () => void; onSave: (updated: Church) => void;
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
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        churchId: church.id, action: "set_billing_controls",
        overrideEnabled, overrideReason: overrideReason.trim() || null, overrideUntil: overrideUntil || null,
        discountPercent: pct, discountReason: discountReason.trim() || null, discountUntil: discountUntil || null,
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
    setDiscountPercent(""); setDiscountReason(""); setDiscountUntil("");
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", zIndex: 50, padding: 16, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}
    >
      <div
        style={{ backgroundColor: "white", borderRadius: 16, width: "100%", maxWidth: 480, padding: 32, boxShadow: "0 20px 60px rgba(0,0,0,0.4)", maxHeight: "90vh", overflowY: "auto" }}
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

        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 12px" }}>Billing Override</p>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 14 }}>
            <input type="checkbox" checked={overrideEnabled} onChange={(e) => setOverrideEnabled(e.target.checked)} style={{ width: 16, height: 16, cursor: "pointer" }} />
            <span style={{ fontSize: 14, color: "#111827", fontWeight: 600 }}>Enable billing override</span>
          </label>
          {overrideEnabled && (
            <p style={{ fontSize: 12, color: "#92400e", backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "8px 12px", margin: "0 0 14px" }}>
              Church will bypass all Stripe billing checks and retain full access.
            </p>
          )}
          <div style={{ marginBottom: 12 }}>
            <label style={MODAL_LABEL}>Reason / Internal Note</label>
            <textarea value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} rows={2} placeholder="e.g. Comp account, partnership, grace period" style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, resize: "vertical", boxSizing: "border-box", color: "#111827", backgroundColor: "white" }} />
          </div>
          <div>
            <label style={MODAL_LABEL}>Override expires (leave blank = never)</label>
            <input type="date" value={overrideUntil} onChange={(e) => setOverrideUntil(e.target.value)} style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, color: "#111827", backgroundColor: "white" }} />
          </div>
        </div>

        <div style={{ height: 1, backgroundColor: "#f3f4f6", margin: "0 0 24px" }} />

        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.07em", margin: 0 }}>Internal Discount</p>
            <button type="button" onClick={handleClearDiscount} style={{ fontSize: 12, color: "#9ca3af", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Clear discount</button>
          </div>
          <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 12px" }}>Stored for reference only. Does not automatically change Stripe pricing.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={MODAL_LABEL}>Discount %</label>
              <input type="number" min="0" max="100" value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} placeholder="e.g. 20" style={MODAL_INPUT} />
            </div>
            <div>
              <label style={MODAL_LABEL}>Discount Reason</label>
              <input type="text" value={discountReason} onChange={(e) => setDiscountReason(e.target.value)} placeholder="e.g. Partner church, referral" style={MODAL_INPUT} />
            </div>
          </div>
          <div>
            <label style={MODAL_LABEL}>Discount expires (leave blank = no expiry)</label>
            <input type="date" value={discountUntil} onChange={(e) => setDiscountUntil(e.target.value)} style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, color: "#111827", backgroundColor: "white" }} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 11, borderRadius: 10, border: "1px solid #e5e7eb", backgroundColor: "white", fontSize: 14, fontWeight: 500, color: "#374151", cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: 11, borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${PURPLE}, #9D4EDD)`, color: "white", fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────

function ConfirmModal({
  icon, title, body, confirmLabel, confirmColor, onCancel, onConfirm,
}: {
  icon: string; title: string; body: React.ReactNode;
  confirmLabel: string; confirmColor: string;
  onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <div
      style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.6)", zIndex: 50, padding: 16 }}
      onClick={onCancel}
    >
      <div
        style={{ backgroundColor: "white", borderRadius: 16, width: "100%", maxWidth: 420, padding: 32, boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 36, marginBottom: 12 }}>{icon}</div>
        <h2 style={{ fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 700, color: "#111827", margin: "0 0 10px" }}>{title}</h2>
        <div style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6, marginBottom: 24 }}>{body}</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: 11, borderRadius: 10, border: "1px solid #e5e7eb", backgroundColor: "white", fontSize: 14, fontWeight: 500, color: "#374151", cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={onConfirm} style={{ flex: 1, padding: 11, borderRadius: 10, border: "none", backgroundColor: confirmColor, color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
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
    const res = await fetch("/api/master-admin/subscriptions", { headers: { Authorization: `Bearer ${t}` } });
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

  const now = new Date();
  const activeTrialCount = churches.filter((c) => c.subscription_status === "trial" && c.trial_ends_at && new Date(c.trial_ends_at) > now).length;
  const paidCount        = churches.filter((c) => c.subscription_status === "active").length;
  const expiredCount     = churches.filter((c) => c.subscription_status === "trial" && (!c.trial_ends_at || new Date(c.trial_ends_at) <= now)).length;
  const suspendedCount   = churches.filter((c) => c.subscription_status === "suspended").length;
  const expiringIn7Count = churches.filter((c) => { const d = getDaysRemaining(c); return c.subscription_status === "trial" && d !== null && d >= 0 && d <= 7; }).length;
  const overrideCount    = churches.filter((c) => isOverrideActive(c.sub)).length;
  const estimatedMRR     = churches.filter((c) => c.subscription_status === "active").reduce((sum, c) => sum + getTierMRR(c.subscription_tier), 0);

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
        case "days_left": { const da = getDaysRemaining(a) ?? Infinity; const db = getDaysRemaining(b) ?? Infinity; return da - db; }
        default: return defaultSort(a, b);
      }
    });
  }, [churches, search, statusFilter, sortKey]);

  if (!loading && accessDenied) {
    return (
      <AppShell navItems={[]}>
        <div style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 26, fontWeight: 700, color: TEXT, margin: "0 0 10px", textAlign: "center" }}>Access Denied</h1>
          <p style={{ color: MUTED, fontSize: 14, textAlign: "center", maxWidth: 360 }}>You do not have permission to view this page. This area is restricted to master administrators only.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell navItems={[]}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0d0720 0%, #1a0f35 100%)", padding: "32px 40px", borderBottom: `1px solid ${BORDER}` }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 6px", opacity: 0.8 }}>Master Admin</p>
        <h1 style={{ color: TEXT, fontSize: 30, fontWeight: 700, fontFamily: "Georgia, serif", margin: "0 0 6px" }}>Subscription Management</h1>
        <p style={{ color: MUTED, fontSize: 14, margin: 0 }}>Manage subscriptions, trials, billing overrides, and discounts across ShepherdKids.</p>
      </div>

      <div style={{ minHeight: "100vh", background: BG, padding: "28px 32px" }}>
        {/* Summary cards */}
        {!loading && !pageError && !accessDenied && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Total Churches",    value: churches.length,               icon: "🏛️", color: TEXT },
              { label: "Active Trials",     value: activeTrialCount,              icon: "⏳", color: "#93c5fd" },
              { label: "Expired Trials",    value: expiredCount,                  icon: "⚠️", color: "#f87171" },
              { label: "Paid Churches",     value: paidCount,                     icon: "✅", color: "#4ade80" },
              { label: "Suspended",         value: suspendedCount,                icon: "🚫", color: "#9ca3af" },
              { label: "Expiring ≤ 7 Days", value: expiringIn7Count,              icon: "🔔", color: "#fbbf24" },
              { label: "Overrides Active",  value: overrideCount,                 icon: "🔓", color: "#c084fc" },
              { label: "Est. MRR",          value: "$" + estimatedMRR.toLocaleString(), icon: "💰", color: "#4ade80" },
            ].map((c) => (
              <div key={c.label} style={{ backgroundColor: CARD, borderRadius: 12, border: `1px solid ${BORDER}`, padding: "14px 18px" }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{c.icon}</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: c.color, lineHeight: 1 }}>{c.value}</div>
                <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{c.label}</div>
              </div>
            ))}
          </div>
        )}

        {loading && <div style={{ textAlign: "center", padding: "64px 0", color: MUTED, fontSize: 14 }}>Loading…</div>}

        {pageError && !loading && (
          <div style={{ borderRadius: 10, border: "1px solid rgba(239,68,68,0.3)", backgroundColor: "rgba(239,68,68,0.1)", color: "#f87171", fontWeight: 500, padding: "14px 20px", marginBottom: 16, fontSize: 13 }}>
            {pageError}
          </div>
        )}

        {actionError && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: 10, backgroundColor: "rgba(251,146,60,0.1)", border: "1px solid rgba(251,146,60,0.3)", padding: "10px 16px", color: "#fb923c", fontSize: 13, marginBottom: 16 }}>
            <span>{actionError}</span>
            <button onClick={() => setActionError("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#fb923c", fontWeight: 700, fontSize: 16, lineHeight: 1 }}>×</button>
          </div>
        )}

        {/* Search + Filter + Sort */}
        {!loading && !pageError && !accessDenied && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
            <input
              type="text"
              placeholder="Search church, city, email, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%", padding: "10px 16px", borderRadius: 10, border: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.05)", color: TEXT, fontSize: 13, outline: "none", boxSizing: "border-box" }}
            />

            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {STATUS_FILTERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setStatusFilter(f.key)}
                    style={{
                      padding: "5px 14px", borderRadius: 9999, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.1s", border: "1px solid",
                      borderColor: statusFilter === f.key ? PURPLE : BORDER,
                      backgroundColor: statusFilter === f.key ? "rgba(123,44,191,0.3)" : "transparent",
                      color: statusFilter === f.key ? TEXT : MUTED,
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: MUTED, fontWeight: 500, whiteSpace: "nowrap" }}>Sort:</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {SORT_OPTIONS.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => setSortKey(s.key)}
                      style={{
                        padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "all 0.1s", border: "1px solid",
                        borderColor: sortKey === s.key ? GOLD : BORDER,
                        backgroundColor: sortKey === s.key ? "rgba(212,175,55,0.1)" : "transparent",
                        color: sortKey === s.key ? GOLD : MUTED,
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
          <div style={{ background: CARD, borderRadius: 16, border: `1px solid ${BORDER}`, overflow: "hidden" }}>
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
                      <td colSpan={9} style={{ ...TD_STYLE, padding: 48, textAlign: "center", color: MUTED, borderBottom: "none" }}>
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
                      <tr key={church.id} style={{ backgroundColor: isActing ? "rgba(255,255,255,0.03)" : "transparent" }}>
                        <td style={{ ...TD_STYLE, fontWeight: 700, color: TEXT, whiteSpace: "nowrap" }}>{church.name}</td>
                        <td style={{ ...TD_STYLE, color: MUTED, whiteSpace: "nowrap" }}>
                          {[church.city, church.state].filter(Boolean).join(", ") || "—"}
                        </td>
                        <td style={{ ...TD_STYLE, color: MUTED }}>
                          {church.email ? (
                            <a href={`mailto:${church.email}`} style={{ color: GOLD, textDecoration: "none" }}>{church.email}</a>
                          ) : "—"}
                        </td>
                        <td style={TD_STYLE}><StatusBadge status={status} /></td>
                        <td style={{ ...TD_STYLE, whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {overrideOn && <OverrideBadge />}
                            {discountOn && church.sub?.discount_percent != null && <DiscountBadge pct={church.sub.discount_percent} />}
                            {!overrideOn && !discountOn && <span style={{ color: "rgba(255,255,255,0.2)" }}>—</span>}
                          </div>
                        </td>
                        <td style={{ ...TD_STYLE, color: MUTED, whiteSpace: "nowrap" }}>{fmtDate(church.trial_ends_at)}</td>
                        <td style={{ ...TD_STYLE, whiteSpace: "nowrap" }}>
                          {days === null ? (
                            <span style={{ color: MUTED }}>—</span>
                          ) : days === 0 ? (
                            <span style={{ color: "#fbbf24", fontWeight: 700 }}>0d</span>
                          ) : days < 0 ? (
                            <span style={{ color: "#f87171", fontWeight: 700 }}>{days}d</span>
                          ) : (
                            <span style={{ color: days <= 7 ? "#fbbf24" : "#4ade80", fontWeight: 600 }}>{days}d</span>
                          )}
                        </td>
                        <td style={{ ...TD_STYLE, color: "rgba(255,255,255,0.3)", whiteSpace: "nowrap" }}>{fmtDate(church.created_at)}</td>
                        <td style={TD_STYLE}>
                          {isActing ? (
                            <span style={{ color: MUTED, fontSize: 12 }}>Working…</span>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (openMenu?.id === church.id) { setOpenMenu(null); return; }
                                const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                                setOpenMenu({ id: church.id, right: window.innerWidth - rect.right, top: rect.bottom + 4 });
                              }}
                              style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, backgroundColor: openMenu?.id === church.id ? "rgba(255,255,255,0.08)" : "transparent", cursor: "pointer", fontSize: 13, fontWeight: 500, color: MUTED, whiteSpace: "nowrap" }}
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
            <div style={{ display: "flex", alignItems: "center", fontSize: 12, color: MUTED, padding: "10px 14px", borderTop: `1px solid ${BORDER}` }}>
              Showing <strong style={{ color: TEXT, margin: "0 4px" }}>{displayed.length}</strong> of{" "}
              <strong style={{ color: TEXT, margin: "0 4px" }}>{churches.length}</strong>{" "}
              {churches.length === 1 ? "church" : "churches"}
            </div>
          </div>
        )}
      </div>

      {/* Fixed-position dropdown */}
      {openMenu && (() => {
        const menuChurch = churches.find((c) => c.id === openMenu.id);
        if (!menuChurch) return null;
        return (
          <>
            <div style={{ position: "fixed", inset: 0, zIndex: 9998 }} onClick={() => setOpenMenu(null)} />
            <div
              style={{ position: "fixed", right: openMenu.right, top: openMenu.top, zIndex: 9999, backgroundColor: "#1a1030", border: `1px solid ${BORDER}`, borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.5)", minWidth: 240, overflow: "hidden" }}
              onClick={(e) => e.stopPropagation()}
            >
              {ACTIONS.map((action, i) => (
                <div key={action.key}>
                  {i === 6 && <div style={{ height: 1, backgroundColor: BORDER, margin: "2px 0" }} />}
                  {i === 7 && <div style={{ height: 1, backgroundColor: BORDER, margin: "2px 0" }} />}

                  {action.href ? (
                    <a
                      href={action.href(menuChurch.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setOpenMenu(null)}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", fontSize: 13, color: TEXT, textDecoration: "none", backgroundColor: "transparent", boxSizing: "border-box", width: "100%" }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                    >
                      {action.label}
                    </a>
                  ) : action.disabled ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", fontSize: 13, color: "rgba(255,255,255,0.25)", cursor: "not-allowed" }}>
                      {action.label}
                      <span style={{ marginLeft: "auto", fontSize: 10, backgroundColor: "rgba(255,255,255,0.08)", color: MUTED, padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>Soon</span>
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
                      style={{ width: "100%", padding: "10px 16px", textAlign: "left", fontSize: 13, border: "none", backgroundColor: "transparent", cursor: "pointer", color: action.destructive ? "#f87171" : TEXT, fontWeight: action.destructive ? 600 : 400, display: "flex", alignItems: "center", gap: 8 }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
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
          onSave={(updated) => { setChurches((prev) => prev.map((c) => (c.id === updated.id ? updated : c))); setBillingModal(null); }}
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
