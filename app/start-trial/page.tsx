"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const DARK_GREEN = "#1A4A2E";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
];

type FormState = {
  churchName:  string;
  city:        string;
  state:       string;
  phone:       string;
  churchEmail: string;
  adminFirst:  string;
  adminLast:   string;
  adminEmail:  string;
  password:    string;
  confirm:     string;
};

type Status = "idle" | "submitting" | "signing-in" | "done" | "error";

const LABEL: React.CSSProperties = {
  display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 5,
};
const INPUT: React.CSSProperties = {
  width: "100%", padding: "10px 13px", border: "1px solid #d1d5db", borderRadius: 8,
  fontSize: 14, color: "#111827", backgroundColor: "white", boxSizing: "border-box",
  outline: "none",
};
const SELECT: React.CSSProperties = {
  ...INPUT, appearance: "none", backgroundImage:
    'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'8\' viewBox=\'0 0 12 8\'%3E%3Cpath fill=\'%236b7280\' d=\'M1 1l5 5 5-5\'/%3E%3C/svg%3E")',
  backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: 32,
};
const SECTION_LABEL: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const,
  letterSpacing: "0.08em", color: DARK_GREEN, margin: "0 0 14px",
};
const DIVIDER: React.CSSProperties = {
  height: 1, backgroundColor: "#f3f4f6", margin: "24px 0",
};
const ROW: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12,
};

