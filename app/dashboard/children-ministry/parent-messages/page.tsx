"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/layout/AppShell";

const supabase = createClient();

const BG     = "#08060D";
const CARD   = "#120A1F";
const BORDER = "rgba(212,175,55,0.25)";
const GOLD   = "#D4AF37";
const PURPLE = "#7B2CBF";
const TEXT   = "#ffffff";
const MUTED  = "#A9A9B8";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 13px",
  background: "rgba(255,255,255,0.05)",
  border: `1px solid ${BORDER}`,
  borderRadius: 8, fontSize: 14, color: TEXT, outline: "none", boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 600,
  color: MUTED, marginBottom: 6, letterSpacing: "0.05em", textTransform: "uppercase",
};

type Message = {
  id: string;
  title: string;
  body: string;
  audience: string;
  room_id: string | null;
  status: "draft" | "sent";
  sent_at: string | null;
  created_at: string;
};

type Room = { id: string; name: string };

const AUDIENCE_OPTIONS = [
  { value: "all_parents",       label: "All Parents" },
  { value: "checked_in_today",  label: "Checked-In Today" },
  { value: "first_time",        label: "First-Time Families" },
  { value: "selected_room",     label: "Selected Room" },
];

function audienceLabel(audience: string, rooms: Room[], roomId: string | null) {
  const opt = AUDIENCE_OPTIONS.find((o) => o.value === audience);
  if (audience === "selected_room" && roomId) {
    const room = rooms.find((r) => r.id === roomId);
    return room ? `Room: ${room.name}` : "Selected Room";
  }
  return opt?.label ?? audience;
}

const BLANK_FORM = { title: "", body: "", audience: "all_parents", room_id: "" };

