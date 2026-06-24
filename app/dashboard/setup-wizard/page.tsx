"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ── Design tokens ────────────────────────────────────────────────────────────
const BG     = "#08060D";
const CARD   = "#120A1F";
const BORDER = "rgba(212,175,55,0.18)";
const GOLD   = "#D4AF37";
const PURPLE = "#7B2CBF";
const TEXT   = "#ffffff";
const MUTED  = "rgba(255,255,255,0.5)";
const GREEN  = "#16a34a";

// ── Step definitions ─────────────────────────────────────────────────────────
const STEPS = [
  { n: 1, title: "Welcome",                  subtitle: "Start here"                      },
  { n: 2, title: "Church Profile",           subtitle: "Name, city & contact"            },
  { n: 3, title: "Ministry Session",         subtitle: "Create your first check-in time" },
  { n: 4, title: "Classrooms",               subtitle: "Add check-in rooms"              },
  { n: 5, title: "Label Printer",            subtitle: "Optional hardware setup"         },
  { n: 6, title: "Check-In Kiosk",           subtitle: "Share the kiosk URL"             },
  { n: 7, title: "Add a Test Family",        subtitle: "Try a sample check-in"           },
  { n: 8, title: "You're All Set!",          subtitle: "Launch your ministry"            },
];

// ── Shared UI helpers ─────────────────────────────────────────────────────────
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 12, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6, marginTop: 0 }}>
      {children}
    </p>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${BORDER}`,
  background: "rgba(255,255,255,0.05)", color: TEXT, fontSize: 14, outline: "none",
  boxSizing: "border-box",
};

function SuccessBadge({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(22,163,74,0.12)", border: "1px solid rgba(22,163,74,0.3)", borderRadius: 8, padding: "6px 14px", color: "#4ade80", fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
      <span>✓</span> {children}
    </div>
  );
}

function PrimaryBtn({
  children, onClick, disabled, loading, style,
}: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean;
  loading?: boolean; style?: React.CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        padding: "12px 28px", borderRadius: 10, border: "none",
        background: disabled || loading ? "#3d2a5e" : `linear-gradient(135deg, ${PURPLE}, #9D4EDD)`,
        color: TEXT, fontWeight: 700, fontSize: 15, cursor: disabled || loading ? "not-allowed" : "pointer",
        opacity: disabled || loading ? 0.7 : 1, transition: "opacity 0.15s",
        ...style,
      }}
    >
      {loading ? "Saving…" : children}
    </button>
  );
}

function GoldBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "12px 28px", borderRadius: 10, border: `1px solid ${GOLD}`,
        background: "transparent", color: GOLD, fontWeight: 700, fontSize: 15, cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

// ── Wizard page ───────────────────────────────────────────────────────────────
type WizardState = { current_step: number; completed_steps: number[]; is_complete: boolean };

