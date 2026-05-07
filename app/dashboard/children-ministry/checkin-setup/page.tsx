"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import MinistryShell from "@/components/layout/MinistryShell";

const ACCENT = "#F28C28";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

type Room = { id: string; name: string; min_age: number | null; max_age: number | null; capacity: number | null; is_active: boolean };
type Template = { id: string; name: string; typical_day: string | null; typical_time: string | null; is_active: boolean };
type Session = { id: string; service_name: string; date: string; scheduled_time: string | null; status: string; kiosk_pin: string };

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
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"rooms" | "templates" | "sessions">("rooms");

  const [rooms, setRooms] = useState<Room[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);

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
  const [sessionForm, setSessionForm] = useState({ serviceName: "", templateId: "", date: "", scheduledTime: "", kioskPin: "" });
  const [savingSession, setSavingSession] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  async function load(token: string) {
    const headers = { Authorization: `Bearer ${token}` };
    const [rRes, tRes, sRes] = await Promise.all([
      fetch("/api/checkin/rooms", { headers }),
      fetch("/api/checkin/templates", { headers }),
      fetch("/api/checkin/sessions", { headers }),
    ]);
    if (rRes.ok) { const d = await rRes.json(); setRooms(d.rooms ?? []); }
    if (tRes.ok) { const d = await tRes.json(); setTemplates(d.templates ?? []); }
    if (sRes.ok) { const d = await sRes.json(); setSessions(d.sessions ?? []); }
  }

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/"); return; }
      setAuthToken(session.access_token);
      await load(session.access_token);
      setLoading(false);
    }
    init();
  }, [router]);

  async function saveRoom() {
    if (!authToken || !roomForm.name.trim()) return;
    setSavingRoom(true);
    const res = await fetch("/api/checkin/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ name: roomForm.name, minAge: roomForm.minAge ? parseInt(roomForm.minAge) : null, maxAge: roomForm.maxAge ? parseInt(roomForm.maxAge) : null, capacity: roomForm.capacity ? parseInt(roomForm.capacity) : null }),
    });
    if (res.ok) { const d = await res.json(); setRooms(r => [...r, d.room]); setRoomForm({ name: "", minAge: "", maxAge: "", capacity: "" }); setShowAddRoom(false); }
    else { const errBody = await res.json().catch(() => ({})); console.log('[saveRoom] failed', res.status, errBody); }
    setSavingRoom(false);
  }

  async function toggleRoom(room: Room) {
    if (!authToken) return;
    const res = await fetch("/api/checkin/rooms", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ id: room.id, isActive: !room.is_active }),
    });
    if (res.ok) { const d = await res.json(); setRooms(rs => rs.map(r => r.id === room.id ? d.room : r)); }
  }

  async function saveTemplate() {
    if (!authToken || !tplForm.name.trim()) return;
    setSavingTemplate(true);
    const res = await fetch("/api/checkin/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ name: tplForm.name, typicalDay: tplForm.typicalDay || null, typicalTime: tplForm.typicalTime || null }),
    });
    if (res.ok) { const d = await res.json(); setTemplates(t => [...t, d.template]); setTplForm({ name: "", typicalDay: "", typicalTime: "" }); setShowAddTemplate(false); }
    setSavingTemplate(false);
  }

  async function toggleTemplate(tpl: Template) {
    if (!authToken) return;
    const res = await fetch("/api/checkin/templates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ id: tpl.id, isActive: !tpl.is_active }),
    });
    if (res.ok) { const d = await res.json(); setTemplates(ts => ts.map(t => t.id === tpl.id ? d.template : t)); }
  }

  async function saveSession() {
    if (!authToken || !sessionForm.serviceName.trim() || !sessionForm.date || !sessionForm.kioskPin) return;
    if (!/^\d{4}$/.test(sessionForm.kioskPin)) { alert("PIN must be exactly 4 digits"); return; }
    setSavingSession(true);
    const res = await fetch("/api/checkin/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ serviceName: sessionForm.serviceName, serviceTemplateId: sessionForm.templateId || null, date: sessionForm.date, scheduledTime: sessionForm.scheduledTime || null, kioskPin: sessionForm.kioskPin }),
    });
    if (res.ok) { const d = await res.json(); setSessions(s => [d.session, ...s]); setSessionForm({ serviceName: "", templateId: "", date: "", scheduledTime: "", kioskPin: "" }); setShowAddSession(false); }
    setSavingSession(false);
  }

  async function toggleSession(session: Session) {
    if (!authToken) return;
    const newStatus = session.status === "open" ? "closed" : "open";
    const res = await fetch("/api/checkin/sessions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ id: session.id, status: newStatus }),
    });
    if (res.ok) { const d = await res.json(); setSessions(ss => ss.map(s => s.id === session.id ? d.session : s)); }
  }

  function handleCopy(url: string) {
    copyText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-gray-400">Loading…</div></div>;

  const activeRooms = rooms.filter(r => r.is_active);
  const activeSessions = sessions.filter(s => s.status === "open");

  return (
    <MinistryShell type="childrens">
      {/* Header */}
      <div className="px-8 py-10" style={{ background: `linear-gradient(135deg, #c2570a 0%, ${ACCENT} 100%)` }}>
        <p className="text-orange-100 text-sm mb-1">Children's Ministry</p>
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>📋 Check-In Setup</h1>
        <p className="text-orange-100 text-sm mt-1">Manage rooms, service templates, and kiosk sessions</p>
      </div>

      <div className="px-8 py-8 bg-gray-50 min-h-screen">
        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 w-fit">
          {(["rooms", "templates", "sessions"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors capitalize" style={{ backgroundColor: tab === t ? ACCENT : "transparent", color: tab === t ? "white" : "#6b7280" }}>
              {t === "rooms" ? "🏠 Rooms" : t === "templates" ? "📅 Service Templates" : "🔑 Sessions"}
            </button>
          ))}
        </div>

        {/* ── ROOMS TAB ── */}
        {tab === "rooms" && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-gray-800" style={{ fontFamily: "Georgia, serif" }}>Check-In Rooms</h2>
                <p className="text-xs text-gray-400 mt-0.5">Children are assigned by age range</p>
              </div>
              <button onClick={() => setShowAddRoom(true)} className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: ACCENT }}>+ Add Room</button>
            </div>

            {showAddRoom && (
              <div className="bg-white rounded-2xl shadow p-6 mb-6 border border-orange-100">
                <h3 className="font-bold text-gray-800 mb-4">New Room</h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-1">Room Name *</label>
                    <input value={roomForm.name} onChange={e => setRoomForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Nursery, K–2nd Grade" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-1">Min Age</label>
                    <input type="number" value={roomForm.minAge} onChange={e => setRoomForm(f => ({ ...f, minAge: e.target.value }))} placeholder="e.g. 0" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-1">Max Age</label>
                    <input type="number" value={roomForm.maxAge} onChange={e => setRoomForm(f => ({ ...f, maxAge: e.target.value }))} placeholder="e.g. 3" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-1">Capacity</label>
                    <input type="number" value={roomForm.capacity} onChange={e => setRoomForm(f => ({ ...f, capacity: e.target.value }))} placeholder="e.g. 20" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={saveRoom} disabled={savingRoom || !roomForm.name.trim()} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: ACCENT, opacity: savingRoom ? 0.6 : 1 }}>{savingRoom ? "Saving…" : "Save Room"}</button>
                  <button onClick={() => setShowAddRoom(false)} className="px-4 py-2.5 rounded-xl text-sm border border-gray-200 text-gray-500">Cancel</button>
                </div>
              </div>
            )}

            {rooms.length === 0 ? (
              <div className="bg-white rounded-2xl shadow p-12 text-center"><div className="text-4xl mb-3">🏠</div><p className="text-gray-400">No rooms yet. Add your first room above.</p></div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {rooms.map(room => (
                  <div key={room.id} className="bg-white rounded-2xl shadow border border-gray-100 p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-bold text-gray-900">{room.name}</h3>
                        <p className="text-sm text-gray-500">{ageRange(room)}</p>
                        {room.capacity && <p className="text-xs text-gray-400 mt-0.5">Capacity: {room.capacity}</p>}
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${room.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>{room.is_active ? "Active" : "Inactive"}</span>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button onClick={() => toggleRoom(room)} className="flex-1 py-2 rounded-xl text-xs font-bold border" style={{ borderColor: ACCENT, color: room.is_active ? "#6b7280" : ACCENT, backgroundColor: room.is_active ? "transparent" : ACCENT + "11" }}>
                        {room.is_active ? "Deactivate" : "Activate"}
                      </button>
                      {room.is_active && APP_URL && (
                        <a href={`${APP_URL}/classroom/${room.id}`} target="_blank" rel="noopener noreferrer" className="flex-1 py-2 rounded-xl text-xs font-bold text-white text-center" style={{ backgroundColor: ACCENT }}>
                          Open Classroom ↗
                        </a>
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
                <h2 className="text-lg font-bold text-gray-800" style={{ fontFamily: "Georgia, serif" }}>Service Templates</h2>
                <p className="text-xs text-gray-400 mt-0.5">Reusable service definitions for quick session creation</p>
              </div>
              <button onClick={() => setShowAddTemplate(true)} className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: ACCENT }}>+ Add Template</button>
            </div>

            {showAddTemplate && (
              <div className="bg-white rounded-2xl shadow p-6 mb-6 border border-orange-100">
                <h3 className="font-bold text-gray-800 mb-4">New Template</h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-1">Service Name *</label>
                    <input value={tplForm.name} onChange={e => setTplForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Sunday Morning Service" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-1">Typical Day</label>
                    <input value={tplForm.typicalDay} onChange={e => setTplForm(f => ({ ...f, typicalDay: e.target.value }))} placeholder="e.g. Sunday" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-1">Typical Time</label>
                    <input type="time" value={tplForm.typicalTime} onChange={e => setTplForm(f => ({ ...f, typicalTime: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={saveTemplate} disabled={savingTemplate || !tplForm.name.trim()} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: ACCENT, opacity: savingTemplate ? 0.6 : 1 }}>{savingTemplate ? "Saving…" : "Save Template"}</button>
                  <button onClick={() => setShowAddTemplate(false)} className="px-4 py-2.5 rounded-xl text-sm border border-gray-200 text-gray-500">Cancel</button>
                </div>
              </div>
            )}

            {templates.length === 0 ? (
              <div className="bg-white rounded-2xl shadow p-12 text-center"><div className="text-4xl mb-3">📅</div><p className="text-gray-400">No templates yet. Add your first service template above.</p></div>
            ) : (
              <div className="space-y-3">
                {templates.map(tpl => (
                  <div key={tpl.id} className="bg-white rounded-2xl shadow border border-gray-100 p-5 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900">{tpl.name}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {[tpl.typical_day, tpl.typical_time ? fmtTime(tpl.typical_time) : null].filter(Boolean).join(" · ") || "No schedule set"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${tpl.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>{tpl.is_active ? "Active" : "Inactive"}</span>
                      <button onClick={() => toggleTemplate(tpl)} className="px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 text-gray-500">
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
            {/* Classroom access links */}
            {activeRooms.length > 0 && APP_URL && (
              <div className="bg-white rounded-2xl shadow p-5 mb-6 border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-3 text-sm">🏫 Classroom Tablet Links</h3>
                <div className="flex flex-wrap gap-2">
                  {activeRooms.map(room => {
                    const url = `${APP_URL}/classroom/${room.id}`;
                    return (
                      <div key={room.id} className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                        <span className="text-sm font-medium text-gray-700">{room.name}</span>
                        <button onClick={() => handleCopy(url)} className="text-xs px-2 py-0.5 rounded font-bold" style={{ color: ACCENT }}>{copiedUrl === url ? "Copied!" : "Copy"}</button>
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-gray-600">↗</a>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-gray-800" style={{ fontFamily: "Georgia, serif" }}>Check-In Sessions</h2>
                <p className="text-xs text-gray-400 mt-0.5">Create a session to open the kiosk for check-in</p>
              </div>
              <button onClick={() => setShowAddSession(true)} className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: ACCENT }}>+ New Session</button>
            </div>

            {showAddSession && (
              <div className="bg-white rounded-2xl shadow p-6 mb-6 border border-orange-100">
                <h3 className="font-bold text-gray-800 mb-4">New Check-In Session</h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-1">Service Name *</label>
                    <input value={sessionForm.serviceName} onChange={e => setSessionForm(f => ({ ...f, serviceName: e.target.value }))} placeholder="e.g. Sunday Morning Service" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-1">Use Template (optional)</label>
                    <select value={sessionForm.templateId} onChange={e => { const tpl = templates.find(t => t.id === e.target.value); setSessionForm(f => ({ ...f, templateId: e.target.value, serviceName: tpl ? tpl.name : f.serviceName, scheduledTime: tpl?.typical_time ?? f.scheduledTime })); }} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm">
                      <option value="">— No template —</option>
                      {templates.filter(t => t.is_active).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-1">Date *</label>
                    <input type="date" value={sessionForm.date} onChange={e => setSessionForm(f => ({ ...f, date: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-1">Time</label>
                    <input type="time" value={sessionForm.scheduledTime} onChange={e => setSessionForm(f => ({ ...f, scheduledTime: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-1">Kiosk PIN (4 digits) *</label>
                    <input value={sessionForm.kioskPin} onChange={e => setSessionForm(f => ({ ...f, kioskPin: e.target.value.replace(/\D/g, "").slice(0, 4) }))} placeholder="e.g. 1234" maxLength={4} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-mono" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={saveSession} disabled={savingSession || !sessionForm.serviceName.trim() || !sessionForm.date || sessionForm.kioskPin.length !== 4} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: ACCENT, opacity: savingSession ? 0.6 : 1 }}>{savingSession ? "Creating…" : "Create Session"}</button>
                  <button onClick={() => setShowAddSession(false)} className="px-4 py-2.5 rounded-xl text-sm border border-gray-200 text-gray-500">Cancel</button>
                </div>
              </div>
            )}

            {sessions.length === 0 ? (
              <div className="bg-white rounded-2xl shadow p-12 text-center"><div className="text-4xl mb-3">🔑</div><p className="text-gray-400">No sessions yet. Create one to start check-in.</p></div>
            ) : (
              <div className="space-y-4">
                {sessions.map(session => {
                  const kioskUrl = APP_URL ? `${APP_URL}/kiosk/${session.id}` : `/kiosk/${session.id}`;
                  const isOpen = session.status === "open";
                  return (
                    <div key={session.id} className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-gray-900">{session.service_name}</h3>
                              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${isOpen ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{isOpen ? "Open" : "Closed"}</span>
                            </div>
                            <p className="text-sm text-gray-500">{fmtDate(session.date)}{session.scheduled_time ? ` · ${fmtTime(session.scheduled_time)}` : ""}</p>
                            <p className="text-xs text-gray-400 font-mono mt-0.5">PIN: {session.kiosk_pin}</p>
                          </div>
                          <button onClick={() => toggleSession(session)} className="px-4 py-2 rounded-xl text-sm font-bold" style={{ backgroundColor: isOpen ? "#fee2e2" : "#dcfce7", color: isOpen ? "#dc2626" : "#16a34a" }}>
                            {isOpen ? "Close Session" : "Reopen"}
                          </button>
                        </div>

                        {/* Kiosk URL */}
                        <div className="bg-gray-50 rounded-xl p-3 mb-3">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Kiosk URL</p>
                          <div className="flex items-center gap-2">
                            <code className="text-xs text-gray-600 flex-1 truncate">{kioskUrl}</code>
                            <button onClick={() => handleCopy(kioskUrl)} className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{ backgroundColor: ACCENT + "22", color: ACCENT }}>{copiedUrl === kioskUrl ? "Copied!" : "Copy"}</button>
                            {isOpen && (
                              <a href={kioskUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold px-2.5 py-1 rounded-lg text-white" style={{ backgroundColor: ACCENT }}>Open ↗</a>
                            )}
                          </div>
                        </div>

                        {/* Classroom links for this session */}
                        {isOpen && activeRooms.length > 0 && APP_URL && (
                          <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Classroom Links</p>
                            <div className="flex flex-wrap gap-2">
                              {activeRooms.map(room => {
                                const url = `${APP_URL}/classroom/${room.id}`;
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
      </div>
    </MinistryShell>
  );
}