export default function ParentMessagesPage() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);

  const [form, setForm] = useState(BLANK_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [marking, setMarking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  function set(key: keyof typeof BLANK_FORM, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function loadMessages(t: string) {
    const res = await fetch("/api/children-ministry/parent-messages", {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (res.ok) {
      const { messages: data } = await res.json();
      setMessages(data ?? []);
    }
  }

  async function loadRooms(t: string) {
    const res = await fetch("/api/checkin/rooms", {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (res.ok) {
      const { rooms: data } = await res.json();
      setRooms(data ?? []);
    }
  }

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const t = session.access_token;
      setToken(t);
      await Promise.all([loadMessages(t), loadRooms(t)]);
      setLoading(false);
    }
    init();
  }, []);

  function startNew() {
    setEditingId(null);
    setForm(BLANK_FORM);
    setErrorMsg("");
    setSuccessMsg("");
  }

  function loadExisting(msg: Message) {
    setEditingId(msg.id);
    setForm({ title: msg.title, body: msg.body, audience: msg.audience, room_id: msg.room_id ?? "" });
    setErrorMsg("");
    setSuccessMsg("");
  }

  async function handleSaveDraft() {
    if (!token) return;
    setErrorMsg(""); setSuccessMsg("");
    setSaving(true);
    try {
      let res: Response;
      if (editingId) {
        res = await fetch("/api/children-ministry/parent-messages", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ id: editingId, action: "save_draft", ...form }),
        });
      } else {
        res = await fetch("/api/children-ministry/parent-messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(form),
        });
      }
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErrorMsg((d as { error?: string }).error ?? "Failed to save draft.");
        return;
      }
      const d = await res.json();
      const saved: Message = d.message;
      setEditingId(saved.id);
      setSuccessMsg("Draft saved.");
      setTimeout(() => setSuccessMsg(""), 3000);
      await loadMessages(token);
    } finally {
      setSaving(false);
    }
  }

  function handleCopy() {
    if (!form.body) return;
    navigator.clipboard.writeText(`${form.title ? form.title + "\n\n" : ""}${form.body}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleMarkSent() {
    if (!token || !editingId) return;
    setErrorMsg(""); setSuccessMsg("");
    setMarking(true);
    try {
      const res = await fetch("/api/children-ministry/parent-messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: editingId, action: "mark_sent" }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErrorMsg((d as { error?: string }).error ?? "Failed to mark sent.");
        return;
      }
      setSuccessMsg("Message marked as sent.");
      setTimeout(() => setSuccessMsg(""), 3000);
      await loadMessages(token);
    } finally {
      setMarking(false);
    }
  }

  const currentMsg = editingId ? messages.find((m) => m.id === editingId) : null;
  const isAlreadySent = currentMsg?.status === "sent";

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: BG }}>
        <span style={{ color: MUTED, fontSize: 14 }}>Loading…</span>
      </div>
    );
  }

  return (
    <AppShell navItems={[]}>
      {/* Hero */}
      <div style={{ padding: "40px 32px 28px", background: "linear-gradient(135deg, #08060D 0%, #1C0A30 100%)" }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", color: GOLD, marginBottom: 6, textTransform: "uppercase" }}>
          ShepherdKids
        </p>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: TEXT, margin: 0, fontFamily: "Georgia, serif" }}>
          Parent Messages
        </h1>
        <p style={{ color: MUTED, fontSize: 14, marginTop: 6, marginBottom: 0 }}>
          Compose and prepare messages to send to your ministry families.
        </p>
      </div>

      <div style={{ background: BG, minHeight: "100vh", padding: 32 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, maxWidth: 1100 }}>

          {/* ── Compose form ── */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 28 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <h2 style={{ fontWeight: 700, color: TEXT, fontFamily: "Georgia, serif", fontSize: 17, margin: 0 }}>
                {editingId ? (isAlreadySent ? "View Message" : "Edit Draft") : "New Message"}
              </h2>
              {editingId && (
                <button
                  onClick={startNew}
                  style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 8, color: GOLD, cursor: "pointer", fontSize: 12, padding: "6px 14px" }}
                >
                  + New Message
                </button>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <label style={labelStyle}>Message Title</label>
                <input
                  style={inputStyle}
                  type="text"
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="e.g. Sunday Recap — June 22"
                  disabled={isAlreadySent}
                />
              </div>

              <div>
                <label style={labelStyle}>Message Body</label>
                <textarea
                  style={{ ...inputStyle, resize: "vertical", minHeight: 180 }}
                  value={form.body}
                  onChange={(e) => set("body", e.target.value)}
                  placeholder="Write your message to parents here…"
                  rows={7}
                  disabled={isAlreadySent}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={labelStyle}>Audience</label>
                  <select
                    style={{ ...inputStyle, appearance: "none" }}
                    value={form.audience}
                    onChange={(e) => set("audience", e.target.value)}
                    disabled={isAlreadySent}
                  >
                    {AUDIENCE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value} style={{ background: CARD }}>{o.label}</option>
                    ))}
                  </select>
                </div>
                {form.audience === "selected_room" && (
                  <div>
                    <label style={labelStyle}>Room</label>
                    <select
                      style={{ ...inputStyle, appearance: "none" }}
                      value={form.room_id}
                      onChange={(e) => set("room_id", e.target.value)}
                      disabled={isAlreadySent}
                    >
                      <option value="" style={{ background: CARD }}>— Select a room —</option>
                      {rooms.map((r) => (
                        <option key={r.id} value={r.id} style={{ background: CARD }}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {errorMsg && (
              <p style={{ color: "#f87171", fontSize: 13, marginTop: 14 }}>{errorMsg}</p>
            )}
            {successMsg && (
              <p style={{ color: "#4ade80", fontSize: 13, fontWeight: 600, marginTop: 14 }}>✓ {successMsg}</p>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap" }}>
              {!isAlreadySent && (
                <button
                  onClick={handleSaveDraft}
                  disabled={saving || !form.body.trim()}
                  style={{
                    padding: "10px 20px", borderRadius: 10, border: `1px solid ${BORDER}`,
                    background: "none", color: saving ? MUTED : TEXT,
                    fontSize: 13, fontWeight: 600, cursor: saving || !form.body.trim() ? "not-allowed" : "pointer",
                    opacity: saving || !form.body.trim() ? 0.5 : 1,
                  }}
                >
                  {saving ? "Saving…" : "💾 Save Draft"}
                </button>
              )}

              <button
                onClick={handleCopy}
                disabled={!form.body.trim()}
                style={{
                  padding: "10px 20px", borderRadius: 10, border: `1px solid ${BORDER}`,
                  background: "none", color: copied ? "#4ade80" : GOLD,
                  fontSize: 13, fontWeight: 600, cursor: !form.body.trim() ? "not-allowed" : "pointer",
                  opacity: !form.body.trim() ? 0.5 : 1,
                }}
              >
                {copied ? "✓ Copied!" : "📋 Copy Message"}
              </button>

              {editingId && !isAlreadySent && (
                <button
                  onClick={handleMarkSent}
                  disabled={marking}
                  style={{
                    padding: "10px 20px", borderRadius: 10, border: "none",
                    background: marking ? "rgba(123,44,191,0.5)" : `linear-gradient(135deg, ${PURPLE}, #9D4EDD)`,
                    color: TEXT, fontSize: 13, fontWeight: 700, cursor: marking ? "not-allowed" : "pointer",
                  }}
                >
                  {marking ? "Saving…" : "✅ Mark as Sent"}
                </button>
              )}
            </div>
          </div>

          {/* ── Message history ── */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ fontWeight: 700, color: TEXT, fontFamily: "Georgia, serif", fontSize: 17, margin: 0 }}>
                Messages
              </h2>
              <span style={{ fontSize: 12, color: MUTED }}>{messages.length} total</span>
            </div>

            {messages.length === 0 ? (
              <p style={{ color: MUTED, fontSize: 13 }}>No messages yet. Compose your first one.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {messages.map((msg) => (
                  <button
                    key={msg.id}
                    onClick={() => loadExisting(msg)}
                    style={{
                      width: "100%", textAlign: "left", padding: "12px 14px", borderRadius: 10,
                      border: editingId === msg.id ? `1px solid rgba(123,44,191,0.5)` : `1px solid ${BORDER}`,
                      background: editingId === msg.id ? "rgba(123,44,191,0.1)" : "rgba(255,255,255,0.03)",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: TEXT, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, paddingRight: 6 }}>
                        {msg.title || <span style={{ fontStyle: "italic", color: MUTED }}>Untitled</span>}
                      </p>
                      {msg.status === "sent" ? (
                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "rgba(34,197,94,0.2)", color: "#4ade80", fontWeight: 700, flexShrink: 0 }}>
                          Sent
                        </span>
                      ) : (
                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "rgba(255,255,255,0.08)", color: MUTED, fontWeight: 700, flexShrink: 0 }}>
                          Draft
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 11, color: MUTED, margin: 0 }}>
                      {audienceLabel(msg.audience, rooms, msg.room_id)} · {new Date(msg.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                    {msg.body && (
                      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: "4px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {msg.body}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
