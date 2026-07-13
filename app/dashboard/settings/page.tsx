"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AppShell, { type NavItem } from "@/components/layout/AppShell";
import { selectedChurchHeaders } from "@/lib/selected-church";
import { isAdminRole } from "@/lib/staff-permissions";
import StaffAccessTab from "./StaffAccessTab";

const supabase = createClient();
const navItems: NavItem[] = [];

const BG       = "#08060D";
const CARD     = "#120A1F";
const BORDER   = "rgba(212,175,55,0.18)";
const GOLD     = "#D4AF37";
const PURPLE   = "#7B2CBF";
const TEXT     = "#ffffff";
const MUTED    = "rgba(255,255,255,0.5)";
const INPUT_BG = "rgba(255,255,255,0.05)";
const INPUT_BD = "rgba(255,255,255,0.12)";

type Tab = "profile" | "church" | "platform" | "staff" | "security" | "subscription";
const TABS: { id: Tab; label: string }[] = [
  { id: "profile",      label: "Profile" },
  { id: "church",       label: "Church" },
  { id: "platform",     label: "Platform" },
  { id: "staff",        label: "Staff Access" },
  { id: "security",     label: "Security" },
  { id: "subscription", label: "Subscription" },
];

type ChurchForm = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  website: string;
  logo_url: string;
  timezone: string;
  senior_pastor: string;
  children_pastor: string;
  label_mode: string;
};

const EMPTY: ChurchForm = {
  name: "", email: "", phone: "", address: "", city: "", state: "",
  zip: "", website: "", logo_url: "", timezone: "America/Los_Angeles",
  senior_pastor: "", children_pastor: "",
  label_mode: "smart",
};

// ── Shared input components ──────────────────────────────────────────────────

function DarkInput({
  label, value, onChange, type = "text", readOnly = false, placeholder,
}: {
  label: string; value: string; onChange?: (v: string) => void;
  type?: string; readOnly?: boolean; placeholder?: string;
}) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: MUTED, marginBottom: 6 }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        placeholder={placeholder}
        onChange={e => onChange?.(e.target.value)}
        style={{
          width: "100%", boxSizing: "border-box",
          background: readOnly ? "rgba(255,255,255,0.02)" : INPUT_BG,
          border: `1px solid ${INPUT_BD}`, borderRadius: 8,
          padding: "9px 12px", fontSize: 14,
          color: readOnly ? MUTED : TEXT, outline: "none",
        }}
      />
    </div>
  );
}