export default function StartTrialPage() {
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState<FormState>({
    churchName: "", city: "", state: "", phone: "", churchEmail: "",
    adminFirst: "", adminLast: "", adminEmail: "", password: "", confirm: "",
  });
  const [status, setStatus]   = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function set(key: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validate(): string | null {
    if (!form.churchName.trim()) return "Church name is required.";
    if (!form.adminEmail.trim()) return "Admin email is required.";
    if (!form.password)          return "Password is required.";
    if (form.password.length < 8) return "Password must be at least 8 characters.";
    if (form.password !== form.confirm) return "Passwords do not match.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    const validationError = validate();
    if (validationError) { setErrorMsg(validationError); return; }

    setStatus("submitting");

    // 1. Create church + admin user server-side
    const res = await fetch("/api/start-trial", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        churchName:  form.churchName.trim(),
        city:        form.city.trim(),
        state:       form.state,
        phone:       form.phone.trim(),
        churchEmail: form.churchEmail.trim(),
        adminFirst:  form.adminFirst.trim(),
        adminLast:   form.adminLast.trim(),
        adminEmail:  form.adminEmail.trim(),
        password:    form.password,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErrorMsg((data as { error?: string }).error ?? "Something went wrong. Please try again.");
      setStatus("error");
      return;
    }

    // 2. Sign in automatically with the password they just set
    setStatus("signing-in");
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email:    form.adminEmail.trim().toLowerCase(),
      password: form.password,
    });

    if (signInErr) {
      // Account was created but auto sign-in failed — send them to login
      setStatus("done");
      router.push("/?welcome=1");
      return;
    }

    // 3. Redirect to billing so they can start their subscription
    setStatus("done");
    router.push("/dashboard/billing");
  }

  const busy = status === "submitting" || status === "signing-in";

  const btnLabel =
    status === "submitting"  ? "Creating your account…" :
    status === "signing-in"  ? "Signing you in…"        :
    "Start Free 14-Day Trial";

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f0fdf4", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", padding: "40px 16px 60px" }}>
      {/* Logo + headline */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <img src="/shepherd-kids-logo.png" alt="ShepherdKids" style={{ width: 160, height: "auto", borderRadius: 12, marginBottom: 16 }} />
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 28, fontWeight: 700, color: "#111827", margin: "0 0 8px" }}>
          Start Your Free 14-Day Trial
        </h1>
        <p style={{ fontSize: 15, color: "#6b7280", margin: 0 }}>
          No credit card required to start. Cancel anytime.
        </p>
      </div>

      {/* Plan badge */}
      <div style={{ backgroundColor: "white", border: "1px solid #bbf7d0", borderRadius: 10, padding: "10px 20px", marginBottom: 28, display: "flex", alignItems: "center", gap: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
        <span style={{ fontSize: 18 }}>✅</span>
        <span style={{ fontSize: 14, color: "#374151" }}>
          <strong style={{ color: DARK_GREEN }}>ShepherdKids</strong> — $49/month after trial
        </span>
      </div>

      {/* Form card */}
      <div style={{ width: "100%", maxWidth: 580, backgroundColor: "white", borderRadius: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.08)", padding: "36px 36px 40px" }}>
        {errorMsg && (
          <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "11px 15px", color: "#dc2626", fontSize: 14, marginBottom: 20, lineHeight: 1.5 }}>
            {errorMsg}
            {errorMsg.includes("already exists") && (
              <> <Link href="/" style={{ color: "#dc2626", fontWeight: 700, textDecoration: "underline" }}>Sign in here</Link>.</>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* ── Church Info ── */}
          <p style={SECTION_LABEL}>Church Information</p>

          <div style={{ marginBottom: 14 }}>
            <label style={LABEL}>Church Name <span style={{ color: "#dc2626" }}>*</span></label>
            <input
              style={INPUT} type="text" required autoFocus
              placeholder="Grace Community Church"
              value={form.churchName} onChange={(e) => set("churchName", e.target.value)}
            />
          </div>

          <div style={{ ...ROW, marginBottom: 14 }}>
            <div>
              <label style={LABEL}>City</label>
              <input style={INPUT} type="text" placeholder="Nashville" value={form.city} onChange={(e) => set("city", e.target.value)} />
            </div>
            <div>
              <label style={LABEL}>State</label>
              <select style={SELECT} value={form.state} onChange={(e) => set("state", e.target.value)}>
                <option value="">— Select —</option>
                {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div style={{ ...ROW, marginBottom: 0 }}>
            <div>
              <label style={LABEL}>Church Phone</label>
              <input style={INPUT} type="tel" placeholder="(615) 555-0100" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div>
              <label style={LABEL}>Church Email</label>
              <input style={INPUT} type="email" placeholder="office@gracecc.org" value={form.churchEmail} onChange={(e) => set("churchEmail", e.target.value)} />
            </div>
          </div>

          <div style={DIVIDER} />

          {/* ── Admin Account ── */}
          <p style={SECTION_LABEL}>Your Account</p>

          <div style={{ ...ROW, marginBottom: 14 }}>
            <div>
              <label style={LABEL}>First Name</label>
              <input style={INPUT} type="text" placeholder="Sarah" value={form.adminFirst} onChange={(e) => set("adminFirst", e.target.value)} />
            </div>
            <div>
              <label style={LABEL}>Last Name</label>
              <input style={INPUT} type="text" placeholder="Johnson" value={form.adminLast} onChange={(e) => set("adminLast", e.target.value)} />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={LABEL}>Admin Email <span style={{ color: "#dc2626" }}>*</span></label>
            <input
              style={INPUT} type="email" required
              placeholder="sarah@gracecc.org"
              value={form.adminEmail} onChange={(e) => set("adminEmail", e.target.value)}
            />
          </div>

          <div style={{ ...ROW, marginBottom: 0 }}>
            <div>
              <label style={LABEL}>Password <span style={{ color: "#dc2626" }}>*</span></label>
              <input
                style={INPUT} type="password" required
                placeholder="At least 8 characters"
                value={form.password} onChange={(e) => set("password", e.target.value)}
              />
            </div>
            <div>
              <label style={LABEL}>Confirm Password <span style={{ color: "#dc2626" }}>*</span></label>
              <input
                style={INPUT} type="password" required
                placeholder="Repeat password"
                value={form.confirm} onChange={(e) => set("confirm", e.target.value)}
              />
            </div>
          </div>

          <div style={{ height: 28 }} />

          <button
            type="submit"
            disabled={busy}
            style={{
              width: "100%", padding: "14px 0", borderRadius: 10, border: "none",
              backgroundColor: busy ? "#4a7c5e" : DARK_GREEN, color: "white",
              fontSize: 16, fontWeight: 700, cursor: busy ? "not-allowed" : "pointer",
              transition: "background-color 0.15s",
            }}
          >
            {btnLabel}
          </button>

          <p style={{ textAlign: "center", fontSize: 12, color: "#9ca3af", marginTop: 14, marginBottom: 0 }}>
            By signing up you agree to our Terms of Service and Privacy Policy.
          </p>
        </form>
      </div>

      {/* Sign-in link */}
      <p style={{ marginTop: 24, fontSize: 14, color: "#6b7280" }}>
        Already have an account?{" "}
        <Link href="/" style={{ color: DARK_GREEN, fontWeight: 600, textDecoration: "none" }}>
          Sign in
        </Link>
      </p>
    </div>
  );
}