export default function SetupWizardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [churchId, setChurchId] = useState<string | null>(null);
  const [wizard, setWizard] = useState<WizardState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Church profile form
  const [churchName, setChurchName] = useState("");
  const [churchCity, setChurchCity] = useState("");
  const [churchState, setChurchState] = useState("");
  const [churchPhone, setChurchPhone] = useState("");
  const [churchEmail, setChurchEmail] = useState("");

  // Service schedule form
  const [serviceName, setServiceName] = useState("Sunday Kids Check-In");
  const [serviceDate, setServiceDate] = useState(() => {
    const d = new Date();
    const daysUntilSunday = d.getDay() === 0 ? 7 : 7 - d.getDay();
    d.setDate(d.getDate() + daysUntilSunday);
    return d.toISOString().split("T")[0];
  });
  const [serviceTime, setServiceTime] = useState("09:00");

  // Classrooms form
  const [rooms, setRooms] = useState([
    { name: "Nursery", minAge: "0", maxAge: "1" },
    { name: "Toddlers", minAge: "2", maxAge: "3" },
    { name: "Pre-K", minAge: "4", maxAge: "5" },
  ]);

  // Per-step save status
  const [stepStatus, setStepStatus] = useState<Record<number, "saved" | "error">>({});
  const [stepError, setStepError] = useState<Record<number, string>>({});

  // Load session + wizard state
  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/"); return; }
      setAccessToken(session.access_token);

      const res = await fetch("/api/setup-wizard", { credentials: "include" });
      if (res.ok) {
        const { wizard: w } = await res.json();
        setWizard(w);
      }

      const sRes = await fetch("/api/settings", { headers: { Authorization: `Bearer ${session.access_token}` } });
      if (sRes.ok) {
        const { church: c } = await sRes.json();
        if (c) {
          setChurchName(c.name ?? "");
          setChurchCity(c.city ?? "");
          setChurchState(c.state ?? "");
          setChurchPhone(c.phone ?? "");
          setChurchEmail(c.email ?? "");
        }
      }

      const { data: cu } = await supabase.from("church_users").select("church_id").eq("user_id", session.user.id).maybeSingle();
      if (cu?.church_id) setChurchId(cu.church_id);

      setLoading(false);
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patchWizard = useCallback(async (body: object): Promise<WizardState | null> => {
    const res = await fetch("/api/setup-wizard", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const { wizard: w } = await res.json();
    setWizard(w);
    return w as WizardState;
  }, []);

  async function goToStep(step: number) {
    await patchWizard({ action: "go_to_step", step });
  }

  async function completeStep(step: number) {
    return patchWizard({ action: "complete_step", step });
  }

  // ── Step handlers ─────────────────────────────────────────────────────────

  async function handleSaveChurch() {
    if (!churchName.trim()) return;
    setSaving(true);
    try {
      const token = accessToken || (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: churchName, city: churchCity, state: churchState, phone: churchPhone, email: churchEmail }),
      });
      if (!res.ok) { setStepStatus((s) => ({ ...s, 2: "error" })); return; }
      setStepStatus((s) => ({ ...s, 2: "saved" }));
      await completeStep(2);
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateService() {
    if (!serviceName.trim() || !serviceDate) return;
    setSaving(true);
    try {
      const token = accessToken || (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch("/api/children-ministry/service-events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ title: serviceName, event_date: serviceDate, start_time: serviceTime || null }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = (body as { error?: string }).error ?? `HTTP ${res.status}`;
        console.error("[wizard step 3] service-events error:", msg);
        setStepError((s) => ({ ...s, 3: msg }));
        setStepStatus((s) => ({ ...s, 3: "error" }));
        return;
      }
      setStepStatus((s) => ({ ...s, 3: "saved" }));
      setStepError((s) => ({ ...s, 3: "" }));
      await completeStep(3);
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateRooms() {
    setSaving(true);
    try {
      const filled = rooms.filter((r) => r.name.trim());
      await Promise.all(filled.map((r) =>
        fetch("/api/checkin/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ name: r.name.trim(), minAge: r.minAge !== "" ? Number(r.minAge) : null, maxAge: r.maxAge !== "" ? Number(r.maxAge) : null }),
        })
      ));
      setStepStatus((s) => ({ ...s, 4: "saved" }));
      await completeStep(4);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddTestFamily() {
    setSaving(true);
    try {
      // Uses the wizard API which writes directly into cm_visitor_families +
      // cm_visitor_children — the tables the kiosk lookup actually queries.
      const w = await patchWizard({ action: "create_test_family" });
      if (!w) { setStepStatus((s) => ({ ...s, 7: "error" })); return; }
      setStepStatus((s) => ({ ...s, 7: "saved" }));
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete() {
    setSaving(true);
    await patchWizard({ action: "complete" });
    setSaving(false);
    router.push("/dashboard");
  }

  // ── Loading state ─────────────────────────────────────────────────────────

  if (loading || !wizard) {
    return (
      <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: MUTED, fontSize: 15 }}>Loading…</p>
      </div>
    );
  }

  const currentStep = wizard.current_step;
  const completedSteps = new Set(wizard.completed_steps);
  const kioskUrl = churchId ? `${window.location.origin}/kiosk/church/${churchId}` : "";

  // ── Step content — called as a function, never as <StepContent />
  // to avoid remount-on-every-keystroke loss of focus.
  function renderStepContent() {
    switch (currentStep) {

      // ── Step 1: Welcome ──────────────────────────────────────────────────
      case 1:
        return (
          <div>
            <div style={{ fontSize: 64, marginBottom: 20 }}>👋</div>
            <h2 style={{ fontSize: 26, fontWeight: 700, color: TEXT, fontFamily: "Georgia, serif", marginBottom: 12 }}>
              Welcome to ShepherdKids!
            </h2>
            <p style={{ color: MUTED, fontSize: 15, lineHeight: 1.7, marginBottom: 20 }}>
              This quick setup wizard will walk you through the essential steps to get your children's ministry up and running. It takes about 5 minutes.
            </p>
            <div style={{ background: "rgba(212,175,55,0.08)", border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20, marginBottom: 28 }}>
              <p style={{ color: GOLD, fontWeight: 700, fontSize: 14, marginBottom: 12 }}>What we'll set up:</p>
              {[
                "Church profile & contact info",
                "Your children's ministry session time",
                "Check-in classrooms",
                "Label printer (optional)",
                "Check-in kiosk link",
                "A test family to try check-in",
              ].map((item) => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ color: GREEN, fontSize: 16 }}>✓</span>
                  <span style={{ color: TEXT, fontSize: 14 }}>{item}</span>
                </div>
              ))}
            </div>
            <PrimaryBtn onClick={() => completeStep(1)}>Get Started →</PrimaryBtn>
          </div>
        );

      // ── Step 2: Church Profile ───────────────────────────────────────────
      case 2:
        return (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: TEXT, fontFamily: "Georgia, serif", marginBottom: 6 }}>Church Profile</h2>
            <p style={{ color: MUTED, fontSize: 14, marginBottom: 24 }}>This info appears on check-in labels and certificates.</p>

            <div style={{ marginBottom: 16 }}>
              <FieldLabel>Church Name <span style={{ color: "#f87171" }}>*</span></FieldLabel>
              <input style={inputStyle} type="text" value={churchName} placeholder="Grace Community Church" onChange={(e) => setChurchName(e.target.value)} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <FieldLabel>City</FieldLabel>
                <input style={inputStyle} type="text" value={churchCity} placeholder="Nashville" onChange={(e) => setChurchCity(e.target.value)} />
              </div>
              <div>
                <FieldLabel>State</FieldLabel>
                <input style={inputStyle} type="text" value={churchState} placeholder="TN" onChange={(e) => setChurchState(e.target.value)} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div>
                <FieldLabel>Phone</FieldLabel>
                <input style={inputStyle} type="tel" value={churchPhone} placeholder="(615) 555-0100" onChange={(e) => setChurchPhone(e.target.value)} />
              </div>
              <div>
                <FieldLabel>Email</FieldLabel>
                <input style={inputStyle} type="email" value={churchEmail} placeholder="office@church.org" onChange={(e) => setChurchEmail(e.target.value)} />
              </div>
            </div>

            {stepStatus[2] === "saved" && <SuccessBadge>Church profile saved!</SuccessBadge>}
            {stepStatus[2] === "error" && <p style={{ color: "#f87171", fontSize: 13, marginBottom: 12 }}>Failed to save. Please try again.</p>}

            <div style={{ display: "flex", gap: 12 }}>
              <PrimaryBtn onClick={handleSaveChurch} loading={saving} disabled={!churchName.trim()}>
                Save & Continue →
              </PrimaryBtn>
              <GoldBtn onClick={() => goToStep(3)}>Skip for now</GoldBtn>
            </div>
          </div>
        );

      // ── Step 3: Ministry Session ─────────────────────────────────────────
      case 3:
        return (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: TEXT, fontFamily: "Georgia, serif", marginBottom: 6 }}>Children's Ministry Service Time</h2>
            <p style={{ color: MUTED, fontSize: 14, marginBottom: 24 }}>
              Create the first children's ministry check-in time. This should match the service or ministry time when families will check children in.
            </p>

            <div style={{ marginBottom: 16 }}>
              <FieldLabel>Children's Ministry Session Name <span style={{ color: "#f87171" }}>*</span></FieldLabel>
              <input style={inputStyle} type="text" value={serviceName} placeholder="Sunday Kids Check-In" onChange={(e) => setServiceName(e.target.value)} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div>
                <FieldLabel>Date <span style={{ color: "#f87171" }}>*</span></FieldLabel>
                <input style={inputStyle} type="date" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} />
              </div>
              <div>
                <FieldLabel>Start Time</FieldLabel>
                <input style={inputStyle} type="time" value={serviceTime} onChange={(e) => setServiceTime(e.target.value)} />
              </div>
            </div>

            {stepStatus[3] === "saved" && <SuccessBadge>Session created!</SuccessBadge>}
            {stepStatus[3] === "error" && <p style={{ color: "#f87171", fontSize: 13, marginBottom: 12 }}>Failed to create: {stepError[3] || "Please try again."}</p>}

            <div style={{ display: "flex", gap: 12 }}>
              <PrimaryBtn onClick={handleCreateService} loading={saving} disabled={!serviceName.trim() || !serviceDate}>
                Create & Continue →
              </PrimaryBtn>
              <GoldBtn onClick={() => goToStep(4)}>Skip for now</GoldBtn>
            </div>
          </div>
        );

      // ── Step 4: Classrooms ───────────────────────────────────────────────
      case 4:
        return (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: TEXT, fontFamily: "Georgia, serif", marginBottom: 6 }}>Classrooms</h2>
            <p style={{ color: MUTED, fontSize: 14, marginBottom: 24 }}>Add your check-in rooms. We've pre-filled common ones — edit or add more.</p>

            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 8, marginBottom: 6 }}>
                <FieldLabel>Room Name</FieldLabel>
                <FieldLabel>Min Age</FieldLabel>
                <FieldLabel>Max Age</FieldLabel>
                <div />
              </div>
              {rooms.map((room, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 8, marginBottom: 8, alignItems: "center" }}>
                  <input
                    style={inputStyle}
                    value={room.name}
                    placeholder="e.g. Nursery"
                    onChange={(e) => {
                      const v = e.target.value;
                      setRooms((rs) => rs.map((r, j) => j === i ? { ...r, name: v } : r));
                    }}
                  />
                  <input
                    style={inputStyle}
                    value={room.minAge}
                    placeholder="0"
                    type="number"
                    onChange={(e) => {
                      const v = e.target.value;
                      setRooms((rs) => rs.map((r, j) => j === i ? { ...r, minAge: v } : r));
                    }}
                  />
                  <input
                    style={inputStyle}
                    value={room.maxAge}
                    placeholder="1"
                    type="number"
                    onChange={(e) => {
                      const v = e.target.value;
                      setRooms((rs) => rs.map((r, j) => j === i ? { ...r, maxAge: v } : r));
                    }}
                  />
                  <button
                    onClick={() => setRooms((rs) => rs.filter((_, j) => j !== i))}
                    style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", fontSize: 20, padding: "0 4px", lineHeight: 1 }}
                  >×</button>
                </div>
              ))}
            </div>

            <button
              onClick={() => setRooms((rs) => [...rs, { name: "", minAge: "", maxAge: "" }])}
              style={{ background: "none", border: `1px dashed ${BORDER}`, borderRadius: 8, color: GOLD, cursor: "pointer", fontSize: 13, padding: "8px 16px", marginBottom: 20 }}
            >
              + Add another room
            </button>

            {stepStatus[4] === "saved" && <div style={{ display: "block", marginBottom: 4 }}><SuccessBadge>Rooms created!</SuccessBadge></div>}
            {stepStatus[4] === "error" && <p style={{ color: "#f87171", fontSize: 13, marginBottom: 12 }}>Failed to save. Please try again.</p>}

            <div style={{ display: "flex", gap: 12 }}>
              <PrimaryBtn onClick={handleCreateRooms} loading={saving}>Save Rooms & Continue →</PrimaryBtn>
              <GoldBtn onClick={() => goToStep(5)}>Skip for now</GoldBtn>
            </div>
          </div>
        );

      // ── Step 5: Label Printer (informational) ────────────────────────────
      case 5:
        return (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: TEXT, fontFamily: "Georgia, serif", marginBottom: 6 }}>Label Printer</h2>
            <p style={{ color: MUTED, fontSize: 14, marginBottom: 20 }}>
              When you're ready to print labels, here are our two recommended Brother QL-series printers.
            </p>

            <div style={{ background: "rgba(212,175,55,0.08)", border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
              {[
                { name: "Brother QL-810W",    note: "Wi-Fi + Wi-Fi Direct — great for most churches" },
                { name: "Brother QL-820NWB",  note: "Wi-Fi + Wi-Fi Direct + Bluetooth + Ethernet" },
              ].map((p) => (
                <div key={p.name} style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>🖨️</span>
                  <div>
                    <p style={{ color: TEXT, fontWeight: 700, fontSize: 14, margin: 0 }}>{p.name}</p>
                    <p style={{ color: MUTED, fontSize: 13, margin: "3px 0 0" }}>{p.note}</p>
                  </div>
                </div>
              ))}
            </div>

            <p style={{ color: MUTED, fontSize: 13, lineHeight: 1.7, marginBottom: 8 }}>
              You can continue testing ShepherdKids without a printer. You can find this printer information later inside <strong style={{ color: TEXT }}>Check-In Setup</strong> and <strong style={{ color: TEXT }}>Label Printing</strong>.
            </p>
            <p style={{ color: MUTED, fontSize: 13, lineHeight: 1.7, marginBottom: 24 }}>
              Once your printer is connected to Wi-Fi, go to <strong style={{ color: TEXT }}>Settings → Platform → Label Printer Type</strong> to configure it.
            </p>

            <PrimaryBtn onClick={() => completeStep(5)}>Got it, continue →</PrimaryBtn>
          </div>
        );

      // ── Step 6: Check-In Kiosk ───────────────────────────────────────────
      case 6:
        return (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: TEXT, fontFamily: "Georgia, serif", marginBottom: 6 }}>Check-In Kiosk</h2>
            <p style={{ color: MUTED, fontSize: 14, marginBottom: 24 }}>
              Open this URL on any iPad or tablet at your welcome desk. Parents tap their name, select their children, and print labels — no app needed.
            </p>

            <div style={{ background: "rgba(212,175,55,0.08)", border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <FieldLabel>Your Kiosk URL</FieldLabel>
              <p style={{ color: GOLD, fontSize: 14, fontFamily: "monospace", margin: 0, wordBreak: "break-all" }}>
                {kioskUrl || "Loading…"}
              </p>
            </div>

            {kioskUrl && (
              <a
                href={kioskUrl}
                target="_blank"
                rel="noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 8, border: `1px solid ${BORDER}`, color: TEXT, fontSize: 13, fontWeight: 600, textDecoration: "none", marginBottom: 20 }}
              >
                Open Kiosk ↗
              </a>
            )}

            <p style={{ color: MUTED, fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
              <strong style={{ color: TEXT }}>Tip:</strong> Bookmark this URL on the tablet and set it to open in fullscreen. For iPads, use Safari → "Add to Home Screen" for a kiosk-like experience.
            </p>

            <PrimaryBtn onClick={() => completeStep(6)}>Continue →</PrimaryBtn>
          </div>
        );

      // ── Step 7: Add a Test Family ────────────────────────────────────────
      case 7:
        return (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: TEXT, fontFamily: "Georgia, serif", marginBottom: 6 }}>Add a Test Family</h2>
            <p style={{ color: MUTED, fontSize: 14, marginBottom: 20 }}>
              Add a sample family so you can try a real check-in before Sunday. We'll create a child called <strong style={{ color: TEXT }}>Emma Sample</strong> with parent <strong style={{ color: TEXT }}>David & Sarah Sample</strong>.
            </p>

            <div style={{ background: "rgba(212,175,55,0.08)", border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { label: "Child", value: "Emma Sample" },
                  { label: "Grade / Age", value: "Kindergarten (born 2019)" },
                  { label: "Parent", value: "David & Sarah Sample" },
                  { label: "Kiosk Phone", value: "555-0100" },
                ].map((row) => (
                  <div key={row.label}>
                    <p style={{ color: MUTED, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 2px" }}>{row.label}</p>
                    <p style={{ color: TEXT, fontSize: 14, margin: 0 }}>{row.value}</p>
                  </div>
                ))}
              </div>
              <p style={{ color: MUTED, fontSize: 12, marginTop: 14, marginBottom: 0 }}>
                At the kiosk, enter phone number <strong style={{ color: GOLD }}>555-0100</strong> to find this family.
              </p>
            </div>

            {stepStatus[7] === "saved" && <SuccessBadge>Test family added! Enter 555-0100 at the kiosk to check Emma in.</SuccessBadge>}
            {stepStatus[7] === "error" && <p style={{ color: "#f87171", fontSize: 13, marginBottom: 12 }}>Failed to add. You can add a family manually from the Children page.</p>}

            <div style={{ display: "flex", gap: 12 }}>
              <PrimaryBtn onClick={handleAddTestFamily} loading={saving} disabled={stepStatus[7] === "saved"}>
                {stepStatus[7] === "saved" ? "Family Added ✓" : "Add Test Family →"}
              </PrimaryBtn>
              <GoldBtn onClick={() => goToStep(8)}>Skip for now</GoldBtn>
            </div>
          </div>
        );

      // ── Step 8: All Set ──────────────────────────────────────────────────
      case 8:
        return (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 72, marginBottom: 16 }}>🎉</div>
            <h2 style={{ fontSize: 26, fontWeight: 700, color: TEXT, fontFamily: "Georgia, serif", marginBottom: 12 }}>
              You're all set!
            </h2>
            <p style={{ color: MUTED, fontSize: 15, lineHeight: 1.7, marginBottom: 28 }}>
              Your ShepherdKids ministry is ready to serve families. Head to the dashboard to start your first check-in Sunday.
            </p>
            <PrimaryBtn onClick={handleComplete} loading={saving}>Go to Dashboard →</PrimaryBtn>
          </div>
        );

      default:
        return null;
    }
  }

  // ── Layout ────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "16px 24px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 22 }}>⛪</span>
          <span style={{ color: TEXT, fontWeight: 700, fontSize: 16 }}>ShepherdKids Setup</span>
        </div>
        <button
          onClick={() => router.push("/dashboard")}
          style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", fontSize: 13 }}
        >
          Skip wizard →
        </button>
      </div>

      <div style={{ flex: 1, display: "flex", maxWidth: 1000, margin: "0 auto", width: "100%", padding: "32px 20px", gap: 32, alignItems: "flex-start" }}>
        {/* Sidebar */}
        <div style={{ width: 220, flexShrink: 0 }}>
          {STEPS.map((s) => {
            const isComplete = completedSteps.has(s.n);
            const isCurrent = currentStep === s.n;
            return (
              <button
                key={s.n}
                onClick={() => goToStep(s.n)}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 12, width: "100%",
                  padding: "10px 12px", borderRadius: 10, marginBottom: 4,
                  background: isCurrent ? "rgba(123,44,191,0.15)" : "none",
                  border: isCurrent ? "1px solid rgba(123,44,191,0.4)" : "1px solid transparent",
                  cursor: "pointer", textAlign: "left",
                }}
              >
                <div style={{
                  width: 24, height: 24, borderRadius: "50%", flexShrink: 0, marginTop: 1,
                  background: isComplete ? GREEN : isCurrent ? PURPLE : "rgba(255,255,255,0.08)",
                  border: isComplete || isCurrent ? "none" : `1px solid ${BORDER}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, color: TEXT,
                }}>
                  {isComplete ? "✓" : s.n}
                </div>
                <div>
                  <p style={{ color: isCurrent ? TEXT : isComplete ? "#a3e6b0" : MUTED, fontSize: 13, fontWeight: isCurrent ? 700 : 500, margin: 0 }}>{s.title}</p>
                  <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, margin: "2px 0 0" }}>{s.subtitle}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Main content */}
        <div style={{ flex: 1, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "36px 40px", minHeight: 400 }}>
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: MUTED, fontWeight: 600 }}>Step {currentStep} of {STEPS.length}</span>
            <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 4, marginTop: 8, marginBottom: 24 }}>
              <div style={{
                height: "100%", borderRadius: 4,
                background: `linear-gradient(90deg, ${PURPLE}, #9D4EDD)`,
                width: `${(completedSteps.size / STEPS.length) * 100}%`,
                transition: "width 0.4s ease",
              }} />
            </div>
          </div>
          {renderStepContent()}
        </div>
      </div>
    </div>
  );
}
