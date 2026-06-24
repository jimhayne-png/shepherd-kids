"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/layout/AppShell";
import QRCodeImage from "@/components/ui/QRCodeImage";

const supabase = createClient();

const ACCENT = "#7B2CBF";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? (typeof window !== "undefined" ? window.location.origin : "");

type Room = { id: string; name: string; min_age: number | null; max_age: number | null; capacity: number | null; is_active: boolean; classroom_qr_token: string };
type Template = { id: string; name: string; typical_day: string | null; typical_time: string | null; is_active: boolean };
type Session = { id: string; service_name: string; date: string; scheduled_time: string | null; status: string; kiosk_pin: string };
type Token = { id: string; token: string; label: string; is_active: boolean };

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function computeOpenTime(time: string, minutesBefore: number): string {
  const [h, m] = time.split(":").map(Number);
  const adjusted = ((h * 60 + m - minutesBefore) % 1440 + 1440) % 1440;
  const oh = Math.floor(adjusted / 60);
  const om = adjusted % 60;
  return `${oh % 12 || 12}:${om.toString().padStart(2, "0")} ${oh < 12 ? "AM" : "PM"}`;
}

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}
function fmtTime(t: string | null) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour < 12 ? "AM" : "PM"}`;
}
function ageRange(room: Room) {
  if (room.min_age === null && room.max_age === null) return "All ages";
  if (room.min_age === null) return `Up to age ${room.max_age}`;
  if (room.max_age === null) return `Age ${room.min_age}+`;
  return `Ages ${room.min_age}–${room.max_age}`;
}
async function copyText(text: string) {
  await navigator.clipboard.writeText(text).catch(() => {});
}

export default function CheckinSetupPage() {
  const router = useRouter();
  const selectedChurchIdRef = useRef<string | null>(null);
  function ch(): Record<string, string> {
    return selectedChurchIdRef.current ? { "x-selected-church-id": selectedChurchIdRef.current } : {};
  }
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"rooms" | "templates" | "sessions" | "automation" | "label-printing" | "general" | "locations">("rooms");

  const [rooms, setRooms] = useState<Room[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});
  const [newTokenLabel, setNewTokenLabel] = useState("");
  const [showAddToken, setShowAddToken] = useState(false);

  // Room form
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [roomForm, setRoomForm] = useState({ name: "", minAge: "", maxAge: "", capacity: "" });
  const [savingRoom, setSavingRoom] = useState(false);

  // Template form
  const [showAddTemplate, setShowAddTemplate] = useState(false);
  const [tplForm, setTplForm] = useState({ name: "", typicalDay: "", typicalTime: "" });
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Session form
  const [showAddSession, setShowAddSession] = useState(false);
  const [sessionForm, setSessionForm] = useState({ serviceName: "", templateId: "", date: "", scheduledTime: "", kioskPin: "", sessionGroup: "" });
  const [savingSession, setSavingSession] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Daily PIN management
  const [showChangePIN, setShowChangePIN] = useState(false);
  const [newPINInput, setNewPINInput] = useState("");
  const [savingPIN, setSavingPIN] = useState(false);

  // Automation settings (persisted in localStorage — no DB yet)
  const [autoOpen, setAutoOpen] = useState(false);
  const [autoOpenMinutes, setAutoOpenMinutes] = useState(60);
  const [autoSettingsSaved, setAutoSettingsSaved] = useState(false);

  // Classroom QR modal
  const [qrRoom, setQrRoom] = useState<Room | null>(null);

  // Smart Labels settings
  const [labelExpiryMinutes, setLabelExpiryMinutes] = useState(15);
  const [labelExpirySaved, setLabelExpirySaved] = useState(false);

  // Label Mode + QR settings
  const [labelMode, setLabelMode] = useState<"smart" | "classic">("smart");
  const [smartLabelQrEnabled, setSmartLabelQrEnabled] = useState(true);
  const [volunteerCheckinQrEnabled, setVolunteerCheckinQrEnabled] = useState(true);
  const [labelSettingsSaving, setLabelSettingsSaving] = useState(false);
  const [labelSettingsSaved, setLabelSettingsSaved] = useState(false);

  // Automation: add-service-schedule form (session_group UI-only — DB field pending)
  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ name: "", day: "Sunday", time: "", sessionGroup: "" });
  const [savingSchedule, setSavingSchedule] = useState(false);

  // General tab — church timezone
  const [timezone, setTimezone] = useState("America/Los_Angeles");
  const [timezoneSaving, setTimezoneSaving] = useState(false);
  const [timezoneSaved, setTimezoneSaved] = useState(false);

  // Automation — check-in time window
  const [checkInOpensBefore, setCheckInOpensBefore] = useState(30);
  const [typicalClassDuration, setTypicalClassDuration] = useState(60);
  const [checkInClosesAfter, setCheckInClosesAfter] = useState(30);
  const [windowSaving, setWindowSaving] = useState(false);
  const [windowSaved, setWindowSaved] = useState(false);

  // Letter template (Automation Settings tab)
  const [letterSubject, setLetterSubject] = useState("");
  const [letterBody, setLetterBody] = useState("");
  const [letterSaving, setLetterSaving] = useState(false);
  const [letterSaved, setLetterSaved] = useState(false);
  const [letterLoaded, setLetterLoaded] = useState(false);

  useEffect(() => {
    if (tab === "automation" && !loading && !letterLoaded) {
      loadLetterTemplate();
    }
  }, [tab, loading, letterLoaded]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("sk_checkin_auto_open");
      if (raw) {
        const p = JSON.parse(raw);
        setAutoOpen(p.autoOpen ?? false);
        setAutoOpenMinutes(p.autoOpenMinutes ?? 60);
      }
    } catch { /* ignore */ }
    try {
      const rawExpiry = localStorage.getItem("sk_smart_label_expiry");
      if (rawExpiry !== null) setLabelExpiryMinutes(parseInt(rawExpiry, 10) || 15);
    } catch { /* ignore */ }
  }, []);

  function saveAutoSettings() {
    localStorage.setItem("sk_checkin_auto_open", JSON.stringify({ autoOpen, autoOpenMinutes }));
    setAutoSettingsSaved(true);
    setTimeout(() => setAutoSettingsSaved(false), 2000);
  }

  function saveSmartLabelSettings() {
    localStorage.setItem("sk_smart_label_expiry", String(labelExpiryMinutes));
    setLabelExpirySaved(true);
    setTimeout(() => setLabelExpirySaved(false), 2000);
  }

  async function saveSchedule() {
    if (!scheduleForm.name.trim() || !scheduleForm.time) return;
    setSavingSchedule(true);
    const res = await fetch("/api/checkin/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...ch() },
      credentials: "include",
      body: JSON.stringify({ name: scheduleForm.name, typicalDay: scheduleForm.day, typicalTime: scheduleForm.time }),
    });
    if (res.ok) {
      const d = await res.json();
      setTemplates(t => [...t, d.template]);
      setScheduleForm({ name: "", day: "Sunday", time: "", sessionGroup: "" });
      setShowAddSchedule(false);
    }
    setSavingSchedule(false);
  }

  async function loadLetterTemplate() {
    const res = await fetch("/api/children-ministry/letter-template", { credentials: "include", headers: ch() });
    if (res.ok) { const d = await res.json(); setLetterSubject(d.template.subject); setLetterBody(d.template.body_html); }
    setLetterLoaded(true);
  }

  async function saveLetterTemplate() {
    setLetterSaving(true);
    await fetch("/api/children-ministry/letter-template", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...ch() },
      credentials: "include",
      body: JSON.stringify({ subject: letterSubject, body_html: letterBody }),
    });
    setLetterSaving(false);
    setLetterSaved(true);
    setTimeout(() => setLetterSaved(false), 2000);
  }

  async function saveWindowSettings() {
    setWindowSaving(true);
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...ch() },
      credentials: "include",
      body: JSON.stringify({ check_in_opens_minutes_before: checkInOpensBefore, typical_class_duration_minutes: typicalClassDuration, check_in_closes_minutes_after: checkInClosesAfter }),
    });
    setWindowSaving(false);
    if (res.ok) {
      setWindowSaved(true);
      setTimeout(() => setWindowSaved(false), 2500);
    }
  }

  async function saveLabelSettings() {
    setLabelSettingsSaving(true);
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...ch() },
      credentials: "include",
      body: JSON.stringify({ label_mode: labelMode, smart_label_qr_enabled: smartLabelQrEnabled, volunteer_checkin_qr_enabled: volunteerCheckinQrEnabled }),
    });
    setLabelSettingsSaving(false);
    if (res.ok) {
      setLabelSettingsSaved(true);
      setTimeout(() => setLabelSettingsSaved(false), 2500);
    }
  }

  async function saveTimezone() {
    setTimezoneSaving(true);
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...ch() },
      credentials: "include",
      body: JSON.stringify({ timezone }),
    });
    setTimezoneSaving(false);
    if (res.ok) {
      setTimezoneSaved(true);
      setTimeout(() => setTimezoneSaved(false), 2500);
    }
  }

  async function load() {
    const [rRes, tRes, sRes, tokRes] = await Promise.all([
      fetch("/api/checkin/rooms", { credentials: "include", headers: ch() }),
      fetch("/api/checkin/templates", { credentials: "include", headers: ch() }),
      fetch("/api/checkin/sessions", { credentials: "include", headers: ch() }),
      fetch("/api/children-ministry/visitor-tokens", { credentials: "include", headers: ch() }),
    ]);
    if (rRes.ok) { const d = await rRes.json(); setRooms(d.rooms ?? []); }
    if (tRes.ok) { const d = await tRes.json(); setTemplates(d.templates ?? []); }
    if (sRes.ok) { const d = await sRes.json(); setSessions(d.sessions ?? []); if (!selectedChurchIdRef.current && d.sessions?.length > 0) { selectedChurchIdRef.current = d.sessions[0].church_id; } }
    if (tokRes.ok) { const d = await tokRes.json(); setTokens(d.tokens ?? []); }
  }

  useEffect(() => {
    async function init() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!user || error) {
        console.log("Dashboard client user unavailable:", error?.message ?? null);
        return;
      }
      const churchRes = await fetch('/api/auth/church', {
        credentials: 'include',
        headers: ch(),
      });
      if (churchRes.ok) {
        const churchData = await churchRes.json();
        selectedChurchIdRef.current = churchData.churchId;
      }
      await load();
      const settingsRes = await fetch("/api/settings", { credentials: "include", headers: ch() });
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        if (settingsData.church?.timezone) setTimezone(settingsData.church.timezone);
        if (settingsData.church?.check_in_opens_minutes_before) setCheckInOpensBefore(settingsData.church.check_in_opens_minutes_before);
        if (settingsData.church?.typical_class_duration_minutes) setTypicalClassDuration(settingsData.church.typical_class_duration_minutes);
        if (settingsData.church?.check_in_closes_minutes_after) setCheckInClosesAfter(settingsData.church.check_in_closes_minutes_after);
        if (settingsData.church?.label_mode === "classic" || settingsData.church?.label_mode === "smart") setLabelMode(settingsData.church.label_mode);
        if (typeof settingsData.church?.smart_label_qr_enabled === "boolean") setSmartLabelQrEnabled(settingsData.church.smart_label_qr_enabled);
        if (typeof settingsData.church?.volunteer_checkin_qr_enabled === "boolean") setVolunteerCheckinQrEnabled(settingsData.church.volunteer_checkin_qr_enabled);
      }
      setLoading(false);
    }
    init();
  }, [router]);

  async function saveRoom() {
    if (!roomForm.name.trim()) return;
    setSavingRoom(true);
    const res = await fetch("/api/checkin/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...ch() },
      credentials: "include",
      body: JSON.stringify({ name: roomForm.name, minAge: roomForm.minAge ? parseInt(roomForm.minAge) : null, maxAge: roomForm.maxAge ? parseInt(roomForm.maxAge) : null, capacity: roomForm.capacity ? parseInt(roomForm.capacity) : null }),
    });
    if (res.ok) { const d = await res.json(); setRooms(r => [...r, d.room]); setRoomForm({ name: "", minAge: "", maxAge: "", capacity: "" }); setShowAddRoom(false); }
    else { const errBody = await res.json().catch(() => ({})); console.log('[saveRoom] failed', res.status, errBody); }
    setSavingRoom(false);
  }

  async function toggleRoom(room: Room) {
    const res = await fetch("/api/checkin/rooms", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...ch() },
      credentials: "include",
      body: JSON.stringify({ id: room.id, isActive: !room.is_active }),
    });
    if (res.ok) { const d = await res.json(); setRooms(rs => rs.map(r => r.id === room.id ? d.room : r)); }
  }

  async function deleteRoom(room: Room) {
    if (!confirm(`Permanently delete "${room.name}"? This cannot be undone.`)) return;
    const res = await fetch("/api/checkin/rooms", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", ...ch() },
      credentials: "include",
      body: JSON.stringify({ id: room.id }),
    });
    if (res.ok) { setRooms(rs => rs.filter(r => r.id !== room.id)); }
  }

  async function saveTemplate() {
    if (!tplForm.name.trim()) return;
    setSavingTemplate(true);
    const res = await fetch("/api/checkin/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...ch() },
      credentials: "include",
      body: JSON.stringify({ name: tplForm.name, typicalDay: tplForm.typicalDay || null, typicalTime: tplForm.typicalTime || null }),
    });
    if (res.ok) { const d = await res.json(); setTemplates(t => [...t, d.template]); setTplForm({ name: "", typicalDay: "", typicalTime: "" }); setShowAddTemplate(false); }
    setSavingTemplate(false);
  }

  async function toggleTemplate(tpl: Template) {
    const res = await fetch("/api/checkin/templates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...ch() },
      credentials: "include",
      body: JSON.stringify({ id: tpl.id, isActive: !tpl.is_active }),
    });
    if (res.ok) { const d = await res.json(); setTemplates(ts => ts.map(t => t.id === tpl.id ? d.template : t)); }
  }

  async function saveSession() {
    if (!sessionForm.serviceName.trim() || !sessionForm.date || !sessionForm.kioskPin) return;
    if (!/^\d{4}$/.test(sessionForm.kioskPin)) { alert("PIN must be exactly 4 digits"); return; }
    setSavingSession(true);
    const res = await fetch("/api/checkin/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...ch() },
      credentials: "include",
      body: JSON.stringify({ serviceName: sessionForm.serviceName, serviceTemplateId: sessionForm.templateId || null, date: sessionForm.date, scheduledTime: sessionForm.scheduledTime || null, kioskPin: sessionForm.kioskPin, sessionGroup: sessionForm.sessionGroup || null, labelExpiryMinutes }),
    });
    if (res.ok) { const d = await res.json(); setSessions(s => [d.session, ...s]); setSessionForm({ serviceName: "", templateId: "", date: "", scheduledTime: "", kioskPin: "", sessionGroup: "" }); setShowAddSession(false); }
    setSavingSession(false);
  }

  async function toggleSession(session: Session) {
    const newStatus = session.status === "open" ? "closed" : "open";
    const res = await fetch("/api/checkin/sessions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...ch() },
      credentials: "include",
      body: JSON.stringify({ id: session.id, status: newStatus }),
    });
    if (res.ok) { const d = await res.json(); setSessions(ss => ss.map(s => s.id === session.id ? d.session : s)); }
  }

  function handleCopy(url: string) {
    copyText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  }

  async function generateQr(tok: Token) {
    if (qrDataUrls[tok.id]) return;
    const url = `${APP_URL}/kids-checkin/${tok.token}`;
    const { default: QRCode } = await import("qrcode");
    const dataUrl = await QRCode.toDataURL(url, { width: 280, margin: 2, color: { dark: "#1A4A2E", light: "#ffffff" } });
    setQrDataUrls(m => ({ ...m, [tok.id]: dataUrl }));
  }

  async function addToken() {
    if (!newTokenLabel.trim()) return;
    await fetch("/api/children-ministry/visitor-tokens", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", ...ch() },
      body: JSON.stringify({ label: newTokenLabel }),
    });
    setNewTokenLabel(""); setShowAddToken(false);
    await load();
  }

  async function saveDailyPin() {
    if (!/^\d{4}$/.test(newPINInput)) return;
    setSavingPIN(true);
    const today = new Date().toLocaleDateString('en-CA');
    const res = await fetch("/api/checkin/sessions/daily-pin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...ch() },
      credentials: "include",
      body: JSON.stringify({ date: today, pin: newPINInput }),
    });
    if (res.ok) {
      setSessions(ss => ss.map(s => s.date === today ? { ...s, kiosk_pin: newPINInput } : s));
      setShowChangePIN(false);
      setNewPINInput("");
    }
    setSavingPIN(false);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#08060D" }}><div style={{ color: "#D8D8E8" }}>Loading…</div></div>;

  const activeRooms = rooms.filter(r => r.is_active);
  const activeSessions = sessions.filter(s => s.status === "open");

  return (
    <AppShell navItems={[]}>
      {/* Header */}
      <div className="px-8 py-10" style={{ background: "linear-gradient(135deg, #08060D 0%, #1C0A30 100%)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
          <div>
            <p className="text-sm mb-1" style={{ color: "#D4AF37" }}>ShepherdKids</p>
            <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>Check-In Setup</h1>
            <p className="text-sm mt-1" style={{ color: "#D8D8E8" }}>Manage rooms, service templates, and kiosk sessions</p>
          </div>
          <a
            href="/dashboard/children-ministry/live-checkin"
            style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 20px", backgroundColor: "#16a34a", color: "#ffffff", borderRadius: "12px", fontSize: "14px", fontWeight: 700, textDecoration: "none", flexShrink: 0, marginTop: "6px" }}
          >
            🟢 Go Live Dashboard
          </a>
        </div>
      </div>

      <div className="px-8 py-8" style={{ backgroundColor: "#0A0814", minHeight: "100vh" }}>
        {/* Tabs */}
        <div className="flex gap-1 mb-8 w-fit flex-wrap" style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.22)", borderRadius: "16px", padding: "6px" }}>
          {(["general", "rooms", "templates", "sessions", "automation", "label-printing", "locations"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors" style={{ backgroundColor: tab === t ? ACCENT : "transparent", color: tab === t ? "white" : "#A9A9B8" }}>
              {t === "general" ? "General" : t === "rooms" ? "Rooms" : t === "templates" ? "Templates" : t === "sessions" ? "Sessions" : t === "automation" ? "Automation" : t === "label-printing" ? "Label Printing" : "Check-In Locations"}
            </button>
          ))}
        </div>

        {/* ── GENERAL TAB ── */}
        {tab === "general" && (
          <div style={{ maxWidth: 560 }}>
            <div style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.25)", borderRadius: "16px", padding: "28px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
                <span style={{ fontSize: "22px" }}>🌍</span>
                <div>
                  <h2 style={{ color: "#FFFFFF", fontWeight: 700, fontSize: "16px", margin: 0, fontFamily: "Georgia, serif" }}>Church Time Zone</h2>
                  <p style={{ color: "#A9A9B8", fontSize: "12px", margin: "3px 0 0" }}>
                    Used to determine which sessions are open today and for all check-in date logic
                  </p>
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "#A9A9B8", textTransform: "uppercase" as const, letterSpacing: "0.08em", display: "block", marginBottom: "8px" }}>
                  Time Zone
                </label>
                <select
                  value={timezone}
                  onChange={e => setTimezone(e.target.value)}
                  style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: "10px", color: "#FFFFFF", fontSize: "14px", outline: "none", appearance: "none", WebkitAppearance: "none", cursor: "pointer" }}
                >
                  <option value="America/Los_Angeles" style={{ background: "#120A1F" }}>Pacific Time — America/Los_Angeles</option>
                  <option value="America/Denver" style={{ background: "#120A1F" }}>Mountain Time — America/Denver</option>
                  <option value="America/Chicago" style={{ background: "#120A1F" }}>Central Time — America/Chicago</option>
                  <option value="America/New_York" style={{ background: "#120A1F" }}>Eastern Time — America/New_York</option>
                  <option value="America/Anchorage" style={{ background: "#120A1F" }}>Alaska Time — America/Anchorage</option>
                  <option value="Pacific/Honolulu" style={{ background: "#120A1F" }}>Hawaii Time — Pacific/Honolulu</option>
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button
                  onClick={saveTimezone}
                  disabled={timezoneSaving}
                  style={{ padding: "9px 22px", background: "linear-gradient(135deg, #7B2CBF, #9D4EDD)", border: "none", borderRadius: "10px", fontSize: "13px", fontWeight: 700, color: "#FFFFFF", cursor: timezoneSaving ? "not-allowed" : "pointer", opacity: timezoneSaving ? 0.6 : 1 }}
                >
                  {timezoneSaved ? "✓ Saved" : timezoneSaving ? "Saving…" : "Save Time Zone"}
                </button>
              </div>

              <div style={{ marginTop: "20px", padding: "12px 14px", background: "rgba(212,175,55,0.07)", border: "1px solid rgba(212,175,55,0.18)", borderRadius: "10px" }}>
                <p style={{ fontSize: "12px", color: "#D4AF37", margin: 0 }}>
                  💡 The kiosk compares today&apos;s date in this timezone when deciding which sessions to show. If your sessions appear on the wrong day, check that this matches your church location.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── ROOMS TAB ── */}
        {tab === "rooms" && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold" style={{ fontFamily: "Georgia, serif", color: "#ffffff" }}>Check-In Rooms</h2>
                <p className="text-xs mt-0.5" style={{ color: "#A9A9B8" }}>Children are assigned by age range</p>
              </div>
              <button onClick={() => setShowAddRoom(true)} className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: ACCENT }}>+ Add Room</button>
            </div>

            {showAddRoom && (
              <div className="rounded-2xl p-6 mb-6" style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.22)" }}>
                <h3 className="font-bold mb-4" style={{ color: "#ffffff" }}>New Room</h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="col-span-2">
                    <label className="text-xs font-semibold uppercase tracking-widest block mb-1" style={{ color: "#A9A9B8" }}>Room Name *</label>
                    <input value={roomForm.name} onChange={e => setRoomForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Nursery, K–2nd Grade" className="w-full px-3 py-2.5 rounded-lg text-sm" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,175,55,0.3)", color: "#ffffff", outline: "none" }} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest block mb-1" style={{ color: "#A9A9B8" }}>Min Age</label>
                    <input type="number" value={roomForm.minAge} onChange={e => setRoomForm(f => ({ ...f, minAge: e.target.value }))} placeholder="e.g. 0" className="w-full px-3 py-2.5 rounded-lg text-sm" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,175,55,0.3)", color: "#ffffff", outline: "none" }} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest block mb-1" style={{ color: "#A9A9B8" }}>Max Age</label>
                    <input type="number" value={roomForm.maxAge} onChange={e => setRoomForm(f => ({ ...f, maxAge: e.target.value }))} placeholder="e.g. 3" className="w-full px-3 py-2.5 rounded-lg text-sm" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,175,55,0.3)", color: "#ffffff", outline: "none" }} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest block mb-1" style={{ color: "#A9A9B8" }}>Capacity</label>
                    <input type="number" value={roomForm.capacity} onChange={e => setRoomForm(f => ({ ...f, capacity: e.target.value }))} placeholder="e.g. 20" className="w-full px-3 py-2.5 rounded-lg text-sm" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,175,55,0.3)", color: "#ffffff", outline: "none" }} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={saveRoom} disabled={savingRoom || !roomForm.name.trim()} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: ACCENT, opacity: savingRoom ? 0.6 : 1 }}>{savingRoom ? "Saving…" : "Save Room"}</button>
                  <button onClick={() => setShowAddRoom(false)} className="px-4 py-2.5 rounded-xl text-sm" style={{ border: "1px solid rgba(212,175,55,0.3)", color: "#A9A9B8", background: "transparent" }}>Cancel</button>
                </div>
              </div>
            )}

            {rooms.length === 0 ? (
              <div className="rounded-2xl p-12 text-center" style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.22)" }}><div className="text-4xl mb-3">🏠</div><p style={{ color: "#A9A9B8" }}>No rooms yet. Add your first room above.</p></div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {rooms.map(room => (
                  <div key={room.id} className="rounded-2xl p-5" style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.22)" }}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-bold" style={{ color: "#ffffff" }}>{room.name}</h3>
                        <p className="text-sm" style={{ color: "#A9A9B8" }}>{ageRange(room)}</p>
                        {room.capacity && <p className="text-xs mt-0.5" style={{ color: "#A9A9B8" }}>Capacity: {room.capacity}</p>}
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${room.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>{room.is_active ? "Active" : "Inactive"}</span>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button onClick={() => toggleRoom(room)} className="flex-1 py-2 rounded-xl text-xs font-bold border" style={{ borderColor: ACCENT, color: room.is_active ? "#6b7280" : ACCENT, backgroundColor: room.is_active ? "transparent" : ACCENT + "11" }}>
                        {room.is_active ? "Deactivate" : "Activate"}
                      </button>
                      {room.is_active && APP_URL && room.classroom_qr_token && volunteerCheckinQrEnabled && (
                        <>
                          <button onClick={() => setQrRoom(room)} className="py-2 px-3 rounded-xl text-xs font-bold" style={{ border: `1px solid ${ACCENT}`, color: ACCENT, backgroundColor: "transparent" }}>
                            QR Code
                          </button>
                          <a href={`${APP_URL}/classroom/${room.classroom_qr_token}`} target="_blank" rel="noopener noreferrer" className="flex-1 py-2 rounded-xl text-xs font-bold text-white text-center" style={{ backgroundColor: ACCENT }}>
                            Open ↗
                          </a>
                        </>
                      )}
                      {!room.is_active && (
                        <button onClick={() => deleteRoom(room)} className="py-2 px-3 rounded-xl text-xs font-bold border border-red-200 text-red-500 hover:bg-red-50 transition-colors">
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TEMPLATES TAB ── */}
        {tab === "templates" && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold" style={{ fontFamily: "Georgia, serif", color: "#ffffff" }}>Service Templates</h2>
                <p className="text-xs mt-0.5" style={{ color: "#A9A9B8" }}>Reusable service definitions for quick session creation</p>
              </div>
              <button onClick={() => setShowAddTemplate(true)} className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: ACCENT }}>+ Add Template</button>
            </div>

            {showAddTemplate && (
              <div className="rounded-2xl p-6 mb-6" style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.22)" }}>
                <h3 className="font-bold mb-4" style={{ color: "#ffffff" }}>New Template</h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="col-span-2">
                    <label className="text-xs font-semibold uppercase tracking-widest block mb-1" style={{ color: "#A9A9B8" }}>Service Name *</label>
                    <input value={tplForm.name} onChange={e => setTplForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Sunday Morning Service" className="w-full px-3 py-2.5 rounded-lg text-sm" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,175,55,0.3)", color: "#ffffff", outline: "none" }} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest block mb-1" style={{ color: "#A9A9B8" }}>Typical Day</label>
                    <input value={tplForm.typicalDay} onChange={e => setTplForm(f => ({ ...f, typicalDay: e.target.value }))} placeholder="e.g. Sunday" className="w-full px-3 py-2.5 rounded-lg text-sm" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,175,55,0.3)", color: "#ffffff", outline: "none" }} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest block mb-1" style={{ color: "#A9A9B8" }}>Typical Time</label>
                    <input type="time" value={tplForm.typicalTime} onChange={e => setTplForm(f => ({ ...f, typicalTime: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg text-sm" style={{ background: "#C084FC", border: "1px solid rgba(212,175,55,0.45)", color: "#08060D", WebkitTextFillColor: "#08060D", colorScheme: "light", outline: "none" }} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={saveTemplate} disabled={savingTemplate || !tplForm.name.trim()} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: ACCENT, opacity: savingTemplate ? 0.6 : 1 }}>{savingTemplate ? "Saving…" : "Save Template"}</button>
                  <button onClick={() => setShowAddTemplate(false)} className="px-4 py-2.5 rounded-xl text-sm" style={{ border: "1px solid rgba(212,175,55,0.3)", color: "#A9A9B8", background: "transparent" }}>Cancel</button>
                </div>
              </div>
            )}

            {templates.length === 0 ? (
              <div className="rounded-2xl p-12 text-center" style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.22)" }}><div className="text-4xl mb-3">📅</div><p style={{ color: "#A9A9B8" }}>No templates yet. Add your first service template above.</p></div>
            ) : (
              <div className="space-y-3">
                {templates.map(tpl => (
                  <div key={tpl.id} className="rounded-2xl p-5 flex items-center justify-between" style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.22)" }}>
                    <div>
                      <h3 className="font-bold" style={{ color: "#ffffff" }}>{tpl.name}</h3>
                      <p className="text-sm mt-0.5" style={{ color: "#A9A9B8" }}>
                        {[tpl.typical_day, tpl.typical_time ? fmtTime(tpl.typical_time) : null].filter(Boolean).join(" · ") || "No schedule set"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2.5 py-1 rounded-full font-bold" style={{ background: tpl.is_active ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.06)", color: tpl.is_active ? "#4ade80" : "#A9A9B8" }}>{tpl.is_active ? "Active" : "Inactive"}</span>
                      <button onClick={() => toggleTemplate(tpl)} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ border: "1px solid rgba(212,175,55,0.3)", color: "#A9A9B8", background: "transparent" }}>
                        {tpl.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── SESSIONS TAB ── */}
        {tab === "sessions" && (
          <div>
            {/* Permanent church kiosk URL */}
            {selectedChurchIdRef.current && APP_URL && (
              <div className="rounded-2xl shadow p-5 mb-6 border-2" style={{ backgroundColor: ACCENT + "0d", borderColor: ACCENT }}>
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-2xl flex-shrink-0">📱</span>
                  <div>
                    <h3 className="font-bold text-base" style={{ color: "#ffffff" }}>Church Check-In Kiosk</h3>
                    <p className="text-xs mt-0.5" style={{ color: "#A9A9B8" }}>This link never changes — bookmark it on your check-in tablet</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,175,55,0.3)" }}>
                  <code className="text-sm flex-1 truncate min-w-0" style={{ color: "#D8D8E8" }}>
                    {APP_URL}/kiosk/church/{selectedChurchIdRef.current}
                  </code>
                  <button
                    onClick={() => handleCopy(`${APP_URL}/kiosk/church/${selectedChurchIdRef.current!}`)}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg flex-shrink-0"
                    style={{ backgroundColor: ACCENT + "22", color: ACCENT }}
                  >
                    {copiedUrl === `${APP_URL}/kiosk/church/${selectedChurchIdRef.current}` ? "Copied!" : "Copy"}
                  </button>
                  <a
                    href={`${APP_URL}/kiosk/church/${selectedChurchIdRef.current}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold px-3 py-1.5 rounded-lg text-white flex-shrink-0"
                    style={{ backgroundColor: ACCENT }}
                  >
                    Open ↗
                  </a>
                </div>
              </div>
            )}

            {/* Volunteer Room View card */}
            {selectedChurchIdRef.current && APP_URL && (
              volunteerCheckinQrEnabled ? (
                <div className="rounded-2xl shadow p-5 mb-6 border-2" style={{ backgroundColor: "#7c3aed0d", borderColor: "#7c3aed" }}>
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-2xl flex-shrink-0">👥</span>
                    <div>
                      <h3 className="font-bold text-base" style={{ color: "#ffffff" }}>Volunteer Room View</h3>
                      <p className="text-xs mt-0.5" style={{ color: "#A9A9B8" }}>Share with room volunteers — they enter today&apos;s PIN and select their room</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,175,55,0.3)" }}>
                    <code className="text-sm flex-1 truncate min-w-0" style={{ color: "#D8D8E8" }}>
                      {APP_URL}/kiosk/volunteer/{selectedChurchIdRef.current}
                    </code>
                    <button
                      onClick={() => handleCopy(`${APP_URL}/kiosk/volunteer/${selectedChurchIdRef.current!}`)}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg flex-shrink-0"
                      style={{ backgroundColor: "#7c3aed22", color: "#7c3aed" }}
                    >
                      {copiedUrl === `${APP_URL}/kiosk/volunteer/${selectedChurchIdRef.current}` ? "Copied!" : "Copy"}
                    </button>
                    <a
                      href={`${APP_URL}/kiosk/volunteer/${selectedChurchIdRef.current}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold px-3 py-1.5 rounded-lg text-white flex-shrink-0"
                      style={{ backgroundColor: "#7c3aed" }}
                    >
                      Open ↗
                    </a>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl p-4 mb-6" style={{ background: "rgba(107,114,128,0.08)", border: "1px solid rgba(107,114,128,0.25)" }}>
                  <p style={{ color: "#6b7280", fontSize: "13px", margin: 0 }}>
                    👥 <strong style={{ color: "#9ca3af" }}>Volunteer Room View</strong> — Volunteer QR tools are turned off in{" "}
                    <button onClick={() => setTab("label-printing")} style={{ color: "#D4AF37", background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: "13px", fontWeight: 600 }}>Label Printing settings</button>.
                  </p>
                </div>
              )
            )}

            {/* Today's PIN card */}
            {(() => {
              const today = new Date().toLocaleDateString('en-CA');
              const todaySessions = sessions.filter(s => s.date === today);
              const todayPin = todaySessions[0]?.kiosk_pin ?? null;
              return (
                <div className="rounded-2xl p-5 mb-6" style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.22)" }}>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-sm mb-0.5" style={{ color: "#ffffff" }}>🔑 Today&apos;s PIN</h3>
                      {todayPin ? (
                        <p className="text-2xl font-mono font-bold tracking-widest" style={{ color: "#D4AF37" }}>{todayPin}</p>
                      ) : (
                        <p className="text-sm mt-0.5" style={{ color: "#A9A9B8" }}>No sessions today</p>
                      )}
                    </div>
                    {!showChangePIN && (
                      <button
                        onClick={() => { setNewPINInput(todayPin ?? ""); setShowChangePIN(true); }}
                        className="px-4 py-2 rounded-xl text-sm font-bold flex-shrink-0"
                        style={{ border: "1px solid rgba(212,175,55,0.3)", color: "#A9A9B8", background: "transparent" }}
                      >
                        Change PIN
                      </button>
                    )}
                  </div>
                  {showChangePIN && (
                    <div className="mt-4 flex items-center gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={newPINInput}
                        onChange={e => setNewPINInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        placeholder="New 4-digit PIN"
                        maxLength={4}
                        className="px-3 py-2 rounded-lg text-sm font-mono w-36"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,175,55,0.3)", color: "#ffffff", outline: "none" }}
                        autoFocus
                      />
                      <button
                        onClick={saveDailyPin}
                        disabled={savingPIN || newPINInput.length !== 4}
                        className="px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40"
                        style={{ backgroundColor: ACCENT }}
                      >
                        {savingPIN ? "Saving…" : "Save"}
                      </button>
                      <button
                        onClick={() => { setShowChangePIN(false); setNewPINInput(""); }}
                        className="px-3 py-2 rounded-xl text-sm"
                        style={{ border: "1px solid rgba(212,175,55,0.3)", color: "#A9A9B8", background: "transparent" }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Classroom access links */}
            {activeRooms.length > 0 && APP_URL && (
              volunteerCheckinQrEnabled ? (
                <div className="rounded-2xl p-5 mb-6" style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.22)" }}>
                  <h3 className="font-bold mb-3 text-sm" style={{ color: "#ffffff" }}>🏫 Classroom Tablet Links</h3>
                  <div className="flex flex-wrap gap-2">
                    {activeRooms.map(room => {
                      const url = `${APP_URL}/classroom/${room.classroom_qr_token}`;
                      return (
                        <div key={room.id} className="flex items-center gap-1.5 rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,175,55,0.2)" }}>
                          <span className="text-sm font-medium" style={{ color: "#D8D8E8" }}>{room.name}</span>
                          <button onClick={() => handleCopy(url)} className="text-xs px-2 py-0.5 rounded font-bold" style={{ color: ACCENT }}>{copiedUrl === url ? "Copied!" : "Copy"}</button>
                          <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs" style={{ color: "#A9A9B8" }}>↗</a>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null
            )}

            {/* Service Schedule */}
            <div style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.25)", borderRadius: "16px", padding: "24px", marginBottom: "24px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: "20px" }}>
                <div>
                  <h2 style={{ color: "#FFFFFF", fontWeight: 700, fontSize: "16px", margin: 0, fontFamily: "Georgia, serif" }}>📅 Service Schedule</h2>
                  <p style={{ color: "#A9A9B8", fontSize: "12px", margin: "4px 0 0" }}>
                    {autoOpen
                      ? `Active services will open check-in ${autoOpenMinutes} min before start`
                      : "Define recurring services — enable Automatic Session Opening in Automation to activate"}
                  </p>
                </div>
                <button
                  onClick={() => setShowAddSchedule(true)}
                  style={{ padding: "8px 16px", background: "linear-gradient(135deg, #7B2CBF, #9D4EDD)", border: "none", borderRadius: "10px", fontSize: "13px", fontWeight: 700, color: "#FFFFFF", cursor: "pointer", flexShrink: 0 }}
                >
                  + Add Service
                </button>
              </div>

              {showAddSchedule && (
                <div style={{ background: "#0D0A14", border: "1px solid rgba(212,175,55,0.2)", borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
                  <h3 style={{ color: "#FFFFFF", fontWeight: 700, fontSize: "14px", margin: "0 0 16px" }}>New Service Schedule</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={{ fontSize: "11px", fontWeight: 700, color: "#A9A9B8", textTransform: "uppercase" as const, letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>Service Name *</label>
                      <input
                        value={scheduleForm.name}
                        onChange={e => setScheduleForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="e.g. Sunday Morning Service"
                        style={{ width: "100%", padding: "8px 12px", background: "#0E0C18", border: "1px solid rgba(212,175,55,0.2)", borderRadius: "8px", fontSize: "13px", color: "#FFFFFF", boxSizing: "border-box" as const, outline: "none" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "11px", fontWeight: 700, color: "#A9A9B8", textTransform: "uppercase" as const, letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>Day of Week *</label>
                      <select
                        value={scheduleForm.day}
                        onChange={e => setScheduleForm(f => ({ ...f, day: e.target.value }))}
                        style={{ width: "100%", padding: "8px 12px", background: "#C084FC", border: "1px solid rgba(212,175,55,0.45)", borderRadius: "8px", fontSize: "13px", color: "#08060D", WebkitTextFillColor: "#08060D", colorScheme: "light", outline: "none" }}
                      >
                        {DAYS_OF_WEEK.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: "11px", fontWeight: 700, color: "#A9A9B8", textTransform: "uppercase" as const, letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>Service Start Time *</label>
                      <input
                        type="time"
                        value={scheduleForm.time}
                        onChange={e => setScheduleForm(f => ({ ...f, time: e.target.value }))}
                        style={{ width: "100%", padding: "8px 12px", background: "#0E0C18", border: "1px solid rgba(212,175,55,0.2)", borderRadius: "8px", fontSize: "13px", color: "#FFFFFF", outline: "none" }}
                      />
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={{ fontSize: "11px", fontWeight: 700, color: "#A9A9B8", textTransform: "uppercase" as const, letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>
                        Session Group{" "}
                        <span style={{ color: "rgba(212,175,55,0.5)", fontWeight: 400, textTransform: "none" as const, letterSpacing: 0 }}>(optional)</span>
                      </label>
                      <input
                        value={scheduleForm.sessionGroup}
                        onChange={e => setScheduleForm(f => ({ ...f, sessionGroup: e.target.value }))}
                        placeholder="e.g. Sunday Morning"
                        style={{ width: "100%", padding: "8px 12px", background: "#0E0C18", border: "1px solid rgba(212,175,55,0.12)", borderRadius: "8px", fontSize: "13px", color: "rgba(255,255,255,0.45)", boxSizing: "border-box" as const, outline: "none" }}
                      />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
                    <button
                      onClick={saveSchedule}
                      disabled={savingSchedule || !scheduleForm.name.trim() || !scheduleForm.time}
                      style={{ padding: "8px 20px", background: "linear-gradient(135deg, #7B2CBF, #9D4EDD)", border: "none", borderRadius: "10px", fontSize: "13px", fontWeight: 700, color: "#FFFFFF", cursor: savingSchedule ? "not-allowed" : "pointer", opacity: (savingSchedule || !scheduleForm.name.trim() || !scheduleForm.time) ? 0.6 : 1 }}
                    >
                      {savingSchedule ? "Saving…" : "Save Service"}
                    </button>
                    <button
                      onClick={() => { setShowAddSchedule(false); setScheduleForm({ name: "", day: "Sunday", time: "", sessionGroup: "" }); }}
                      style={{ padding: "8px 16px", background: "transparent", border: "1px solid rgba(212,175,55,0.2)", borderRadius: "10px", fontSize: "13px", color: "#A9A9B8", cursor: "pointer" }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {templates.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px" }}>
                  <div style={{ fontSize: "40px", marginBottom: "12px" }}>📅</div>
                  <p style={{ color: "#FFFFFF", fontWeight: 500, fontFamily: "Georgia, serif", margin: 0 }}>No services scheduled yet.</p>
                  <p style={{ color: "#A9A9B8", fontSize: "13px", marginTop: "6px" }}>Add your first recurring service above.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {templates.map(tpl => {
                    const openAtTime = autoOpen && tpl.typical_time ? computeOpenTime(tpl.typical_time, autoOpenMinutes) : null;
                    return (
                      <div
                        key={tpl.id}
                        style={{ background: "#0D0A14", border: `1px solid ${tpl.is_active ? "rgba(123,44,191,0.3)" : "rgba(212,175,55,0.1)"}`, borderRadius: "12px", padding: "16px 20px", display: "flex", alignItems: "center", gap: "16px", opacity: tpl.is_active ? 1 : 0.55 }}
                      >
                        <div style={{ flexShrink: 0, width: 58, textAlign: "center" as const, background: tpl.is_active ? "rgba(123,44,191,0.15)" : "rgba(212,175,55,0.06)", borderRadius: "8px", padding: "6px 4px" }}>
                          <p style={{ fontSize: "10px", fontWeight: 700, color: tpl.is_active ? "#c084fc" : "#6b6b8a", margin: 0, textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>{tpl.typical_day?.slice(0, 3) ?? "—"}</p>
                          <p style={{ fontSize: "12px", fontWeight: 700, color: tpl.is_active ? "#FFFFFF" : "#6b6b8a", margin: "3px 0 0" }}>{tpl.typical_time ? fmtTime(tpl.typical_time) : "—"}</p>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 700, color: "#FFFFFF", fontSize: "14px", margin: 0 }}>{tpl.name}</p>
                          {openAtTime ? (
                            <p style={{ fontSize: "12px", color: "#D4AF37", margin: "3px 0 0" }}>⚡ Check-in opens at {openAtTime}</p>
                          ) : (
                            <p style={{ fontSize: "12px", color: "#6b6b8a", margin: "3px 0 0" }}>{tpl.typical_day && tpl.typical_time ? `${tpl.typical_day} · ${fmtTime(tpl.typical_time)}` : "No schedule set"}</p>
                          )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                          <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "20px", fontWeight: 700, background: tpl.is_active ? "rgba(123,44,191,0.18)" : "rgba(212,175,55,0.07)", color: tpl.is_active ? "#c084fc" : "#6b6b8a" }}>{tpl.is_active ? "Active" : "Inactive"}</span>
                          <button onClick={() => toggleTemplate(tpl)} style={{ padding: "5px 12px", borderRadius: "8px", border: "1px solid rgba(212,175,55,0.2)", background: "transparent", fontSize: "12px", fontWeight: 600, color: "#A9A9B8", cursor: "pointer" }}>
                            {tpl.is_active ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold" style={{ fontFamily: "Georgia, serif", color: "#ffffff" }}>Check-In Sessions</h2>
                <p className="text-xs mt-0.5" style={{ color: "#A9A9B8" }}>Create a session to open the kiosk for check-in</p>
              </div>
              <button
                onClick={() => {
                  const today = new Date().toLocaleDateString('en-CA');
                  const todayPin = sessions.find(s => s.date === today)?.kiosk_pin
                    ?? String(Math.floor(1000 + Math.random() * 9000));
                  setSessionForm(f => ({ ...f, kioskPin: todayPin }));
                  setShowAddSession(true);
                }}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white"
                style={{ backgroundColor: ACCENT }}
              >
                + New Session
              </button>
            </div>

            {showAddSession && (
              <div className="rounded-2xl p-6 mb-6" style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.22)" }}>
                <h3 className="font-bold mb-4" style={{ color: "#ffffff" }}>New Check-In Session</h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="col-span-2">
                    <label className="text-xs font-semibold uppercase tracking-widest block mb-1" style={{ color: "#A9A9B8" }}>Service Name *</label>
                    <input value={sessionForm.serviceName} onChange={e => setSessionForm(f => ({ ...f, serviceName: e.target.value }))} placeholder="e.g. Sunday Morning Service" className="w-full px-3 py-2.5 rounded-lg text-sm" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,175,55,0.3)", color: "#ffffff", outline: "none" }} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-semibold uppercase tracking-widest block mb-2" style={{ color: "#A9A9B8" }}>Use Template (optional)</label>
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors" style={{ borderColor: sessionForm.templateId === "" ? ACCENT : "rgba(212,175,55,0.2)", background: sessionForm.templateId === "" ? ACCENT + "18" : "transparent" }}>
                        <input
                          type="radio"
                          name="sessionTemplate"
                          value=""
                          checked={sessionForm.templateId === ""}
                          onChange={() => setSessionForm(f => ({ ...f, templateId: "" }))}
                          className="accent-violet-500"
                        />
                        <span className="text-sm italic" style={{ color: "#A9A9B8" }}>No template</span>
                      </label>
                      {templates.filter(t => t.is_active).map(t => (
                        <label key={t.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors" style={{ borderColor: sessionForm.templateId === t.id ? ACCENT : "rgba(212,175,55,0.2)", background: sessionForm.templateId === t.id ? ACCENT + "18" : "transparent" }}>
                          <input
                            type="radio"
                            name="sessionTemplate"
                            value={t.id}
                            checked={sessionForm.templateId === t.id}
                            onChange={() => setSessionForm(f => ({ ...f, templateId: t.id, serviceName: t.name, scheduledTime: t.typical_time ?? f.scheduledTime }))}
                            className="accent-violet-500"
                          />
                          <div>
                            <p className="text-sm font-medium" style={{ color: "#ffffff" }}>{t.name}</p>
                            {(t.typical_day || t.typical_time) && (
                              <p className="text-xs" style={{ color: "#A9A9B8" }}>{[t.typical_day, t.typical_time ? fmtTime(t.typical_time) : null].filter(Boolean).join(" · ")}</p>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-semibold uppercase tracking-widest block mb-1" style={{ color: "#A9A9B8" }}>Session Group (optional)</label>
                    <input value={sessionForm.sessionGroup} onChange={e => setSessionForm(f => ({ ...f, sessionGroup: e.target.value }))} placeholder="e.g. Sunday Morning" className="w-full px-3 py-2.5 rounded-lg text-sm" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,175,55,0.3)", color: "#ffffff", outline: "none" }} />
                    <p className="text-xs mt-1" style={{ color: "#A9A9B8" }}>Sessions with the same group name on the same date will share a security code at check-in.</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest block mb-1" style={{ color: "#A9A9B8" }}>Date *</label>
                    <input type="date" value={sessionForm.date} onChange={e => setSessionForm(f => ({ ...f, date: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg text-sm" style={{ background: "#C084FC", border: "1px solid rgba(212,175,55,0.45)", color: "#08060D", WebkitTextFillColor: "#08060D", colorScheme: "light", outline: "none" }} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest block mb-1" style={{ color: "#A9A9B8" }}>Time</label>
                    <input type="time" value={sessionForm.scheduledTime} onChange={e => setSessionForm(f => ({ ...f, scheduledTime: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg text-sm" style={{ background: "#C084FC", border: "1px solid rgba(212,175,55,0.45)", color: "#08060D", WebkitTextFillColor: "#08060D", colorScheme: "light", outline: "none" }} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest block mb-1" style={{ color: "#A9A9B8" }}>Kiosk PIN (4 digits) *</label>
                    <input value={sessionForm.kioskPin} onChange={e => setSessionForm(f => ({ ...f, kioskPin: e.target.value.replace(/\D/g, "").slice(0, 4) }))} placeholder="e.g. 1234" maxLength={4} className="w-full px-3 py-2.5 rounded-lg text-sm font-mono" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,175,55,0.3)", color: "#ffffff", outline: "none" }} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={saveSession} disabled={savingSession || !sessionForm.serviceName.trim() || !sessionForm.date || sessionForm.kioskPin.length !== 4} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: ACCENT, opacity: savingSession ? 0.6 : 1 }}>{savingSession ? "Creating…" : "Create Session"}</button>
                  <button onClick={() => setShowAddSession(false)} className="px-4 py-2.5 rounded-xl text-sm" style={{ border: "1px solid rgba(212,175,55,0.3)", color: "#A9A9B8", background: "transparent" }}>Cancel</button>
                </div>
              </div>
            )}

            {sessions.length === 0 ? (
              <div className="rounded-2xl p-12 text-center" style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.22)" }}><div className="text-4xl mb-3">🔑</div><p style={{ color: "#A9A9B8" }}>No sessions yet. Create one to start check-in.</p></div>
            ) : (
              <div className="space-y-4">
                {sessions.map(session => {
                  const isOpen = session.status === "open";
                  return (
                    <div key={session.id} className="rounded-2xl overflow-hidden" style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.22)" }}>
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold" style={{ color: "#ffffff" }}>{session.service_name}</h3>
                              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold" style={{ background: isOpen ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.07)", color: isOpen ? "#4ade80" : "#A9A9B8" }}>{isOpen ? "Open" : "Closed"}</span>
                            </div>
                            <p className="text-sm" style={{ color: "#A9A9B8" }}>{fmtDate(session.date)}{session.scheduled_time ? ` · ${fmtTime(session.scheduled_time)}` : ""}</p>
                            <p className="text-xs font-mono mt-0.5" style={{ color: "#A9A9B8" }}>PIN: {session.kiosk_pin}</p>
                          </div>
                          <button onClick={() => toggleSession(session)} className="px-4 py-2 rounded-xl text-sm font-bold" style={{ backgroundColor: isOpen ? "rgba(220,38,38,0.15)" : "rgba(34,197,94,0.15)", color: isOpen ? "#f87171" : "#4ade80" }}>
                            {isOpen ? "Close Session" : "Reopen"}
                          </button>
                        </div>

                        {/* Classroom links for this session */}
                        {isOpen && activeRooms.length > 0 && APP_URL && volunteerCheckinQrEnabled && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#A9A9B8" }}>Classroom Links</p>
                            <div className="flex flex-wrap gap-2">
                              {activeRooms.map(room => {
                                const url = `${APP_URL}/classroom/${room.classroom_qr_token}`;
                                return (
                                  <a key={room.id} href={url} target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1.5 rounded-xl font-semibold border" style={{ borderColor: ACCENT, color: ACCENT }}>
                                    {room.name} ↗
                                  </a>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── AUTOMATION TAB ── */}
        {tab === "automation" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* Auto-Open Setting */}
            <div style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.25)", borderRadius: "16px", padding: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                <span style={{ fontSize: "22px" }}>⚡</span>
                <div>
                  <h2 style={{ color: "#FFFFFF", fontWeight: 700, fontSize: "16px", margin: 0, fontFamily: "Georgia, serif" }}>Automatic Session Opening</h2>
                  <p style={{ color: "#A9A9B8", fontSize: "12px", margin: "2px 0 0" }}>Automatically open check-in before class starts using the Check-In Window settings.</p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "20px" }}>
                {/* Toggle */}
                <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", width: "fit-content" }}>
                  <div
                    onClick={() => setAutoOpen(v => !v)}
                    style={{ width: 44, height: 24, borderRadius: 12, background: autoOpen ? "#7B2CBF" : "#2d2340", position: "relative", cursor: "pointer", transition: "background 0.2s", flexShrink: 0, border: `1px solid ${autoOpen ? "#9D4EDD" : "rgba(212,175,55,0.2)"}` }}
                  >
                    <div style={{ position: "absolute", top: 2, left: autoOpen ? 22 : 2, width: 18, height: 18, borderRadius: "50%", background: "#FFFFFF", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.4)" }} />
                  </div>
                  <span style={{ color: "#FFFFFF", fontSize: "14px", fontWeight: 600 }}>{autoOpen ? "Enabled" : "Disabled"}</span>
                </label>

                {/* Minutes before */}
                {autoOpen && (
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <span style={{ color: "#D8D8E8", fontSize: "13px" }}>Open check-in</span>
                    <input
                      type="number"
                      min={5}
                      max={240}
                      value={autoOpenMinutes}
                      onChange={e => setAutoOpenMinutes(Math.max(5, Math.min(240, parseInt(e.target.value) || 60)))}
                      style={{ width: "68px", padding: "6px 10px", background: "#0E0C18", border: "1px solid rgba(212,175,55,0.3)", borderRadius: "8px", fontSize: "15px", fontWeight: 700, color: "#D4AF37", textAlign: "center", outline: "none" }}
                    />
                    <span style={{ color: "#D8D8E8", fontSize: "13px" }}>minutes before service start</span>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button
                  onClick={saveAutoSettings}
                  style={{ padding: "8px 20px", background: "linear-gradient(135deg, #7B2CBF, #9D4EDD)", border: "none", borderRadius: "10px", fontSize: "13px", fontWeight: 700, color: "#FFFFFF", cursor: "pointer" }}
                >
                  {autoSettingsSaved ? "✓ Saved" : "Save Settings"}
                </button>
              </div>

              <div style={{ marginTop: "16px", padding: "10px 14px", background: "rgba(212,175,55,0.07)", border: "1px solid rgba(212,175,55,0.18)", borderRadius: "10px" }}>
                <p style={{ fontSize: "12px", color: "#D4AF37", margin: 0 }}>
                  💡 Settings are saved locally. Backend automation activates in an upcoming update once service schedule fields are confirmed in the database.
                </p>
              </div>
            </div>

            {/* Check-In Time Window */}
            <div style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.25)", borderRadius: "16px", padding: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                <span style={{ fontSize: "22px" }}>🕐</span>
                <div>
                  <h2 style={{ color: "#FFFFFF", fontWeight: 700, fontSize: "16px", margin: 0, fontFamily: "Georgia, serif" }}>Check-In Time Window</h2>
                  <p style={{ color: "#A9A9B8", fontSize: "12px", margin: "2px 0 0" }}>Controls when the kiosk automatically shows or hides sessions based on scheduled time</p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "18px", marginBottom: "20px" }}>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#A9A9B8", textTransform: "uppercase" as const, letterSpacing: "0.08em", display: "block", marginBottom: "8px" }}>
                    Open check-in before class starts
                  </label>
                  <select
                    value={checkInOpensBefore}
                    onChange={e => setCheckInOpensBefore(Number(e.target.value))}
                    style={{ padding: "7px 12px", background: "#0E0C18", border: "1px solid rgba(212,175,55,0.3)", borderRadius: "8px", fontSize: "14px", fontWeight: 700, color: "#D4AF37", outline: "none", cursor: "pointer" }}
                  >
                    {[15, 30, 45, 60, 90].map(m => <option key={m} value={m} style={{ background: "#120A1F" }}>{m} minutes</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#A9A9B8", textTransform: "uppercase" as const, letterSpacing: "0.08em", display: "block", marginBottom: "8px" }}>
                    Typical Class Length
                  </label>
                  <select
                    value={typicalClassDuration}
                    onChange={e => setTypicalClassDuration(Number(e.target.value))}
                    style={{ padding: "7px 12px", background: "#0E0C18", border: "1px solid rgba(212,175,55,0.3)", borderRadius: "8px", fontSize: "14px", fontWeight: 700, color: "#D4AF37", outline: "none", cursor: "pointer" }}
                  >
                    {[45, 60, 75, 90, 120].map(m => <option key={m} value={m} style={{ background: "#120A1F" }}>{m} minutes</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#A9A9B8", textTransform: "uppercase" as const, letterSpacing: "0.08em", display: "block", marginBottom: "8px" }}>
                    Close check-in after class ends
                  </label>
                  <select
                    value={checkInClosesAfter}
                    onChange={e => setCheckInClosesAfter(Number(e.target.value))}
                    style={{ padding: "7px 12px", background: "#0E0C18", border: "1px solid rgba(212,175,55,0.3)", borderRadius: "8px", fontSize: "14px", fontWeight: 700, color: "#D4AF37", outline: "none", cursor: "pointer" }}
                  >
                    {[15, 30, 45, 60, 90].map(m => <option key={m} value={m} style={{ background: "#120A1F" }}>{m} minutes</option>)}
                  </select>
                </div>
              </div>

              {/* Live formula preview */}
              {(() => {
                function fmtMin(total: number): string {
                  const h = Math.floor(total / 60) % 24;
                  const m = total % 60;
                  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
                }
                const rows: [string, string, string][] = [
                  ["Check-in Opens", fmtMin(600 - checkInOpensBefore), "#4ade80"],
                  ["Class Begins", "10:00 AM", "#D8D8E8"],
                  ["Class Ends", fmtMin(600 + typicalClassDuration), "#fbbf24"],
                  ["Check-in Closes", fmtMin(600 + typicalClassDuration + checkInClosesAfter), "#f87171"],
                ];
                return (
                  <div style={{ marginBottom: "20px", padding: "14px 16px", background: "rgba(123,44,191,0.08)", border: "1px solid rgba(123,44,191,0.25)", borderRadius: "10px" }}>
                    <p style={{ margin: "0 0 10px", fontWeight: 700, fontSize: "12px", color: "#c084fc" }}>Example — 10:00 AM service</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {rows.map(([label, time, color]) => (
                        <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px" }}>
                          <span style={{ color: "#A9A9B8" }}>{label}</span>
                          <strong style={{ color }}>{time}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button
                  onClick={saveWindowSettings}
                  disabled={windowSaving}
                  style={{ padding: "8px 20px", background: "linear-gradient(135deg, #7B2CBF, #9D4EDD)", border: "none", borderRadius: "10px", fontSize: "13px", fontWeight: 700, color: "#FFFFFF", cursor: windowSaving ? "not-allowed" : "pointer", opacity: windowSaving ? 0.6 : 1 }}
                >
                  {windowSaved ? "✓ Saved" : windowSaving ? "Saving…" : "Save Settings"}
                </button>
              </div>

              <div style={{ marginTop: "16px", padding: "10px 14px", background: "rgba(212,175,55,0.07)", border: "1px solid rgba(212,175,55,0.18)", borderRadius: "10px" }}>
                <p style={{ fontSize: "12px", color: "#D4AF37", margin: 0 }}>
                  💡 Sessions without a scheduled time are controlled manually via Open/Close. Sessions past their close window are hidden automatically.
                </p>
              </div>
            </div>

            {/* Welcome Letter Template */}
            <div style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.25)", borderRadius: "16px", padding: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                <span style={{ fontSize: "22px" }}>✉️</span>
                <div>
                  <h2 style={{ color: "#FFFFFF", fontWeight: 700, fontSize: "16px", margin: 0, fontFamily: "Georgia, serif" }}>Welcome Letter Template</h2>
                  <p style={{ color: "#A9A9B8", fontSize: "12px", margin: "2px 0 0" }}>Customize the letter sent to first-time visiting families</p>
                </div>
              </div>
              <p style={{ color: "#A9A9B8", fontSize: "12px", marginBottom: "16px" }}>
                Use merge fields: <code style={{ color: "#D4AF37", fontSize: "11px" }}>{"{{parent_name}}"}</code> <code style={{ color: "#D4AF37", fontSize: "11px" }}>{"{{child_names}}"}</code> <code style={{ color: "#D4AF37", fontSize: "11px" }}>{"{{church_name}}"}</code> <code style={{ color: "#D4AF37", fontSize: "11px" }}>{"{{visit_date}}"}</code> <code style={{ color: "#D4AF37", fontSize: "11px" }}>{"{{pastor_name}}"}</code>
              </p>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "#A9A9B8", textTransform: "uppercase" as const, letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>Subject</label>
                <input
                  value={letterSubject}
                  onChange={e => setLetterSubject(e.target.value)}
                  placeholder="Loading…"
                  style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: "10px", color: "#ffffff", fontSize: "14px", outline: "none", boxSizing: "border-box" as const }}
                />
              </div>
              <div style={{ marginBottom: "18px" }}>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "#A9A9B8", textTransform: "uppercase" as const, letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>Letter Body</label>
                <textarea
                  value={letterBody}
                  onChange={e => setLetterBody(e.target.value)}
                  rows={10}
                  placeholder="Loading…"
                  style={{ width: "100%", padding: "12px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: "10px", color: "#D8D8E8", fontSize: "13px", outline: "none", resize: "vertical" as const, lineHeight: 1.75, boxSizing: "border-box" as const, fontFamily: "Georgia, serif" }}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button
                  onClick={saveLetterTemplate}
                  disabled={letterSaving || !letterSubject.trim() || !letterBody.trim()}
                  style={{ padding: "8px 20px", background: "linear-gradient(135deg, #7B2CBF, #9D4EDD)", border: "none", borderRadius: "10px", fontSize: "13px", fontWeight: 700, color: "#FFFFFF", cursor: (letterSaving || !letterSubject.trim() || !letterBody.trim()) ? "not-allowed" : "pointer", opacity: (letterSaving || !letterSubject.trim() || !letterBody.trim()) ? 0.6 : 1 }}
                >
                  {letterSaved ? "✓ Saved" : letterSaving ? "Saving…" : "Save Template"}
                </button>
                <a
                  href="/dashboard/children-ministry/followup"
                  style={{ fontSize: "13px", color: "#D4AF37", textDecoration: "none", fontWeight: 600 }}
                >
                  Manage Follow Up →
                </a>
              </div>
            </div>

            {/* How it works */}
            <div style={{ background: "rgba(123,44,191,0.07)", border: "1px solid rgba(123,44,191,0.2)", borderRadius: "16px", padding: "20px" }}>
              <h3 style={{ color: "#FFFFFF", fontWeight: 700, fontSize: "14px", margin: "0 0 12px" }}>⚙️ How Automation Works</h3>
              <ul style={{ margin: 0, padding: "0 0 0 18px", display: "flex", flexDirection: "column", gap: "8px" }}>
                {[
                  "On the day of service, ShepherdKids creates or activates a check-in session from the matching template.",
                  "Check-in opens automatically at the configured time before service start.",
                  "Duplicate sessions for the same church + template + date are never created.",
                  "Sessions use your church timezone.",
                  "A 4-digit PIN will be auto-generated if none exists for that day.",
                ].map((note, i) => (
                  <li key={i} style={{ fontSize: "13px", color: "#D8D8E8", lineHeight: 1.6 }}>{note}</li>
                ))}
              </ul>
            </div>

          </div>
        )}

        {/* ── LABEL PRINTING TAB ── */}
        {tab === "label-printing" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* QR Label Security */}
            <div style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.25)", borderRadius: "16px", padding: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                <span style={{ fontSize: "22px" }}>🔐</span>
                <div>
                  <h2 style={{ color: "#FFFFFF", fontWeight: 700, fontSize: "16px", margin: 0, fontFamily: "Georgia, serif" }}>QR Label Security</h2>
                  <p style={{ color: "#A9A9B8", fontSize: "12px", margin: "2px 0 0" }}>Set how long the QR code on each child label stays active after a session closes</p>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "20px" }}>
                <span style={{ color: "#D8D8E8", fontSize: "13px" }}>Labels expire</span>
                <input
                  type="number"
                  min={0}
                  max={1440}
                  value={labelExpiryMinutes}
                  onChange={e => setLabelExpiryMinutes(Math.max(0, Math.min(1440, parseInt(e.target.value) || 0)))}
                  style={{ width: "68px", padding: "6px 10px", background: "#0E0C18", border: "1px solid rgba(212,175,55,0.3)", borderRadius: "8px", fontSize: "15px", fontWeight: 700, color: "#D4AF37", textAlign: "center" as const, outline: "none" }}
                />
                <span style={{ color: "#D8D8E8", fontSize: "13px" }}>minutes after session closes</span>
                <span style={{ color: "#A9A9B8", fontSize: "12px" }}>{labelExpiryMinutes === 0 ? "(Never expire)" : ""}</span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button
                  onClick={saveSmartLabelSettings}
                  style={{ padding: "8px 20px", background: "linear-gradient(135deg, #7B2CBF, #9D4EDD)", border: "none", borderRadius: "10px", fontSize: "13px", fontWeight: 700, color: "#FFFFFF", cursor: "pointer" }}
                >
                  {labelExpirySaved ? "✓ Saved" : "Save Settings"}
                </button>
              </div>

              <p style={{ fontSize: "12px", color: "#A9A9B8", margin: "12px 0 0", lineHeight: 1.6 }}>
                After expiration, scanned labels will display &ldquo;This label has expired.&rdquo; This helps prevent reuse of old check-in labels.
              </p>

              <div style={{ marginTop: "12px", padding: "10px 14px", background: "rgba(212,175,55,0.07)", border: "1px solid rgba(212,175,55,0.18)", borderRadius: "10px" }}>
                <p style={{ fontSize: "12px", color: "#D4AF37", margin: 0 }}>
                  💡 This expiry applies to new sessions. Set to 0 to never expire.
                </p>
              </div>
            </div>

            {/* Label Mode + QR */}
            <div style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.25)", borderRadius: "16px", padding: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                <span style={{ fontSize: "22px" }}>🏷️</span>
                <div>
                  <h2 style={{ color: "#FFFFFF", fontWeight: 700, fontSize: "16px", margin: 0, fontFamily: "Georgia, serif" }}>Label Printing</h2>
                  <p style={{ color: "#A9A9B8", fontSize: "12px", margin: "2px 0 0" }}>Choose how care information appears on child check-in labels</p>
                </div>
              </div>

              <p style={{ fontSize: "11px", fontWeight: 700, color: "#A9A9B8", textTransform: "uppercase" as const, letterSpacing: "0.08em", margin: "0 0 10px" }}>Label Mode</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
                <label
                  style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "14px 16px", borderRadius: "12px", cursor: "pointer", border: `2px solid ${labelMode === "smart" ? ACCENT : "rgba(212,175,55,0.2)"}`, background: labelMode === "smart" ? "rgba(123,44,191,0.12)" : "transparent" }}
                >
                  <input type="radio" name="labelMode" value="smart" checked={labelMode === "smart"} onChange={() => setLabelMode("smart")} style={{ marginTop: 2, accentColor: ACCENT, flexShrink: 0 }} />
                  <div>
                    <p style={{ color: "#FFFFFF", fontWeight: 700, fontSize: "14px", margin: 0 }}>Smart Label <span style={{ fontWeight: 400, fontSize: "12px", color: "#D4AF37" }}>(recommended)</span></p>
                    <p style={{ color: "#A9A9B8", fontSize: "12px", margin: "4px 0 0", lineHeight: 1.5 }}>
                      Prints a <strong style={{ color: "#D8D8E8" }}>⚠ SEE CARE NOTES</strong> badge. Full allergy and medical details are accessed by scanning the QR code — not printed in plain sight.
                    </p>
                  </div>
                </label>
                <label
                  style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "14px 16px", borderRadius: "12px", cursor: "pointer", border: `2px solid ${labelMode === "classic" ? ACCENT : "rgba(212,175,55,0.2)"}`, background: labelMode === "classic" ? "rgba(123,44,191,0.12)" : "transparent" }}
                >
                  <input type="radio" name="labelMode" value="classic" checked={labelMode === "classic"} onChange={() => setLabelMode("classic")} style={{ marginTop: 2, accentColor: ACCENT, flexShrink: 0 }} />
                  <div>
                    <p style={{ color: "#FFFFFF", fontWeight: 700, fontSize: "14px", margin: 0 }}>Classic Label</p>
                    <p style={{ color: "#A9A9B8", fontSize: "12px", margin: "4px 0 0", lineHeight: 1.5 }}>
                      Prints allergies, medical notes, and special instructions directly on child labels. QR code included if enabled below.
                    </p>
                  </div>
                </label>
              </div>

              <p style={{ fontSize: "11px", fontWeight: 700, color: "#A9A9B8", textTransform: "uppercase" as const, letterSpacing: "0.08em", margin: "0 0 12px" }}>QR Features</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", padding: "14px 16px", borderRadius: "12px", border: "1px solid rgba(212,175,55,0.18)", background: "rgba(255,255,255,0.02)" }}>
                  <div style={{ flexShrink: 0, marginTop: 1 }}>
                    <div onClick={() => setSmartLabelQrEnabled(v => !v)} style={{ width: 44, height: 24, borderRadius: 12, background: smartLabelQrEnabled ? ACCENT : "#2d2340", position: "relative", cursor: "pointer", transition: "background 0.2s", border: `1px solid ${smartLabelQrEnabled ? "#9D4EDD" : "rgba(212,175,55,0.2)"}` }}>
                      <div style={{ position: "absolute", top: 2, left: smartLabelQrEnabled ? 22 : 2, width: 18, height: 18, borderRadius: "50%", background: "#FFFFFF", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.4)" }} />
                    </div>
                  </div>
                  <div>
                    <p style={{ color: "#FFFFFF", fontWeight: 700, fontSize: "14px", margin: 0 }}>Smart Label QR <span style={{ fontWeight: 400, fontSize: "12px", color: smartLabelQrEnabled ? "#4ade80" : "#6b7280" }}>{smartLabelQrEnabled ? "ON" : "OFF"}</span></p>
                    <p style={{ color: "#A9A9B8", fontSize: "12px", margin: "4px 0 0", lineHeight: 1.5 }}>Print a QR code on child labels so volunteers can scan Care Notes. Applies in both Smart and Classic modes.</p>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", padding: "14px 16px", borderRadius: "12px", border: "1px solid rgba(212,175,55,0.18)", background: "rgba(255,255,255,0.02)" }}>
                  <div style={{ flexShrink: 0, marginTop: 1 }}>
                    <div onClick={() => setVolunteerCheckinQrEnabled(v => !v)} style={{ width: 44, height: 24, borderRadius: 12, background: volunteerCheckinQrEnabled ? ACCENT : "#2d2340", position: "relative", cursor: "pointer", transition: "background 0.2s", border: `1px solid ${volunteerCheckinQrEnabled ? "#9D4EDD" : "rgba(212,175,55,0.2)"}` }}>
                      <div style={{ position: "absolute", top: 2, left: volunteerCheckinQrEnabled ? 22 : 2, width: 18, height: 18, borderRadius: "50%", background: "#FFFFFF", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.4)" }} />
                    </div>
                  </div>
                  <div>
                    <p style={{ color: "#FFFFFF", fontWeight: 700, fontSize: "14px", margin: 0 }}>Volunteer Check-In QR <span style={{ fontWeight: 400, fontSize: "12px", color: volunteerCheckinQrEnabled ? "#4ade80" : "#6b7280" }}>{volunteerCheckinQrEnabled ? "ON" : "OFF"}</span></p>
                    <p style={{ color: "#A9A9B8", fontSize: "12px", margin: "4px 0 0", lineHeight: 1.5 }}>Enable classroom and volunteer QR check-in tools (Volunteer Room View, classroom tablet links).</p>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button
                  onClick={saveLabelSettings}
                  disabled={labelSettingsSaving}
                  style={{ padding: "8px 20px", background: "linear-gradient(135deg, #7B2CBF, #9D4EDD)", border: "none", borderRadius: "10px", fontSize: "13px", fontWeight: 700, color: "#FFFFFF", cursor: labelSettingsSaving ? "not-allowed" : "pointer", opacity: labelSettingsSaving ? 0.6 : 1 }}
                >
                  {labelSettingsSaved ? "✓ Saved" : labelSettingsSaving ? "Saving…" : "Save Settings"}
                </button>
              </div>

              <div style={{ marginTop: "16px", padding: "10px 14px", background: "rgba(212,175,55,0.07)", border: "1px solid rgba(212,175,55,0.18)", borderRadius: "10px" }}>
                <p style={{ fontSize: "12px", color: "#D4AF37", margin: 0 }}>
                  💡 Label settings apply to new check-ins. Existing labels already printed are not affected.
                </p>
              </div>
            </div>

            {/* Recommended Printer */}
            <div style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.25)", borderRadius: "16px", padding: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                <span style={{ fontSize: "22px" }}>🖨️</span>
                <div>
                  <h2 style={{ color: "#FFFFFF", fontWeight: 700, fontSize: "16px", margin: 0, fontFamily: "Georgia, serif" }}>Recommended Label Printer</h2>
                  <p style={{ color: "#A9A9B8", fontSize: "12px", margin: "2px 0 0" }}>Choosing the right printer for your check-in station</p>
                </div>
              </div>

              {/* QL-810W */}
              <div style={{ background: "rgba(123,44,191,0.1)", border: "2px solid rgba(123,44,191,0.4)", borderRadius: "12px", padding: "18px 20px", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                  <span style={{ fontSize: "16px" }}>⭐</span>
                  <h3 style={{ color: "#FFFFFF", fontWeight: 700, fontSize: "15px", margin: 0, fontFamily: "Georgia, serif" }}>Brother QL-810W <span style={{ fontSize: "12px", fontWeight: 400, color: "#c084fc" }}>(Recommended)</span></h3>
                </div>
                <p style={{ color: "#D8D8E8", fontSize: "13px", margin: "0 0 12px", lineHeight: 1.6 }}>
                  The <strong style={{ color: "#FFFFFF" }}>Brother QL-810W</strong> is the recommended label printer for most Shepherd Kids churches. For approximately <strong style={{ color: "#D4AF37" }}>90% of churches</strong>, this printer provides everything needed for child check-in labels.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                  {["Wi-Fi Direct (no router needed)", "Wi-Fi connectivity", "USB connectivity", "Fast 4\" × 2\" label printing", "Simple setup", "Lower cost"].map(f => (
                    <div key={f} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#D8D8E8" }}>
                      <span style={{ color: "#4ade80", flexShrink: 0 }}>✅</span> {f}
                    </div>
                  ))}
                </div>
              </div>

              {/* QL-820NWB */}
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(212,175,55,0.2)", borderRadius: "12px", padding: "18px 20px", marginBottom: "20px" }}>
                <h3 style={{ color: "#FFFFFF", fontWeight: 700, fontSize: "15px", margin: "0 0 10px", fontFamily: "Georgia, serif" }}>Brother QL-820NWB <span style={{ fontSize: "12px", fontWeight: 400, color: "#A9A9B8" }}>(Advanced Installations)</span></h3>
                <p style={{ color: "#D8D8E8", fontSize: "13px", margin: "0 0 10px", lineHeight: 1.6 }}>
                  The <strong style={{ color: "#FFFFFF" }}>Brother QL-820NWB</strong> supports all the same printing capabilities as the QL-810W — including <strong style={{ color: "#D4AF37" }}>Wi-Fi Direct</strong> and standard Wi-Fi — and adds <strong style={{ color: "#D4AF37" }}>two additional connectivity options</strong> as the <strong style={{ color: "#FFFFFF" }}>primary differences</strong> between the two printers:
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginBottom: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#D8D8E8", fontWeight: 600 }}>
                    <span style={{ color: "#4ade80" }}>✅</span> Wi-Fi Direct (connect directly from any device — no router needed)
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#D8D8E8", fontWeight: 600 }}>
                    <span style={{ color: "#4ade80" }}>✅</span> Wi-Fi connectivity
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#D8D8E8", fontWeight: 600 }}>
                    <span style={{ color: "#4ade80" }}>✅</span> Ethernet (wired network connection)
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#D8D8E8", fontWeight: 600 }}>
                    <span style={{ color: "#4ade80" }}>✅</span> Bluetooth connectivity
                  </div>
                </div>
                <p style={{ color: "#A9A9B8", fontSize: "12px", margin: "0 0 8px" }}>Recommended for churches that:</p>
                <ul style={{ margin: 0, padding: "0 0 0 16px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  {[
                    "Have multiple check-in stations",
                    "Want to place the printer on a wired network using Ethernet",
                    "Need Bluetooth printing from tablets or mobile devices",
                    "Require additional installation flexibility",
                  ].map(item => (
                    <li key={item} style={{ fontSize: "12px", color: "#A9A9B8", lineHeight: 1.5 }}>{item}</li>
                  ))}
                </ul>
              </div>

              {/* Quick Recommendation */}
              <div style={{ background: "rgba(212,175,55,0.07)", border: "1px solid rgba(212,175,55,0.25)", borderRadius: "10px", padding: "14px 16px", marginBottom: "20px" }}>
                <p style={{ fontSize: "12px", fontWeight: 700, color: "#D4AF37", margin: "0 0 6px", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Quick Recommendation</p>
                <p style={{ fontSize: "13px", color: "#D8D8E8", margin: "0 0 8px", lineHeight: 1.6 }}>
                  <strong style={{ color: "#FFFFFF" }}>Most churches should purchase the Brother QL-810W.</strong>
                </p>
                <p style={{ fontSize: "13px", color: "#D8D8E8", margin: "0 0 8px", lineHeight: 1.6 }}>
                  Upgrade to the <strong style={{ color: "#FFFFFF" }}>QL-820NWB only if your installation specifically requires Ethernet or Bluetooth.</strong> Aside from those two options, both printers provide the same excellent label printing experience.
                </p>
              </div>

              {/* Comparison Table */}
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#A9A9B8", textTransform: "uppercase" as const, letterSpacing: "0.08em", margin: "0 0 10px" }}>Comparison</p>
              <div style={{ overflowX: "auto" as const }}>
                <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: "12px" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left" as const, padding: "8px 12px", color: "#A9A9B8", fontWeight: 700, borderBottom: "1px solid rgba(212,175,55,0.2)", whiteSpace: "nowrap" as const }}>Feature</th>
                      <th style={{ textAlign: "center" as const, padding: "8px 12px", color: "#c084fc", fontWeight: 700, borderBottom: "1px solid rgba(212,175,55,0.2)", whiteSpace: "nowrap" as const }}>QL-810W ⭐</th>
                      <th style={{ textAlign: "center" as const, padding: "8px 12px", color: "#A9A9B8", fontWeight: 700, borderBottom: "1px solid rgba(212,175,55,0.2)", whiteSpace: "nowrap" as const }}>QL-820NWB</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { feature: "Wi-Fi Direct (no router needed)", w810: "✅", w820: "✅", highlight: false },
                      { feature: "Wi-Fi", w810: "✅", w820: "✅", highlight: false },
                      { feature: "USB", w810: "✅", w820: "✅", highlight: false },
                      { feature: "Ethernet", w810: "❌", w820: "✅", highlight: true },
                      { feature: "Bluetooth", w810: "❌", w820: "✅", highlight: true },
                      { feature: "Recommended for Most Churches", w810: "⭐ Yes", w820: "Optional Upgrade", highlight: false },
                    ].map(({ feature, w810, w820, highlight }) => (
                      <tr key={feature} style={{ background: highlight ? "rgba(212,175,55,0.05)" : "transparent" }}>
                        <td style={{ padding: "8px 12px", color: highlight ? "#D4AF37" : "#D8D8E8", fontWeight: highlight ? 700 : 400, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>{feature}</td>
                        <td style={{ padding: "8px 12px", textAlign: "center" as const, color: "#D8D8E8", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>{w810}</td>
                        <td style={{ padding: "8px 12px", textAlign: "center" as const, color: "#D8D8E8", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>{w820}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ── CHECK-IN LOCATIONS TAB ── */}
        {tab === "locations" && (
          <div>
            <div style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.22)", borderRadius: "16px", padding: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                <div>
                  <h2 style={{ fontWeight: 700, color: "#ffffff", fontSize: "17px", margin: 0, fontFamily: "Georgia, serif" }}>Check-In Locations</h2>
                  <p style={{ fontSize: "12px", color: "#A9A9B8", margin: "3px 0 0" }}>QR codes for your welcome desk, entrance, or tablets</p>
                </div>
                <button onClick={() => setShowAddToken(true)} style={{ padding: "7px 14px", borderRadius: "10px", fontSize: "12px", fontWeight: 700, color: "#ffffff", background: "linear-gradient(135deg, #7B2CBF, #9D4EDD)", border: "none", cursor: "pointer" }}>
                  + Add Location
                </button>
              </div>

              {tokens.length === 0 ? (
                <p style={{ color: "#A9A9B8", fontSize: "13px" }}>No check-in locations yet. Create one to get your QR code.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tokens.map(tok => (
                    <div key={tok.id} style={{ border: "1px solid rgba(212,175,55,0.2)", borderRadius: "14px", padding: "16px", background: "rgba(255,255,255,0.03)" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p style={{ fontSize: "13px", fontWeight: 700, color: "#ffffff", margin: 0 }}>{tok.label}</p>
                          <p style={{ fontSize: "11px", color: "#A9A9B8", fontFamily: "monospace", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tok.token.slice(0, 12)}…</p>
                        </div>
                        <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "20px", fontWeight: 700, flexShrink: 0, marginLeft: "8px", background: tok.is_active ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.08)", color: tok.is_active ? "#4ade80" : "#A9A9B8" }}>
                          {tok.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      {qrDataUrls[tok.id] ? (
                        <div style={{ textAlign: "center" }}>
                          <img src={qrDataUrls[tok.id]} alt="QR" style={{ width: 140, height: 140, margin: "0 auto 8px", borderRadius: "10px", display: "block" }} />
                          <div style={{ display: "flex", gap: "8px" }}>
                            <a href={qrDataUrls[tok.id]} download={`${tok.label}.png`} style={{ flex: 1, padding: "6px 0", borderRadius: "8px", fontSize: "12px", fontWeight: 700, color: "#ffffff", textAlign: "center", textDecoration: "none", background: "linear-gradient(135deg, #7B2CBF, #9D4EDD)" }}>⬇ Download</a>
                            {APP_URL && <a href={`${APP_URL}/kids-checkin/${tok.token}`} target="_blank" rel="noopener noreferrer" style={{ flex: 1, padding: "6px 0", borderRadius: "8px", fontSize: "12px", fontWeight: 700, border: "1px solid rgba(212,175,55,0.3)", color: "#D4AF37", textAlign: "center", textDecoration: "none" }}>Open ↗</a>}
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => generateQr(tok)} style={{ width: "100%", padding: "8px 0", borderRadius: "10px", fontSize: "12px", fontWeight: 700, border: "1px solid rgba(212,175,55,0.3)", color: "#D4AF37", background: "transparent", cursor: "pointer" }}>
                          Show QR Code
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {showAddToken && (
                <div style={{ marginTop: "16px", display: "flex", gap: "8px", maxWidth: "360px" }}>
                  <input value={newTokenLabel} onChange={e => setNewTokenLabel(e.target.value)} placeholder="e.g. Main Entrance" style={{ flex: 1, padding: "8px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: "8px", fontSize: "13px", color: "#ffffff", outline: "none" }} />
                  <button onClick={addToken} style={{ padding: "8px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 700, color: "#ffffff", background: "linear-gradient(135deg, #7B2CBF, #9D4EDD)", border: "none", cursor: "pointer" }}>Add</button>
                  <button onClick={() => setShowAddToken(false)} style={{ padding: "8px 12px", borderRadius: "8px", fontSize: "12px", border: "1px solid rgba(255,255,255,0.15)", color: "#A9A9B8", background: "transparent", cursor: "pointer" }}>Cancel</button>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
      {/* Classroom QR modal */}
      {qrRoom && APP_URL && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}>
          <div style={{ backgroundColor: "#120A1F", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 24, padding: 32, maxWidth: 360, width: "100%", textAlign: "center" }}>
            <h2 style={{ color: "#FFFFFF", fontSize: 20, fontWeight: 800, margin: "0 0 4px", fontFamily: "Georgia, serif" }}>{qrRoom.name}</h2>
            <p style={{ color: "#A9A9B8", fontSize: 13, margin: "0 0 20px" }}>Scan to open Classroom View</p>
            <div style={{ display: "inline-block", backgroundColor: "#FFFFFF", padding: 12, borderRadius: 12, marginBottom: 20 }}>
              <QRCodeImage value={`${APP_URL}/classroom/${qrRoom.classroom_qr_token}`} size={220} />
            </div>
            <div style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,175,55,0.2)", borderRadius: 10, padding: "8px 12px", marginBottom: 16 }}>
              <code style={{ color: "#D4AF37", fontSize: 11, wordBreak: "break-all" }}>{APP_URL}/classroom/{qrRoom.classroom_qr_token}</code>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => handleCopy(`${APP_URL}/classroom/${qrRoom.classroom_qr_token}`)}
                style={{ flex: 1, padding: "10px 0", borderRadius: 12, border: `1px solid ${ACCENT}`, backgroundColor: "transparent", color: ACCENT, fontWeight: 700, fontSize: 13, cursor: "pointer" }}
              >
                {copiedUrl === `${APP_URL}/classroom/${qrRoom.classroom_qr_token}` ? "Copied!" : "Copy URL"}
              </button>
              <button
                onClick={() => setQrRoom(null)}
                style={{ flex: 1, padding: "10px 0", borderRadius: 12, border: "1px solid rgba(212,175,55,0.25)", backgroundColor: "transparent", color: "#A9A9B8", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
