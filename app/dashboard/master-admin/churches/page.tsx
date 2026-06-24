"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/layout/AppShell";

const supabase = createClient();
const DARK_GREEN = "#1A4A2E";

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
  admin: { userId: string; email: string | null } | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function statusColor(status: string | null) {
  switch (status) {
    case "active":    return { bg: "#dcfce7", color: "#16a34a" };
    case "trial":     return { bg: "#dbeafe", color: "#1d4ed8" };
    case "suspended": return { bg: "#fee2e2", color: "#dc2626" };
    default:          return { bg: "#f3f4f6", color: "#6b7280" };
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

// ── Shared styles ─────────────────────────────────────────────────────────────

const TH: React.CSSProperties = {
  padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700,
  color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em",
  whiteSpace: "nowrap", backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb",
};
const TD: React.CSSProperties = {
  padding: "10px 12px", borderBottom: "1px solid #f3f4f6", fontSize: 13, verticalAlign: "middle",
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

    // Minimal church object for local state — page will reload full data
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
      admin: { userId: "", email: form.adminEmail.trim() },
    };

    onCreated(newChurch, d.invite_link ?? null);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px", border: "1px solid #d1d5db",
    borderRadius: 8, fontSize: 13, boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4,
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ backgroundColor: "white", borderRadius: 16, width: "100%", maxWidth: 520, padding: 32, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" }}
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
            <p style={{ fontSize: 11, fontWeight: 700, color: DARK_GREEN, textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 12px" }}>
              Church Info
            </p>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Church Name *</label>
              <input style={inputStyle} value={form.churchName} onChange={(e) => update("churchName", e.target.value)} placeholder="Grace Community Church" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>City</label>
                <input style={inputStyle} value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="Nashville" />
              </div>
              <div>
                <label style={labelStyle}>State</label>
                <input style={inputStyle} value={form.state} onChange={(e) => update("state", e.target.value)} placeholder="TN" />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <input style={inputStyle} value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="(615) 555-0100" />
            </div>
          </div>

          <div style={{ height: 1, backgroundColor: "#f3f4f6", margin: "0 0 20px" }} />

          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: DARK_GREEN, textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 12px" }}>
              Admin Account
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>First Name</label>
                <input style={inputStyle} value={form.adminFirst} onChange={(e) => update("adminFirst", e.target.value)} placeholder="Sarah" />
              </div>
              <div>
                <label style={labelStyle}>Last Name</label>
                <input style={inputStyle} value={form.adminLast} onChange={(e) => update("adminLast", e.target.value)} placeholder="Johnson" />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Admin Email *</label>
              <input style={inputStyle} type="email" value={form.adminEmail} onChange={(e) => update("adminEmail", e.target.value)} placeholder="sarah@gracecc.org" />
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
              style={{ flex: 2, padding: 11, borderRadius: 10, border: "none", backgroundColor: DARK_GREEN, color: "white", fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
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
      style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ backgroundColor: "white", borderRadius: 16, width: "100%", maxWidth: 480, padding: 32, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
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
          This link expires after use. If needed, generate a new one via the Impersonate action.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={copy}
            style={{ flex: 1, padding: 11, borderRadius: 10, border: "none", backgroundColor: copied ? "#16a34a" : DARK_GREEN, color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "background-color 0.2s" }}
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

// ── Impersonate Modal ─────────────────────────────────────────────────────────

function ImpersonateModal({ link, email, onClose }: { link: string; email: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ backgroundColor: "white", borderRadius: 16, width: "100%", maxWidth: 480, padding: 32, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 36, marginBottom: 12 }}>🔑</div>
        <h2 style={{ fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 700, color: "#111827", margin: "0 0 8px" }}>
          Impersonate Church Admin
        </h2>
        <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 12px" }}>
          One-time login link for <strong style={{ color: "#111827" }}>{email}</strong>.
        </p>
        <div style={{ backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 12px", marginBottom: 12, fontSize: 12, color: "#92400e" }}>
          Paste this link in an incognito window to avoid signing out of your current session.
        </div>
        <div style={{ backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 12px", marginBottom: 20, wordBreak: "break-all", fontSize: 12, color: "#374151", lineHeight: 1.5 }}>
          {link}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={copy}
            style={{ flex: 1, padding: 11, borderRadius: 10, border: "none", backgroundColor: copied ? "#16a34a" : "#7B2CBF", color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "background-color 0.2s" }}
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
      style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
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

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [inviteModal, setInviteModal] = useState<{ link: string; email: string } | null>(null);
  const [impersonateModal, setImpersonateModal] = useState<{ link: string; email: string } | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState<Church | null>(null);
  const [confirmReactivate, setConfirmReactivate] = useState<Church | null>(null);
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

  async function doAction(churchId: string, action: string) {
    if (!token) return;
    setActionLoading(churchId);
    setActionError("");
    setOpenMenu(null);

    if (action === "impersonate") {
      const res = await fetch("/api/master-admin/churches", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ churchId, action }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError((d as { error?: string }).error ?? "Failed.");
      } else {
        const data = d as { link: string | null; email: string };
        if (data.link) setImpersonateModal({ link: data.link, email: data.email });
        else setActionError("Could not generate impersonation link.");
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
      // Refresh the church list
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
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
          <div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 26, fontWeight: 700, color: "#111827", margin: "0 0 10px" }}>Access Denied</h1>
          <p className="text-gray-500 text-sm text-center max-w-sm">This area is restricted to master administrators only.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell navItems={[]}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${DARK_GREEN} 0%, #2D6B42 100%)`, padding: "32px 40px" }}>
        <p className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: "#86efac" }}>Master Admin</p>
        <h1 style={{ color: "white", fontSize: 32, fontWeight: 700, fontFamily: "Georgia, serif", margin: "0 0 8px" }}>
          Church Management
        </h1>
        <p style={{ color: "#bbf7d0", fontSize: 14, margin: 0 }}>
          Create and manage churches, admin accounts, and access.
        </p>
      </div>

      <div className="min-h-screen bg-gray-50" style={{ padding: "28px 32px" }}>
        {/* Summary cards */}
        {!loading && !pageError && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Total Churches", value: churches.length, icon: "🏛️", color: "#374151" },
              { label: "Active Trials",  value: activeTrials,    icon: "⏳", color: "#1d4ed8" },
              { label: "Paid",           value: active,          icon: "✅", color: "#16a34a" },
              { label: "Suspended",      value: suspended,       icon: "🚫", color: "#dc2626" },
            ].map((c) => (
              <div key={c.label} style={{ backgroundColor: "white", borderRadius: 12, border: "1px solid #e5e7eb", padding: "14px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{c.icon}</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: c.color, lineHeight: 1 }}>{c.value}</div>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>{c.label}</div>
              </div>
            ))}
          </div>
        )}

        {loading && <div className="text-center py-16 text-gray-400">Loading…</div>}

        {pageError && !loading && (
          <div className="rounded-xl border border-red-300 bg-red-50 text-red-700 font-medium" style={{ padding: "14px 20px", marginBottom: 16 }}>
            {pageError}
          </div>
        )}

        {actionError && (
          <div className="rounded-xl flex items-center justify-between" style={{ backgroundColor: "#fff7ed", border: "1px solid #fdba74", padding: "10px 16px", color: "#c2410c", fontSize: 13, marginBottom: 16 }}>
            <span>{actionError}</span>
            <button onClick={() => setActionError("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#c2410c", fontWeight: 700, fontSize: 16 }}>×</button>
          </div>
        )}

        {!loading && !pageError && (
          <>
            {/* Toolbar */}
            <div className="flex items-center gap-3 mb-4">
              <input
                type="text"
                placeholder="Search churches, email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-800"
                style={{ padding: "10px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
              />
              <button
                onClick={() => setShowCreate(true)}
                style={{ padding: "10px 20px", borderRadius: 10, border: "none", backgroundColor: DARK_GREEN, color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
              >
                + Create Church
              </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-200" style={{ overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Church", "City / State", "Admin Email", "Status", "Trial Ends", "Created", "Actions"].map((h) => (
                        <th key={h} style={TH}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayed.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center text-gray-400" style={{ ...TD, padding: 48 }}>
                          {churches.length === 0 ? "No churches yet. Click + Create Church to add one." : "No churches match your search."}
                        </td>
                      </tr>
                    )}
                    {displayed.map((church) => {
                      const isActing = actionLoading === church.id;
                      return (
                        <tr key={church.id} style={{ backgroundColor: isActing ? "#fafafa" : "white" }}>
                          <td style={{ ...TD, fontWeight: 700, color: "#111827", whiteSpace: "nowrap" }}>{church.name}</td>
                          <td style={{ ...TD, color: "#6b7280", whiteSpace: "nowrap" }}>
                            {[church.city, church.state].filter(Boolean).join(", ") || "—"}
                          </td>
                          <td style={{ ...TD, color: "#6b7280" }}>
                            {church.admin?.email ? (
                              <a href={`mailto:${church.admin.email}`} style={{ color: "#2563eb", textDecoration: "none" }}>
                                {church.admin.email}
                              </a>
                            ) : "—"}
                          </td>
                          <td style={TD}><StatusPill status={church.subscription_status} /></td>
                          <td style={{ ...TD, color: "#6b7280", whiteSpace: "nowrap" }}>{fmtDate(church.trial_ends_at)}</td>
                          <td style={{ ...TD, color: "#9ca3af", whiteSpace: "nowrap" }}>{fmtDate(church.created_at)}</td>
                          <td style={TD}>
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
                Showing <strong className="text-gray-600 mx-1">{displayed.length}</strong> of <strong className="text-gray-600 mx-1">{churches.length}</strong> churches
              </div>
            </div>
          </>
        )}
      </div>

      {/* Fixed-position dropdown */}
      {openMenu && (() => {
        const c = churches.find((x) => x.id === openMenu.id);
        if (!c) return null;
        const isSuspended = c.subscription_status === "suspended";

        type Item = { label: string; action?: string; destructive?: boolean; href?: string };
        const items: Item[] = [
          { label: "🏛️ Open Dashboard", href: `/dashboard?churchId=${c.id}` },
          { label: "🔑 Impersonate Admin", action: "impersonate" },
          { label: isSuspended ? "✅ Reactivate" : "🚫 Deactivate", action: isSuspended ? "reactivate" : "deactivate", destructive: !isSuspended },
          { label: "🗑️ Delete Church", action: "delete", destructive: true },
        ];

        return (
          <>
            <div style={{ position: "fixed", inset: 0, zIndex: 9998 }} onClick={() => setOpenMenu(null)} />
            <div
              style={{ position: "fixed", right: openMenu.right, top: openMenu.top, zIndex: 9999, backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", minWidth: 210, overflow: "hidden" }}
              onClick={(e) => e.stopPropagation()}
            >
              {items.map((item, i) => (
                <div key={i}>
                  {i === 2 && <div style={{ height: 1, backgroundColor: "#e5e7eb", margin: "2px 0" }} />}
                  {i === 3 && <div style={{ height: 1, backgroundColor: "#e5e7eb", margin: "2px 0" }} />}
                  {item.href ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setOpenMenu(null)}
                      style={{ display: "block", padding: "10px 16px", fontSize: 13, color: "#374151", textDecoration: "none" }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f9fafb"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "white"; }}
                    >
                      {item.label}
                    </a>
                  ) : (
                    <button
                      onClick={() => {
                        setOpenMenu(null);
                        if (item.action === "delete") setConfirmDelete(c);
                        else if (item.action === "deactivate") setConfirmDeactivate(c);
                        else if (item.action === "reactivate") setConfirmReactivate(c);
                        else if (item.action) doAction(c.id, item.action);
                      }}
                      style={{ width: "100%", padding: "10px 16px", textAlign: "left", fontSize: 13, border: "none", backgroundColor: "white", cursor: "pointer", color: item.destructive ? "#dc2626" : "#374151", fontWeight: item.destructive ? 600 : 400 }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f9fafb"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "white"; }}
                    >
                      {item.label}
                    </button>
                  )}
                </div>
              ))}
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

      {/* Impersonate modal */}
      {impersonateModal && (
        <ImpersonateModal link={impersonateModal.link} email={impersonateModal.email} onClose={() => setImpersonateModal(null)} />
      )}

      {/* Deactivate confirm */}
      {confirmDeactivate && (
        <ConfirmModal
          icon="🚫"
          title="Deactivate Church?"
          body={<>This will suspend <strong style={{ color: "#111827" }}>{confirmDeactivate.name}</strong> and block their access immediately. You can reactivate at any time.</>}
          confirmLabel="Deactivate"
          confirmColor="#dc2626"
          working={confirmWorking}
          onCancel={() => setConfirmDeactivate(null)}
          onConfirm={async () => {
            setConfirmWorking(true);
            await doAction(confirmDeactivate.id, "deactivate");
            setConfirmWorking(false);
            setConfirmDeactivate(null);
          }}
        />
      )}

      {/* Reactivate confirm */}
      {confirmReactivate && (
        <ConfirmModal
          icon="✅"
          title="Reactivate Church?"
          body={<>This will restore trial access for <strong style={{ color: "#111827" }}>{confirmReactivate.name}</strong>.</>}
          confirmLabel="Reactivate"
          confirmColor="#16a34a"
          working={confirmWorking}
          onCancel={() => setConfirmReactivate(null)}
          onConfirm={async () => {
            setConfirmWorking(true);
            await doAction(confirmReactivate.id, "reactivate");
            setConfirmWorking(false);
            setConfirmReactivate(null);
          }}
        />
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
