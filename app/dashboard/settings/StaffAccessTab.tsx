"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { selectedChurchHeaders } from "@/lib/selected-church";
import { INVITABLE_ROLES, ROLE_LABELS, isPrimaryAdmin, isAdminRole } from "@/lib/staff-permissions";

const BG     = "#08060D";
const CARD   = "#120A1F";
const GOLD   = "#D4AF37";
const PURPLE = "#7B2CBF";
const MUTED  = "rgba(255,255,255,0.5)";
const TEXT   = "#ffffff";
const BORDER = "rgba(212,175,55,0.18)";
const INPUT_BG = "rgba(255,255,255,0.05)";
const INPUT_BD = "rgba(255,255,255,0.12)";

const supabase = createClient();

// ── Types ─────────────────────────────────────────────────────────────────────

type Member = {
  userId: string;
  churchUserId: string;
  email: string;
  displayName: string;
  phone: string;
  role: string;
  roleLabel: string;
  lastSignInAt: string | null;
  createdAt: string;
};

type Invitation = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
  roleLabel: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  invitedBy: string;
};

type SubscriptionSummary = {
  status: string;
  tier: string | null;
  trialEndsAt: string | null;
  hasStripe: boolean;
  periodEnd: string | null;
  churchName: string;
  billingReviewRequired: boolean;
  billingReviewRequestedAt: string | null;
  billingReviewReason: string | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function statusBadge(status: string): React.CSSProperties {
  const map: Record<string, React.CSSProperties> = {
    pending:  { background: "rgba(234,179,8,0.12)",  color: "#fbbf24", border: "1px solid rgba(234,179,8,0.25)" },
    accepted: { background: "rgba(34,197,94,0.12)",  color: "#4ade80", border: "1px solid rgba(34,197,94,0.25)" },
    expired:  { background: "rgba(255,255,255,0.06)", color: MUTED,    border: "1px solid rgba(255,255,255,0.1)" },
    revoked:  { background: "rgba(239,68,68,0.1)",   color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" },
  };
  return map[status] ?? map.expired;
}

function roleBadge(role: string) {
  if (isPrimaryAdmin(role)) {
    return { background: "rgba(212,175,55,0.12)", color: GOLD, border: `1px solid rgba(212,175,55,0.3)` };
  }
  if (role === "church_admin") {
    return { background: "rgba(123,44,191,0.15)", color: "#c084fc", border: "1px solid rgba(123,44,191,0.3)" };
  }
  return { background: "rgba(255,255,255,0.06)", color: MUTED, border: "1px solid rgba(255,255,255,0.1)" };
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%", boxSizing: "border-box",
    background: INPUT_BG, border: `1px solid ${INPUT_BD}`,
    borderRadius: 8, padding: "9px 12px", fontSize: 13, color: TEXT, outline: "none",
  };
}

function labelStyle(): React.CSSProperties {
  return {
    display: "block", fontSize: 11, fontWeight: 600,
    textTransform: "uppercase", letterSpacing: "0.07em", color: MUTED, marginBottom: 5,
  };
}

// ── Modal shell ───────────────────────────────────────────────────────────────

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "28px 32px", width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" }}>
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, subtitle, onClose }: { title: string; subtitle?: string; onClose: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: TEXT, fontFamily: "Georgia, serif" }}>{title}</h2>
        {subtitle && <p style={{ margin: "4px 0 0", fontSize: 12, color: MUTED }}>{subtitle}</p>}
      </div>
      <button onClick={onClose} style={{ background: "none", border: "none", color: MUTED, fontSize: 20, cursor: "pointer", padding: 0, lineHeight: 1 }}>×</button>
    </div>
  );
}

// ── Invite Modal ──────────────────────────────────────────────────────────────

