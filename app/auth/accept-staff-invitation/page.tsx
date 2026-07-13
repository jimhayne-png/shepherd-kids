"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/client";

const BG     = "#08060D";
const CARD   = "#120A1F";
const GOLD   = "#D4AF37";
const PURPLE = "#7B2CBF";
const MUTED  = "rgba(255,255,255,0.5)";
const TEXT   = "#ffffff";
const BORDER = "rgba(212,175,55,0.2)";

type InvitationInfo = {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  roleLabel: string;
  churchName: string;
};

const supabase = createClient();

function AcceptInvitationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [loading, setLoading]   = useState(true);
  const [inv, setInv]           = useState<InvitationInfo | null>(null);
  const [invalidReason, setInvalidReason] = useState<string | null>(null);

  // Session state — checked once on mount
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  // New-user form fields
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword]       = useState("");
  const [confirm, setConfirm]         = useState("");

  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [done, setDone]               = useState(false);

  useEffect(() => {
    if (!token) { setInvalidReason("No invitation token found."); setLoading(false); return; }

    async function init() {
      // Check for an existing Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSessionEmail(session.user.email ?? null);
        setSessionToken(session.access_token);
      }

      // Validate the invitation token
      const res = await fetch(`/api/auth/staff-invitation?token=${encodeURIComponent(token)}`);
      const d = await res.json();
      if (d.valid) {
        setInv(d);
        setDisplayName(`${d.firstName} ${d.lastName}`);
      } else {
        const msgs: Record<string, string> = {
          not_found:       "This invitation link is invalid or has been removed.",
          already_accepted:"This invitation has already been accepted. Please sign in.",
          revoked:         "This invitation has been revoked. Contact your administrator.",
          expired:         "This invitation has expired. Ask your administrator to send a new one.",
        };
        setInvalidReason(msgs[d.reason] ?? "This invitation link is invalid.");
      }
      setLoading(false);
    }
    init().catch(() => { setInvalidReason("Failed to validate invitation. Please try again."); setLoading(false); });
  }, [token]);

  // ── Existing-user accept (no new password) ──────────────────────────────────
  async function handleExistingUserAccept() {
    if (!sessionToken) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/staff-invitation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ token }),
      });
      const d = await res.json();
      if (res.ok) {
        setDone(true);
        setTimeout(() => router.push("/dashboard"), 3000);
      } else {
        setError(d.error ?? "Failed to accept invitation. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── New-user account creation ───────────────────────────────────────────────
  async function handleNewUserSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!displayName.trim()) { setError("Please enter your name."); return; }
    if (password.length < 8)  { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm)  { setError("Passwords do not match."); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/staff-invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, displayName: displayName.trim(), password }),
      });
      const d = await res.json();
      if (res.ok) {
        setDone(true);
        setTimeout(() => router.push("/"), 3000);
      } else if (d.code === "existing_account") {
        setError("An account with this email already exists. Please sign in first, then click your invitation link again.");
      } else {
        setError(d.error ?? "Failed to create account. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 8, padding: "10px 14px", fontSize: 14, color: TEXT, outline: "none",
  };

  // Email mismatch: signed in as a different email than the invitation
  const emailMismatch = sessionEmail && inv && sessionEmail.toLowerCase() !== inv.email.toLowerCase();
  // Email match: signed in and email matches
  const emailMatch    = sessionEmail && inv && sessionEmail.toLowerCase() === inv.email.toLowerCase();

  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: GOLD }}>ShepherdKids</p>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: TEXT, fontFamily: "Georgia, serif" }}>Staff Invitation</h1>
        </div>

        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "32px 36px" }}>

          {loading && (
            <p style={{ textAlign: "center", color: MUTED, fontSize: 14 }}>Validating invitation…</p>
          )}

          {!loading && invalidReason && (
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 24, marginBottom: 12 }}>⚠️</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#f87171", marginBottom: 8 }}>Invalid Invitation</p>
              <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.6 }}>{invalidReason}</p>
            </div>
          )}

          {!loading && done && (
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 32, marginBottom: 12 }}>✅</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: "#4ade80", marginBottom: 8 }}>Invitation Accepted!</p>
              <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.6 }}>
                Welcome to {inv?.churchName}. You now have access to the ShepherdKids dashboard.
              </p>
              <p style={{ fontSize: 12, color: MUTED, marginTop: 8 }}>Redirecting…</p>
            </div>
          )}

          {!loading && inv && !done && (
            <>
              {/* Invitation summary */}
              <div style={{ background: "rgba(212,175,55,0.07)", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "14px 16px", marginBottom: 24 }}>
                <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.07em" }}>Invitation Details</p>
                <p style={{ margin: "0 0 2px", fontSize: 14, color: TEXT, fontWeight: 600 }}>{inv.churchName}</p>
                <p style={{ margin: 0, fontSize: 13, color: MUTED }}>Role: {inv.roleLabel}</p>
                <p style={{ margin: 0, fontSize: 13, color: MUTED }}>Email: {inv.email}</p>
              </div>

              {/* ── Email mismatch: wrong account signed in ── */}
              {emailMismatch && (
                <div style={{ padding: "14px 16px", borderRadius: 9, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", marginBottom: 16 }}>
                  <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: "#f87171" }}>Wrong Account</p>
                  <p style={{ margin: "0 0 10px", fontSize: 12, color: MUTED, lineHeight: 1.5 }}>
                    You are signed in as <strong style={{ color: TEXT }}>{sessionEmail}</strong>, but this invitation was sent to <strong style={{ color: TEXT }}>{inv.email}</strong>.
                    Please sign out and sign in with the correct account, then follow the invitation link again.
                  </p>
                  <button
                    onClick={async () => { await supabase.auth.signOut(); router.push("/"); }}
                    style={{ padding: "7px 16px", background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                  >
                    Sign Out
                  </button>
                </div>
              )}

              {/* ── Email match: accept with existing account ── */}
              {emailMatch && !emailMismatch && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ padding: "12px 14px", borderRadius: 9, background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", marginBottom: 14 }}>
                    <p style={{ margin: 0, fontSize: 13, color: "#4ade80", lineHeight: 1.5 }}>
                      You are already signed in as <strong>{sessionEmail}</strong>. Click below to accept this invitation and join {inv.churchName}.
                    </p>
                  </div>
                  {error && (
                    <p style={{ margin: "0 0 12px", fontSize: 13, color: "#f87171", lineHeight: 1.5 }}>⚠ {error}</p>
                  )}
                  <button
                    onClick={handleExistingUserAccept}
                    disabled={submitting}
                    style={{
                      width: "100%", padding: "11px 24px",
                      background: submitting ? "rgba(123,44,191,0.5)" : `linear-gradient(135deg, ${PURPLE}, #9D4EDD)`,
                      border: "none", borderRadius: 9, fontSize: 14, fontWeight: 700,
                      color: TEXT, cursor: submitting ? "not-allowed" : "pointer",
                    }}
                  >
                    {submitting ? "Accepting…" : "Accept Invitation"}
                  </button>
                  <p style={{ margin: "12px 0 0", fontSize: 12, color: MUTED, textAlign: "center" }}>
                    Not you?{" "}
                    <button
                      onClick={async () => { await supabase.auth.signOut(); setSessionEmail(null); setSessionToken(null); }}
                      style={{ background: "none", border: "none", color: GOLD, cursor: "pointer", fontSize: 12, padding: 0, textDecoration: "underline" }}
                    >
                      Sign out
                    </button>{" "}
                    and create a new account below.
                  </p>
                </div>
              )}

              {/* ── New-user form (no active session, or after sign-out) ── */}
              {!sessionEmail && (
                <form onSubmit={handleNewUserSubmit}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Your Name</label>
                      <input
                        value={displayName}
                        onChange={e => setDisplayName(e.target.value)}
                        placeholder="Full name"
                        autoComplete="name"
                        required
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Password</label>
                      <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        autoComplete="new-password"
                        required
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Confirm Password</label>
                      <input
                        type="password"
                        value={confirm}
                        onChange={e => setConfirm(e.target.value)}
                        placeholder="Repeat password"
                        autoComplete="new-password"
                        required
                        style={inputStyle}
                      />
                    </div>

                    {error && (
                      <p style={{ margin: 0, fontSize: 13, color: "#f87171", lineHeight: 1.5 }}>⚠ {error}</p>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      style={{
                        padding: "11px 24px",
                        background: submitting ? "rgba(123,44,191,0.5)" : `linear-gradient(135deg, ${PURPLE}, #9D4EDD)`,
                        border: "none", borderRadius: 9, fontSize: 14, fontWeight: 700,
                        color: TEXT, cursor: submitting ? "not-allowed" : "pointer",
                      }}
                    >
                      {submitting ? "Creating Account…" : "Create Account & Accept Invitation"}
                    </button>

                    <p style={{ margin: 0, fontSize: 12, color: MUTED, textAlign: "center" }}>
                      Already have an account?{" "}
                      <a href="/" style={{ color: GOLD, textDecoration: "underline" }}>Sign in first</a>
                      {" "}then follow the invitation link again.
                    </p>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AcceptStaffInvitationPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#08060D", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>Loading…</span>
      </div>
    }>
      <AcceptInvitationContent />
    </Suspense>
  );
}
