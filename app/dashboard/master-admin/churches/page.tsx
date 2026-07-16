"use client";

import { useEffect, useState } from "react";
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

type Church = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  email: string | null;
  phone: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
  created_at: string;
  admin: { userId: string; email: string | null; passwordSet: boolean } | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function statusColor(status: string | null) {
  switch (status) {
    case "active":    return { bg: "rgba(22,163,74,0.15)",   color: "#4ade80" };
    case "trial":     return { bg: "rgba(59,130,246,0.15)",  color: "#93c5fd" };
    case "suspended": return { bg: "rgba(239,68,68,0.15)",   color: "#f87171" };
    default:          return { bg: "rgba(107,114,128,0.15)", color: "#9ca3af" };
  }
}

function StatusPill({ status }: { status: string | null }) {
  const { bg, color } = statusColor(status);
  return (
    <span style={{ backgroundColor: bg, color, padding: "3px 10px", borderRadius: 9999, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
      {status ?? "unknown"}
    </span>
  );
}

// ── Shared table styles ───────────────────────────────────────────────────────

const TH: React.CSSProperties = {
  padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700,
  color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em",
  whiteSpace: "nowrap", backgroundColor: "rgba(0,0,0,0.3)", borderBottom: `1px solid ${BORDER}`,
};
const TD: React.CSSProperties = {
  padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 13, verticalAlign: "middle",
};

// ── Modal shared styles ───────────────────────────────────────────────────────

const MODAL_INPUT: React.CSSProperties = {
  width: "100%", padding: "9px 12px", border: "1px solid #d1d5db",
  borderRadius: 8, fontSize: 13, boxSizing: "border-box",
  color: "#111827", backgroundColor: "white",
};
const MODAL_LABEL: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4,
};
const MODAL_SECTION: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: PURPLE, textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 12px",
};

// ── Create Church Modal ───────────────────────────────────────────────────────

type CreateForm = {
  churchName: string;
  city: string;
  state: string;
  adminFirst: string;
  adminLast: string;
  adminEmail: string;
  phone: string;
};

