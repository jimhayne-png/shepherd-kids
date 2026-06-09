"use client";

import { use, useEffect, useState } from "react";

const PRIVACY_OPTIONS = [
  {
    value: "anonymous",
    icon: "🔒",
    label: "Anonymous",
    description: "Only pastor sees this, no name attached",
  },
  {
    value: "private",
    icon: "🔐",
    label: "Private",
    description: "Pastor only, your name is visible",
  },
  {
    value: "prayer_team",
    icon: "🙏",
    label: "Prayer Team",
    description: "Pastor and prayer team",
  },
  {
    value: "congregation",
    icon: "💒",
    label: "Congregation",
    description: "Shared with the church family",
  },
];

export default function PrayPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);

  const [checking, setChecking] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [churchName, setChurchName] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const [privacy, setPrivacy] = useState("private");
  const [urgent, setUrgent] = useState(false);
  const [requestText, setRequestText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/prayer-requests/public?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.valid) {
          setChurchName(d.church_name ?? "Your Church");
        } else {
          setNotFound(true);
        }
        setChecking(false);
      })
      .catch(() => {
        setNotFound(true);
        setChecking(false);
      });
  }, [token]);

  // Update title and PWA meta tags once church name is known
  useEffect(() => {
    if (!churchName) return;

    document.title = `${churchName} — Prayer Request`;

    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("name", name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("apple-mobile-web-app-title", `${churchName} Prayer`);
  }, [churchName]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!requestText.trim()) {
      setError("Please share your prayer request before submitting.");
      return;
    }
    setSubmitting(true);
    setError("");

    const res = await fetch("/api/prayer-requests/public", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberToken: token,
        privacyLevel: privacy,
        requestText,
        isUrgent: urgent,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }

    setSubmitted(true);
    setSubmitting(false);
  }

  // Loading
  if (checking) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9f7f4" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🙏</div>
          <p style={{ color: "#9ca3af", fontFamily: "Georgia, serif" }}>Loading…</p>
        </div>
      </div>
    );
  }

  // Invalid token
  if (notFound) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9f7f4", padding: "24px" }}>
        <div style={{ textAlign: "center", maxWidth: "360px" }}>
          <div style={{ fontSize: "56px", marginBottom: "16px" }}>🔗</div>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: "22px", color: "#1f2937", marginBottom: "12px", fontWeight: "normal" }}>
            This link is no longer active
          </h1>
          <p style={{ color: "#6b7280", fontSize: "15px", lineHeight: "1.6", fontFamily: "Georgia, serif" }}>
            Please ask your pastor or church office for an updated prayer link.
          </p>
        </div>
      </div>
    );
  }

  // Success screen
  if (submitted) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f9f7f4", padding: "24px" }}>
        <div style={{ width: "100%", maxWidth: "400px", textAlign: "center" }}>
          {/* Logo */}
          <div style={{ marginBottom: "32px" }}>
            <img
              src="/shepherd-kids-logo.png"
              alt="ShepherdKids"
              style={{ width: "80px", height: "80px", borderRadius: "50%", objectFit: "cover", margin: "0 auto", display: "block", border: "2px solid rgba(26,74,46,0.2)" }}
            />
          </div>

          <div style={{ fontSize: "56px", marginBottom: "16px" }}>✝️</div>

          <h1 style={{ fontFamily: "Georgia, serif", fontSize: "26px", color: "#1A4A2E", marginBottom: "12px", fontWeight: "normal", lineHeight: "1.3" }}>
            Your prayer request has been received
          </h1>

          <p style={{ fontFamily: "Georgia, serif", fontSize: "17px", color: "#374151", lineHeight: "1.7", marginBottom: "8px" }}>
            Someone is praying for you right now.
          </p>

          <p style={{ fontFamily: "Georgia, serif", fontSize: "15px", color: "#9ca3af", marginBottom: "40px" }}>
            — {churchName}
          </p>

          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "12px", padding: "20px 24px", marginBottom: "32px" }}>
            <p style={{ fontFamily: "Georgia, serif", fontSize: "14px", color: "#166534", lineHeight: "1.7", margin: 0, fontStyle: "italic" }}>
              "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God."
            </p>
            <p style={{ fontFamily: "Georgia, serif", fontSize: "12px", color: "#4ade80", marginTop: "8px", marginBottom: 0 }}>
              — Philippians 4:6
            </p>
          </div>

          <button
            onClick={() => {
              setSubmitted(false);
              setRequestText("");
              setUrgent(false);
              setPrivacy("private");
              setError("");
            }}
            style={{
              width: "100%",
              padding: "16px",
              background: "#1A4A2E",
              color: "white",
              border: "none",
              borderRadius: "12px",
              fontSize: "16px",
              fontFamily: "Georgia, serif",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Submit Another Request
          </button>
        </div>
      </div>
    );
  }

  // Main form
  return (
    <div style={{ minHeight: "100dvh", background: "#f9f7f4", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ background: "#1A4A2E", padding: "24px 20px", textAlign: "center" }}>
        <img
          src="/shepherd-kids-logo.png"
          alt="ShepherdKids"
          style={{ width: "72px", height: "72px", borderRadius: "50%", objectFit: "cover", margin: "0 auto 12px", display: "block", border: "2px solid rgba(255,255,255,0.25)" }}
        />
        <h1 style={{ color: "white", margin: "0 0 4px", fontSize: "20px", fontFamily: "Georgia, serif", fontWeight: "normal" }}>
          Prayer Request
        </h1>
        <p style={{ color: "rgba(255,255,255,0.7)", margin: 0, fontSize: "14px", fontFamily: "Georgia, serif" }}>
          {churchName}
        </p>
      </div>

      {/* Form */}
      <div style={{ flex: 1, padding: "24px 20px", maxWidth: "500px", margin: "0 auto", width: "100%" }}>
        <form onSubmit={handleSubmit}>

          {/* Privacy selector */}
          <div style={{ marginBottom: "24px" }}>
            <p style={{ fontFamily: "Georgia, serif", fontSize: "14px", color: "#6b7280", marginBottom: "12px", marginTop: 0 }}>
              Who should see your request?
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {PRIVACY_OPTIONS.map((opt) => {
                const selected = privacy === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPrivacy(opt.value)}
                    style={{
                      padding: "14px 12px",
                      borderRadius: "12px",
                      border: selected ? "2px solid #1A4A2E" : "2px solid #e5e7eb",
                      background: selected ? "#f0fdf4" : "white",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ fontSize: "22px", marginBottom: "4px" }}>{opt.icon}</div>
                    <div style={{ fontFamily: "Georgia, serif", fontSize: "14px", fontWeight: "bold", color: selected ? "#1A4A2E" : "#1f2937", marginBottom: "2px" }}>
                      {opt.label}
                    </div>
                    <div style={{ fontFamily: "Georgia, serif", fontSize: "11px", color: "#6b7280", lineHeight: "1.4" }}>
                      {opt.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Urgent toggle */}
          <button
            type="button"
            onClick={() => setUrgent((u) => !u)}
            style={{
              width: "100%",
              padding: "16px 20px",
              borderRadius: "12px",
              border: urgent ? "2px solid #dc2626" : "2px solid #e5e7eb",
              background: urgent ? "#fef2f2" : "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "24px",
              transition: "all 0.15s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "24px" }}>⚠️</span>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontFamily: "Georgia, serif", fontSize: "15px", fontWeight: "bold", color: urgent ? "#dc2626" : "#1f2937" }}>
                  This is urgent
                </div>
                <div style={{ fontFamily: "Georgia, serif", fontSize: "12px", color: "#6b7280" }}>
                  Immediate prayer needed
                </div>
              </div>
            </div>
            <div style={{
              width: "44px",
              height: "26px",
              borderRadius: "13px",
              background: urgent ? "#dc2626" : "#d1d5db",
              position: "relative",
              transition: "background 0.2s",
              flexShrink: 0,
            }}>
              <div style={{
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                background: "white",
                position: "absolute",
                top: "3px",
                left: urgent ? "21px" : "3px",
                transition: "left 0.2s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }} />
            </div>
          </button>

          {/* Prayer request textarea */}
          <div style={{ marginBottom: "24px" }}>
            <textarea
              value={requestText}
              onChange={(e) => setRequestText(e.target.value)}
              placeholder="Share your prayer request…"
              rows={6}
              style={{
                width: "100%",
                padding: "16px",
                borderRadius: "12px",
                border: "2px solid #e5e7eb",
                fontSize: "16px",
                fontFamily: "Georgia, serif",
                color: "#1f2937",
                resize: "vertical",
                outline: "none",
                lineHeight: "1.6",
                boxSizing: "border-box",
                background: "white",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#1A4A2E")}
              onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
            />
          </div>

          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px" }}>
              <p style={{ color: "#dc2626", fontSize: "14px", fontFamily: "Georgia, serif", margin: 0 }}>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: "100%",
              padding: "18px",
              background: submitting ? "#4b7a5e" : "#1A4A2E",
              color: "white",
              border: "none",
              borderRadius: "12px",
              fontSize: "18px",
              fontFamily: "Georgia, serif",
              fontWeight: "bold",
              cursor: submitting ? "not-allowed" : "pointer",
              transition: "background 0.15s",
              letterSpacing: "0.01em",
            }}
          >
            {submitting ? "Sending…" : "🙏 Send Prayer Request"}
          </button>

          <p style={{ textAlign: "center", color: "#9ca3af", fontSize: "12px", fontFamily: "Georgia, serif", marginTop: "16px", lineHeight: "1.5" }}>
            Your request is handled with care and confidentiality.<br />
            Powered by ShepherdKids
          </p>
        </form>
      </div>
    </div>
  );
}
