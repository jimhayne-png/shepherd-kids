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
  { n: 1, title: "Welcome",                 subtitle: "Begin here"         },
  { n: 2, title: "Church Information",      subtitle: "Profile & contact"  },
  { n: 3, title: "Classrooms",              subtitle: "Add check-in rooms" },
  { n: 4, title: "Check-In Templates",      subtitle: "Recurring services" },
  { n: 5, title: "Label Printing",          subtitle: "Smart or Classic"   },
  { n: 6, title: "Printer",                 subtitle: "Hardware options"   },
  { n: 7, title: "Family Check-In",         subtitle: "Your kiosk link"    },
  { n: 8, title: "First Service Checklist", subtitle: "You're ready"       },
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

const TIMEZONES = [
  { value: "America/New_York",    label: "Eastern Time — America/New_York"    },
  { value: "America/Chicago",     label: "Central Time — America/Chicago"     },
  { value: "America/Denver",      label: "Mountain Time — America/Denver"     },
  { value: "America/Los_Angeles", label: "Pacific Time — America/Los_Angeles" },
  { value: "America/Anchorage",   label: "Alaska Time — America/Anchorage"   },
  { value: "Pacific/Honolulu",    label: "Hawaii Time — Pacific/Honolulu"    },
];

// ── Types ─────────────────────────────────────────────────────────────────────
type WizardState = { current_step: number; completed_steps: number[]; is_complete: boolean };
type Room = { id: string; name: string; min_age: number | null; max_age: number | null; is_active: boolean };

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

const selectStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${BORDER}`,
  background: "rgba(255,255,255,0.05)", color: TEXT, fontSize: 14, outline: "none",
  boxSizing: "border-box", appearance: "none",
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

function GoldBtn({ children, onClick, href }: { children: React.ReactNode; onClick?: () => void; href?: string }) {
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        style={{
          display: "inline-block", padding: "12px 28px", borderRadius: 10,
          border: `1px solid ${GOLD}`, background: "transparent", color: GOLD,
          fontWeight: 700, fontSize: 15, cursor: "pointer", textDecoration: "none",
        }}
      >
        {children}
      </a>
    );
  }
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
export default function GettingStartedPage() {
  const router = useRouter();
  const supabase = createClient();

  const [churchId, setChurchId] = useState<string | null>(null);
  const [wizard, setWizard] = useState<WizardState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Step 2 — Church Information
  const [churchName, setChurchName] = useState("");
  const [churchAddress, setChurchAddress] = useState("");
  const [churchCity, setChurchCity] = useState("");
  const [churchState, setChurchState] = useState("");
  const [churchZip, setChurchZip] = useState("");
  const [churchTimezone, setChurchTimezone] = useState("America/Chicago");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  // Step 3 — Classrooms
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [newRoomForm, setNewRoomForm] = useState({ name: "", minAge: "", maxAge: "" });
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editRoomForm, setEditRoomForm] = useState({ name: "", minAge: "", maxAge: "" });
  const [savingRoom, setSavingRoom] = useState(false);

  // Step 5 — Label Printing
  const [labelMode, setLabelMode] = useState<"smart" | "classic">("smart");

  // Step 8 — Checklist
  const [templateCount, setTemplateCount] = useState(0);

  // UI
  const [stepStatus, setStepStatus] = useState<Record<number, "saved" | "error">>({});
  const [kioskCopied, setKioskCopied] = useState(false);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/"); return; }
      setAccessToken(session.access_token);

      const headers = { Authorization: `Bearer ${session.access_token}` };

      const [[wizardRes, settingsRes, roomsRes, templatesRes], { data: cuData }] = await Promise.all([
        Promise.all([
          fetch("/api/setup-wizard", { credentials: "include" }),
          fetch("/api/settings", { headers }),
          fetch("/api/checkin/rooms", { credentials: "include" }),
          fetch("/api/checkin/templates", { credentials: "include" }),
        ]),
        supabase.from("church_users").select("church_id").eq("user_id", session.user.id).maybeSingle(),
      ]);

      if (wizardRes.ok) {
        const { wizard: w } = await wizardRes.json() as { wizard: WizardState };
        setWizard(w);
      }

      if (settingsRes.ok) {
        const { church: c } = await settingsRes.json() as { church: Record<string, unknown> };
        if (c) {
          setChurchName((c.name as string) ?? "");
          setChurchAddress((c.address as string) ?? "");
          setChurchCity((c.city as string) ?? "");
          setChurchState((c.state as string) ?? "");
          setChurchZip((c.zip as string) ?? "");
          if (c.timezone) setChurchTimezone(c.timezone as string);
          setContactName((c.children_pastor as string) ?? "");
          setContactEmail((c.email as string) ?? "");
          setContactPhone((c.phone as string) ?? "");
          if (c.label_mode === "smart" || c.label_mode === "classic") setLabelMode(c.label_mode);
        }
      }

      if (cuData?.church_id) setChurchId(cuData.church_id);

      if (roomsRes.ok) {
        const { rooms: allRooms } = await roomsRes.json() as { rooms: Room[] };
        setRooms(allRooms.filter((r) => r.is_active));
      }

      if (templatesRes.ok) {
        const body = await templatesRes.json() as { templates?: unknown[]; data?: unknown[] };
        const templates = body.templates ?? body.data ?? [];
        setTemplateCount(Array.isArray(templates) ? templates.length : 0);
      }

      setLoading(false);
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Wizard helpers ────────────────────────────────────────────────────────
  const patchWizard = useCallback(async (body: object): Promise<WizardState | null> => {
    const res = await fetch("/api/setup-wizard", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const { wizard: w } = await res.json() as { wizard: WizardState };
    setWizard(w);
    return w;
  }, []);

  async function goToStep(step: number) {
    await patchWizard({ action: "go_to_step", step });
  }

  async function completeStep(step: number) {
    return patchWizard({ action: "complete_step", step });
  }

  // ── Step handlers ─────────────────────────────────────────────────────────

  async function handleSaveChurchInfo() {
    if (!churchName.trim()) return;
    setSaving(true);
    try {
      const token = accessToken ?? (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: churchName, address: churchAddress, city: churchCity,
          state: churchState, zip: churchZip, timezone: churchTimezone,
          children_pastor: contactName, email: contactEmail, phone: contactPhone,
        }),
      });
      if (!res.ok) { setStepStatus((s) => ({ ...s, 2: "error" })); return; }
      setStepStatus((s) => ({ ...s, 2: "saved" }));
      await completeStep(2);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddRoom() {
    if (!newRoomForm.name.trim()) return;
    setSavingRoom(true);
    try {
      const res = await fetch("/api/checkin/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newRoomForm.name.trim(),
          minAge: newRoomForm.minAge !== "" ? Number(newRoomForm.minAge) : null,
          maxAge: newRoomForm.maxAge !== "" ? Number(newRoomForm.maxAge) : null,
        }),
      });
      if (!res.ok) return;
      const { room } = await res.json() as { room: Room };
      setRooms((rs) => [...rs, room]);
      setNewRoomForm({ name: "", minAge: "", maxAge: "" });
      setShowAddRoom(false);
    } finally {
      setSavingRoom(false);
    }
  }

  function startEditRoom(room: Room) {
    setEditingRoomId(room.id);
    setEditRoomForm({
      name: room.name,
      minAge: room.min_age != null ? String(room.min_age) : "",
      maxAge: room.max_age != null ? String(room.max_age) : "",
    });
  }

  async function handleSaveEditRoom() {
    if (!editingRoomId || !editRoomForm.name.trim()) return;
    setSavingRoom(true);
    try {
      const res = await fetch("/api/checkin/rooms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: editingRoomId,
          name: editRoomForm.name.trim(),
          minAge: editRoomForm.minAge !== "" ? Number(editRoomForm.minAge) : null,
          maxAge: editRoomForm.maxAge !== "" ? Number(editRoomForm.maxAge) : null,
        }),
      });
      if (!res.ok) return;
      const { room } = await res.json() as { room: Room };
      setRooms((rs) => rs.map((r) => r.id === editingRoomId ? room : r));
      setEditingRoomId(null);
    } finally {
      setSavingRoom(false);
    }
  }

  async function handleRemoveRoom(room: Room) {
    const res = await fetch("/api/checkin/rooms", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id: room.id, isActive: false }),
    });
    if (!res.ok) return;
    setRooms((rs) => rs.filter((r) => r.id !== room.id));
  }

  async function handleSaveLabelMode() {
    setSaving(true);
    try {
      const token = accessToken ?? (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ label_mode: labelMode }),
      });
      if (!res.ok) { setStepStatus((s) => ({ ...s, 5: "error" })); return; }
      setStepStatus((s) => ({ ...s, 5: "saved" }));
      await completeStep(5);
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

  // ── Loading ───────────────────────────────────────────────────────────────
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

  // ── Step content ──────────────────────────────────────────────────────────
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
              Getting Started will walk you through the essentials so your children's ministry is ready for your first Sunday. Takes about 5 minutes.
            </p>
            <div style={{ background: "rgba(212,175,55,0.08)", border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20, marginBottom: 28 }}>
              <p style={{ color: GOLD, fontWeight: 700, fontSize: 14, marginBottom: 12 }}>What we'll cover:</p>
              {[
                "Church information & contact",
                "Classrooms for check-in",
                "Check-In Templates (recurring services)",
                "Label printing — Smart or Classic",
                "Recommended label printers",
                "Your family check-in kiosk link",
              ].map((item) => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ color: GREEN, fontSize: 16 }}>✓</span>
                  <span style={{ color: TEXT, fontSize: 14 }}>{item}</span>
                </div>
              ))}
            </div>
            <PrimaryBtn onClick={() => completeStep(1)}>Begin Getting Started →</PrimaryBtn>
          </div>
        );

      // ── Step 2: Church Information ───────────────────────────────────────
      case 2:
        return (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: TEXT, fontFamily: "Georgia, serif", marginBottom: 6 }}>Church Information</h2>
            <p style={{ color: MUTED, fontSize: 14, marginBottom: 24 }}>This information appears on check-in labels and certificates.</p>

            <div style={{ marginBottom: 16 }}>
              <FieldLabel>Church Name <span style={{ color: "#f87171" }}>*</span></FieldLabel>
              <input style={inputStyle} type="text" value={churchName} placeholder="Grace Community Church" onChange={(e) => setChurchName(e.target.value)} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <FieldLabel>Address</FieldLabel>
              <input style={inputStyle} type="text" value={churchAddress} placeholder="123 Main Street" onChange={(e) => setChurchAddress(e.target.value)} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <FieldLabel>City</FieldLabel>
                <input style={inputStyle} type="text" value={churchCity} placeholder="Nashville" onChange={(e) => setChurchCity(e.target.value)} />
              </div>
              <div>
                <FieldLabel>State</FieldLabel>
                <select style={selectStyle} value={churchState} onChange={(e) => setChurchState(e.target.value)}>
                  <option value="">—</option>
                  {US_STATES.map((st) => <option key={st} value={st}>{st}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel>ZIP</FieldLabel>
                <input style={inputStyle} type="text" value={churchZip} placeholder="37201" onChange={(e) => setChurchZip(e.target.value)} />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <FieldLabel>Time Zone</FieldLabel>
              <select style={selectStyle} value={churchTimezone} onChange={(e) => setChurchTimezone(e.target.value)}>
                {TIMEZONES.map((tz) => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
              </select>
            </div>

            <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 20, marginBottom: 20 }}>
              <p style={{ color: TEXT, fontWeight: 600, fontSize: 14, margin: "0 0 4px" }}>Children's Ministry Contact</p>
              <p style={{ color: MUTED, fontSize: 12, marginBottom: 16 }}>The person families contact with questions about children's ministry.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <FieldLabel>Name</FieldLabel>
                  <input style={inputStyle} type="text" value={contactName} placeholder="Sarah Johnson" onChange={(e) => setContactName(e.target.value)} />
                </div>
                <div>
                  <FieldLabel>Phone</FieldLabel>
                  <input style={inputStyle} type="tel" value={contactPhone} placeholder="(615) 555-0100" onChange={(e) => setContactPhone(e.target.value)} />
                </div>
              </div>
              <div>
                <FieldLabel>Email</FieldLabel>
                <input style={inputStyle} type="email" value={contactEmail} placeholder="kids@grace.church" onChange={(e) => setContactEmail(e.target.value)} />
              </div>
            </div>

            {stepStatus[2] === "saved" && <SuccessBadge>Church information saved!</SuccessBadge>}
            {stepStatus[2] === "error" && <p style={{ color: "#f87171", fontSize: 13, marginBottom: 12 }}>Failed to save. Please try again.</p>}

            <div style={{ display: "flex", gap: 12 }}>
              <PrimaryBtn onClick={handleSaveChurchInfo} loading={saving} disabled={!churchName.trim()}>
                Save & Continue →
              </PrimaryBtn>
              <GoldBtn onClick={() => goToStep(3)}>Skip for now</GoldBtn>
            </div>
          </div>
        );

      // ── Step 3: Classrooms ───────────────────────────────────────────────
      case 3:
        return (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: TEXT, fontFamily: "Georgia, serif", marginBottom: 6 }}>Classrooms</h2>
            <p style={{ color: MUTED, fontSize: 14, marginBottom: 8 }}>
              Add the rooms families can check children into. Use the names your church actually uses — for example: Nursery, Toddlers, Pre-K, Kindergarten.
            </p>
            <p style={{ color: MUTED, fontSize: 13, marginBottom: 20 }}>
              Rooms are saved immediately when added. You can edit or remove them any time from Check-In Setup.
            </p>

            {rooms.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                {rooms.map((room) => {
                  if (editingRoomId === room.id) {
                    return (
                      <div key={room.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto auto", gap: 8, marginBottom: 8, alignItems: "center" }}>
                        <input
                          style={inputStyle}
                          value={editRoomForm.name}
                          onChange={(e) => setEditRoomForm((f) => ({ ...f, name: e.target.value }))}
                          placeholder="Room name"
                        />
                        <input
                          style={inputStyle}
                          type="number"
                          value={editRoomForm.minAge}
                          onChange={(e) => setEditRoomForm((f) => ({ ...f, minAge: e.target.value }))}
                          placeholder="Min age"
                        />
                        <input
                          style={inputStyle}
                          type="number"
                          value={editRoomForm.maxAge}
                          onChange={(e) => setEditRoomForm((f) => ({ ...f, maxAge: e.target.value }))}
                          placeholder="Max age"
                        />
                        <button
                          onClick={handleSaveEditRoom}
                          disabled={savingRoom || !editRoomForm.name.trim()}
                          style={{ padding: "9px 14px", borderRadius: 8, border: "none", background: GREEN, color: TEXT, fontWeight: 700, fontSize: 13, cursor: savingRoom ? "wait" : "pointer" }}
                        >
                          {savingRoom ? "…" : "Save"}
                        </button>
                        <button
                          onClick={() => setEditingRoomId(null)}
                          style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", fontSize: 20, padding: "0 4px", lineHeight: 1 }}
                        >
                          ×
                        </button>
                      </div>
                    );
                  }
                  return (
                    <div key={room.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 8, marginBottom: 8 }}>
                      <div>
                        <span style={{ color: TEXT, fontSize: 14, fontWeight: 600 }}>{room.name}</span>
                        {(room.min_age != null || room.max_age != null) && (
                          <span style={{ color: MUTED, fontSize: 12, marginLeft: 10 }}>
                            {room.min_age != null ? `Age ${room.min_age}` : ""}
                            {room.min_age != null && room.max_age != null ? "–" : ""}
                            {room.max_age != null ? String(room.max_age) : ""}
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => startEditRoom(room)}
                          style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 6, color: MUTED, cursor: "pointer", fontSize: 12, padding: "4px 10px" }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleRemoveRoom(room)}
                          style={{ background: "none", border: "none", color: "rgba(239,68,68,0.6)", cursor: "pointer", fontSize: 20, padding: "0 4px", lineHeight: 1 }}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {rooms.length === 0 && !showAddRoom && (
              <div style={{ padding: "24px 20px", background: "rgba(255,255,255,0.02)", border: `1px dashed ${BORDER}`, borderRadius: 10, textAlign: "center", marginBottom: 16 }}>
                <p style={{ color: MUTED, fontSize: 14, margin: 0 }}>No classrooms added yet. Use the button below to add your first room.</p>
              </div>
            )}

            {showAddRoom && (
              <div style={{ padding: 16, background: "rgba(212,175,55,0.06)", border: `1px solid ${BORDER}`, borderRadius: 10, marginBottom: 16 }}>
                <p style={{ color: GOLD, fontWeight: 700, fontSize: 13, margin: "0 0 12px" }}>New Classroom</p>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                  <div>
                    <FieldLabel>Room Name <span style={{ color: "#f87171" }}>*</span></FieldLabel>
                    <input
                      style={inputStyle}
                      type="text"
                      value={newRoomForm.name}
                      onChange={(e) => setNewRoomForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. Nursery"
                      autoFocus
                    />
                  </div>
                  <div>
                    <FieldLabel>Min Age</FieldLabel>
                    <input
                      style={inputStyle}
                      type="number"
                      value={newRoomForm.minAge}
                      onChange={(e) => setNewRoomForm((f) => ({ ...f, minAge: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <FieldLabel>Max Age</FieldLabel>
                    <input
                      style={inputStyle}
                      type="number"
                      value={newRoomForm.maxAge}
                      onChange={(e) => setNewRoomForm((f) => ({ ...f, maxAge: e.target.value }))}
                      placeholder="2"
                    />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={handleAddRoom}
                    disabled={savingRoom || !newRoomForm.name.trim()}
                    style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: PURPLE, color: TEXT, fontWeight: 700, fontSize: 13, cursor: savingRoom || !newRoomForm.name.trim() ? "not-allowed" : "pointer", opacity: savingRoom || !newRoomForm.name.trim() ? 0.6 : 1 }}
                  >
                    {savingRoom ? "Adding…" : "Add Classroom"}
                  </button>
                  <button
                    onClick={() => { setShowAddRoom(false); setNewRoomForm({ name: "", minAge: "", maxAge: "" }); }}
                    style={{ padding: "9px 14px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "none", color: MUTED, fontWeight: 600, fontSize: 13, cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {!showAddRoom && (
              <button
                onClick={() => setShowAddRoom(true)}
                style={{ background: "none", border: `1px dashed ${BORDER}`, borderRadius: 8, color: GOLD, cursor: "pointer", fontSize: 13, padding: "8px 16px", marginBottom: 20 }}
              >
                + Add Classroom
              </button>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 8 }}>
              <PrimaryBtn onClick={() => completeStep(3)} disabled={showAddRoom}>
                Continue →
              </PrimaryBtn>
              {rooms.length > 0 && (
                <span style={{ color: MUTED, fontSize: 13 }}>
                  {rooms.length} classroom{rooms.length !== 1 ? "s" : ""} added
                </span>
              )}
            </div>
          </div>
        );

      // ── Step 4: Check-In Templates ───────────────────────────────────────
      case 4:
        return (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: TEXT, fontFamily: "Georgia, serif", marginBottom: 6 }}>Check-In Templates</h2>
            <p style={{ color: MUTED, fontSize: 14, marginBottom: 20 }}>
              Templates define your recurring check-in schedule — for example, "Sunday 9:00 AM Kids" or "Wednesday Evening."
            </p>

            <div style={{ background: "rgba(212,175,55,0.08)", border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <p style={{ color: GOLD, fontWeight: 700, fontSize: 13, margin: "0 0 10px" }}>How Templates work:</p>
              {[
                "Each Template represents one recurring service or ministry time.",
                "You assign classrooms and set the schedule (day, time, frequency).",
                "Each week, active Templates auto-generate a check-in session at the right time.",
                "Families check in to a session, not directly to a Template.",
              ].map((item) => (
                <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                  <span style={{ color: GOLD, fontSize: 14, flexShrink: 0, marginTop: 1 }}>→</span>
                  <span style={{ color: TEXT, fontSize: 13, lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>

            <p style={{ color: MUTED, fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
              Templates are created in <strong style={{ color: TEXT }}>Check-In Setup → Templates</strong>. Click the button below to open it in a new tab, then return here when you're done.
            </p>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <GoldBtn href="/dashboard/children-ministry/checkin-setup">
                Create My First Template ↗
              </GoldBtn>
              <PrimaryBtn onClick={() => completeStep(4)}>
                Continue →
              </PrimaryBtn>
            </div>
          </div>
        );

      // ── Step 5: Label Printing ───────────────────────────────────────────
      case 5:
        return (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: TEXT, fontFamily: "Georgia, serif", marginBottom: 6 }}>Label Printing</h2>
            <p style={{ color: MUTED, fontSize: 14, marginBottom: 20 }}>
              Choose how ShepherdKids formats labels when families check in. You can change this later in Check-In Setup → Label Printing.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
              {(["smart", "classic"] as const).map((mode) => {
                const isSelected = labelMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => setLabelMode(mode)}
                    style={{
                      padding: "18px 20px", borderRadius: 12, cursor: "pointer", textAlign: "left",
                      border: isSelected ? `2px solid ${GOLD}` : `1px solid ${BORDER}`,
                      background: isSelected ? "rgba(212,175,55,0.08)" : "rgba(255,255,255,0.02)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${isSelected ? GOLD : MUTED}`, background: isSelected ? GOLD : "transparent", flexShrink: 0 }} />
                      <span style={{ color: TEXT, fontWeight: 700, fontSize: 15 }}>
                        {mode === "smart" ? "Smart Label" : "Classic Label"}
                        {mode === "smart" && (
                          <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: GOLD, background: "rgba(212,175,55,0.15)", padding: "2px 8px", borderRadius: 20 }}>
                            ⭐ Recommended
                          </span>
                        )}
                      </span>
                    </div>
                    <p style={{ color: MUTED, fontSize: 13, margin: 0, lineHeight: 1.5, paddingLeft: 24 }}>
                      {mode === "smart"
                        ? "Compact, QR-code-enabled labels with family photo, child name, and security code. Great for busy check-in lines."
                        : "Standard name-and-number labels. Wider compatibility; no QR code."}
                    </p>
                  </button>
                );
              })}
            </div>

            {stepStatus[5] === "saved" && <SuccessBadge>Label preference saved!</SuccessBadge>}
            {stepStatus[5] === "error" && <p style={{ color: "#f87171", fontSize: 13, marginBottom: 12 }}>Failed to save. Please try again.</p>}

            <PrimaryBtn onClick={handleSaveLabelMode} loading={saving}>
              Save & Continue →
            </PrimaryBtn>
          </div>
        );

      // ── Step 6: Printer Recommendations ─────────────────────────────────
      case 6:
        return (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: TEXT, fontFamily: "Georgia, serif", marginBottom: 6 }}>Printer Recommendations</h2>
            <p style={{ color: MUTED, fontSize: 14, marginBottom: 20 }}>
              ShepherdKids works with Brother QL-series label printers. Both models below use DK-1202 shipping labels.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
              {[
                {
                  name: "Brother QL-810W",
                  badge: "Most Popular",
                  desc: "Wi-Fi + Wi-Fi Direct. Quiet, fast, and simple to set up. Works well for most Sunday morning check-in setups.",
                  note: "Connect via Wi-Fi for shared access from multiple check-in stations.",
                },
                {
                  name: "Brother QL-820NWB",
                  badge: "Full Featured",
                  desc: "Wi-Fi + Wi-Fi Direct + Bluetooth + Ethernet. Best for large campuses or multi-printer setups.",
                  note: "Ethernet port allows wired connection for maximum reliability.",
                },
              ].map((printer) => (
                <div key={printer.name} style={{ padding: "18px 20px", borderRadius: 12, border: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.02)" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                    <span style={{ fontSize: 28, flexShrink: 0 }}>🖨️</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ color: TEXT, fontWeight: 700, fontSize: 15 }}>{printer.name}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: PURPLE, background: "rgba(123,44,191,0.15)", padding: "2px 8px", borderRadius: 20 }}>{printer.badge}</span>
                      </div>
                      <p style={{ color: MUTED, fontSize: 13, margin: "0 0 6px", lineHeight: 1.5 }}>{printer.desc}</p>
                      <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, margin: "0 0 10px" }}>{printer.note}</p>
                      <a
                        href="#"
                        onClick={(e) => e.preventDefault()}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: GOLD, textDecoration: "none", border: `1px solid rgba(212,175,55,0.3)`, borderRadius: 6, padding: "5px 12px" }}
                      >
                        View on Amazon ↗
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, marginBottom: 16 }}>
              Disclosure: Amazon links above are affiliate links. ShepherdKids may earn a small commission at no extra cost to you.
            </p>

            <p style={{ color: MUTED, fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
              You can continue without a printer now. Printer setup instructions are available in <strong style={{ color: TEXT }}>Check-In Setup → Label Printing</strong>.
            </p>

            <PrimaryBtn onClick={() => completeStep(6)}>Continue →</PrimaryBtn>
          </div>
        );

      // ── Step 7: Family Check-In ──────────────────────────────────────────
      case 7:
        return (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: TEXT, fontFamily: "Georgia, serif", marginBottom: 6 }}>Family Check-In</h2>
            <p style={{ color: MUTED, fontSize: 14, marginBottom: 24 }}>
              Open this URL on any iPad or tablet at your welcome desk. Families search by phone number, select their children, and print labels — no app download needed.
            </p>

            <div style={{ background: "rgba(212,175,55,0.08)", border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <FieldLabel>Your Kiosk URL</FieldLabel>
              <p style={{ color: GOLD, fontSize: 14, fontFamily: "monospace", margin: 0, wordBreak: "break-all" }}>
                {kioskUrl || "Loading…"}
              </p>
            </div>

            {kioskUrl && (
              <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                <a
                  href={kioskUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 8, border: `1px solid ${BORDER}`, color: TEXT, fontSize: 13, fontWeight: 600, textDecoration: "none" }}
                >
                  Open Check-In ↗
                </a>
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(kioskUrl);
                    setKioskCopied(true);
                    setTimeout(() => setKioskCopied(false), 2000);
                  }}
                  style={{ padding: "10px 18px", borderRadius: 8, border: `1px solid ${BORDER}`, background: kioskCopied ? "rgba(22,163,74,0.12)" : "none", color: kioskCopied ? "#4ade80" : MUTED, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                >
                  {kioskCopied ? "Copied! ✓" : "Copy Link"}
                </button>
              </div>
            )}

            <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "14px 16px", marginBottom: 24 }}>
              <p style={{ color: TEXT, fontWeight: 600, fontSize: 13, margin: "0 0 8px" }}>Deployment options</p>
              {[
                { icon: "📱", label: "iPad / Tablet", note: "Open in Safari → Add to Home Screen for a kiosk-like experience." },
                { icon: "💻", label: "Laptop", note: "Open the URL in any browser on a welcome desk laptop." },
                { icon: "📺", label: "Mounted Screen", note: "Connect a tablet or thin client to a wall-mounted screen." },
              ].map((opt) => (
                <div key={opt.label} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{opt.icon}</span>
                  <div>
                    <span style={{ color: TEXT, fontSize: 13, fontWeight: 600 }}>{opt.label}: </span>
                    <span style={{ color: MUTED, fontSize: 13 }}>{opt.note}</span>
                  </div>
                </div>
              ))}
            </div>

            <PrimaryBtn onClick={() => completeStep(7)}>Continue →</PrimaryBtn>
          </div>
        );

      // ── Step 8: First Service Checklist ─────────────────────────────────
      case 8: {
        const checklistItems = [
          { label: "Church Information",         done: completedSteps.has(2) },
          { label: "Classrooms Added",           done: rooms.length > 0 },
          { label: "Check-In Templates Created", done: templateCount > 0 },
          { label: "Label Mode Selected",        done: completedSteps.has(5) },
        ];
        const manualItems = [
          { label: "Connect & Configure Label Printer" },
          { label: "Open Family Check-In on Your Kiosk" },
        ];
        const optionalItems = [
          { label: "Invite Staff",         href: "/dashboard/settings" },
          { label: "Volunteer Access",     href: "/dashboard/children-ministry/volunteers" },
          { label: "Parent Communication", href: "/dashboard/children-ministry/parent-update" },
          { label: "Check-In Automation",  href: "/dashboard/children-ministry/checkin-setup" },
        ];
        const doneCount = checklistItems.filter((i) => i.done).length;
        return (
          <div>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: TEXT, fontFamily: "Georgia, serif", marginBottom: 6 }}>First Service Checklist</h2>
            <p style={{ color: MUTED, fontSize: 14, marginBottom: 24 }}>
              Review what's set up and what still needs attention before your first Sunday.
            </p>

            <div style={{ marginBottom: 24 }}>
              <p style={{ color: GOLD, fontWeight: 700, fontSize: 13, margin: "0 0 10px" }}>
                Setup ({doneCount}/{checklistItems.length} complete)
              </p>
              {checklistItems.map((item) => (
                <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", borderRadius: 8, background: item.done ? "rgba(22,163,74,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${item.done ? "rgba(22,163,74,0.2)" : BORDER}`, marginBottom: 8 }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{item.done ? "✅" : "⬜"}</span>
                  <span style={{ color: item.done ? "#4ade80" : TEXT, fontSize: 14, fontWeight: item.done ? 600 : 400 }}>{item.label}</span>
                  {!item.done && <span style={{ marginLeft: "auto", color: MUTED, fontSize: 12 }}>Incomplete</span>}
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 24 }}>
              <p style={{ color: TEXT, fontWeight: 700, fontSize: 13, margin: "0 0 10px" }}>Day-of Tasks</p>
              {manualItems.map((item) => (
                <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}`, marginBottom: 8 }}>
                  <span style={{ fontSize: 16 }}>☐</span>
                  <span style={{ color: MUTED, fontSize: 14 }}>{item.label}</span>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 28 }}>
              <p style={{ color: MUTED, fontWeight: 700, fontSize: 13, margin: "0 0 10px" }}>Optional Next Steps</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {optionalItems.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    style={{ display: "inline-block", padding: "8px 14px", borderRadius: 8, border: `1px solid ${BORDER}`, color: GOLD, fontSize: 13, fontWeight: 600, textDecoration: "none" }}
                  >
                    {item.label} →
                  </a>
                ))}
              </div>
            </div>

            <PrimaryBtn onClick={handleComplete} loading={saving}>
              Go to Dashboard →
            </PrimaryBtn>
          </div>
        );
      }

      default:
        return null;
    }
  }

  // ── Layout ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "16px 24px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 22 }}>⛪</span>
          <span style={{ color: TEXT, fontWeight: 700, fontSize: 16 }}>ShepherdKids — Getting Started</span>
        </div>
        <button
          onClick={() => router.push("/dashboard")}
          style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", fontSize: 13 }}
        >
          Go to Dashboard →
        </button>
      </div>

      <div style={{ flex: 1, display: "flex", maxWidth: 1000, margin: "0 auto", width: "100%", padding: "32px 20px", gap: 32, alignItems: "flex-start" }}>
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
