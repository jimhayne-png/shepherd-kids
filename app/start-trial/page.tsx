"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// ── Design tokens ─────────────────────────────────────────────────────────────
const BG     = "#08060D";
const CARD   = "#120A1F";
const BORDER = "rgba(212,175,55,0.25)";
const GOLD   = "#D4AF37";
const TEXT   = "#ffffff";
const MUTED  = "rgba(255,255,255,0.55)";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
];

const FEATURES = [
  { label: "Welcome Every Family Safely",  desc: "Create a secure and welcoming check-in experience from the first visit." },
  { label: "Know Every Child",             desc: "Keep care notes, attendance, and family information organized." },
  { label: "Never Lose Track of Visitors", desc: "See who is new and know when follow-up is needed." },
  { label: "Equip Every Volunteer",        desc: "Give classroom volunteers simple, secure tools they can use confidently." },
  { label: "Save Hours Every Week",        desc: "Replace scattered notes and manual processes with one organized platform." },
  { label: "Shepherd Every Journey",       desc: "Track attendance, milestones, birthdays, and ongoing ministry care." },
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

// ── Shared input styles (dark) ────────────────────────────────────────────────
const INPUT: React.CSSProperties = {
  width: "100%", padding: "10px 13px",
  border: `1px solid ${BORDER}`,
  borderRadius: 8, fontSize: 14, color: TEXT,
  backgroundColor: "rgba(255,255,255,0.05)",
  boxSizing: "border-box", outline: "none",
};
const SELECT: React.CSSProperties = {
  ...INPUT, appearance: "none",
  backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'8\' viewBox=\'0 0 12 8\'%3E%3Cpath fill=\'%23D4AF37\' d=\'M1 1l5 5 5-5\'/%3E%3C/svg%3E")',
  backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: 32,
};
const LABEL: React.CSSProperties = {
  display: "block", fontSize: 13, fontWeight: 600,
  color: "rgba(255,255,255,0.8)", marginBottom: 5,
};
const SECTION_LABEL: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const,
  letterSpacing: "0.08em", color: GOLD, margin: "0 0 14px",
};
const DIVIDER: React.CSSProperties = {
  height: 1, backgroundColor: "rgba(212,175,55,0.15)", margin: "24px 0",
};
const TWO_COL: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
};

