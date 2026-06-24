"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type PageState = "loading" | "form" | "already-set" | "invalid" | "saving" | "done" | "save-error";

export default function SetupPasswordPage() {
  const router = useRouter();
  const [pageState, setPageState] = useState<PageState>("loading");
  const [email, setEmail]     = useState("");
  const [token, setToken]     = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token") ?? "";
    if (!t) { setPageState("invalid"); return; }
    setToken(t);

    fetch(`/api/auth/setup-password?token=${encodeURIComponent(t)}`)
      .then((r) => r.json())
      .then((d: { valid: boolean; email?: string; password_set?: boolean }) => {
        if (!d.valid) { setPageState("invalid"); return; }
        if (d.password_set) { setPageState("already-set"); return; }
        setEmail(d.email ?? "");
        setPageState("form");
      })
      .catch(() => setPageState("invalid"));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    if (password !== confirm) { setErrorMsg("Passwords do not match."); return; }
    if (password.length < 8)  { setErrorMsg("Password must be at least 8 characters."); return; }

    setPageState("saving");

    const res = await fetch("/api/auth/setup-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErrorMsg((d as { error?: string }).error ?? "Failed to set password. Please try again.");
      setPageState("save-error");
      return;
    }

    setPageState("done");
    setTimeout(() => router.push("/"), 2000);
  }

  // ── Shell ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f9fafb", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src="/shepherd-kids-logo.png" alt="ShepherdKids" style={{ width: 160, height: "auto", borderRadius: 12 }} />
        </div>

        <div style={{ backgroundColor: "white", borderRadius: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.08)", padding: "36px 32px" }}>
          {pageState === "loading" && (
            <p style={{ textAlign: "center", color: "#9ca3af", fontSize: 14 }}>Verifying your setup link…</p>
          )}

          {pageState === "invalid" && (
            <>
              <div style={{ textAlign: "center", fontSize: 48, marginBottom: 12 }}>🔒</div>
              <h1 style={{ fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 700, color: "#111827", textAlign: "center", margin: "0 0 10px" }}>
                Invalid Setup Link
              </h1>
              <p style={{ fontSize: 14, color: "#6b7280", textAlign: "center", lineHeight: 1.6 }}>
                This setup link is invalid. Please contact your ShepherdKids administrator to request a new one.
              </p>
            </>
          )}

          {pageState === "already-set" && (
            <>
              <div style={{ textAlign: "center", fontSize: 48, marginBottom: 12 }}>✅</div>
              <h1 style={{ fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 700, color: "#111827", textAlign: "center", margin: "0 0 10px" }}>
                Password Already Created
              </h1>
              <p style={{ fontSize: 14, color: "#6b7280", textAlign: "center", lineHeight: 1.6, marginBottom: 24 }}>
                Your password has already been created. Please sign in.
              </p>
              <button
                onClick={() => router.push("/")}
                style={{ width: "100%", padding: "12px 0", borderRadius: 10, border: "none", backgroundColor: "#1A4A2E", color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer" }}
              >
                Go to Sign In
              </button>
            </>
          )}

          {pageState === "done" && (
            <>
              <div style={{ textAlign: "center", fontSize: 48, marginBottom: 12 }}>🎉</div>
              <h1 style={{ fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 700, color: "#111827", textAlign: "center", margin: "0 0 10px" }}>
                Password Set!
              </h1>
              <p style={{ fontSize: 14, color: "#6b7280", textAlign: "center", lineHeight: 1.6 }}>
                Your password has been created. Taking you to sign in…
              </p>
            </>
          )}

          {(pageState === "form" || pageState === "saving" || pageState === "save-error") && (
            <>
              <h1 style={{ fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 700, color: "#111827", margin: "0 0 6px" }}>
                Set Your Password
              </h1>
              {email && (
                <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 24px" }}>
                  Create a password for <strong style={{ color: "#111827" }}>{email}</strong>
                </p>
              )}

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    style={{ width: "100%", padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, color: "#111827", backgroundColor: "white", boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repeat your password"
                    style={{ width: "100%", padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, color: "#111827", backgroundColor: "white", boxSizing: "border-box" }}
                  />
                </div>

                {errorMsg && (
                  <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", color: "#dc2626", fontSize: 13 }}>
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={pageState === "saving"}
                  style={{ padding: "12px 0", borderRadius: 10, border: "none", backgroundColor: "#1A4A2E", color: "white", fontSize: 15, fontWeight: 700, cursor: pageState === "saving" ? "not-allowed" : "pointer", opacity: pageState === "saving" ? 0.7 : 1, marginTop: 4 }}
                >
                  {pageState === "saving" ? "Setting Password…" : "Set Password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
