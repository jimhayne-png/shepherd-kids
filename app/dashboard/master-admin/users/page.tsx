"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/layout/AppShell";

const supabase = createClient();
const DARK_GREEN = "#1A4A2E";

// ── Types ─────────────────────────────────────────────────────────────────────

type AuditUser = {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  church: { id: string; name: string } | null;
  is_master_admin: boolean;
};

type Filter = "all" | "attached" | "orphaned";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtDateTime(iso: string | null) {
  if (!iso) return "Never";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// ── Shared table styles ───────────────────────────────────────────────────────

const TH: React.CSSProperties = {
  padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700,
  color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em",
  whiteSpace: "nowrap", backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb",
};
const TD: React.CSSProperties = {
  padding: "10px 12px", borderBottom: "1px solid #f3f4f6", fontSize: 13, verticalAlign: "middle",
};

// ── Confirm delete modal ──────────────────────────────────────────────────────

function ConfirmDeleteModal({
  user, onCancel, onConfirm, working,
}: {
  user: AuditUser; onCancel: () => void; onConfirm: () => void; working: boolean;
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
        <div style={{ fontSize: 36, marginBottom: 12 }}>🗑️</div>
        <h2 style={{ fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 700, color: "#111827", margin: "0 0 10px" }}>
          Delete User?
        </h2>
        <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6, marginBottom: 24 }}>
          Permanently delete <strong style={{ color: "#111827" }}>{user.email ?? user.id}</strong> from Supabase auth? This cannot be undone.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onCancel}
            style={{ flex: 1, padding: 11, borderRadius: 10, border: "1px solid #e5e7eb", backgroundColor: "white", fontSize: 14, fontWeight: 500, color: "#374151", cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={working}
            style={{ flex: 1, padding: 11, borderRadius: 10, border: "none", backgroundColor: "#dc2626", color: "white", fontSize: 14, fontWeight: 700, cursor: working ? "not-allowed" : "pointer", opacity: working ? 0.7 : 1 }}
          >
            {working ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function UserAuditPage() {
  const [users, setUsers]           = useState<AuditUser[]>([]);
  const [loading, setLoading]       = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [pageError, setPageError]   = useState("");
  const [token, setToken]           = useState<string | null>(null);

  const [search, setSearch]         = useState("");
  const [filter, setFilter]         = useState<Filter>("all");
  const [actionError, setActionError] = useState("");

  const [confirmDelete, setConfirmDelete] = useState<AuditUser | null>(null);
  const [deleteWorking, setDeleteWorking] = useState(false);

  async function load(t: string) {
    setPageError("");
    const res = await fetch("/api/master-admin/users", {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (res.status === 403) { setAccessDenied(true); return; }
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setPageError((d as { error?: string }).error ?? "Failed to load.");
      return;
    }
    const d = await res.json();
    setUsers(d.users ?? []);
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

  async function doDelete(user: AuditUser) {
    if (!token) return;
    setDeleteWorking(true);
    setActionError("");
    const res = await fetch(`/api/master-admin/users?userId=${user.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setDeleteWorking(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setActionError((d as { error?: string }).error ?? "Delete failed.");
    } else {
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    }
    setConfirmDelete(null);
  }

  // ── Derived data ────────────────────────────────────────────────────────────

  const orphaned = users.filter((u) => !u.church && !u.is_master_admin);
  const attached  = users.filter((u) => !!u.church);

  const baseFiltered = filter === "attached"
    ? attached
    : filter === "orphaned"
      ? orphaned
      : users;

  const displayed = baseFiltered.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [u.email, u.church?.name].some((v) => v?.toLowerCase().includes(q));
  });

  // ── Access denied ───────────────────────────────────────────────────────────

  if (!loading && accessDenied) {
    return (
      <AppShell navItems={[]}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", padding: 24 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 26, fontWeight: 700, color: "#111827", margin: "0 0 10px" }}>Access Denied</h1>
          <p style={{ color: "#6b7280", fontSize: 14 }}>This area is restricted to master administrators only.</p>
        </div>
      </AppShell>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <AppShell navItems={[]}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${DARK_GREEN} 0%, #2D6B42 100%)`, padding: "32px 40px" }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#86efac", margin: "0 0 6px" }}>
          Master Admin
        </p>
        <h1 style={{ color: "white", fontSize: 32, fontWeight: 700, fontFamily: "Georgia, serif", margin: "0 0 8px" }}>
          User Audit
        </h1>
        <p style={{ color: "#bbf7d0", fontSize: 14, margin: 0 }}>
          All Supabase auth users and their church assignments.
        </p>
      </div>

      <div style={{ minHeight: "100vh", backgroundColor: "#f9fafb", padding: "28px 32px" }}>
        {/* Summary cards */}
        {!loading && !pageError && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Total Users",    value: users.length,    icon: "👤", color: "#374151" },
              { label: "Attached",       value: attached.length, icon: "🏛️", color: "#1d4ed8" },
              { label: "Orphaned",       value: orphaned.length, icon: "⚠️", color: "#d97706" },
              { label: "Master Admins",  value: users.filter((u) => u.is_master_admin).length, icon: "🛡️", color: "#7c3aed" },
            ].map((c) => (
              <div key={c.label} style={{ backgroundColor: "white", borderRadius: 12, border: "1px solid #e5e7eb", padding: "14px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{c.icon}</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: c.color, lineHeight: 1 }}>{c.value}</div>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>{c.label}</div>
              </div>
            ))}
          </div>
        )}

        {loading && <div style={{ textAlign: "center", padding: 64, color: "#9ca3af" }}>Loading…</div>}

        {pageError && !loading && (
          <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "14px 20px", color: "#dc2626", fontWeight: 500, marginBottom: 16 }}>
            {pageError}
          </div>
        )}

        {actionError && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "#fff7ed", border: "1px solid #fdba74", borderRadius: 12, padding: "10px 16px", color: "#c2410c", fontSize: 13, marginBottom: 16 }}>
            <span>{actionError}</span>
            <button onClick={() => setActionError("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#c2410c", fontWeight: 700, fontSize: 16 }}>×</button>
          </div>
        )}

        {!loading && !pageError && (
          <>
            {/* Toolbar */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
              <input
                type="text"
                placeholder="Search email or church…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ flex: 1, minWidth: 200, padding: "10px 16px", borderRadius: 10, border: "1px solid #e5e7eb", backgroundColor: "white", fontSize: 14, color: "#111827", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", outline: "none" }}
              />

              {/* Filter tabs */}
              <div style={{ display: "flex", gap: 4, backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: 10, padding: 4, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                {(["all", "attached", "orphaned"] as Filter[]).map((f) => {
                  const labels: Record<Filter, string> = {
                    all:      `All (${users.length})`,
                    attached: `Attached (${attached.length})`,
                    orphaned: `Orphaned (${orphaned.length})`,
                  };
                  const active = filter === f;
                  return (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      style={{
                        padding: "6px 14px", borderRadius: 7, border: "none", fontSize: 13, fontWeight: active ? 700 : 400, cursor: "pointer", whiteSpace: "nowrap",
                        backgroundColor: active ? (f === "orphaned" ? "#fef3c7" : DARK_GREEN) : "transparent",
                        color: active ? (f === "orphaned" ? "#92400e" : "white") : "#6b7280",
                        transition: "all 0.15s",
                      }}
                    >
                      {labels[f]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Table */}
            <div style={{ backgroundColor: "white", borderRadius: 16, border: "1px solid #e5e7eb", overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Email", "Created", "Last Sign-In", "Church", "Status", ""].map((h) => (
                        <th key={h} style={TH}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayed.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ ...TD, textAlign: "center", padding: 48, color: "#9ca3af" }}>
                          {users.length === 0 ? "No users found." : "No users match your filter."}
                        </td>
                      </tr>
                    )}
                    {displayed.map((u) => {
                      const isOrphaned = !u.church && !u.is_master_admin;
                      return (
                        <tr key={u.id} style={{ backgroundColor: isOrphaned ? "#fffbeb" : "white" }}>
                          <td style={{ ...TD, fontWeight: 500, color: "#111827" }}>
                            {u.email ?? <span style={{ color: "#9ca3af", fontStyle: "italic" }}>no email</span>}
                          </td>
                          <td style={{ ...TD, color: "#6b7280", whiteSpace: "nowrap" }}>{fmtDate(u.created_at)}</td>
                          <td style={{ ...TD, color: "#6b7280", whiteSpace: "nowrap", fontSize: 12 }}>{fmtDateTime(u.last_sign_in_at)}</td>
                          <td style={{ ...TD, color: "#374151" }}>
                            {u.church ? (
                              <span style={{ fontWeight: 500 }}>{u.church.name}</span>
                            ) : u.is_master_admin ? (
                              <span style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", backgroundColor: "#ede9fe", padding: "2px 8px", borderRadius: 9999 }}>
                                Master Admin
                              </span>
                            ) : (
                              <span style={{ color: "#9ca3af", fontStyle: "italic" }}>—</span>
                            )}
                          </td>
                          <td style={TD}>
                            {u.is_master_admin ? (
                              <span style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", backgroundColor: "#ede9fe", padding: "3px 10px", borderRadius: 9999, whiteSpace: "nowrap" }}>
                                System
                              </span>
                            ) : u.church ? (
                              <span style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", backgroundColor: "#dcfce7", padding: "3px 10px", borderRadius: 9999, whiteSpace: "nowrap" }}>
                                Active
                              </span>
                            ) : (
                              <span style={{ fontSize: 11, fontWeight: 700, color: "#d97706", backgroundColor: "#fef3c7", padding: "3px 10px", borderRadius: 9999, whiteSpace: "nowrap" }}>
                                Orphaned
                              </span>
                            )}
                          </td>
                          <td style={{ ...TD, textAlign: "right" }}>
                            {isOrphaned && (
                              <button
                                onClick={() => setConfirmDelete(u)}
                                style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #fecaca", backgroundColor: "#fef2f2", fontSize: 12, fontWeight: 600, color: "#dc2626", cursor: "pointer", whiteSpace: "nowrap" }}
                              >
                                Delete
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ display: "flex", alignItems: "center", padding: "10px 14px", borderTop: "1px solid #f3f4f6", fontSize: 12, color: "#9ca3af" }}>
                Showing <strong style={{ color: "#374151", margin: "0 4px" }}>{displayed.length}</strong> of <strong style={{ color: "#374151", margin: "0 4px" }}>{users.length}</strong> users
              </div>
            </div>
          </>
        )}
      </div>

      {/* Confirm delete modal */}
      {confirmDelete && (
        <ConfirmDeleteModal
          user={confirmDelete}
          working={deleteWorking}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => doDelete(confirmDelete)}
        />
      )}
    </AppShell>
  );
}
