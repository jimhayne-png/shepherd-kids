"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/layout/AppShell";

const supabase = createClient();
const ACCENT = "#7B2CBF";

type Touch = {
  touch1_completed: boolean; touch1_completed_at: string | null;
  touch2_completed: boolean; touch2_completed_at: string | null;
  touch3_completed: boolean; touch3_completed_at: string | null;
};
type FUChild = { id: string; child_name: string; room_name: string | null; checked_in_at: string; touches: Touch | null };
type FUFamily = {
  parentName: string; parentPhone: string; parentEmail: string | null;
  primaryRecordId: string; children: FUChild[];
  followupLog: { status: string; follow_up_type: string; sent_at: string | null } | null;
  visitCount: number;
};
type FUSession = { session: { id: string; service_name: string; date: string; auto_followup: boolean }; families: FUFamily[] };
type ChurchInfo = { id: string; name: string };

const TOUCH_LABELS: [string, string, string] = ["📞 Phone Call", "✉️ Send Welcome Card", "🤝 In-Person Visit"];

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function resolveMergeFields(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

function touchesAllDone(child: FUChild): boolean {
  return !!(child.touches?.touch1_completed && child.touches?.touch2_completed && child.touches?.touch3_completed);
}

function familyFullyDone(family: FUFamily): boolean {
  return !!family.followupLog && family.children.every(touchesAllDone);
}

export default function FollowUpPage() {
  const router = useRouter();
  const selectedChurchIdRef = useRef<string | null>(null);
  function ch(): Record<string, string> {
    return selectedChurchIdRef.current ? { "x-selected-church-id": selectedChurchIdRef.current } : {};
  }

  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<FUSession[]>([]);
  const [church, setChurch] = useState<ChurchInfo | null>(null);
  const [filterTab, setFilterTab] = useState<"active" | "completed" | "all">("active");
  const [letterTemplate, setLetterTemplate] = useState<{ subject: string; body_html: string } | null>(null);

  const [modalFamily, setModalFamily] = useState<FUFamily | null>(null);
  const [modalSession, setModalSession] = useState<FUSession["session"] | null>(null);
  const [modalSubject, setModalSubject] = useState("");
  const [modalBody, setModalBody] = useState("");
  const [modalSending, setModalSending] = useState(false);

  async function loadData() {
    const [fuRes, tplRes] = await Promise.all([
      fetch("/api/children-ministry/followup", { credentials: "include", headers: ch() }),
      fetch("/api/children-ministry/letter-template", { credentials: "include", headers: ch() }),
    ]);
    if (fuRes.ok) { const d = await fuRes.json(); setSessions(d.sessions ?? []); setChurch(d.church ?? null); }
    if (tplRes.ok) { const d = await tplRes.json(); setLetterTemplate(d.template); }
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }
      const churchRes = await fetch('/api/auth/church', { credentials: 'include' });
      if (churchRes.ok) {
        const d = await churchRes.json();
        selectedChurchIdRef.current = d.churchId;
      }
      await loadData();
      setLoading(false);
    }
    init();
  }, []);

  async function toggleTouch(recordId: string, touchNum: 1 | 2 | 3, current: boolean) {
    await fetch("/api/children-ministry/followup/touches", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...ch() },
      credentials: "include",
      body: JSON.stringify({ recordId, touchNumber: touchNum, completed: !current }),
    });
    const nowIso = !current ? new Date().toISOString() : null;
    setSessions(ss => ss.map(s => ({
      ...s,
      families: s.families.map(f => ({
        ...f,
        children: f.children.map(c => {
          if (c.id !== recordId) return c;
          const t = c.touches ?? {
            touch1_completed: false, touch1_completed_at: null,
            touch2_completed: false, touch2_completed_at: null,
            touch3_completed: false, touch3_completed_at: null,
          };
          return {
            ...c,
            touches: {
              ...t,
              [`touch${touchNum}_completed`]: !current,
              [`touch${touchNum}_completed_at`]: nowIso,
            } as Touch,
          };
        }),
      })),
    })));
  }

  function openModal(family: FUFamily, session: FUSession["session"]) {
    if (!letterTemplate) return;
    const vars: Record<string, string> = {
      parent_name: family.parentName,
      child_names: family.children.map(c => c.child_name).join(', '),
      church_name: church?.name ?? '',
      visit_date: fmtDate(session.date),
      pastor_name: 'Your Pastor',
    };
    setModalFamily(family);
    setModalSession(session);
    setModalSubject(resolveMergeFields(letterTemplate.subject, vars));
    setModalBody(resolveMergeFields(letterTemplate.body_html, vars));
    setModalSending(false);
  }

  function closeModal() {
    setModalFamily(null);
    setModalSession(null);
    setModalSubject("");
    setModalBody("");
  }

  async function sendFollowup(type: "email" | "marked") {
    if (!modalFamily || !modalSession) return;
    setModalSending(true);
    const res = await fetch("/api/children-ministry/followup", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...ch() },
      credentials: "include",
      body: JSON.stringify({
        sessionId: modalSession.id,
        recordIds: modalFamily.children.map(c => c.id),
        parentName: modalFamily.parentName,
        parentEmail: modalFamily.parentEmail ?? null,
        childNames: modalFamily.children.map(c => c.child_name),
        followUpType: type,
        subject: modalSubject,
        bodyText: modalBody,
      }),
    });
    setModalSending(false);
    if (res.ok) {
      closeModal();
      await loadData();
    }
  }

  const allFamilies = sessions.flatMap(s => s.families);
  const activeCount = allFamilies.filter(f => !familyFullyDone(f)).length;

  function filteredFamilies(families: FUFamily[]): FUFamily[] {
    if (filterTab === "active") return families.filter(f => !familyFullyDone(f));
    if (filterTab === "completed") return families.filter(f => familyFullyDone(f));
    return families;
  }

  function filteredChildren(children: FUChild[]): FUChild[] {
    if (filterTab === "active") return children.filter(c => !touchesAllDone(c));
    if (filterTab === "completed") return children.filter(c => touchesAllDone(c));
    return children;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#08060D" }}>
        <div style={{ color: "#D8D8E8" }}>Loading…</div>
      </div>
    );
  }

  const noSection1 = sessions.every(s => filteredFamilies(s.families).length === 0);
  const noSection2 = sessions.every(s => s.families.every(f => filteredChildren(f.children).length === 0));

  const emptyMsg = (section: "letter" | "touch") => {
    if (filterTab === "completed") return section === "letter" ? "No completed follow-ups yet." : "No completed shepherd touches yet.";
    if (filterTab === "active") return section === "letter" ? "No outstanding follow-ups — great work!" : "All shepherd touches are complete!";
    return section === "letter" ? "No first-time visitors yet." : "No first-time children yet.";
  };

  return (
    <AppShell navItems={[]}>
      {/* Header */}
      <div className="px-8 py-10" style={{ background: "linear-gradient(135deg, #08060D 0%, #1C0A30 100%)" }}>
        <p className="text-sm mb-1" style={{ color: "#D4AF37" }}>ShepherdKids</p>
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>Follow Up</h1>
        <p className="text-sm mt-1" style={{ color: "#D8D8E8" }}>First visit letters & shepherd touches</p>
      </div>

      <div className="px-8 py-8" style={{ backgroundColor: "#0A0814", minHeight: "100vh" }}>
        {/* Filter tabs */}
        <div className="flex gap-1 mb-8 w-fit" style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.22)", borderRadius: "16px", padding: "6px" }}>
          {(["active", "completed", "all"] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilterTab(t)}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              style={{ backgroundColor: filterTab === t ? ACCENT : "transparent", color: filterTab === t ? "white" : "#A9A9B8", display: "flex", alignItems: "center", gap: "6px" }}
            >
              {t === "active" ? (
                <>
                  Active Follow Up
                  {activeCount > 0 && (
                    <span style={{ background: "#ef4444", color: "white", borderRadius: "9999px", padding: "1px 7px", fontSize: "11px", fontWeight: 700 }}>
                      {activeCount}
                    </span>
                  )}
                </>
              ) : t === "completed" ? "Completed" : "All"}
            </button>
          ))}
        </div>

        {/* Section 1: Parent First Visit Follow Up */}
        <section className="mb-10">
          <h2 className="text-lg font-bold mb-4" style={{ fontFamily: "Georgia, serif", color: "#D4AF37" }}>Parent First Visit Follow Up</h2>
          {noSection1 ? (
            <div className="rounded-2xl p-10 text-center" style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.22)" }}>
              <div className="text-4xl mb-3">{filterTab === "completed" ? "✅" : "📬"}</div>
              <p style={{ color: "#D8D8E8" }}>{emptyMsg("letter")}</p>
            </div>
          ) : (
            sessions.map(({ session: sess, families }) => {
              const visible = filteredFamilies(families);
              if (!visible.length) return null;
              return (
                <div key={sess.id} className="rounded-2xl mb-6 overflow-hidden" style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.22)" }}>
                  <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(212,175,55,0.12)" }}>
                    <h3 className="font-bold" style={{ color: "#ffffff" }}>{sess.service_name}</h3>
                    <p className="text-sm" style={{ color: "#A9A9B8" }}>{fmtDate(sess.date)} · {families.length} {families.length === 1 ? "family" : "families"}</p>
                  </div>
                  {visible.map((family, idx) => {
                    const sent = !!family.followupLog;
                    return (
                      <div key={family.parentPhone} className="px-6 py-5" style={{ borderTop: idx > 0 ? "1px solid rgba(212,175,55,0.08)" : "none" }}>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-base" style={{ color: "#ffffff" }}>{family.parentName}</span>
                              <span className="text-xs px-2 py-0.5 rounded-full font-bold text-white" style={{ backgroundColor: family.visitCount === 1 ? "#3b82f6" : family.visitCount === 2 ? "#8b5cf6" : ACCENT }}>
                                {family.visitCount === 1 ? "1st Visit" : family.visitCount === 2 ? "2nd Visit" : "3rd+ Visit"}
                              </span>
                            </div>
                            <p className="text-sm mb-1" style={{ color: "#A9A9B8" }}>{family.parentPhone}</p>
                            {family.children.map(c => (
                              <p key={c.id} className="text-sm" style={{ color: "#D8D8E8" }}>
                                🧒 {c.child_name}{c.room_name ? ` — ${c.room_name}` : ""}
                              </p>
                            ))}
                          </div>
                          <div className="flex-shrink-0">
                            {sent ? (
                              <span className="text-xs px-2.5 py-1 rounded-full font-bold" style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80" }}>
                                ✅ Letter Sent
                              </span>
                            ) : (
                              <button
                                onClick={() => openModal(family, sess)}
                                disabled={!letterTemplate}
                                className="px-4 py-2 rounded-xl text-sm font-bold text-white"
                                style={{ backgroundColor: ACCENT, opacity: letterTemplate ? 1 : 0.5 }}
                              >
                                ✉️ Personalize & Send
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </section>

        {/* Section 2: Child Shepherd Follow Up */}
        <section>
          <h2 className="text-lg font-bold mb-4" style={{ fontFamily: "Georgia, serif", color: "#D4AF37" }}>Child Shepherd Follow Up</h2>
          {noSection2 ? (
            <div className="rounded-2xl p-10 text-center" style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.22)" }}>
              <div className="text-4xl mb-3">{filterTab === "completed" ? "✅" : "🐑"}</div>
              <p style={{ color: "#D8D8E8" }}>{emptyMsg("touch")}</p>
            </div>
          ) : (
            sessions.map(({ session: sess, families }) => {
              const childRows = families.flatMap(f =>
                filteredChildren(f.children).map(c => ({ ...c, parentName: f.parentName }))
              );
              if (!childRows.length) return null;
              return (
                <div key={sess.id} className="rounded-2xl mb-6 overflow-hidden" style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.22)" }}>
                  <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(212,175,55,0.12)" }}>
                    <h3 className="font-bold" style={{ color: "#ffffff" }}>{sess.service_name}</h3>
                    <p className="text-sm" style={{ color: "#A9A9B8" }}>{fmtDate(sess.date)}</p>
                  </div>
                  {childRows.map((child, idx) => {
                    const t = child.touches;
                    const vals: [boolean, boolean, boolean] = [
                      t?.touch1_completed ?? false,
                      t?.touch2_completed ?? false,
                      t?.touch3_completed ?? false,
                    ];
                    return (
                      <div key={child.id} className="px-6 py-5" style={{ borderTop: idx > 0 ? "1px solid rgba(212,175,55,0.08)" : "none" }}>
                        <p className="font-bold text-base mb-0.5" style={{ color: "#ffffff" }}>🧒 {child.child_name}</p>
                        <p className="text-sm mb-3" style={{ color: "#A9A9B8" }}>
                          {child.parentName}{child.room_name ? ` · ${child.room_name}` : ""}
                        </p>
                        <div className="flex flex-col gap-2">
                          {TOUCH_LABELS.map((label, i) => {
                            const done = vals[i];
                            return (
                              <label key={i} className="flex items-center gap-3 cursor-pointer" style={{ width: "fit-content" }}>
                                <input
                                  type="checkbox"
                                  checked={done}
                                  onChange={() => toggleTouch(child.id, (i + 1) as 1 | 2 | 3, done)}
                                  style={{ width: "16px", height: "16px", accentColor: ACCENT, cursor: "pointer", flexShrink: 0 }}
                                />
                                <span className="text-sm" style={{ color: done ? "#4ade80" : "#D8D8E8", textDecoration: done ? "line-through" : "none" }}>
                                  {label}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </section>
      </div>

      {/* Welcome Letter Modal */}
      {modalFamily && modalSession && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "20px" }}
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.3)", borderRadius: "20px", width: "100%", maxWidth: "580px", maxHeight: "90vh", overflowY: "auto", padding: "28px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <h2 style={{ color: "#ffffff", fontWeight: 700, fontSize: "18px", fontFamily: "Georgia, serif", margin: 0 }}>Welcome Letter</h2>
              <button onClick={closeModal} style={{ background: "none", border: "none", color: "#A9A9B8", cursor: "pointer", fontSize: "20px", lineHeight: 1 }}>✕</button>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <p style={{ color: "#A9A9B8", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>To</p>
              <p style={{ color: "#D8D8E8", fontSize: "14px", margin: 0 }}>{modalFamily.parentName} · {modalFamily.parentPhone}</p>
              {modalFamily.parentEmail ? (
                <p style={{ color: "#D4AF37", fontSize: "12px", margin: "3px 0 0" }}>{modalFamily.parentEmail}</p>
              ) : (
                <p style={{ color: "#f87171", fontSize: "12px", margin: "6px 0 0", padding: "8px 12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px" }}>
                  ⚠️ No email address on file. You can use <strong>Mark as Sent</strong> to log this follow-up as complete.
                </p>
              )}
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label style={{ color: "#A9A9B8", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>Subject</label>
              <input
                value={modalSubject}
                onChange={e => setModalSubject(e.target.value)}
                style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: "10px", color: "#ffffff", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ color: "#A9A9B8", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>Message</label>
              <textarea
                value={modalBody}
                onChange={e => setModalBody(e.target.value)}
                rows={11}
                style={{ width: "100%", padding: "12px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: "10px", color: "#D8D8E8", fontSize: "13px", outline: "none", resize: "vertical", lineHeight: 1.75, boxSizing: "border-box", fontFamily: "Georgia, serif" }}
              />
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button
                onClick={closeModal}
                style={{ padding: "10px 20px", background: "transparent", border: "1px solid rgba(212,175,55,0.3)", borderRadius: "10px", color: "#A9A9B8", fontSize: "14px", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={() => sendFollowup("marked")}
                disabled={modalSending}
                style={{ padding: "10px 20px", background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.35)", borderRadius: "10px", color: "#D4AF37", fontSize: "14px", fontWeight: 600, cursor: modalSending ? "not-allowed" : "pointer", opacity: modalSending ? 0.7 : 1 }}
              >
                {modalSending ? "Saving…" : "✓ Mark as Sent"}
              </button>
              {modalFamily.parentEmail && (
                <button
                  onClick={() => sendFollowup("email")}
                  disabled={modalSending}
                  style={{ padding: "10px 20px", background: ACCENT, border: "none", borderRadius: "10px", color: "#ffffff", fontSize: "14px", fontWeight: 700, cursor: modalSending ? "not-allowed" : "pointer", opacity: modalSending ? 0.7 : 1 }}
                >
                  {modalSending ? "Sending…" : "📧 Send Email"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