function CreateChurchModal({
  token,
  onClose,
  onCreated,
}: {
  token: string;
  onClose: () => void;
  onCreated: (church: Church, inviteLink: string | null) => void;
}) {
  const [form, setForm] = useState<CreateForm>({
    churchName: "", city: "", state: "", adminFirst: "", adminLast: "", adminEmail: "", phone: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(k: keyof CreateForm, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.churchName.trim()) { setError("Church name is required."); return; }
    if (!form.adminEmail.trim()) { setError("Admin email is required."); return; }

    setSaving(true);
    setError("");

    const res = await fetch("/api/master-admin/churches", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError((data as { error?: string }).error ?? "Failed to create church.");
      setSaving(false);
      return;
    }

    const d = data as { church_id: string; invite_link?: string | null };

    const newChurch: Church = {
      id: d.church_id,
      name: form.churchName.trim(),
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      email: form.adminEmail.trim(),
      phone: form.phone.trim() || null,
      subscription_status: "trial",
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      admin: { userId: "", email: form.adminEmail.trim(), passwordSet: false },
    };

    onCreated(newChurch, d.invite_link ?? null);
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ backgroundColor: "white", borderRadius: 16, width: "100%", maxWidth: 520, padding: 32, boxShadow: "0 20px 60px rgba(0,0,0,0.4)", maxHeight: "90vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 700, color: "#111827", margin: "0 0 20px" }}>
          Create New Church
        </h2>

        {error && (
          <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", color: "#dc2626", fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <p style={MODAL_SECTION}>Church Info</p>
            <div style={{ marginBottom: 12 }}>
              <label style={MODAL_LABEL}>Church Name *</label>
              <input style={MODAL_INPUT} value={form.churchName} onChange={(e) => update("churchName", e.target.value)} placeholder="Grace Community Church" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={MODAL_LABEL}>City</label>
                <input style={MODAL_INPUT} value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="Nashville" />
              </div>
              <div>
                <label style={MODAL_LABEL}>State</label>
                <input style={MODAL_INPUT} value={form.state} onChange={(e) => update("state", e.target.value)} placeholder="TN" />
              </div>
            </div>
            <div>
              <label style={MODAL_LABEL}>Phone</label>
              <input style={MODAL_INPUT} value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="(615) 555-0100" />
            </div>
          </div>

          <div style={{ height: 1, backgroundColor: "#f3f4f6", margin: "0 0 20px" }} />

          <div style={{ marginBottom: 24 }}>
            <p style={MODAL_SECTION}>Admin Account</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={MODAL_LABEL}>First Name</label>
                <input style={MODAL_INPUT} value={form.adminFirst} onChange={(e) => update("adminFirst", e.target.value)} placeholder="Sarah" />
              </div>
              <div>
                <label style={MODAL_LABEL}>Last Name</label>
                <input style={MODAL_INPUT} value={form.adminLast} onChange={(e) => update("adminLast", e.target.value)} placeholder="Johnson" />
              </div>
            </div>
            <div>
              <label style={MODAL_LABEL}>Admin Email *</label>
              <input style={MODAL_INPUT} type="email" value={form.adminEmail} onChange={(e) => update("adminEmail", e.target.value)} placeholder="sarah@gracecc.org" />
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ flex: 1, padding: 11, borderRadius: 10, border: "1px solid #e5e7eb", backgroundColor: "white", fontSize: 14, fontWeight: 500, color: "#374151", cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{ flex: 2, padding: 11, borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${PURPLE}, #9D4EDD)`, color: "white", fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
            >
              {saving ? "Creating…" : "Create Church"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Invite Link Modal ─────────────────────────────────────────────────────────

function InviteLinkModal({ link, email, onClose }: { link: string; email: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ backgroundColor: "white", borderRadius: 16, width: "100%", maxWidth: 480, padding: 32, boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 36, marginBottom: 12 }}>🔗</div>
        <h2 style={{ fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 700, color: "#111827", margin: "0 0 8px" }}>
          Account Setup Link
        </h2>
        <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 16px" }}>
          Share this link with <strong style={{ color: "#111827" }}>{email}</strong> so they can set their password and log in.
        </p>
        <div style={{ backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 12px", marginBottom: 16, wordBreak: "break-all", fontSize: 12, color: "#374151", lineHeight: 1.5 }}>
          {link}
        </div>
        <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 20px" }}>
          Use <strong>Send Password Setup Email</strong> from the Actions menu to email this link directly to the admin.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={copy}
            style={{ flex: 1, padding: 11, borderRadius: 10, border: "none", background: copied ? "rgba(22,163,74,0.9)" : `linear-gradient(135deg, ${PURPLE}, #9D4EDD)`, color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "background 0.2s" }}
          >
            {copied ? "✓ Copied!" : "Copy Link"}
          </button>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: 11, borderRadius: 10, border: "1px solid #e5e7eb", backgroundColor: "white", fontSize: 14, fontWeight: 500, color: "#374151", cursor: "pointer" }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────

function ConfirmModal({
  icon, title, body, confirmLabel, confirmColor, onCancel, onConfirm, working,
}: {
  icon: string; title: string; body: React.ReactNode;
  confirmLabel: string; confirmColor: string;
  onCancel: () => void; onConfirm: () => void; working?: boolean;
}) {
  return (
    <div
      style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
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
          <button
            onClick={onConfirm}
            disabled={working}
            style={{ flex: 1, padding: 11, borderRadius: 10, border: "none", backgroundColor: confirmColor, color: "white", fontSize: 14, fontWeight: 700, cursor: working ? "not-allowed" : "pointer", opacity: working ? 0.7 : 1 }}
          >
            {working ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ChurchManagementPage() {
  const [churches, setChurches] = useState<Church[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [openMenu, setOpenMenu] = useState<{ id: string; right: number; top: number } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [inviteModal, setInviteModal] = useState<{ link: string; email: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Church | null>(null);
  const [confirmWorking, setConfirmWorking] = useState(false);

  async function load(t: string) {
    setPageError("");
    const res = await fetch("/api/master-admin/churches", {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (res.status === 403) { setAccessDenied(true); return; }
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setPageError((d as { error?: string }).error ?? "Failed to load.");
      return;
    }
    const d = await res.json();
    setChurches(d.churches ?? []);
  }

  useEffect(() => {
    async function init() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!user || error) { setPageError("Not authenticated."); setLoading(false); return; }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setPageError("No session."); setLoading(false); return; }
      setToken(session.access_token);
      await load(session.access_token);
      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function showSuccess(msg: string) {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 5000);
  }

  async function doAction(churchId: string, action: string) {
    if (!token) return;
    setActionLoading(churchId);
    setActionError("");
    setOpenMenu(null);

    if (action === "send-setup-email" || action === "reset-password") {
      const res = await fetch("/api/master-admin/churches", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ churchId, action }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError((d as { error?: string }).error ?? "Failed.");
      } else {
        const data = d as { email: string };
        showSuccess(
          action === "send-setup-email"
            ? `Setup email sent to ${data.email}.`
            : `Password reset email sent to ${data.email}.`
        );
      }
      setActionLoading(null);
      return;
    }

    const res = await fetch("/api/master-admin/churches", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ churchId, action }),
    });

    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setActionError((d as { error?: string }).error ?? "Action failed.");
    } else {
      await load(token);
    }
    setActionLoading(null);
  }

  async function doDelete(churchId: string) {
    if (!token) return;
    setConfirmWorking(true);
    const res = await fetch(`/api/master-admin/churches?churchId=${churchId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setConfirmWorking(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setActionError((d as { error?: string }).error ?? "Delete failed.");
    } else {
      setChurches((prev) => prev.filter((c) => c.id !== churchId));
    }
    setConfirmDelete(null);
  }

  const displayed = churches.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [c.name, c.city, c.state, c.email, c.admin?.email]
      .some((v) => v?.toLowerCase().includes(q));
  });

  const activeTrials = churches.filter((c) => c.subscription_status === "trial" && c.trial_ends_at && new Date(c.trial_ends_at) > new Date()).length;
  const suspended = churches.filter((c) => c.subscription_status === "suspended").length;
  const active = churches.filter((c) => c.subscription_status === "active").length;

  if (!loading && accessDenied) {
    return (
      <AppShell navItems={[]}>
        <div style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 26, fontWeight: 700, color: TEXT, margin: "0 0 10px" }}>Access Denied</h1>
          <p style={{ color: MUTED, fontSize: 14, textAlign: "center", maxWidth: 360 }}>This area is restricted to master administrators only.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell navItems={[]}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0d0720 0%, #1a0f35 100%)", padding: "32px 40px", borderBottom: `1px solid ${BORDER}` }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 6px", opacity: 0.8 }}>Master Admin</p>
        <h1 style={{ color: TEXT, fontSize: 30, fontWeight: 700, fontFamily: "Georgia, serif", margin: "0 0 6px" }}>
          Church Management
        </h1>
        <p style={{ color: MUTED, fontSize: 14, margin: 0 }}>
          Create and manage churches, admin accounts, and access.
        </p>
      </div>

      <div style={{ minHeight: "100vh", background: BG, padding: "28px 32px" }}>
        {/* Summary cards */}
        {!loading && !pageError && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Total Churches", value: churches.length, icon: "🏛️", color: TEXT },
              { label: "Active Trials",  value: activeTrials,    icon: "⏳", color: "#93c5fd" },
              { label: "Paid",           value: active,          icon: "✅", color: "#4ade80" },
              { label: "Suspended",      value: suspended,       icon: "🚫", color: "#f87171" },
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
          <div style={{ borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(251,146,60,0.1)", border: "1px solid rgba(251,146,60,0.3)", padding: "10px 16px", color: "#fb923c", fontSize: 13, marginBottom: 16 }}>
            <span>{actionError}</span>
            <button onClick={() => setActionError("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#fb923c", fontWeight: 700, fontSize: 16 }}>×</button>
          </div>
        )}

        {actionSuccess && (
          <div style={{ borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(22,163,74,0.1)", border: "1px solid rgba(22,163,74,0.25)", padding: "10px 16px", color: "#4ade80", fontSize: 13, marginBottom: 16 }}>
            <span>{actionSuccess}</span>
            <button onClick={() => setActionSuccess(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#4ade80", fontWeight: 700, fontSize: 16 }}>×</button>
          </div>
        )}

        {!loading && !pageError && (
          <>
            {/* Toolbar */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <input
                type="text"
                placeholder="Search churches, email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ flex: 1, padding: "10px 16px", borderRadius: 10, border: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.05)", color: TEXT, fontSize: 13, outline: "none" }}
              />
              <button
                onClick={() => setShowCreate(true)}
                style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${PURPLE}, #9D4EDD)`, color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
              >
                + Create Church
              </button>
            </div>

            {/* Table */}
            <div style={{ background: CARD, borderRadius: 16, border: `1px solid ${BORDER}`, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Church", "City / State", "Admin Email", "Status", "Trial Ends", "Created", ""].map((h, i) => (
                        <th key={i} style={TH}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayed.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ ...TD, padding: 48, textAlign: "center", color: MUTED, borderBottom: "none" }}>
                          {churches.length === 0 ? "No churches yet. Click + Create Church to add one." : "No churches match your search."}
                        </td>
                      </tr>
                    )}
                    {displayed.map((church) => {
                      const isActing = actionLoading === church.id;
                      return (
                        <tr key={church.id} style={{ backgroundColor: isActing ? "rgba(255,255,255,0.03)" : "transparent" }}>
                          <td style={{ ...TD, fontWeight: 700, color: TEXT, whiteSpace: "nowrap" }}>{church.name}</td>
                          <td style={{ ...TD, color: MUTED, whiteSpace: "nowrap" }}>
                            {[church.city, church.state].filter(Boolean).join(", ") || "—"}
                          </td>
                          <td style={{ ...TD, color: MUTED }}>
                            {church.admin?.email ? (
                              <a href={`mailto:${church.admin.email}`} style={{ color: GOLD, textDecoration: "none" }}>
                                {church.admin.email}
                              </a>
                            ) : "—"}
                          </td>
                          <td style={TD}><StatusPill status={church.subscription_status} /></td>
                          <td style={{ ...TD, color: MUTED, whiteSpace: "nowrap" }}>{fmtDate(church.trial_ends_at)}</td>
                          <td style={{ ...TD, color: "rgba(255,255,255,0.3)", whiteSpace: "nowrap" }}>{fmtDate(church.created_at)}</td>
                          <td style={TD}>
                            {isActing ? (
                              <span style={{ color: MUTED, fontSize: 12 }}>Working…</span>
                            ) : (
                              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                <button
                                  onClick={() => {
                                    localStorage.setItem("selected_church_id", church.id);
                                    window.location.href = `/dashboard?churchId=${church.id}`;
                                  }}
                                  style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: `linear-gradient(135deg, ${PURPLE}, #9D4EDD)`, color: "white", cursor: "pointer", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}
                                >
                                  View Church
                                </button>
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
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ display: "flex", alignItems: "center", fontSize: 12, color: MUTED, padding: "10px 14px", borderTop: `1px solid ${BORDER}` }}>
                Showing <strong style={{ color: TEXT, margin: "0 4px" }}>{displayed.length}</strong> of <strong style={{ color: TEXT, margin: "0 4px" }}>{churches.length}</strong> churches
              </div>
            </div>
          </>
        )}
      </div>

      {/* Fixed-position dropdown */}
      {openMenu && (() => {
        const c = churches.find((x) => x.id === openMenu.id);
        if (!c) return null;
        const needsSetup = c.admin && !c.admin.passwordSet;

        type Item = { label: string; action: string; destructive?: boolean };
        const items: Item[] = [
          ...(needsSetup ? [{ label: "✉️ Send Password Setup Email", action: "send-setup-email" }] : []),
          { label: "🔑 Reset Password", action: "reset-password" },
          { label: "🗑️ Delete Church", action: "delete", destructive: true },
        ];

        return (
          <>
            <div style={{ position: "fixed", inset: 0, zIndex: 9998 }} onClick={() => setOpenMenu(null)} />
            <div
              style={{ position: "fixed", right: openMenu.right, top: openMenu.top, zIndex: 9999, backgroundColor: "#1a1030", border: `1px solid ${BORDER}`, borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.5)", minWidth: 220, overflow: "hidden" }}
              onClick={(e) => e.stopPropagation()}
            >
              {items.map((item, i) => {
                const isDeleteItem = item.action === "delete";
                return (
                  <div key={i}>
                    {isDeleteItem && <div style={{ height: 1, backgroundColor: BORDER, margin: "2px 0" }} />}
                    <button
                      onClick={() => {
                        setOpenMenu(null);
                        if (item.action === "delete") setConfirmDelete(c);
                        else doAction(c.id, item.action);
                      }}
                      style={{ width: "100%", padding: "10px 16px", textAlign: "left", fontSize: 13, border: "none", backgroundColor: "transparent", cursor: "pointer", color: item.destructive ? "#f87171" : TEXT, fontWeight: item.destructive ? 600 : 400 }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                    >
                      {item.label}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        );
      })()}

      {/* Create Church Modal */}
      {showCreate && token && (
        <CreateChurchModal
          token={token}
          onClose={() => setShowCreate(false)}
          onCreated={(church, inviteLink) => {
            setChurches((prev) => [church, ...prev]);
            setShowCreate(false);
            if (inviteLink) setInviteModal({ link: inviteLink, email: church.admin?.email ?? "" });
          }}
        />
      )}

      {/* Invite link after creation */}
      {inviteModal && (
        <InviteLinkModal link={inviteModal.link} email={inviteModal.email} onClose={() => setInviteModal(null)} />
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <ConfirmModal
          icon="🗑️"
          title="Permanently Delete Church?"
          body={
            <>
              <strong style={{ color: "#dc2626" }}>This cannot be undone.</strong> All data for{" "}
              <strong style={{ color: "#111827" }}>{confirmDelete.name}</strong> — including children, check-in records, and families — will be permanently deleted.
            </>
          }
          confirmLabel="Delete Permanently"
          confirmColor="#dc2626"
          working={confirmWorking}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => doDelete(confirmDelete.id)}
        />
      )}
    </AppShell>
  );
}
