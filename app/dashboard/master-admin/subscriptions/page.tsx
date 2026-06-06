"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/layout/AppShell";

const supabase = createClient();
const DARK_GREEN = "#1A4A2E";

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
};

type EffectiveStatus = "trial" | "expired_trial" | "active" | "suspended" | "none";

const STATUS_CONFIG: Record<EffectiveStatus, { label: string; bg: string; color: string }> = {
  trial:         { label: "Active Trial",  bg: "#dbeafe", color: "#1d4ed8" },
  expired_trial: { label: "Expired Trial", bg: "#fee2e2", color: "#dc2626" },
  active:        { label: "Paid / Active", bg: "#dcfce7", color: "#16a34a" },
  suspended:     { label: "Suspended",     bg: "#f3f4f6", color: "#6b7280" },
  none:          { label: "Unknown",       bg: "#f9fafb", color: "#9ca3af" },
};

const ACTIONS: { key: string; label: string; destructive?: boolean; confirm?: boolean }[] = [
  { key: "reset_trial_30",   label: "🔄 Reset Trial (30 days)" },
  { key: "extend_trial_7",   label: "⏩ Extend Trial +7 days" },
  { key: "extend_trial_30",  label: "⏩ Extend Trial +30 days" },
  { key: "mark_paid",        label: "✅ Mark Paid", confirm: true },
  { key: "suspend",          label: "🚫 Suspend", destructive: true, confirm: true },
  { key: "reactivate_trial", label: "↩️ Reactivate Trial" },
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

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

function SummaryCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: string;
  color: string;
}) {
  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        padding: "16px 20px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{label}</div>
    </div>
  );
}

const TH_STYLE: React.CSSProperties = {
  padding: "11px 14px",
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
  padding: "11px 14px",
  borderBottom: "1px solid #f3f4f6",
  fontSize: 13,
  verticalAlign: "middle",
};