function InviteModal({ churchId, token, onClose, onSuccess }: {
  churchId: string; token: string; onClose: () => void; onSuccess: () => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [email,     setEmail]     = useState("");
  const [phone,     setPhone]     = useState("");
  const [role,      setRole]      = useState("church_admin");
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/staff/${churchId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...selectedChurchHeaders() },
        body: JSON.stringify({ firstName, lastName, email, phone, role }),
      });
      const d = await res.json();
      if (res.ok) { onSuccess(); onClose(); }
      else setError(d.error ?? "Failed to send invitation.");
    } catch { setError("Network error. Please try again."); }
    finally { setSaving(false); }
  }

  return (
    <Modal onClose={onClose}>
      <ModalHeader title="Invite Staff Member" subtitle="An invitation email will be sent with a secure link." onClose={onClose} />
      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div>
            <label style={labelStyle()}>First Name</label>
            <input value={firstName} onChange={e => setFirstName(e.target.value)} required style={inputStyle()} autoComplete="off" />
          </div>
          <div>
            <label style={labelStyle()}>Last Name</label>
            <input value={lastName} onChange={e => setLastName(e.target.value)} required style={inputStyle()} autoComplete="off" />
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle()}>Email Address</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle()} autoComplete="off" />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle()}>Phone Number</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle()} autoComplete="off" />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle()}>Role</label>
          <select value={role} onChange={e => setRole(e.target.value)} style={{ ...inputStyle(), cursor: "pointer" }}>
            {INVITABLE_ROLES.map(r => <option key={r.value} value={r.value} style={{ background: CARD }}>{r.label}</option>)}
          </select>
        </div>
        {error && <p style={{ margin: "0 0 14px", fontSize: 13, color: "#f87171" }}>⚠ {error}</p>}
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" onClick={onClose} style={{ flex: 1, padding: "10px 16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 13, color: MUTED, cursor: "pointer" }}>
            Cancel
          </button>
          <button type="submit" disabled={saving} style={{ flex: 2, padding: "10px 16px", background: saving ? "rgba(123,44,191,0.4)" : `linear-gradient(135deg, ${PURPLE}, #9D4EDD)`, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, color: TEXT, cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "Sending…" : "Send Invitation"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Remove Confirmation Modal ─────────────────────────────────────────────────

function RemoveModal({ member, churchId, token, onClose, onSuccess }: {
  member: Member; churchId: string; token: string; onClose: () => void; onSuccess: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  async function handleRemove() {
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/staff/${churchId}/${member.userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, ...selectedChurchHeaders() },
      });
      const d = await res.json();
      if (res.ok) { onSuccess(); onClose(); }
      else setError(d.error ?? "Failed to remove staff member.");
    } catch { setError("Network error."); }
    finally { setSaving(false); }
  }

  return (
    <Modal onClose={onClose}>
      <ModalHeader title="Remove Staff Member" onClose={onClose} />
      <p style={{ fontSize: 14, color: MUTED, marginBottom: 8, lineHeight: 1.6 }}>
        Are you sure you want to remove <strong style={{ color: TEXT }}>{member.displayName || member.email}</strong> from staff access?
      </p>
      <p style={{ fontSize: 13, color: MUTED, marginBottom: 20 }}>
        They will immediately lose access to the ShepherdKids dashboard. This action is logged.
      </p>
      {error && <p style={{ margin: "0 0 14px", fontSize: 13, color: "#f87171" }}>⚠ {error}</p>}
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onClose} style={{ flex: 1, padding: "10px 16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 13, color: MUTED, cursor: "pointer" }}>Cancel</button>
        <button onClick={handleRemove} disabled={saving} style={{ flex: 1, padding: "10px 16px", background: saving ? "rgba(239,68,68,0.3)" : "rgba(239,68,68,0.18)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#f87171", cursor: saving ? "not-allowed" : "pointer" }}>
          {saving ? "Removing…" : "Remove Staff Member"}
        </button>
      </div>
    </Modal>
  );
}

// ── Transfer Primary Admin Wizard ─────────────────────────────────────────────

function TransferWizard({ members, subscription, churchId, token, currentUserId, onClose, onSuccess }: {
  members: Member[];
  subscription: SubscriptionSummary;
  churchId: string;
  token: string;
  currentUserId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [billingAction, setBillingAction] = useState<"keep" | "update">("keep");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eligibleAdmins = members.filter(m => m.role === "church_admin" && m.userId !== currentUserId);
  const selectedMember = members.find(m => m.userId === selectedUserId);

  const planLabels: Record<string, string> = {
    vine: "Vine", grove: "Grove", orchard: "Orchard",
    trial: "Trial", active: "Active", suspended: "Suspended",
  };

  async function handleConfirm() {
    if (!selectedUserId) return;
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/staff/${churchId}/transfer-primary`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...selectedChurchHeaders() },
        body: JSON.stringify({ newPrimaryUserId: selectedUserId, billingAction }),
      });
      const d = await res.json();
      if (res.ok) { onSuccess(); onClose(); }
      else setError(d.error ?? "Transfer failed. Please try again.");
    } catch { setError("Network error."); }
    finally { setSaving(false); }
  }

  const stepLabel = ["", "Choose Administrator", "Billing Review", "Confirm Transfer"];

  return (
    <Modal onClose={onClose}>
      <ModalHeader title="Transfer Primary Administrator" subtitle={`Step ${step} of 3 — ${stepLabel[step]}`} onClose={onClose} />

      {/* Step indicator */}
      <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
        {[1,2,3].map(s => (
          <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: s <= step ? GOLD : "rgba(255,255,255,0.08)" }} />
        ))}
      </div>

      {/* ── Step 1: Choose new primary admin ── */}
      {step === 1 && (
        <>
          <p style={{ fontSize: 13, color: MUTED, marginBottom: 16, lineHeight: 1.6 }}>
            Only active <strong style={{ color: TEXT }}>Church Administrators</strong> are eligible to become the new Primary Administrator.
          </p>
          {eligibleAdmins.length === 0 ? (
            <div style={{ padding: "20px", borderRadius: 10, background: "rgba(234,179,8,0.07)", border: "1px solid rgba(234,179,8,0.2)", textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 13, color: "#fbbf24", lineHeight: 1.6 }}>
                No eligible Church Administrators found. Invite or promote a staff member to Church Administrator before transferring.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              {eligibleAdmins.map(m => (
                <label
                  key={m.userId}
                  style={{
                    display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
                    borderRadius: 10, cursor: "pointer",
                    border: `2px solid ${selectedUserId === m.userId ? GOLD : "rgba(255,255,255,0.08)"}`,
                    background: selectedUserId === m.userId ? "rgba(212,175,55,0.07)" : "rgba(255,255,255,0.02)",
                  }}
                >
                  <input
                    type="radio" name="newPrimary" value={m.userId}
                    checked={selectedUserId === m.userId}
                    onChange={() => setSelectedUserId(m.userId)}
                    style={{ accentColor: GOLD, flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: TEXT }}>{m.displayName || m.email}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: MUTED }}>{m.email}</p>
                    {m.phone && <p style={{ margin: "1px 0 0", fontSize: 12, color: MUTED }}>{m.phone}</p>}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6, ...roleBadge(m.role) }}>
                    Church Admin
                  </span>
                </label>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button onClick={onClose} style={{ flex: 1, padding: "10px 16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 13, color: MUTED, cursor: "pointer" }}>Cancel</button>
            <button
              onClick={() => setStep(2)}
              disabled={!selectedUserId}
              style={{ flex: 2, padding: "10px 16px", background: selectedUserId ? `linear-gradient(135deg, ${PURPLE}, #9D4EDD)` : "rgba(123,44,191,0.2)", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, color: selectedUserId ? TEXT : MUTED, cursor: selectedUserId ? "pointer" : "not-allowed" }}
            >
              Continue →
            </button>
          </div>
        </>
      )}

      {/* ── Step 2: Billing review ── */}
      {step === 2 && (
        <>
          <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "16px 18px", marginBottom: 20 }}>
            <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.07em" }}>Subscription & Billing</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: MUTED }}>Current Plan</span>
                <span style={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>{planLabels[subscription.tier ?? ""] ?? planLabels[subscription.status] ?? "Trial"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: MUTED }}>Billing Status</span>
                <span style={{ fontSize: 13, color: subscription.status === "active" ? "#4ade80" : "#fbbf24", fontWeight: 600 }}>
                  {subscription.status === "active" ? "Active" : subscription.status === "trialing" ? "Trial" : subscription.status}
                </span>
              </div>
              {subscription.periodEnd && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: MUTED }}>Next Renewal</span>
                  <span style={{ fontSize: 13, color: TEXT }}>{fmtDate(subscription.periodEnd)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: MUTED }}>Payment Method</span>
                <span style={{ fontSize: 13, color: TEXT }}>{subscription.hasStripe ? "Payment method on file" : "No payment method"}</span>
              </div>
            </div>
          </div>

          <p style={{ fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 10 }}>Will the current payment method remain?</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {(["keep", "update"] as const).map(opt => (
              <label
                key={opt}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px", borderRadius: 9, cursor: "pointer",
                  border: `2px solid ${billingAction === opt ? GOLD : "rgba(255,255,255,0.08)"}`,
                  background: billingAction === opt ? "rgba(212,175,55,0.06)" : "rgba(255,255,255,0.02)",
                }}
              >
                <input type="radio" name="billing" value={opt} checked={billingAction === opt} onChange={() => setBillingAction(opt)} style={{ accentColor: GOLD, marginTop: 2, flexShrink: 0 }} />
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: TEXT }}>
                    {opt === "keep" ? "Keep Existing Payment Method" : "Update Payment Method After Transfer"}
                  </p>
                  {opt === "update" && (
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: MUTED, lineHeight: 1.5 }}>
                      The new Primary Administrator will be prompted to update the payment method after the transfer is complete to ensure uninterrupted service.
                    </p>
                  )}
                </div>
              </label>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setStep(1)} style={{ flex: 1, padding: "10px 16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 13, color: MUTED, cursor: "pointer" }}>← Back</button>
            <button onClick={() => setStep(3)} style={{ flex: 2, padding: "10px 16px", background: `linear-gradient(135deg, ${PURPLE}, #9D4EDD)`, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, color: TEXT, cursor: "pointer" }}>Continue →</button>
          </div>
        </>
      )}

      {/* ── Step 3: Confirmation ── */}
      {step === 3 && selectedMember && (
        <>
          <p style={{ fontSize: 13, color: MUTED, marginBottom: 16, lineHeight: 1.6 }}>
            Please review the transfer details carefully. This action is permanent and logged.
          </p>

          <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "16px 18px", marginBottom: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: MUTED }}>New Primary Administrator</span>
              <span style={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>{selectedMember.displayName || selectedMember.email}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: MUTED }}>Email</span>
              <span style={{ fontSize: 13, color: MUTED }}>{selectedMember.email}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: MUTED }}>Billing</span>
              <span style={{ fontSize: 13, color: billingAction === "keep" ? "#4ade80" : "#fbbf24", fontWeight: 600 }}>
                {billingAction === "keep" ? "Remains unchanged" : "Will be updated after transfer"}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: MUTED }}>Your New Role</span>
              <span style={{ fontSize: 13, color: TEXT }}>Church Administrator</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: MUTED }}>Audit Log</span>
              <span style={{ fontSize: 13, color: "#4ade80" }}>Will be created</span>
            </div>
          </div>

          {error && <p style={{ margin: "0 0 14px", fontSize: 13, color: "#f87171" }}>⚠ {error}</p>}

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setStep(2)} style={{ flex: 1, padding: "10px 16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 13, color: MUTED, cursor: "pointer" }}>← Back</button>
            <button
              onClick={handleConfirm}
              disabled={saving}
              style={{ flex: 2, padding: "10px 16px", background: saving ? "rgba(212,175,55,0.3)" : "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.4)", borderRadius: 8, fontSize: 13, fontWeight: 700, color: saving ? MUTED : GOLD, cursor: saving ? "not-allowed" : "pointer" }}
            >
              {saving ? "Transferring…" : "Confirm Transfer"}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

// ── Main StaffAccessTab ───────────────────────────────────────────────────────

export default function StaffAccessTab({ userRole }: { userRole: string }) {
  const [members,      setMembers]      = useState<Member[]>([]);
  const [invitations,  setInvitations]  = useState<Invitation[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [token,        setToken]        = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [churchId,     setChurchId]     = useState<string | null>(null);
  const [myRole,       setMyRole]       = useState<string>(userRole);

  const [showInvite,    setShowInvite]    = useState(false);
  const [removeTarget,  setRemoveTarget]  = useState<Member | null>(null);
  const [showTransfer,  setShowTransfer]  = useState(false);
  const [msg,           setMsg]           = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Role change UI
  const [editingRole, setEditingRole]   = useState<string | null>(null); // userId being edited
  const [roleInput,   setRoleInput]     = useState<string>("");
  const [roleError,   setRoleError]     = useState<string | null>(null);
  const [roleSaving,  setRoleSaving]    = useState(false);

  const load = useCallback(async (t: string, cid: string) => {
    const res = await fetch(`/api/staff/${cid}`, {
      headers: { Authorization: `Bearer ${t}`, ...selectedChurchHeaders() },
    });
    if (res.ok) {
      const d = await res.json();
      setMembers(d.members ?? []);
      setInvitations(d.invitations ?? []);
      setSubscription(d.subscription ?? null);
      setError(null);
    } else {
      setError("Failed to load staff list.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("Not signed in."); setLoading(false); return; }
      setCurrentUserId(user.id);

      const { data: { session } } = await supabase.auth.getSession();
      const t = session?.access_token ?? null;
      if (!t) { setError("Session expired."); setLoading(false); return; }
      setToken(t);

      // Get churchId from API (resolves master admin overrides too)
      const settingsRes = await fetch("/api/settings", {
        headers: { Authorization: `Bearer ${t}`, ...selectedChurchHeaders() },
      });
      if (!settingsRes.ok) { setError("Could not load church data."); setLoading(false); return; }
      const { churchId: cid } = await settingsRes.json();
      if (!cid) { setError("No church associated with your account."); setLoading(false); return; }
      setChurchId(cid);
      await load(t, cid);
    }
    init();
  }, [load]);

  // Derive current user's role from members list
  useEffect(() => {
    if (!currentUserId || members.length === 0) return;
    const me = members.find(m => m.userId === currentUserId);
    if (me) setMyRole(me.role);
  }, [members, currentUserId]);

  async function handleRoleSave(userId: string) {
    if (!token || !churchId || !roleInput) return;
    setRoleSaving(true); setRoleError(null);
    try {
      const res = await fetch(`/api/staff/${churchId}/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...selectedChurchHeaders() },
        body: JSON.stringify({ role: roleInput }),
      });
      const d = await res.json();
      if (res.ok) {
        setMsg({ type: "ok", text: "Role updated." });
        setTimeout(() => setMsg(null), 3000);
        setEditingRole(null);
        if (token && churchId) await load(token, churchId);
      } else {
        setRoleError(d.error ?? "Failed to update role.");
      }
    } catch { setRoleError("Network error."); }
    finally { setRoleSaving(false); }
  }

  async function handleRevokeInvitation(invId: string) {
    if (!token || !churchId) return;
    const res = await fetch(`/api/staff/${churchId}/invitations/${invId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}`, ...selectedChurchHeaders() },
    });
    const d = await res.json();
    if (res.ok) {
      setMsg({ type: "ok", text: "Invitation revoked." });
      setTimeout(() => setMsg(null), 3000);
      await load(token!, churchId!);
    } else {
      setMsg({ type: "err", text: d.error ?? "Failed to revoke invitation." });
    }
  }

  async function handleBillingReviewComplete() {
    if (!token || !churchId) return;
    // Clear the billing review flag via the subscription settings endpoint
    const res = await fetch(`/api/staff/${churchId}/billing-review`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...selectedChurchHeaders() },
      body: JSON.stringify({ action: "complete" }),
    });
    if (res.ok) {
      setMsg({ type: "ok", text: "Billing review marked as complete. Thank you!" });
      setTimeout(() => setMsg(null), 4000);
      await load(token!, churchId!);
    } else {
      const d = await res.json().catch(() => ({}));
      setMsg({ type: "err", text: d.error ?? "Failed to mark billing review complete." });
    }
  }

  const canManageStaff = myRole === "primary_admin" || myRole === "admin" || myRole === "church_admin";
  const primaryMember  = members.find(m => isPrimaryAdmin(m.role));
  const pendingInvs    = invitations.filter(i => i.status === "pending");
  const pastInvs       = invitations.filter(i => i.status !== "pending");

  if (loading) return <p style={{ color: MUTED, fontSize: 14 }}>Loading staff…</p>;
  if (error)   return <p style={{ color: "#f87171", fontSize: 14 }}>⚠ {error}</p>;
  if (!token || !churchId) return null;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: GOLD, fontFamily: "Georgia, serif" }}>Staff Access</h2>
          <p style={{ margin: 0, fontSize: 12, color: MUTED, lineHeight: 1.5 }}>
            Manage administrative users who can sign into the ShepherdKids dashboard.<br />
            This page is not for classroom volunteers.
          </p>
        </div>
        {canManageStaff && (
          <button
            onClick={() => setShowInvite(true)}
            style={{ padding: "9px 20px", background: `linear-gradient(135deg, ${PURPLE}, #9D4EDD)`, border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, color: TEXT, cursor: "pointer", whiteSpace: "nowrap" }}
          >
            + Invite Staff Member
          </button>
        )}
      </div>

      {/* Status message */}
      {msg && (
        <div style={{
          marginBottom: 16, padding: "10px 14px", borderRadius: 9, fontSize: 13,
          background: msg.type === "ok" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
          border: `1px solid ${msg.type === "ok" ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`,
          color: msg.type === "ok" ? "#34d399" : "#f87171",
        }}>
          {msg.type === "ok" ? "✓ " : "⚠ "}{msg.text}
        </div>
      )}

      {/* Billing review banner — shown to the new primary admin after a transfer */}
      {subscription?.billingReviewRequired && isAdminRole(myRole) && (
        <div style={{
          marginBottom: 20, padding: "16px 20px", borderRadius: 10,
          background: "rgba(234,179,8,0.08)", border: "2px solid rgba(234,179,8,0.35)",
        }}>
          <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: "#fbbf24" }}>
            ⚠ Action Required: Payment Method Review
          </p>
          <p style={{ margin: "0 0 12px", fontSize: 12, color: MUTED, lineHeight: 1.6 }}>
            The previous Primary Administrator requested that you review and update the payment method
            on file after this ownership transfer. Please visit the Subscription tab to verify your
            billing details before the next renewal date.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a
              href="/dashboard/billing"
              style={{ padding: "7px 16px", background: "#fbbf24", color: "#120A1F", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 700, textDecoration: "none", cursor: "pointer" }}
            >
              Update Payment Method
            </a>
            <button
              onClick={handleBillingReviewComplete}
              style={{ padding: "7px 16px", background: "rgba(234,179,8,0.12)", color: "#fbbf24", border: "1px solid rgba(234,179,8,0.3)", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
            >
              Mark as Reviewed
            </button>
          </div>
        </div>
      )}

      {/* Primary Admin section */}
      {primaryMember && (
        <section style={{ background: CARD, border: `1px solid rgba(212,175,55,0.3)`, borderRadius: 12, padding: "18px 20px", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(212,175,55,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>👑</div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>{primaryMember.displayName || primaryMember.email}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: "rgba(212,175,55,0.15)", color: GOLD, border: "1px solid rgba(212,175,55,0.3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>PRIMARY ADMINISTRATOR</span>
                  {primaryMember.userId === currentUserId && <span style={{ fontSize: 11, color: MUTED }}>(you)</span>}
                </div>
                <p style={{ margin: "3px 0 0", fontSize: 12, color: MUTED }}>{primaryMember.email}</p>
                {primaryMember.phone && <p style={{ margin: "1px 0 0", fontSize: 12, color: MUTED }}>{primaryMember.phone}</p>}
              </div>
            </div>
            {canManageStaff && (
              <button
                onClick={() => setShowTransfer(true)}
                style={{ padding: "8px 16px", background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 8, fontSize: 12, fontWeight: 700, color: GOLD, cursor: "pointer" }}
              >
                Transfer Primary Administrator
              </button>
            )}
          </div>
        </section>
      )}

      {/* Staff table */}
      <section style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${BORDER}` }}>
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: TEXT }}>Staff Members</h3>
        </div>
        {members.filter(m => !isPrimaryAdmin(m.role)).length === 0 ? (
          <p style={{ padding: "20px", fontSize: 13, color: MUTED, margin: 0 }}>No additional staff members yet. Invite someone to get started.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Name", "Email", "Phone", "Role", "Last Sign-In", ""].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.07em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.filter(m => !isPrimaryAdmin(m.role)).map(m => (
                  <tr key={m.userId} style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                    <td style={{ padding: "12px 16px", color: TEXT, fontWeight: 600, whiteSpace: "nowrap" }}>
                      {m.displayName || "—"}
                      {m.userId === currentUserId && <span style={{ marginLeft: 6, fontSize: 11, color: MUTED }}>(you)</span>}
                    </td>
                    <td style={{ padding: "12px 16px", color: MUTED, whiteSpace: "nowrap" }}>{m.email}</td>
                    <td style={{ padding: "12px 16px", color: MUTED, whiteSpace: "nowrap" }}>{m.phone || "—"}</td>
                    <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                      {editingRole === m.userId ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <select
                            value={roleInput}
                            onChange={e => setRoleInput(e.target.value)}
                            style={{ background: INPUT_BG, border: `1px solid ${INPUT_BD}`, borderRadius: 6, padding: "4px 8px", fontSize: 12, color: TEXT, outline: "none" }}
                          >
                            {INVITABLE_ROLES.map(r => <option key={r.value} value={r.value} style={{ background: CARD }}>{r.label}</option>)}
                          </select>
                          <button onClick={() => handleRoleSave(m.userId)} disabled={roleSaving} style={{ padding: "4px 10px", background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 6, fontSize: 11, fontWeight: 700, color: "#4ade80", cursor: "pointer" }}>
                            {roleSaving ? "…" : "Save"}
                          </button>
                          <button onClick={() => { setEditingRole(null); setRoleError(null); }} style={{ padding: "4px 8px", background: "none", border: "none", color: MUTED, fontSize: 18, cursor: "pointer", lineHeight: 1 }}>×</button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6, ...roleBadge(m.role) }}>
                          {ROLE_LABELS[m.role] ?? m.role}
                        </span>
                      )}
                      {editingRole === m.userId && roleError && (
                        <p style={{ margin: "4px 0 0", fontSize: 11, color: "#f87171" }}>{roleError}</p>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px", color: MUTED, whiteSpace: "nowrap" }}>{fmtDate(m.lastSignInAt)}</td>
                    <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                      {canManageStaff && m.userId !== currentUserId && (
                        <div style={{ display: "flex", gap: 6 }}>
                          {editingRole !== m.userId && (
                            <button
                              onClick={() => { setEditingRole(m.userId); setRoleInput(m.role); setRoleError(null); }}
                              style={{ padding: "5px 10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, fontSize: 11, color: MUTED, cursor: "pointer" }}
                            >
                              Change Role
                            </button>
                          )}
                          <button
                            onClick={() => setRemoveTarget(m)}
                            style={{ padding: "5px 10px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)", borderRadius: 6, fontSize: 11, color: "#f87171", cursor: "pointer" }}
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Pending Invitations */}
      {pendingInvs.length > 0 && (
        <section style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
          <div style={{ padding: "14px 20px", borderBottom: `1px solid ${BORDER}` }}>
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: TEXT }}>Pending Invitations</h3>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Name", "Email", "Role", "Expires", ""].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.07em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pendingInvs.map(inv => (
                  <tr key={inv.id} style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                    <td style={{ padding: "12px 16px", color: TEXT, fontWeight: 600, whiteSpace: "nowrap" }}>{inv.firstName} {inv.lastName}</td>
                    <td style={{ padding: "12px 16px", color: MUTED }}>{inv.email}</td>
                    <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6, ...roleBadge(inv.role) }}>{inv.roleLabel}</span>
                    </td>
                    <td style={{ padding: "12px 16px", color: MUTED, whiteSpace: "nowrap" }}>{fmtDate(inv.expiresAt)}</td>
                    <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                      {canManageStaff && (
                        <button
                          onClick={() => handleRevokeInvitation(inv.id)}
                          style={{ padding: "5px 10px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)", borderRadius: 6, fontSize: 11, color: "#f87171", cursor: "pointer" }}
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Past Invitations */}
      {pastInvs.length > 0 && (
        <section style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
          <div style={{ padding: "14px 20px", borderBottom: `1px solid ${BORDER}` }}>
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: MUTED }}>Invitation History</h3>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Name", "Email", "Role", "Status", "Date"].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.07em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pastInvs.map(inv => (
                  <tr key={inv.id} style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                    <td style={{ padding: "12px 16px", color: TEXT, whiteSpace: "nowrap" }}>{inv.firstName} {inv.lastName}</td>
                    <td style={{ padding: "12px 16px", color: MUTED }}>{inv.email}</td>
                    <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6, ...roleBadge(inv.role) }}>{inv.roleLabel}</span>
                    </td>
                    <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 7px", borderRadius: 5, ...statusBadge(inv.status) }}>{inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}</span>
                    </td>
                    <td style={{ padding: "12px 16px", color: MUTED, whiteSpace: "nowrap" }}>{fmtDate(inv.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Modals */}
      {showInvite && (
        <InviteModal
          churchId={churchId}
          token={token}
          onClose={() => setShowInvite(false)}
          onSuccess={async () => {
            setMsg({ type: "ok", text: "Invitation sent successfully." });
            setTimeout(() => setMsg(null), 4000);
            await load(token!, churchId!);
          }}
        />
      )}

      {removeTarget && (
        <RemoveModal
          member={removeTarget}
          churchId={churchId}
          token={token}
          onClose={() => setRemoveTarget(null)}
          onSuccess={async () => {
            setMsg({ type: "ok", text: "Staff member removed." });
            setTimeout(() => setMsg(null), 3000);
            await load(token!, churchId!);
          }}
        />
      )}

      {showTransfer && subscription && (
        <TransferWizard
          members={members}
          subscription={subscription}
          churchId={churchId}
          token={token}
          currentUserId={currentUserId ?? ""}
          onClose={() => setShowTransfer(false)}
          onSuccess={async () => {
            setMsg({ type: "ok", text: "Primary Administrator transferred successfully." });
            setTimeout(() => setMsg(null), 5000);
            await load(token!, churchId!);
          }}
        />
      )}
    </div>
  );
}