export default function StartTrialPage() {
  const router  = useRouter();
  const supabase = createClient();
  const honeypotRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>({
    churchName: "", city: "", state: "", phone: "", churchEmail: "",
    adminFirst: "", adminLast: "", adminEmail: "", password: "", confirm: "",
  });
  const [status,   setStatus]   = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function set(key: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validate(): string | null {
    if (!form.churchName.trim())          return "Church name is required.";
    if (!form.adminEmail.trim())          return "Admin email is required.";
    if (!form.password)                   return "Password is required.";
    if (form.password.length < 8)         return "Password must be at least 8 characters.";
    if (form.password !== form.confirm)   return "Passwords do not match.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    const err = validate();
    if (err) { setErrorMsg(err); return; }

    setStatus("submitting");

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
        website:     honeypotRef.current?.value ?? "",
      }),
    });

    if (res.status === 429) {
      setErrorMsg("Too many requests. Please wait a few minutes and try again.");
      setStatus("error");
      return;
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErrorMsg((data as { error?: string }).error ?? "Something went wrong. Please try again.");
      setStatus("error");
      return;
    }

    setStatus("signing-in");
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email:    form.adminEmail.trim().toLowerCase(),
      password: form.password,
    });

    if (signInErr) {
      setStatus("done");
      router.push("/?welcome=1");
      return;
    }

    setStatus("done");
    router.push("/dashboard/setup-wizard");
  }

  const busy = status === "submitting" || status === "signing-in";
  const btnLabel =
    status === "submitting" ? "Creating your account…" :
    status === "signing-in" ? "Signing you in…"        :
    "Start Free 14-Day Trial";

  return (
    <div style={{ minHeight: "100vh", backgroundColor: BG, display: "flex", flexDirection: "column", alignItems: "center", padding: "0 16px 60px" }}>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div style={{ textAlign: "center", padding: "48px 0 32px", maxWidth: 600, width: "100%" }}>
        <img
          src="/shepherd-kids-logo.png"
          alt="ShepherdKids"
          style={{ width: 160, height: "auto", borderRadius: 12, marginBottom: 20, border: "2px solid rgba(212,175,55,0.5)" }}
        />
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 32, fontWeight: 700, color: TEXT, margin: "0 0 14px", lineHeight: 1.35 }}>
          Welcome Every Family Safely.<br />
          Know Every Child.<br />
          Shepherd Every Journey.
        </h1>
        <p style={{ fontSize: 15, color: MUTED, margin: "0 auto 10px", lineHeight: 1.75, maxWidth: 500 }}>
          Everything your children's ministry needs to securely check in families, know every child, and shepherd every journey.
        </p>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: 0 }}>
          Start Your Free 14-Day Trial &middot; No credit card required &middot; $49/month after the free period.
        </p>
      </div>

      {/* ── Feature cards ────────────────────────────────────────────────── */}
      <div style={{
        width: "100%", maxWidth: 720, marginBottom: 32,
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10,
      }}>
        {FEATURES.map((f) => (
          <div key={f.label} style={{ backgroundColor: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px 18px" }}>
            <p style={{ color: "#4ade80", fontWeight: 700, fontSize: 13, margin: "0 0 3px" }}>
              ✔ {f.label}
            </p>
            <p style={{ color: MUTED, fontSize: 12, margin: 0, lineHeight: 1.5 }}>{f.desc}</p>
          </div>
        ))}
      </div>

      {/* ── Form card ────────────────────────────────────────────────────── */}
      <div style={{ width: "100%", maxWidth: 580, backgroundColor: CARD, borderRadius: 20, border: `1px solid ${BORDER}`, padding: "36px 32px 40px" }}>

        {/* Pricing notice */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>
            <span style={{ color: "#4ade80", fontWeight: 700 }}>No credit card required</span>
            {" · "}
            <span style={{ color: TEXT }}>$49/month after your free trial</span>
          </p>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div
            role="alert"
            aria-live="assertive"
            style={{ backgroundColor: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: 8, padding: "11px 15px", color: "#f87171", fontSize: 14, marginBottom: 20, lineHeight: 1.5 }}
          >
            {errorMsg}
            {errorMsg.includes("already exists") && (
              <> <Link href="/" style={{ color: "#f87171", fontWeight: 700, textDecoration: "underline" }}>Sign in here</Link>.</>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Honeypot — invisible to users, visible to bots */}
          <div style={{ position: "absolute", left: "-9999px", height: 0, overflow: "hidden" }} aria-hidden="true">
            <label htmlFor="hp_website">Website</label>
            <input id="hp_website" ref={honeypotRef} type="text" name="website" tabIndex={-1} autoComplete="off" />
          </div>

          {/* Church Information */}
          <p style={SECTION_LABEL}>Church Information</p>

          <div style={{ marginBottom: 14 }}>
            <label htmlFor="churchName" style={LABEL}>
              Church Name <span style={{ color: "#f87171" }} aria-hidden="true">*</span>
            </label>
            <input
              id="churchName" name="churchName"
              style={INPUT} type="text" required autoFocus
              placeholder="Grace Community Church"
              aria-required="true"
              value={form.churchName} onChange={(e) => set("churchName", e.target.value)}
            />
          </div>

          <div style={{ ...TWO_COL, marginBottom: 14 }}>
            <div>
              <label htmlFor="city" style={LABEL}>City</label>
              <input id="city" name="city" style={INPUT} type="text" placeholder="Nashville" value={form.city} onChange={(e) => set("city", e.target.value)} />
            </div>
            <div>
              <label htmlFor="state" style={LABEL}>State</label>
              <select id="state" name="state" style={SELECT} value={form.state} onChange={(e) => set("state", e.target.value)}>
                <option value="">— Select —</option>
                {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div style={{ ...TWO_COL, marginBottom: 0 }}>
            <div>
              <label htmlFor="phone" style={LABEL}>Church Phone</label>
              <input id="phone" name="phone" style={INPUT} type="tel" placeholder="(615) 555-0100" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div>
              <label htmlFor="churchEmail" style={LABEL}>Church Email</label>
              <input id="churchEmail" name="churchEmail" style={INPUT} type="email" placeholder="office@gracecc.org" value={form.churchEmail} onChange={(e) => set("churchEmail", e.target.value)} />
            </div>
          </div>

          <div style={DIVIDER} />

          {/* Your Account */}
          <p style={SECTION_LABEL}>Your Account</p>

          <div style={{ ...TWO_COL, marginBottom: 14 }}>
            <div>
              <label htmlFor="adminFirst" style={LABEL}>First Name</label>
              <input id="adminFirst" name="adminFirst" style={INPUT} type="text" placeholder="Sarah" value={form.adminFirst} onChange={(e) => set("adminFirst", e.target.value)} />
            </div>
            <div>
              <label htmlFor="adminLast" style={LABEL}>Last Name</label>
              <input id="adminLast" name="adminLast" style={INPUT} type="text" placeholder="Johnson" value={form.adminLast} onChange={(e) => set("adminLast", e.target.value)} />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label htmlFor="adminEmail" style={LABEL}>
              Admin Email <span style={{ color: "#f87171" }} aria-hidden="true">*</span>
            </label>
            <input
              id="adminEmail" name="adminEmail"
              style={INPUT} type="email" required
              placeholder="sarah@gracecc.org"
              aria-required="true"
              value={form.adminEmail} onChange={(e) => set("adminEmail", e.target.value)}
            />
          </div>

          <div style={{ ...TWO_COL, marginBottom: 0 }}>
            <div>
              <label htmlFor="password" style={LABEL}>
                Password <span style={{ color: "#f87171" }} aria-hidden="true">*</span>
              </label>
              <input
                id="password" name="password"
                style={INPUT} type="password" required
                placeholder="At least 8 characters"
                aria-required="true"
                value={form.password} onChange={(e) => set("password", e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="confirm" style={LABEL}>
                Confirm Password <span style={{ color: "#f87171" }} aria-hidden="true">*</span>
              </label>
              <input
                id="confirm" name="confirm"
                style={INPUT} type="password" required
                placeholder="Repeat password"
                aria-required="true"
                value={form.confirm} onChange={(e) => set("confirm", e.target.value)}
              />
            </div>
          </div>

          <div style={{ height: 28 }} />

          <button
            type="submit"
            disabled={busy}
            aria-busy={busy}
            aria-label={busy ? btnLabel : "Start your free 14-day trial"}
            style={{
              width: "100%", padding: "14px 0", borderRadius: 10, border: "none",
              background: busy ? "rgba(123,44,191,0.5)" : "linear-gradient(135deg, #7B2CBF, #9D4EDD)",
              color: "white", fontSize: 16, fontWeight: 700,
              cursor: busy ? "not-allowed" : "pointer",
              transition: "opacity 0.15s",
            }}
          >
            {btnLabel}
          </button>

          <p style={{ textAlign: "center", fontSize: 12, color: MUTED, marginTop: 14, marginBottom: 0 }}>
            By signing up you agree to our Terms of Service and Privacy Policy.
          </p>
        </form>
      </div>

      {/* Sign-in link */}
      <p style={{ marginTop: 24, fontSize: 14, color: MUTED }}>
        Already have an account?{" "}
        <Link href="/" style={{ color: GOLD, fontWeight: 600, textDecoration: "none" }}>
          Sign in
        </Link>
      </p>
    </div>
  );
}
