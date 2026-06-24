"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/layout/AppShell";

const supabase = createClient();

type UpdateRecord = {
  id: string; session_date: string; memory_verse: string | null;
  lesson_summary: string | null; conversation_starter: string | null;
  special_notes: string | null; sent_at: string | null; created_at: string;
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(212,175,55,0.3)",
  borderRadius: "8px",
  fontSize: "13px",
  color: "#ffffff",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "11px",
  fontWeight: 600,
  color: "#A9A9B8",
  marginBottom: "6px",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};

export default function ParentUpdatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [history, setHistory] = useState<UpdateRecord[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const [form, setForm] = useState({
    sessionDate: new Date().toISOString().slice(0, 10),
    memoryVerse: "",
    lessonSummary: "",
    conversationStarter: "",
    specialNotes: "",
  });
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [sendSuccess, setSendSuccess] = useState("");

  async function loadHistory(t: string) {
    const res = await fetch(`/api/children-ministry/parent-update`, { headers: { Authorization: `Bearer ${t}` } });
    const data = await res.json();
    setHistory(data.updates ?? []);
  }

  useEffect(() => {
    async function init() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!user || error) {
        console.log("Dashboard client user unavailable:", error?.message ?? null);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const t = session.access_token;
      setToken(t);
      await loadHistory(t);
      setLoading(false);
    }
    init();
  }, [router]);

  function loadPastUpdate(u: UpdateRecord) {
    setForm({
      sessionDate: u.session_date,
      memoryVerse: u.memory_verse ?? "",
      lessonSummary: u.lesson_summary ?? "",
      conversationStarter: u.conversation_starter ?? "",
      specialNotes: u.special_notes ?? "",
    });
  }

  async function save(sendNow: boolean) {
    if (sendNow) { setSending(true); } else { setSaving(true); }
    setSaveError(""); setSendSuccess("");

    const res = await fetch("/api/children-ministry/parent-update", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...form, sendNow }),
    });
    const data = await res.json();

    if (!res.ok) { setSaveError(data.error ?? "Error"); setSaving(false); setSending(false); return; }
    setSaving(false); setSending(false);

    if (sendNow) {
      setSendSuccess(`✅ Parent Communication sent to ${data.emailsSent} families!`);
      setTimeout(() => setSendSuccess(""), 5000);
    }
    if (token) await loadHistory(token);
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#08060D" }}>
        <div style={{ color: "#D8D8E8", fontFamily: "Georgia, serif" }}>Loading…</div>
      </div>
    );
  }

  return (
    <AppShell navItems={[]}>
      {/* Hero */}
      <div style={{ padding: "40px 32px 32px", background: "linear-gradient(135deg, #08060D 0%, #1C0A30 100%)" }}>
        <p style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.06em", color: "#D4AF37", marginBottom: "6px", textTransform: "uppercase" }}>
          ShepherdKids
        </p>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#ffffff", margin: 0, fontFamily: "Georgia, serif" }}>
          Children's Lesson Plan
        </h1>
      </div>

      <div style={{ backgroundColor: "#0A0814", minHeight: "100vh", padding: "32px" }}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Compose form */}
          <div
            className="lg:col-span-2"
            style={{
              background: "#120A1F",
              border: "1px solid rgba(212,175,55,0.25)",
              borderRadius: "18px",
              padding: "28px",
            }}
          >
            <h2 style={{ fontWeight: 700, color: "#ffffff", marginBottom: "22px", fontFamily: "Georgia, serif", fontSize: "17px" }}>
              Compose Lesson Plan
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <div>
                <label style={labelStyle}>Session Date *</label>
                <input
                  type="date"
                  value={form.sessionDate}
                  onChange={e => setForm(f => ({ ...f, sessionDate: e.target.value }))}
                  style={{ ...inputStyle, width: "auto" }}
                />
              </div>

              <div>
                <label style={labelStyle}>Memory Verse</label>
                <input
                  value={form.memoryVerse}
                  onChange={e => setForm(f => ({ ...f, memoryVerse: e.target.value }))}
                  placeholder='"For God so loved the world…" — John 3:16'
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Lesson Summary</label>
                <textarea
                  value={form.lessonSummary}
                  onChange={e => setForm(f => ({ ...f, lessonSummary: e.target.value }))}
                  rows={4}
                  placeholder="Today we learned about…"
                  style={{ ...inputStyle, resize: "none" }}
                />
              </div>

              <div>
                <label style={labelStyle}>Conversation Starter for Parents</label>
                <input
                  value={form.conversationStarter}
                  onChange={e => setForm(f => ({ ...f, conversationStarter: e.target.value }))}
                  placeholder="What was the most important thing you learned today?"
                  style={inputStyle}
                />
                <p style={{ fontSize: "11px", color: "#A9A9B8", marginTop: "5px" }}>
                  Parents will see: Ask [child&apos;s name]: &ldquo;…&rdquo;
                </p>
              </div>

              <div>
                <label style={labelStyle}>Special Notes</label>
                <textarea
                  value={form.specialNotes}
                  onChange={e => setForm(f => ({ ...f, specialNotes: e.target.value }))}
                  rows={3}
                  placeholder="Upcoming events, reminders, announcements…"
                  style={{ ...inputStyle, resize: "none" }}
                />
              </div>
            </div>

            {saveError && (
              <p style={{ fontSize: "13px", color: "#f87171", marginTop: "16px" }}>{saveError}</p>
            )}
            {sendSuccess && (
              <p style={{ fontSize: "13px", color: "#4ade80", fontWeight: 700, marginTop: "16px" }}>{sendSuccess}</p>
            )}

            <div style={{ display: "flex", gap: "10px", marginTop: "24px", flexWrap: "wrap" }}>
              <button
                onClick={() => setShowPreview(true)}
                style={{
                  padding: "9px 18px",
                  border: "1px solid rgba(212,175,55,0.4)",
                  borderRadius: "10px",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#D4AF37",
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                👁️ Preview Email
              </button>
              <button
                onClick={() => save(false)}
                disabled={saving}
                style={{
                  padding: "9px 18px",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "10px",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#D8D8E8",
                  background: "transparent",
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? "Saving…" : "💾 Save Draft"}
              </button>
              <button
                onClick={() => save(true)}
                disabled={sending}
                style={{
                  flex: 1,
                  minWidth: "160px",
                  padding: "9px 18px",
                  borderRadius: "10px",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#ffffff",
                  background: sending ? "rgba(123,44,191,0.5)" : "linear-gradient(135deg, #7B2CBF, #9D4EDD)",
                  border: "none",
                  cursor: sending ? "not-allowed" : "pointer",
                }}
              >
                {sending ? "Sending…" : "📧 Send to All Parents"}
              </button>
            </div>
          </div>

          {/* Past Updates sidebar */}
          <div
            style={{
              background: "#120A1F",
              border: "1px solid rgba(212,175,55,0.25)",
              borderRadius: "18px",
              padding: "24px",
            }}
          >
            <h2 style={{ fontWeight: 700, color: "#ffffff", marginBottom: "16px", fontFamily: "Georgia, serif", fontSize: "17px" }}>
              Past Updates
            </h2>
            {history.length === 0 ? (
              <p style={{ color: "#A9A9B8", fontSize: "13px" }}>No updates sent yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {history.map(u => (
                  <button
                    key={u.id}
                    onClick={() => loadPastUpdate(u)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "12px 14px",
                      borderRadius: "10px",
                      border: "1px solid rgba(212,175,55,0.2)",
                      background: "rgba(255,255,255,0.03)",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "3px" }}>
                      <p style={{ fontSize: "13px", fontWeight: 600, color: "#ffffff", margin: 0 }}>
                        {new Date(u.session_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                      {u.sent_at ? (
                        <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "20px", background: "rgba(34,197,94,0.2)", color: "#4ade80", fontWeight: 700 }}>
                          Sent
                        </span>
                      ) : (
                        <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "20px", background: "rgba(255,255,255,0.08)", color: "#A9A9B8", fontWeight: 700 }}>
                          Draft
                        </span>
                      )}
                    </div>
                    {u.memory_verse && (
                      <p style={{ fontSize: "11px", color: "#A9A9B8", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        &ldquo;{u.memory_verse}&rdquo;
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "16px" }}
          onClick={() => setShowPreview(false)}
        >
          <div
            style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.3)", borderRadius: "18px", width: "100%", maxWidth: "520px", maxHeight: "88vh", overflowY: "auto" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div style={{ position: "sticky", top: 0, background: "#120A1F", borderBottom: "1px solid rgba(212,175,55,0.15)", padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: "18px 18px 0 0" }}>
              <h2 style={{ fontWeight: 700, color: "#ffffff", margin: 0, fontSize: "15px" }}>Email Preview</h2>
              <button
                onClick={() => setShowPreview(false)}
                style={{ color: "#A9A9B8", background: "none", border: "none", cursor: "pointer", fontSize: "18px", lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            {/* Email body — kept light since it represents an actual parent email */}
            <div style={{ padding: "24px" }}>
              <div style={{ fontFamily: "Georgia, serif", borderRadius: "10px", overflow: "hidden", border: "1px solid #e5e7eb" }}>
                <div style={{ background: "linear-gradient(135deg, #7B2CBF, #9D4EDD)", padding: "22px 26px" }}>
                  <h1 style={{ color: "white", margin: 0, fontSize: "19px", fontWeight: "normal" }}>Your Church</h1>
                  <p style={{ color: "rgba(255,255,255,0.85)", margin: "4px 0 0", fontSize: "13px" }}>
                    ShepherdKids · {form.sessionDate ? new Date(form.sessionDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : ""}
                  </p>
                </div>
                <div style={{ background: "white", padding: "26px" }}>
                  {form.memoryVerse && (
                    <div style={{ marginBottom: "18px" }}>
                      <h3 style={{ color: "#1A4A2E", fontSize: "14px", margin: "0 0 7px" }}>📖 Memory Verse This Week</h3>
                      <p style={{ fontSize: "14px", fontStyle: "italic", color: "#374151", margin: 0 }}>&ldquo;{form.memoryVerse}&rdquo;</p>
                    </div>
                  )}
                  {form.lessonSummary && (
                    <div style={{ marginBottom: "18px" }}>
                      <h3 style={{ color: "#1A4A2E", fontSize: "14px", margin: "0 0 7px" }}>✝️ This Week&apos;s Lesson</h3>
                      <p style={{ fontSize: "14px", color: "#374151", lineHeight: "1.7", margin: 0 }}>{form.lessonSummary}</p>
                    </div>
                  )}
                  {form.conversationStarter && (
                    <div style={{ marginBottom: "18px", background: "#f8fafc", borderRadius: "8px", padding: "12px 16px" }}>
                      <h3 style={{ color: "#1A4A2E", fontSize: "14px", margin: "0 0 7px" }}>💬 Conversation Starter</h3>
                      <p style={{ fontSize: "14px", color: "#374151", fontStyle: "italic", margin: 0 }}>Ask [child&apos;s name]: &ldquo;{form.conversationStarter}&rdquo;</p>
                    </div>
                  )}
                  {form.specialNotes && (
                    <div>
                      <h3 style={{ color: "#1A4A2E", fontSize: "14px", margin: "0 0 7px" }}>📢 Special Notes</h3>
                      <p style={{ fontSize: "14px", color: "#374151", lineHeight: "1.7", margin: 0 }}>{form.specialNotes}</p>
                    </div>
                  )}
                  <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "18px 0" }} />
                  <p style={{ fontSize: "11px", color: "#9ca3af", textAlign: "center", margin: 0 }}>Each email is personalized with the child&apos;s name.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