function DarkSelect({
  label, value, onChange, options,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: MUTED, marginBottom: 6 }}>
        {label}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: "100%", boxSizing: "border-box",
          background: CARD, border: `1px solid ${INPUT_BD}`,
          borderRadius: 8, padding: "9px 12px", fontSize: 14, color: TEXT, outline: "none",
        }}
      >
        {options.map(o => <option key={o.value} value={o.value} style={{ background: CARD }}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Card({ children, title, subtitle }: { children: React.ReactNode; title?: string; subtitle?: string }) {
  return (
    <section style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "24px 28px", marginBottom: 20 }}>
      {title && <h2 style={{ margin: "0 0 2px", fontSize: 15, fontWeight: 700, color: GOLD, fontFamily: "Georgia, serif" }}>{title}</h2>}
      {subtitle && <p style={{ margin: "0 0 18px", fontSize: 12, color: MUTED }}>{subtitle}</p>}
      {!subtitle && title && <div style={{ marginBottom: 18 }} />}
      {children}
    </section>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();

  const [tab, setTab]             = useState<Tab>("profile");
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole]   = useState<string>("");
  const [displayName, setDisplayName] = useState("");
  const [form, setForm]           = useState<ChurchForm>(EMPTY);
  const [billing, setBilling]     = useState<{ subscription_status?: string; subscription_tier?: string; trial_ends_at?: string }>({});
  const [token, setToken]         = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [warnings, setWarnings]   = useState<string[]>([]);
  const [saving, setSaving]       = useState(false);
  const [msg, setMsg]             = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  function setStr(key: keyof ChurchForm) {
    return (v: string) => setForm(f => ({ ...f, [key]: v }));
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSessionExpired(true); setLoading(false); return; }
      setUserEmail(user.email ?? "");
      setDisplayName((user.user_metadata as Record<string, string> | null)?.full_name ?? "");

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setSessionExpired(true); setLoading(false); return; }
      const t = session.access_token;
      setToken(t);

      const res = await fetch("/api/settings", { headers: { Authorization: `Bearer ${t}`, ...selectedChurchHeaders() } });
      if (res.ok) {
        const { church, userRole: role, warnings: w } = await res.json();
        setUserRole(role ?? "");
        setWarnings(w ?? []);
        setForm({
          name:            church.name ?? "",
          email:           church.email ?? "",
          phone:           church.phone ?? "",
          address:         church.address ?? "",
          city:            church.city ?? "",
          state:           church.state ?? "",
          zip:             church.zip ?? "",
          website:         church.website ?? "",
          logo_url:        church.logo_url ?? "",
          timezone:        church.timezone ?? "America/Los_Angeles",
          senior_pastor:   church.senior_pastor ?? "",
          children_pastor: church.children_pastor ?? "",
          label_mode:      church.label_mode ?? "smart",
        });
        setBilling({
          subscription_status: church.subscription_status ?? "",
          subscription_tier:   church.subscription_tier ?? "",
          trial_ends_at:       church.trial_ends_at ?? "",
        });
      } else {
        const d = await res.json().catch(() => ({}));
        setFetchError(d.error ?? "Failed to load settings. Please try again.");
      }
      setLoading(false);
    }
    init();
  }, []);

  async function handleSave() {
    setSaving(true);
    setMsg(null);
    const { data: { session } } = await supabase.auth.getSession();
    const t = session?.access_token ?? token;
    if (!t) { setSaving(false); setSessionExpired(true); return; }

    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}`, ...selectedChurchHeaders() },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      setMsg({ type: "ok", text: "Settings saved successfully." });
      setTimeout(() => setMsg(null), 4000);
    } else {
      const d = await res.json().catch(() => ({}));
      setMsg({ type: "err", text: d.error ?? "Failed to save settings." });
    }
  }

  async function handleResetPassword() {
    if (!userEmail) return;
    const redirectTo = `${window.location.origin}/auth/callback?next=/auth/reset-password`;
    await supabase.auth.resetPasswordForEmail(userEmail, { redirectTo });
    setResetSent(true);
    setTimeout(() => setResetSent(false), 6000);
  }

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/");
  }

  const g2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 };
  const s2: React.CSSProperties = { gridColumn: "1 / -1" };

  const planLabel: Record<string, string> = {
    very_small: "Vine", small: "Vine", medium: "Grove", large: "Orchard",
    enterprise: "Orchard", vine: "Vine", grove: "Grove", orchard: "Orchard",
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: BG }}>
        <span style={{ color: MUTED, fontSize: 14 }}>Loading…</span>
      </div>
    );
  }

  const showSave = tab === "profile" || tab === "church" || tab === "platform";

  return (
    <AppShell navItems={navItems}>

      {/* ── Header + Tab bar ──────────────────────────────────────────────── */}
      <div style={{ background: CARD, borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ padding: "28px 36px 0" }}>
          <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: GOLD }}>
            Settings
          </p>
          <h1 style={{ margin: "0 0 20px", fontSize: 24, fontWeight: 700, color: TEXT, fontFamily: "Georgia, serif" }}>
            Account & Church Settings
          </h1>
        </div>

        <div style={{ display: "flex", gap: 0, paddingLeft: 28, overflowX: "auto" }}>
          {TABS.filter(t => t.id !== "staff" || isAdminRole(userRole)).map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setMsg(null); }}
              style={{
                padding: "10px 22px", background: "none", border: "none", cursor: "pointer",
                fontSize: 14, fontWeight: tab === t.id ? 700 : 400,
                color: tab === t.id ? GOLD : MUTED,
                borderBottom: `2px solid ${tab === t.id ? GOLD : "transparent"}`,
                transition: "color 0.15s, border-color 0.15s",
                whiteSpace: "nowrap",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div style={{ background: BG, minHeight: "calc(100vh - 152px)", padding: "32px 36px 64px" }}>
        <div style={{ maxWidth: 700 }}>

          {/* Fetch error banner */}
          {fetchError && (
            <div style={{
              marginBottom: 20, padding: "16px 20px", borderRadius: 10,
              background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.28)",
            }}>
              <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: "#f87171" }}>Unable to Load Settings</p>
              <p style={{ margin: "0 0 12px", fontSize: 12, color: MUTED }}>{fetchError}</p>
              <button
                onClick={() => window.location.reload()}
                style={{ padding: "7px 18px", background: "rgba(239,68,68,0.18)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
              >
                Retry
              </button>
            </div>
          )}

          {/* Status message */}
          {msg && (
            <div style={{
              marginBottom: 20, padding: "12px 16px", borderRadius: 10, fontSize: 13, fontWeight: 500,
              background: msg.type === "ok" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
              border: `1px solid ${msg.type === "ok" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
              color: msg.type === "ok" ? "#34d399" : "#f87171",
            }}>
              {msg.type === "ok" ? "✓ " : "⚠ "}{msg.text}
            </div>
          )}

          {/* Session expired inline warning */}
          {sessionExpired && (
            <div style={{ marginBottom: 20, padding: "14px 18px", borderRadius: 10, border: "1px solid rgba(234,179,8,0.35)", background: "rgba(234,179,8,0.08)" }}>
              <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 600, color: "#fbbf24" }}>Session Expired</p>
              <p style={{ margin: "0 0 10px", fontSize: 12, color: MUTED }}>Your session has expired. Please sign in again to continue.</p>
              <button
                onClick={() => router.push("/")}
                style={{ padding: "7px 18px", background: "#fbbf24", color: "#120A1F", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
              >
                Go to Login
              </button>
            </div>
          )}

          {/* ── Profile ── */}
          {tab === "profile" && (
            <Card title="My Profile" subtitle="Your account identity on ShepherdKids.">
              <div style={g2}>
                <DarkInput label="Email" value={userEmail} readOnly />
                <DarkInput label="Display Name" value={displayName} onChange={v => setDisplayName(v)} placeholder="Your name" />
                <div style={s2}>
                  <DarkInput label="Role" value="Admin" readOnly />
                </div>
              </div>
            </Card>
          )}

          {/* ── Church ── */}
          {tab === "church" && (
            <>
              <Card title="Church Profile" subtitle="Details shown in letters, emails, and ministry reports.">
                <div style={g2}>
                  <div style={s2}>
                    <DarkInput label="Church Name" value={form.name} onChange={setStr("name")} />
                  </div>
                  <DarkInput label="Email" value={form.email} onChange={setStr("email")} type="email" />
                  <DarkInput label="Phone" value={form.phone} onChange={setStr("phone")} />
                  <div style={s2}>
                    <DarkInput label="Website" value={form.website} onChange={setStr("website")} />
                  </div>
                  <div style={s2}>
                    <DarkInput label="Address" value={form.address} onChange={setStr("address")} />
                  </div>
                  <DarkInput label="City" value={form.city} onChange={setStr("city")} />
                  <DarkInput label="State" value={form.state} onChange={setStr("state")} />
                  <DarkInput label="Zip" value={form.zip} onChange={setStr("zip")} />
                  <div style={s2}>
                    <DarkSelect
                      label="Timezone"
                      value={form.timezone}
                      onChange={setStr("timezone")}
                      options={[
                        { value: "America/New_York",    label: "Eastern — America/New_York" },
                        { value: "America/Chicago",     label: "Central — America/Chicago" },
                        { value: "America/Denver",      label: "Mountain — America/Denver" },
                        { value: "America/Los_Angeles", label: "Pacific — America/Los_Angeles" },
                        { value: "America/Anchorage",   label: "Alaska — America/Anchorage" },
                        { value: "Pacific/Honolulu",    label: "Hawaii — Pacific/Honolulu" },
                      ]}
                    />
                  </div>
                  <div style={s2}>
                    <DarkInput label="Logo URL" value={form.logo_url} onChange={setStr("logo_url")} placeholder="https://…" />
                  </div>
                </div>
                {form.logo_url && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.logo_url} alt="Logo preview" style={{ maxHeight: 64, borderRadius: 8, objectFit: "contain" }} />
                  </div>
                )}
              </Card>

              <Card title="Pastoral Leadership" subtitle="Staff displayed in ministry communications.">
                {warnings.includes("pastoral_leadership_unavailable") && (
                  <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.2)", fontSize: 12, color: "#fbbf24" }}>
                    Pastoral fields could not be loaded from the database. Other settings are unaffected.
                  </div>
                )}
                <div style={g2}>
                  <DarkInput label="Senior Pastor" value={form.senior_pastor} onChange={setStr("senior_pastor")} placeholder="Pastor name" />
                  <DarkInput label="Children's Pastor" value={form.children_pastor} onChange={setStr("children_pastor")} placeholder="Pastor name" />
                </div>
              </Card>
            </>
          )}

          {/* ── Platform ── */}
          {tab === "platform" && (
            <>
              <Card title="Check-In" subtitle="Label printing mode for the kiosk.">
                <DarkSelect
                  label="Label Mode"
                  value={form.label_mode}
                  onChange={setStr("label_mode")}
                  options={[
                    { value: "smart",   label: "Smart Labels (QR Code)" },
                    { value: "classic", label: "Classic Labels" },
                  ]}
                />
              </Card>

              <Card title="Notifications" subtitle="Where system alerts are delivered.">
                <DarkInput
                  label="Notification Email"
                  value={form.email}
                  onChange={setStr("email")}
                  type="email"
                  placeholder="pastor@yourchurch.com"
                />
              </Card>
            </>
          )}

          {/* ── Staff Access ── */}
          {tab === "staff" && (
            isAdminRole(userRole)
              ? <StaffAccessTab userRole={userRole} />
              : (
                <div style={{ padding: "24px 0", textAlign: "center" }}>
                  <p style={{ fontSize: 14, color: MUTED }}>You do not have permission to view Staff Access settings.</p>
                </div>
              )
          )}

          {/* ── Security ── */}
          {tab === "security" && (
            <Card title="Security" subtitle="Password and session controls for your account.">
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, padding: "16px 18px", background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: 10 }}>
                  <div>
                    <p style={{ margin: "0 0 3px", fontSize: 14, fontWeight: 600, color: TEXT }}>Change Password</p>
                    <p style={{ margin: 0, fontSize: 12, color: MUTED }}>
                      Sends a password reset link to <strong style={{ color: "rgba(255,255,255,0.75)" }}>{userEmail || "your email"}</strong>.
                    </p>
                  </div>
                  <button
                    onClick={handleResetPassword}
                    disabled={resetSent}
                    style={{
                      padding: "9px 22px", flexShrink: 0, border: "none",
                      background: resetSent ? "rgba(52,211,153,0.12)" : PURPLE,
                      color: resetSent ? "#34d399" : TEXT,
                      borderRadius: 8, fontSize: 13, fontWeight: 600,
                      cursor: resetSent ? "default" : "pointer",
                    }}
                  >
                    {resetSent ? "✓ Email Sent" : "Send Reset Link"}
                  </button>
                </div>

                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, padding: "16px 18px", background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: 10 }}>
                  <div>
                    <p style={{ margin: "0 0 3px", fontSize: 14, fontWeight: 600, color: TEXT }}>Sign Out</p>
                    <p style={{ margin: 0, fontSize: 12, color: MUTED }}>End your current session on this device.</p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    disabled={signingOut}
                    style={{
                      padding: "9px 22px", flexShrink: 0,
                      background: "rgba(239,68,68,0.12)", color: "#f87171",
                      border: "1px solid rgba(239,68,68,0.25)",
                      borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    {signingOut ? "Signing out…" : "Sign Out"}
                  </button>
                </div>

                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, padding: "16px 18px", background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: 10 }}>
                  <div>
                    <p style={{ margin: "0 0 3px", fontSize: 14, fontWeight: 600, color: TEXT }}>Run Setup Wizard Again</p>
                    <p style={{ margin: 0, fontSize: 12, color: MUTED }}>Restart the first-time setup wizard to reconfigure your church profile, classrooms, or service schedule.</p>
                  </div>
                  <button
                    onClick={async () => {
                      await fetch("/api/setup-wizard", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ action: "reset" }) });
                      router.push("/dashboard/setup-wizard");
                    }}
                    style={{ padding: "9px 22px", flexShrink: 0, border: `1px solid ${BORDER}`, background: "none", color: GOLD, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                  >
                    Launch Wizard
                  </button>
                </div>

                <div style={{ padding: "14px 18px", borderRadius: 10, border: "1px solid rgba(239,68,68,0.18)", marginTop: 4 }}>
                  <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 600, color: "#f87171" }}>Danger Zone</p>
                  <p style={{ margin: 0, fontSize: 12, color: MUTED }}>
                    To delete your church profile or transfer ownership, contact{" "}
                    <a href="mailto:support@shepherdkids.app" style={{ color: GOLD, textDecoration: "underline" }}>support@shepherdkids.app</a>.
                  </p>
                </div>

              </div>
            </Card>
          )}

          {/* ── Subscription ── */}
          {tab === "subscription" && (
            <Card title="Subscription" subtitle="Your current plan and billing status.">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
                {[
                  { label: "Status", value: billing.subscription_status || null },
                  {
                    label: "Plan",
                    value: billing.subscription_tier
                      ? (planLabel[billing.subscription_tier] ?? billing.subscription_tier)
                      : null,
                  },
                  {
                    label: "Trial Ends",
                    value: billing.trial_ends_at
                      ? new Date(billing.trial_ends_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                      : null,
                  },
                ].map(b => (
                  <div key={b.label} style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "14px 18px" }}>
                    <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: MUTED }}>{b.label}</p>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: TEXT, textTransform: "capitalize" }}>
                      {b.value ?? <span style={{ color: MUTED, fontWeight: 400, fontStyle: "italic" }}>Not assigned</span>}
                    </p>
                  </div>
                ))}
              </div>
              <Link
                href="/dashboard/billing"
                style={{ display: "inline-block", padding: "10px 24px", background: PURPLE, color: TEXT, borderRadius: 9, fontSize: 13, fontWeight: 700, textDecoration: "none" }}
              >
                💳 Manage Billing
              </Link>
            </Card>
          )}

          {/* Save button — shown on editable tabs */}
          {showSave && (
            <div style={{ marginTop: 4 }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: "11px 32px", background: PURPLE, color: TEXT,
                  border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700,
                  cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1,
                  transition: "opacity 0.15s",
                }}
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          )}

        </div>
      </div>
    </AppShell>
  );
}
