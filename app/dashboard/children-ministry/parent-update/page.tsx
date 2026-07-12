"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { selectedChurchHeaders } from "@/lib/selected-church";

const GOLD    = "#D4AF37";
const MUTED   = "#A9A9B8";
const BODY    = "#D8D8E8";
const CARD    = "#120A1F";
const PURPLE  = "#7B2CBF";
const PURPLE2 = "#9D4EDD";

type RecipientContact = {
  email: string;
  displayName: string;
  householdName: string;
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 13px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(212,175,55,0.3)",
  borderRadius: "8px",
  fontSize: "13px",
  color: "#ffffff",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "11px",
  fontWeight: 700,
  color: MUTED,
  marginBottom: "6px",
  letterSpacing: "0.05em",
  textTransform: "uppercase",
};

function ConfirmSendModal({
  subject,
  familyCount,
  emailCount,
  onCancel,
  onConfirm,
}: {
  subject: string;
  familyCount: number;
  emailCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.80)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "24px",
      }}
    >
      <div
        style={{
          background: "#150E22",
          border: "1px solid rgba(212,175,55,0.28)",
          borderRadius: "16px", padding: "28px",
          maxWidth: "420px", width: "100%",
          boxShadow: "0 8px 64px rgba(0,0,0,0.70)",
        }}
      >
        <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#ffffff", margin: "0 0 16px", fontFamily: "Georgia, serif" }}>
          Send Family Email
        </h3>

        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "10px", padding: "14px", marginBottom: "20px",
          }}
        >
          <p style={{ fontSize: "11px", color: MUTED, margin: "0 0 3px", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>Subject</p>
          <p style={{ fontSize: "13px", color: BODY, margin: "0 0 12px" }}>{subject}</p>
          <p style={{ fontSize: "11px", color: MUTED, margin: "0 0 3px", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>Recipients</p>
          <p style={{ fontSize: "13px", color: BODY, margin: 0 }}>
            {familyCount} {familyCount !== 1 ? "families" : "family"} · {emailCount} email {emailCount !== 1 ? "addresses" : "address"}
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: "11px", borderRadius: "10px", border: "none",
              cursor: "pointer",
              background: `linear-gradient(135deg, ${PURPLE}, ${PURPLE2})`,
              color: "#fff", fontSize: "13px", fontWeight: 700,
            }}
          >
            Confirm and Send
          </button>
          <button
            onClick={onCancel}
            style={{
              padding: "11px 20px", borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.08)",
              cursor: "pointer", background: "transparent", color: MUTED, fontSize: "13px",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ParentCommunicationPage() {
  const [contacts, setContacts] = useState<RecipientContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [churchName, setChurchName] = useState("Your Church");
  const [churchLogoUrl, setChurchLogoUrl] = useState<string | null>(null);

  const [recipientMode, setRecipientMode] = useState<"all" | "selected">("all");
  const [search, setSearch] = useState("");
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  // Signature — populated from church settings once loaded
  const [sigName, setSigName] = useState("Your Children's Ministry Team");
  const [sigTitle, setSigTitle] = useState("Children's Ministry");

  const [showPreview, setShowPreview] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    const headers = selectedChurchHeaders();
    Promise.all([
      fetch("/api/children-ministry/parent-email", { credentials: "include", headers }),
      fetch("/api/settings", { credentials: "include", headers }),
    ]).then(async ([contactsRes, settingsRes]) => {
      if (contactsRes.ok) {
        const d = await contactsRes.json();
        setContacts(d.contacts ?? []);
      }
      if (settingsRes.ok) {
        const d = await settingsRes.json();
        if (d.church?.name) setChurchName(d.church.name);
        if (d.church?.logo_url) setChurchLogoUrl(d.church.logo_url);
        const cp = (d.church?.children_pastor ?? "").trim();
        setSigName(cp || "Your Children's Ministry Team");
      }
      setLoadingContacts(false);
    });
  }, []);

  const filteredContacts = useMemo(() => {
    if (!search.trim()) return contacts;
    const q = search.toLowerCase();
    return contacts.filter(
      c =>
        c.email.toLowerCase().includes(q) ||
        c.displayName.toLowerCase().includes(q) ||
        c.householdName.toLowerCase().includes(q),
    );
  }, [contacts, search]);

  // Family counts — distinct householdName values
  const allFamilyCount = useMemo(
    () => new Set(contacts.map(c => c.householdName)).size,
    [contacts],
  );

  const selectedFamilyCount = useMemo(() => {
    const sel = contacts.filter(c => selectedEmails.has(c.email));
    return new Set(sel.map(c => c.householdName)).size;
  }, [contacts, selectedEmails]);

  const emailCount = recipientMode === "all" ? contacts.length : selectedEmails.size;
  const familyCount = recipientMode === "all" ? allFamilyCount : selectedFamilyCount;

  function toggleEmail(email: string) {
    setSelectedEmails(prev => {
      const next = new Set(prev);
      next.has(email) ? next.delete(email) : next.add(email);
      return next;
    });
  }

  function selectAllFiltered() {
    setSelectedEmails(prev => {
      const next = new Set(prev);
      filteredContacts.forEach(c => next.add(c.email));
      return next;
    });
  }

  function deselectAllFiltered() {
    setSelectedEmails(prev => {
      const next = new Set(prev);
      filteredContacts.forEach(c => next.delete(c.email));
      return next;
    });
  }

  async function handleSend() {
    setShowConfirm(false);
    setSending(true);
    setSendError(null);
    setSendSuccess(null);

    try {
      const res = await fetch("/api/children-ministry/parent-email", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...selectedChurchHeaders() },
        body: JSON.stringify({
          subject: subject.trim(),
          message: message.trim(),
          recipientMode,
          selectedEmails:
            recipientMode === "selected" ? Array.from(selectedEmails) : undefined,
          signatureName: sigName.trim(),
          signatureTitle: sigTitle.trim(),
        }),
      });

      const d = await res.json();
      if (!res.ok) {
        setSendError(d.error ?? "Failed to send. Please try again.");
        return;
      }

      setSendSuccess(
        `Email sent to ${d.sent} email ${d.sent !== 1 ? "addresses" : "address"}.`,
      );
    } catch {
      setSendError("Failed to send. Please try again.");
    } finally {
      setSending(false);
    }
  }

  const canSend =
    !!subject.trim() &&
    !!message.trim() &&
    emailCount > 0 &&
    !sending;

  const sendButtonLabel = sending
    ? "Sending…"
    : recipientMode === "all"
    ? "Send to All Families"
    : `Send to ${familyCount} ${familyCount !== 1 ? "Families" : "Family"}`;

  // Signature preview text for inline hint
  const sigPreview = [sigName || "—", sigTitle, churchName].filter(Boolean).join(" · ");

  return (
    <AppShell navItems={[]}>
      {/* Hero */}
      <div style={{ padding: "40px 32px 32px", background: "linear-gradient(135deg, #08060D 0%, #1C0A30 100%)" }}>
        <p style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.06em", color: GOLD, marginBottom: "6px", textTransform: "uppercase" }}>
          ShepherdKids
        </p>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#ffffff", margin: "0 0 6px", fontFamily: "Georgia, serif" }}>
          Parent Communication
        </h1>
        <p style={{ fontSize: "13px", color: MUTED, margin: 0 }}>
          Write and send a message to families in your children&apos;s ministry.
        </p>
      </div>

      <div style={{ backgroundColor: "#0A0814", minHeight: "100vh", padding: "32px" }}>
        <div style={{ maxWidth: "840px" }}>

          {/* ── Communication type tabs ── */}
          <div style={{ display: "flex", gap: "4px", marginBottom: "24px", background: "rgba(255,255,255,0.04)", borderRadius: "10px", padding: "4px" }}>
            <span
              style={{
                flex: 1, textAlign: "center",
                padding: "9px 16px", borderRadius: "8px",
                fontSize: "13px", fontWeight: 700,
                background: "rgba(212,175,55,0.12)", color: "#D4AF37",
                display: "block",
              }}
            >
              General Email
            </span>
            <Link
              href="/dashboard/children-ministry/parent-update/lesson-plan"
              style={{
                flex: 1, textAlign: "center",
                padding: "9px 16px", borderRadius: "8px",
                fontSize: "13px", fontWeight: 400,
                background: "transparent", color: "#A9A9B8",
                textDecoration: "none", display: "block",
              }}
            >
              Children&apos;s Lesson Plan
            </Link>
          </div>

          {/* ── Main composer ── */}
          <div
            style={{
              background: CARD,
              border: "1px solid rgba(212,175,55,0.22)",
              borderRadius: "18px",
              padding: "28px",
              marginBottom: "20px",
            }}
          >
            {/* Recipients */}
            <div style={{ marginBottom: "24px" }}>
              <label style={labelStyle}>Recipients</label>

              <div style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
                {(["all", "selected"] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setRecipientMode(mode)}
                    style={{
                      padding: "8px 18px",
                      borderRadius: "8px",
                      border: `1.5px solid ${recipientMode === mode ? "rgba(212,175,55,0.5)" : "rgba(255,255,255,0.12)"}`,
                      background: recipientMode === mode ? "rgba(212,175,55,0.08)" : "transparent",
                      color: recipientMode === mode ? GOLD : MUTED,
                      fontSize: "13px",
                      fontWeight: recipientMode === mode ? 700 : 400,
                      cursor: "pointer",
                    }}
                  >
                    {mode === "all" ? "All Families" : "Selected Families"}
                  </button>
                ))}
              </div>

              {recipientMode === "all" && (
                <p style={{ fontSize: "13px", color: BODY, margin: 0 }}>
                  {loadingContacts
                    ? "Loading…"
                    : contacts.length === 0
                    ? "No family email addresses on file."
                    : `Recipients: ${allFamilyCount} ${allFamilyCount !== 1 ? "families" : "family"} · ${contacts.length} email ${contacts.length !== 1 ? "addresses" : "address"}`}
                </p>
              )}

              {recipientMode === "selected" && (
                <div>
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name, household, or email…"
                    style={{ ...inputStyle, marginBottom: "8px" }}
                  />

                  {!loadingContacts && contacts.length > 0 && (
                    <div
                      style={{
                        display: "flex", alignItems: "center", gap: "12px",
                        marginBottom: "6px",
                      }}
                    >
                      <span style={{ fontSize: "12px", color: MUTED }}>
                        {selectedEmails.size === 0
                          ? "None selected"
                          : `${selectedFamilyCount} ${selectedFamilyCount !== 1 ? "families" : "family"} · ${selectedEmails.size} email ${selectedEmails.size !== 1 ? "addresses" : "address"}`}
                      </span>
                      <button
                        onClick={selectAllFiltered}
                        style={{ fontSize: "12px", color: GOLD, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                      >
                        Select all
                      </button>
                      <button
                        onClick={deselectAllFiltered}
                        style={{ fontSize: "12px", color: MUTED, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                      >
                        Deselect all
                      </button>
                    </div>
                  )}

                  <div
                    style={{
                      maxHeight: "220px", overflowY: "auto",
                      border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: "10px",
                    }}
                  >
                    {loadingContacts ? (
                      <p style={{ color: MUTED, fontSize: "13px", padding: "14px", margin: 0 }}>Loading…</p>
                    ) : filteredContacts.length === 0 ? (
                      <p style={{ color: MUTED, fontSize: "13px", padding: "14px", margin: 0 }}>
                        {search.trim() ? "No matches." : "No family email addresses on file."}
                      </p>
                    ) : (
                      filteredContacts.map(c => (
                        <label
                          key={c.email}
                          style={{
                            display: "flex", alignItems: "center", gap: "12px",
                            padding: "10px 14px",
                            borderBottom: "1px solid rgba(255,255,255,0.04)",
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedEmails.has(c.email)}
                            onChange={() => toggleEmail(c.email)}
                            style={{ flexShrink: 0, accentColor: PURPLE }}
                          />
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: "13px", fontWeight: 600, color: "#ffffff", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {c.displayName}
                            </p>
                            <p style={{ fontSize: "11px", color: MUTED, margin: 0 }}>
                              {c.householdName} · {c.email}
                            </p>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Subject */}
            <div style={{ marginBottom: "18px" }}>
              <label style={labelStyle}>Subject *</label>
              <input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Message subject…"
                style={inputStyle}
              />
            </div>

            {/* Message */}
            <div style={{ marginBottom: "18px" }}>
              <label style={labelStyle}>Message *</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={8}
                placeholder="Write your message to families…"
                style={{ ...inputStyle, resize: "vertical", minHeight: "160px" }}
              />
            </div>

            {/* Signature */}
            <div
              style={{
                borderTop: "1px solid rgba(255,255,255,0.07)",
                paddingTop: "18px",
                marginBottom: "22px",
              }}
            >
              <label style={{ ...labelStyle, marginBottom: "12px" }}>Email Signature</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "10px" }}>
                <div>
                  <label style={{ ...labelStyle, fontSize: "10px" }}>Signature Name</label>
                  <input
                    value={sigName}
                    onChange={e => setSigName(e.target.value)}
                    placeholder="Your Children's Ministry Team"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ ...labelStyle, fontSize: "10px" }}>Signature Title</label>
                  <input
                    value={sigTitle}
                    onChange={e => setSigTitle(e.target.value)}
                    placeholder="Children's Ministry"
                    style={inputStyle}
                  />
                </div>
              </div>
              <p style={{ fontSize: "11px", color: MUTED, margin: 0 }}>
                Preview: Blessings, · <span style={{ color: BODY }}>{sigPreview}</span>
              </p>
            </div>

            {/* Feedback */}
            {sendError && (
              <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.30)", borderRadius: "10px", marginBottom: "14px" }}>
                <p style={{ color: "#FCA5A5", fontSize: "12px", margin: 0 }}>{sendError}</p>
              </div>
            )}
            {sendSuccess && (
              <div style={{ padding: "10px 14px", background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.30)", borderRadius: "10px", marginBottom: "14px" }}>
                <p style={{ color: "#34D399", fontSize: "12px", fontWeight: 700, margin: 0 }}>✓ {sendSuccess}</p>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <button
                onClick={() => setShowPreview(true)}
                style={{
                  padding: "9px 18px",
                  border: "1px solid rgba(212,175,55,0.4)",
                  borderRadius: "10px",
                  fontSize: "13px", fontWeight: 600,
                  color: GOLD, background: "transparent", cursor: "pointer",
                }}
              >
                Preview Email
              </button>

              <button
                onClick={() => setShowConfirm(true)}
                disabled={!canSend}
                style={{
                  padding: "9px 22px", borderRadius: "10px", border: "none",
                  fontSize: "13px", fontWeight: 700, color: "#ffffff",
                  background: !canSend
                    ? "rgba(123,44,191,0.35)"
                    : `linear-gradient(135deg, ${PURPLE}, ${PURPLE2})`,
                  cursor: !canSend ? "not-allowed" : "pointer",
                }}
              >
                {sendButtonLabel}
              </button>
            </div>
          </div>

          {/* ── Annual Family Safety Review — secondary link ── */}
          <div
            style={{
              background: CARD,
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "14px",
              padding: "18px 22px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
            }}
          >
            <div>
              <p style={{ fontSize: "14px", fontWeight: 700, color: BODY, margin: "0 0 3px" }}>
                Annual Family Safety Review
              </p>
              <p style={{ fontSize: "12px", color: MUTED, margin: 0 }}>
                Send a secure family-information review link to selected families.
              </p>
            </div>
            <Link
              href="/dashboard/children-ministry/family-safety-review"
              style={{
                flexShrink: 0,
                display: "inline-flex", alignItems: "center", gap: "4px",
                fontSize: "12px", fontWeight: 600, color: BODY,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "8px", padding: "7px 14px",
                textDecoration: "none",
              }}
            >
              Open Safety Reviews →
            </Link>
          </div>

        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div
          style={{
            position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 50, padding: "16px",
          }}
          onClick={() => setShowPreview(false)}
        >
          <div
            style={{
              background: "#120A1F",
              border: "1px solid rgba(212,175,55,0.3)",
              borderRadius: "18px", width: "100%", maxWidth: "560px",
              maxHeight: "88vh", overflowY: "auto",
            }}
            onClick={e => e.stopPropagation()}
          >
            <div
              style={{
                position: "sticky", top: 0, background: "#120A1F",
                borderBottom: "1px solid rgba(212,175,55,0.15)",
                padding: "18px 24px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                borderRadius: "18px 18px 0 0",
              }}
            >
              <h2 style={{ fontWeight: 700, color: "#ffffff", margin: 0, fontSize: "15px" }}>Email Preview</h2>
              <button
                onClick={() => setShowPreview(false)}
                style={{ color: MUTED, background: "none", border: "none", cursor: "pointer", fontSize: "18px", lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: "24px" }}>
              <div style={{ fontFamily: "Arial,sans-serif", borderRadius: "10px", overflow: "hidden", border: "1px solid #e5e7eb" }}>
                {/* Header */}
                <div style={{ background: "linear-gradient(135deg, #7B2CBF, #9D4EDD)", padding: "22px 26px", textAlign: "center" }}>
                  {churchLogoUrl && (
                    <img
                      src={churchLogoUrl}
                      alt={churchName}
                      style={{ maxHeight: "60px", display: "block", margin: "0 auto 10px" }}
                    />
                  )}
                  <h1 style={{ color: "white", margin: 0, fontSize: "20px", fontWeight: "bold" }}>{churchName}</h1>
                </div>

                {/* Body */}
                <div style={{ background: "white", padding: "30px 26px" }}>
                  {subject && (
                    <h2 style={{ color: "#1f2937", fontSize: "17px", margin: "0 0 16px", fontWeight: 700 }}>
                      {subject}
                    </h2>
                  )}
                  {message ? (
                    message.split("\n").map((line, i) =>
                      line.trim() ? (
                        <p key={i} style={{ fontSize: "15px", color: "#374151", lineHeight: "1.7", margin: "0 0 12px" }}>
                          {line}
                        </p>
                      ) : null,
                    )
                  ) : (
                    <p style={{ fontSize: "15px", color: "#9ca3af", fontStyle: "italic" }}>
                      Your message will appear here.
                    </p>
                  )}

                  {/* Signature */}
                  <div style={{ marginTop: "24px" }}>
                    <p style={{ fontSize: "15px", color: "#374151", margin: "0 0 14px", lineHeight: 1 }}>
                      Blessings,
                    </p>
                    <p style={{ fontSize: "15px", color: "#374151", margin: 0, lineHeight: "1.8" }}>
                      <strong>{sigName || "Your Children's Ministry Team"}</strong>
                      {sigTitle && (
                        <>
                          <br />
                          {sigTitle}
                        </>
                      )}
                      <br />
                      {churchName}
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div style={{ background: "#F2F2F2", padding: "16px", textAlign: "center", fontSize: "12px", color: "#666" }}>
                  {churchName} — Children&apos;s Ministry
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {showConfirm && (
        <ConfirmSendModal
          subject={subject}
          familyCount={familyCount}
          emailCount={emailCount}
          onCancel={() => setShowConfirm(false)}
          onConfirm={handleSend}
        />
      )}
    </AppShell>
  );
}