export default function SubscriptionsPage() {
  const [churches, setChurches] = useState<Church[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  const [confirmSuspend, setConfirmSuspend] = useState<{ id: string; name: string } | null>(null);
  const [confirmMarkPaid, setConfirmMarkPaid] = useState<{ id: string; name: string } | null>(null);

  async function load(t: string) {
    setPageError("");
    setAccessDenied(false);
    const res = await fetch("/api/master-admin/subscriptions", {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (res.status === 403) {
      setAccessDenied(true);
      return;
    }
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
      if (!user || authErr) {
        setPageError("Not authenticated.");
        setLoading(false);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setPageError("No session found.");
        setLoading(false);
        return;
      }
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
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ churchId, action }),
    });

    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setActionError((d as { error?: string }).error ?? "Action failed. Please try again.");
    } else {
      const d = await res.json();
      setChurches((prev) =>
        prev.map((c) => (c.id === churchId ? (d as { church: Church }).church : c)),
      );
    }
    setActionLoading(null);
  }

  // Summary counts
  const now = new Date();
  const activeTrialCount = churches.filter(
    (c) => c.subscription_status === "trial" && c.trial_ends_at && new Date(c.trial_ends_at) > now,
  ).length;
  const paidCount = churches.filter((c) => c.subscription_status === "active").length;
  const expiredCount = churches.filter(
    (c) =>
      c.subscription_status === "trial" &&
      (!c.trial_ends_at || new Date(c.trial_ends_at) <= now),
  ).length;
  const suspendedCount = churches.filter((c) => c.subscription_status === "suspended").length;

  // Access denied state
  if (!loading && accessDenied) {
    return (
      <AppShell navItems={[]}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
          <div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div>
          <h1
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 26,
              fontWeight: 700,
              color: "#111827",
              margin: "0 0 10px",
              textAlign: "center",
            }}
          >
            Access Denied
          </h1>
          <p className="text-gray-500 text-sm text-center max-w-sm">
            You do not have permission to view this page. This area is restricted to master
            administrators only.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell navItems={[]}>
      {/* Header */}
      <div
        style={{
          background: `linear-gradient(135deg, ${DARK_GREEN} 0%, #2D6B42 100%)`,
          padding: "32px 40px",
        }}
      >
        <p className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: "#86efac" }}>
          Master Admin
        </p>
        <h1
          style={{
            color: "white",
            fontSize: 32,
            fontWeight: 700,
            fontFamily: "Georgia, serif",
            margin: "0 0 8px",
          }}
        >
          Subscription Management
        </h1>
        <p style={{ color: "#bbf7d0", fontSize: 14, margin: 0 }}>
          Manage church trials, paid subscriptions, and account access.
        </p>
      </div>

      <div
        className="min-h-screen bg-gray-50"
        style={{ padding: "28px 32px" }}
      >
        {/* Summary cards */}
        {!loading && !pageError && !accessDenied && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: 14,
              marginBottom: 24,
            }}
          >
            <SummaryCard label="Total Churches"  value={churches.length}  icon="🏛️" color="#374151" />
            <SummaryCard label="Active Trials"   value={activeTrialCount} icon="⏳" color="#1d4ed8" />
            <SummaryCard label="Paid Churches"   value={paidCount}        icon="✅" color="#16a34a" />
            <SummaryCard label="Expired Trials"  value={expiredCount}     icon="⚠️" color="#dc2626" />
            <SummaryCard label="Suspended"       value={suspendedCount}   icon="🚫" color="#9ca3af" />
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-16 text-gray-400">Loading…</div>
        )}

        {/* Page error */}
        {pageError && !loading && (
          <div
            className="rounded-xl border border-red-300 bg-red-50 text-red-700 font-medium"
            style={{ padding: "14px 20px" }}
          >
            {pageError}
          </div>
        )}

        {/* Action error (dismissible) */}
        {actionError && (
          <div
            className="rounded-xl flex items-center justify-between"
            style={{
              backgroundColor: "#fff7ed",
              border: "1px solid #fdba74",
              padding: "10px 16px",
              color: "#c2410c",
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            <span>{actionError}</span>
            <button
              onClick={() => setActionError("")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#c2410c",
                fontWeight: 700,
                fontSize: 16,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* Table */}
        {!loading && !pageError && !accessDenied && (
          <div
            className="bg-white rounded-2xl border border-gray-200"
            style={{ overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}
          >
            {openMenu && (
              <div
                style={{ position: "fixed", inset: 0, zIndex: 10 }}
                onClick={() => setOpenMenu(null)}
              />
            )}

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {[
                      "Church",
                      "City / State",
                      "Email",
                      "Phone",
                      "Status",
                      "Tier",
                      "Trial Ends",
                      "Days Left",
                      "Created",
                      "Actions",
                    ].map((h) => (
                      <th key={h} style={TH_STYLE}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {churches.length === 0 && (
                    <tr>
                      <td
                        colSpan={10}
                        className="text-center text-gray-400"
                        style={{ ...TD_STYLE, padding: 48 }}
                      >
                        No churches found.
                      </td>
                    </tr>
                  )}

                  {churches.map((church) => {
                    const status = getEffectiveStatus(church);
                    const days = getDaysRemaining(church);
                    const isActing = actionLoading === church.id;
                    const menuOpen = openMenu === church.id;

                    return (
                      <tr
                        key={church.id}
                        style={{
                          backgroundColor: isActing ? "#fafafa" : "white",
                          transition: "background-color 0.1s",
                        }}
                      >
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
                            <a
                              href={`mailto:${church.email}`}
                              style={{ color: "#2563eb", textDecoration: "none" }}
                            >
                              {church.email}
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>

                        {/* Phone */}
                        <td style={{ ...TD_STYLE, color: "#6b7280", whiteSpace: "nowrap" }}>
                          {church.phone || "—"}
                        </td>

                        {/* Status */}
                        <td style={TD_STYLE}>
                          <StatusBadge status={status} />
                        </td>

                        {/* Tier */}
                        <td style={{ ...TD_STYLE, color: "#6b7280" }}>
                          {church.subscription_tier || "—"}
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
                            <span
                              style={{
                                color: days <= 7 ? "#f59e0b" : "#16a34a",
                                fontWeight: 600,
                              }}
                            >
                              {days}d
                            </span>
                          )}
                        </td>

                        {/* Created */}
                        <td style={{ ...TD_STYLE, color: "#9ca3af", whiteSpace: "nowrap" }}>
                          {fmtDate(church.created_at)}
                        </td>

                        {/* Actions */}
                        <td style={{ ...TD_STYLE, position: "relative" }}>
                          {isActing ? (
                            <span style={{ color: "#9ca3af", fontSize: 12 }}>Working…</span>
                          ) : (
                            <div style={{ position: "relative", display: "inline-block" }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenu(menuOpen ? null : church.id);
                                }}
                                style={{
                                  padding: "6px 12px",
                                  borderRadius: 8,
                                  border: "1px solid #e5e7eb",
                                  backgroundColor: menuOpen ? "#f3f4f6" : "white",
                                  cursor: "pointer",
                                  fontSize: 13,
                                  fontWeight: 500,
                                  color: "#374151",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                Actions ▾
                              </button>

                              {menuOpen && (
                                <div
                                  style={{
                                    position: "absolute",
                                    right: 0,
                                    top: "calc(100% + 4px)",
                                    zIndex: 20,
                                    backgroundColor: "white",
                                    border: "1px solid #e5e7eb",
                                    borderRadius: 10,
                                    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                                    minWidth: 210,
                                    overflow: "hidden",
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {ACTIONS.map((action, i) => (
                                    <button
                                      key={action.key}
                                      onClick={() => {
                                        setOpenMenu(null);
                                        if (action.key === "suspend") {
                                          setConfirmSuspend({ id: church.id, name: church.name });
                                        } else if (action.key === "mark_paid") {
                                          setConfirmMarkPaid({ id: church.id, name: church.name });
                                        } else {
                                          doAction(church.id, action.key);
                                        }
                                      }}
                                      style={{
                                        width: "100%",
                                        padding: "10px 16px",
                                        textAlign: "left",
                                        fontSize: 13,
                                        border: "none",
                                        borderBottom:
                                          i < ACTIONS.length - 1 ? "1px solid #f3f4f6" : "none",
                                        backgroundColor: "white",
                                        cursor: "pointer",
                                        color: action.destructive ? "#dc2626" : "#374151",
                                        fontWeight: action.destructive ? 600 : 400,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = "#f9fafb";
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = "white";
                                      }}
                                    >
                                      {action.label}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {churches.length > 0 && (
              <div
                className="text-xs text-gray-400 text-right"
                style={{
                  padding: "10px 14px",
                  borderTop: "1px solid #f3f4f6",
                }}
              >
                {churches.length} {churches.length === 1 ? "church" : "churches"}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Suspend Confirmation Modal */}
      {confirmSuspend && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.50)", zIndex: 50, padding: 16 }}
          onClick={() => setConfirmSuspend(null)}
        >
          <div
            className="bg-white rounded-2xl w-full"
            style={{ maxWidth: 420, padding: 32, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>🚫</div>
            <h2
              style={{
                fontFamily: "Georgia, serif",
                fontSize: 20,
                fontWeight: 700,
                color: "#111827",
                margin: "0 0 10px",
              }}
            >
              Suspend Church?
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              This will suspend{" "}
              <strong className="text-gray-900">{confirmSuspend.name}</strong>. Their access will
              be restricted immediately. You can reactivate them at any time.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmSuspend(null)}
                className="flex-1 rounded-xl border border-gray-200 bg-white font-medium text-gray-700 cursor-pointer"
                style={{ padding: "11px", fontSize: 14 }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  doAction(confirmSuspend.id, "suspend");
                  setConfirmSuspend(null);
                }}
                className="flex-1 rounded-xl border-none text-white font-bold cursor-pointer"
                style={{ padding: "11px", backgroundColor: "#dc2626", fontSize: 14 }}
              >
                Yes, Suspend
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark Paid Confirmation Modal */}
      {confirmMarkPaid && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.50)", zIndex: 50, padding: 16 }}
          onClick={() => setConfirmMarkPaid(null)}
        >
          <div
            className="bg-white rounded-2xl w-full"
            style={{ maxWidth: 420, padding: 32, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
            <h2
              style={{
                fontFamily: "Georgia, serif",
                fontSize: 20,
                fontWeight: 700,
                color: "#111827",
                margin: "0 0 10px",
              }}
            >
              Mark as Paid?
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              This will mark{" "}
              <strong className="text-gray-900">{confirmMarkPaid.name}</strong> as a paid
              subscriber and set their status to <strong className="text-gray-900">Paid / Active</strong>.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmMarkPaid(null)}
                className="flex-1 rounded-xl border border-gray-200 bg-white font-medium text-gray-700 cursor-pointer"
                style={{ padding: "11px", fontSize: 14 }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  doAction(confirmMarkPaid.id, "mark_paid");
                  setConfirmMarkPaid(null);
                }}
                className="flex-1 rounded-xl border-none text-white font-bold cursor-pointer"
                style={{ padding: "11px", backgroundColor: "#16a34a", fontSize: 14 }}
              >
                Yes, Mark Paid
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
