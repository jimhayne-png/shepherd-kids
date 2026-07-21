"use client";

import { useEffect, useState, type ReactNode, type CSSProperties } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/layout/AppShell";
import { isAdminRole } from "@/lib/staff-permissions";

const supabase = createClient();

const GOLD = "#D4AF37";
const ACCENT = "#7B2CBF";
const ACCENT2 = "#9D4EDD";
const CARD = "#120A1F";
const MUTED = "#A9A9B8";
const BODY = "#D8D8E8";
const WARN = "#fbbf24";

const LABEL_STYLE: CSSProperties = { fontSize: "11px", fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 };
const EMPTY_STYLE: CSSProperties = { fontSize: "12px", color: MUTED, margin: 0, fontStyle: "italic" };
const TEXTAREA_STYLE: CSSProperties = { width: "100%", padding: "8px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: "8px", fontSize: "13px", color: "#ffffff", outline: "none", resize: "vertical", boxSizing: "border-box" };
const PRIMARY_BTN: CSSProperties = { padding: "6px 14px", borderRadius: "8px", border: "none", cursor: "pointer", background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`, color: "#ffffff", fontSize: "12px", fontWeight: 700 };
const SECONDARY_BTN: CSSProperties = { padding: "6px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.15)", cursor: "pointer", background: "transparent", color: MUTED, fontSize: "12px", fontWeight: 600 };
const LINK_BTN: CSSProperties = { fontSize: "12px", color: ACCENT2, background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 600 };
const LINK_BTN_MUTED: CSSProperties = { fontSize: "12px", color: MUTED, background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 600 };
const ITEM_CARD: CSSProperties = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(212,175,55,0.12)", borderRadius: "10px", padding: "12px 14px" };
const META_STYLE: CSSProperties = { fontSize: "11px", color: MUTED };

const STATUS_META: Record<string, { label: string; bg: string; text: string }> = {
  new:       { label: "New",       bg: "rgba(59,130,246,0.15)",  text: "#60a5fa" },
  contacted: { label: "Contacted", bg: "rgba(245,158,11,0.15)",  text: "#fbbf24" },
  returning: { label: "Returning", bg: "rgba(157,78,221,0.2)",   text: "#c084fc" },
  converted: { label: "Converted", bg: "rgba(34,197,94,0.15)",   text: "#4ade80" },
};

type VisitorFamily = {
  id: string;
  parent1_first_name: string;
  parent1_last_name: string;
  parent1_email: string | null;
  parent1_phone: string | null;
  parent2_first_name: string | null;
  parent2_last_name: string | null;
  parent2_email: string | null;
  parent2_phone: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  how_did_you_hear: string | null;
  visit_date: string | null;
  follow_up_sent: boolean;
  follow_up_sent_at: string | null;
  next_day_sent: boolean;
  next_day_sent_at: string | null;
  notes: string | null;
  status: string;
  created_at: string;
};

type VisitorChild = {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  grade: string | null;
  allergies: string | null;
  medical_notes: string | null;
  special_instructions: string | null;
};

type FamilyCheckin = {
  id: string;
  child_name: string;
  checked_in_at: string;
  service_name: string | null;
  session_date: string | null;
  room_id: string | null;
};

function calcAge(dob: string): number {
  const d = new Date(dob + "T00:00:00");
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  if (today.getMonth() < d.getMonth() || (today.getMonth() === d.getMonth() && today.getDate() < d.getDate())) age--;
  return age;
}

function fmtDateShort(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function SectionCard({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
  return (
    <div style={{ background: CARD, border: "1px solid rgba(212,175,55,0.22)", borderRadius: "16px", overflow: "hidden" }}>
      <div style={{ padding: "16px 24px", borderBottom: "1px solid rgba(212,175,55,0.12)", display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ fontSize: "18px" }}>{icon}</span>
        <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#ffffff", margin: 0, fontFamily: "Georgia, serif" }}>{title}</h2>
      </div>
      <div style={{ padding: "20px 24px" }}>{children}</div>
    </div>
  );
}

function AdultCard({ firstName, lastName, role, phone, email, isAuthorizedPickup }: {
  firstName: string; lastName: string; role: string;
  phone: string | null; email: string | null; isAuthorizedPickup?: boolean;
}) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(212,175,55,0.15)", borderRadius: "14px", padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
        <div style={{
          width: "44px", height: "44px", borderRadius: "50%", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "15px", fontWeight: 700, color: "#ffffff",
          background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`,
        }}>
          {firstName[0]}{lastName[0]}
        </div>
        <div>
          <p style={{ fontWeight: 700, color: "#ffffff", fontSize: "14px", margin: 0 }}>{firstName} {lastName}</p>
          <div style={{ display: "flex", gap: "6px", marginTop: "3px", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "11px", color: MUTED, fontWeight: 600 }}>{role}</span>
            {isAuthorizedPickup && (
              <span style={{ fontSize: "11px", padding: "1px 7px", borderRadius: "20px", fontWeight: 700, color: "#4ade80", backgroundColor: "rgba(34,197,94,0.12)" }}>
                Authorized Pickup
              </span>
            )}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {phone && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px" }}>📱</span>
            <span style={{ fontSize: "13px", color: BODY }}>{phone}</span>
          </div>
        )}
        {email && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px" }}>✉️</span>
            <span style={{ fontSize: "13px", color: BODY }}>{email}</span>
          </div>
        )}
        {!phone && !email && (
          <p style={{ fontSize: "12px", color: MUTED, margin: 0, fontStyle: "italic" }}>No contact info on file.</p>
        )}
      </div>
    </div>
  );
}

function ChildCard({ child }: { child: VisitorChild }) {
  const age = child.date_of_birth ? calcAge(child.date_of_birth) : null;
  return (
    <Link href={`/dashboard/children-ministry/children/${child.id}`} style={{ textDecoration: "none", display: "block" }}>
      <div
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(212,175,55,0.15)", borderRadius: "14px", padding: "18px 20px", cursor: "pointer" }}
        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(123,44,191,0.5)"}
        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(212,175,55,0.15)"}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
          <div style={{
            width: "40px", height: "40px", borderRadius: "50%", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "14px", fontWeight: 700, color: "#ffffff",
            background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`,
          }}>
            {child.first_name[0]}{child.last_name[0]}
          </div>
          <div>
            <p style={{ fontWeight: 700, color: "#ffffff", fontSize: "14px", margin: 0 }}>{child.first_name} {child.last_name}</p>
            {age !== null && (
              <p style={{ fontSize: "12px", color: MUTED, margin: "2px 0 0" }}>
                Age {age}{child.grade ? ` · ${child.grade}` : ""}
              </p>
            )}
          </div>
        </div>
        {child.date_of_birth && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
            <span style={{ fontSize: "12px" }}>🎂</span>
            <span style={{ fontSize: "12px", color: MUTED }}>
              {new Date(child.date_of_birth + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" })}
            </span>
          </div>
        )}
        {child.allergies && (
          <div style={{ fontSize: "12px", fontWeight: 700, color: "#ffffff", padding: "4px 10px", borderRadius: "7px", backgroundColor: "#dc2626", marginTop: "6px", display: "inline-block" }}>
            ⚠️ {child.allergies}
          </div>
        )}
        {child.medical_notes && (
          <p style={{ fontSize: "12px", color: "#fbbf24", margin: "4px 0 0" }}>🏥 {child.medical_notes}</p>
        )}
        <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "4px" }}>
          <span style={{ fontSize: "12px", color: ACCENT2, fontWeight: 600 }}>View Profile →</span>
          <span style={{ fontSize: "11px", color: GOLD, fontWeight: 600 }}>🎉 View Celebration Timeline →</span>
        </div>
      </div>
    </Link>
  );
}

// ── Family Care sub-sections ─────────────────────────────────────────────────

type CareNote = {
  id: string; note_text: string; created_by: string; created_by_name: string | null;
  created_at: string; updated_at: string | null;
};

type PrayerRequest = {
  id: string; request_text: string; status: "active" | "answered" | "archived";
  created_by: string; created_by_name: string | null;
  created_at: string; updated_at: string | null; answered_at: string | null;
};

type LeaderAssignment = {
  id: string; leader_user_id: string; leader_name: string | null;
  assigned_by: string; assigned_by_name: string | null; assigned_at: string;
};

type EligibleStaff = { userId: string; name: string; role: string };

function authHeaders(token: string) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

function CareNotesSection({ familyId, token, initialNotes }: { familyId: string; token: string; initialNotes: CareNote[] }) {
  const [notes, setNotes] = useState<CareNote[]>(initialNotes);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const base = `/api/children-ministry/parents/${familyId}/care-notes`;

  async function handleAdd() {
    if (!draft.trim()) return;
    setSaving(true);
    const res = await fetch(base, { method: "POST", headers: authHeaders(token), body: JSON.stringify({ noteText: draft.trim() }) });
    if (res.ok) {
      const { note } = await res.json();
      setNotes(n => [note, ...n]);
      setDraft("");
      setAdding(false);
    }
    setSaving(false);
  }

  async function handleEdit(id: string) {
    if (!editDraft.trim()) return;
    const res = await fetch(`${base}/${id}`, { method: "PATCH", headers: authHeaders(token), body: JSON.stringify({ noteText: editDraft.trim() }) });
    if (res.ok) {
      setNotes(ns => ns.map(n => n.id === id ? { ...n, note_text: editDraft.trim() } : n));
      setEditingId(null);
    }
  }

  async function handleArchive(id: string) {
    if (!confirm("Archive this care note?")) return;
    const res = await fetch(`${base}/${id}`, { method: "PATCH", headers: authHeaders(token), body: JSON.stringify({ archive: true }) });
    if (res.ok) setNotes(ns => ns.filter(n => n.id !== id));
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
        <p style={LABEL_STYLE}>Care Notes</p>
        {!adding && <button onClick={() => setAdding(true)} style={LINK_BTN}>+ Add Care Note</button>}
      </div>
      {adding && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "10px" }}>
          <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={3} placeholder="Add a care note…" style={TEXTAREA_STYLE} />
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={handleAdd} disabled={saving} style={{ ...PRIMARY_BTN, opacity: saving ? 0.5 : 1 }}>{saving ? "Saving…" : "Save"}</button>
            <button onClick={() => { setAdding(false); setDraft(""); }} style={SECONDARY_BTN}>Cancel</button>
          </div>
        </div>
      )}
      {notes.length === 0 && !adding ? (
        <p style={EMPTY_STYLE}>No care notes have been added.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {notes.map(note => (
            <div key={note.id} style={ITEM_CARD}>
              {editingId === note.id ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <textarea value={editDraft} onChange={e => setEditDraft(e.target.value)} rows={3} style={TEXTAREA_STYLE} />
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={() => handleEdit(note.id)} style={PRIMARY_BTN}>Save</button>
                    <button onClick={() => setEditingId(null)} style={SECONDARY_BTN}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: "13px", color: BODY, margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{note.note_text}</p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "8px" }}>
                    <span style={META_STYLE}>{note.created_by_name ?? "Unknown"} · {fmtDateTime(note.created_at)}</span>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button onClick={() => { setEditingId(note.id); setEditDraft(note.note_text); }} style={LINK_BTN}>Edit</button>
                      <button onClick={() => handleArchive(note.id)} style={LINK_BTN_MUTED}>Archive</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const PRAYER_STATUS_META: Record<string, { label: string; bg: string; text: string }> = {
  active:   { label: "Active",   bg: "rgba(157,78,221,0.2)",  text: "#c084fc" },
  answered: { label: "Answered", bg: "rgba(34,197,94,0.15)",  text: "#4ade80" },
  archived: { label: "Archived", bg: "rgba(255,255,255,0.08)", text: MUTED },
};

function PrayerRequestsSection({ familyId, token, initialRequests }: { familyId: string; token: string; initialRequests: PrayerRequest[] }) {
  const [requests, setRequests] = useState<PrayerRequest[]>(initialRequests);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const base = `/api/children-ministry/parents/${familyId}/prayer-requests`;
  const statusOrder: Record<string, number> = { active: 0, answered: 1, archived: 2 };
  const sorted = [...requests].sort((a, b) => {
    const so = statusOrder[a.status] - statusOrder[b.status];
    return so !== 0 ? so : b.created_at.localeCompare(a.created_at);
  });

  async function handleAdd() {
    if (!draft.trim()) return;
    setSaving(true);
    const res = await fetch(base, { method: "POST", headers: authHeaders(token), body: JSON.stringify({ requestText: draft.trim() }) });
    if (res.ok) {
      const { request } = await res.json();
      setRequests(r => [request, ...r]);
      setDraft("");
      setAdding(false);
    }
    setSaving(false);
  }

  async function handleStatus(id: string, status: "answered" | "archived") {
    const res = await fetch(`${base}/${id}`, { method: "PATCH", headers: authHeaders(token), body: JSON.stringify({ status }) });
    if (res.ok) {
      setRequests(rs => rs.map(r => r.id === id ? { ...r, status, answered_at: status === "answered" ? new Date().toISOString() : r.answered_at } : r));
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
        <p style={LABEL_STYLE}>Prayer Requests</p>
        {!adding && <button onClick={() => setAdding(true)} style={LINK_BTN}>+ Add Prayer Request</button>}
      </div>
      {adding && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "10px" }}>
          <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={3} placeholder="Add a prayer request…" style={TEXTAREA_STYLE} />
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={handleAdd} disabled={saving} style={{ ...PRIMARY_BTN, opacity: saving ? 0.5 : 1 }}>{saving ? "Saving…" : "Save"}</button>
            <button onClick={() => { setAdding(false); setDraft(""); }} style={SECONDARY_BTN}>Cancel</button>
          </div>
        </div>
      )}
      {requests.length === 0 && !adding ? (
        <p style={EMPTY_STYLE}>No active prayer requests.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {sorted.map(reqItem => {
            const sm = PRAYER_STATUS_META[reqItem.status];
            return (
              <div key={reqItem.id} style={ITEM_CARD}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <span style={{ fontSize: "11px", padding: "2px 9px", borderRadius: "20px", fontWeight: 700, backgroundColor: sm.bg, color: sm.text }}>{sm.label}</span>
                </div>
                <p style={{ fontSize: "13px", color: BODY, margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{reqItem.request_text}</p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "8px" }}>
                  <span style={META_STYLE}>{reqItem.created_by_name ?? "Unknown"} · {fmtDateTime(reqItem.created_at)}</span>
                  <div style={{ display: "flex", gap: "10px" }}>
                    {reqItem.status === "active" && <button onClick={() => handleStatus(reqItem.id, "answered")} style={LINK_BTN}>Mark Answered</button>}
                    {reqItem.status !== "archived" && <button onClick={() => handleStatus(reqItem.id, "archived")} style={LINK_BTN_MUTED}>Archive</button>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AssignedLeaderSection({
  familyId, token, canAssign, initialAssignment, eligibleStaff,
}: {
  familyId: string; token: string; canAssign: boolean;
  initialAssignment: LeaderAssignment | null; eligibleStaff: EligibleStaff[];
}) {
  const [assignment, setAssignment] = useState<LeaderAssignment | null>(initialAssignment);
  const [picking, setPicking] = useState(false);
  const [selected, setSelected] = useState("");
  const [saving, setSaving] = useState(false);

  const base = `/api/children-ministry/parents/${familyId}/leader`;

  async function handleAssign() {
    if (!selected) return;
    setSaving(true);
    const res = await fetch(base, { method: "PUT", headers: authHeaders(token), body: JSON.stringify({ leaderUserId: selected }) });
    if (res.ok) {
      const { assignment: a } = await res.json();
      setAssignment(a);
      setPicking(false);
      setSelected("");
    }
    setSaving(false);
  }

  async function handleRemove() {
    if (!confirm("Remove the assigned leader from this family?")) return;
    const res = await fetch(base, { method: "DELETE", headers: authHeaders(token) });
    if (res.ok) setAssignment(null);
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
        <p style={LABEL_STYLE}>Assigned Leader</p>
        {canAssign && !picking && (
          <button onClick={() => setPicking(true)} style={LINK_BTN}>{assignment ? "Change" : "Assign Leader"}</button>
        )}
      </div>
      {picking && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "10px" }}>
          <select
            value={selected}
            onChange={e => setSelected(e.target.value)}
            style={{ width: "100%", padding: "7px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: "8px", fontSize: "13px", color: "#ffffff", outline: "none" }}
          >
            <option value="" style={{ background: "#ffffff", color: "#000000" }}>Select a ministry leader…</option>
            {eligibleStaff.map(s => (
              <option key={s.userId} value={s.userId} style={{ background: "#ffffff", color: "#000000" }}>{s.name}</option>
            ))}
          </select>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={handleAssign} disabled={saving || !selected} style={{ ...PRIMARY_BTN, opacity: saving || !selected ? 0.5 : 1 }}>{saving ? "Saving…" : "Save"}</button>
            <button onClick={() => { setPicking(false); setSelected(""); }} style={SECONDARY_BTN}>Cancel</button>
          </div>
        </div>
      )}
      {!assignment && !picking ? (
        <p style={EMPTY_STYLE}>No ministry leader assigned.</p>
      ) : assignment && !picking ? (
        <div style={ITEM_CARD}>
          <p style={{ fontSize: "13px", color: BODY, margin: 0, fontWeight: 700 }}>{assignment.leader_name ?? "Unknown"}</p>
          <p style={META_STYLE}>Assigned {fmtDateTime(assignment.assigned_at)}{assignment.assigned_by_name ? ` by ${assignment.assigned_by_name}` : ""}</p>
          {canAssign && (
            <button onClick={handleRemove} style={{ ...LINK_BTN_MUTED, marginTop: "8px" }}>Remove Assignment</button>
          )}
        </div>
      ) : null}
    </div>
  );
}

type SensitiveNote = {
  id: string; note_text: string; created_by: string; created_by_name: string | null;
  created_at: string; updated_at: string | null;
};

function SensitiveNotesSection({ familyId, token, initialNotes }: { familyId: string; token: string; initialNotes: SensitiveNote[] }) {
  const [notes, setNotes] = useState<SensitiveNote[]>(initialNotes);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const base = `/api/children-ministry/parents/${familyId}/sensitive-notes`;

  async function handleAdd() {
    if (!draft.trim()) return;
    setSaving(true);
    const res = await fetch(base, { method: "POST", headers: authHeaders(token), body: JSON.stringify({ noteText: draft.trim() }) });
    if (res.ok) {
      const { note } = await res.json();
      setNotes(n => [note, ...n]);
      setDraft("");
      setAdding(false);
    }
    setSaving(false);
  }

  async function handleEdit(id: string) {
    if (!editDraft.trim()) return;
    const res = await fetch(`${base}/${id}`, { method: "PATCH", headers: authHeaders(token), body: JSON.stringify({ noteText: editDraft.trim() }) });
    if (res.ok) {
      setNotes(ns => ns.map(n => n.id === id ? { ...n, note_text: editDraft.trim() } : n));
      setEditingId(null);
    }
  }

  async function handleArchive(id: string) {
    if (!confirm("Archive this sensitive note?")) return;
    const res = await fetch(`${base}/${id}`, { method: "PATCH", headers: authHeaders(token), body: JSON.stringify({ archive: true }) });
    if (res.ok) setNotes(ns => ns.filter(n => n.id !== id));
  }

  return (
    <div style={{ border: "1px solid rgba(245,158,11,0.35)", borderRadius: "12px", padding: "14px", background: "rgba(245,158,11,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
        <p style={{ ...LABEL_STYLE, color: WARN }}>⚠️ Sensitive Family Notes</p>
        {!adding && <button onClick={() => setAdding(true)} style={LINK_BTN}>+ Add Sensitive Note</button>}
      </div>
      <p style={{ fontSize: "11px", color: MUTED, margin: "0 0 10px", fontStyle: "italic" }}>
        Visible only to Administrators. Never shown on kiosk, classroom, labels, or parent-facing screens.
      </p>
      {adding && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "10px" }}>
          <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={3} placeholder="Add a sensitive note…" style={TEXTAREA_STYLE} />
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={handleAdd} disabled={saving} style={{ ...PRIMARY_BTN, opacity: saving ? 0.5 : 1 }}>{saving ? "Saving…" : "Save"}</button>
            <button onClick={() => { setAdding(false); setDraft(""); }} style={SECONDARY_BTN}>Cancel</button>
          </div>
        </div>
      )}
      {notes.length === 0 && !adding ? (
        <p style={EMPTY_STYLE}>No sensitive notes recorded.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {notes.map(note => (
            <div key={note.id} style={{ ...ITEM_CARD, border: "1px solid rgba(245,158,11,0.2)" }}>
              {editingId === note.id ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <textarea value={editDraft} onChange={e => setEditDraft(e.target.value)} rows={3} style={TEXTAREA_STYLE} />
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={() => handleEdit(note.id)} style={PRIMARY_BTN}>Save</button>
                    <button onClick={() => setEditingId(null)} style={SECONDARY_BTN}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: "13px", color: BODY, margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{note.note_text}</p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "8px" }}>
                    <span style={META_STYLE}>{note.created_by_name ?? "Unknown"} · {fmtDateTime(note.created_at)}</span>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button onClick={() => { setEditingId(note.id); setEditDraft(note.note_text); }} style={LINK_BTN}>Edit</button>
                      <button onClick={() => handleArchive(note.id)} style={LINK_BTN_MUTED}>Archive</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FamilyProfilePage() {
  const params = useParams();
  const router = useRouter();
  const familyId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [family, setFamily] = useState<VisitorFamily | null>(null);
  const [children, setChildren] = useState<VisitorChild[]>([]);
  const [checkinHistory, setCheckinHistory] = useState<FamilyCheckin[]>([]);
  const [savingStatus, setSavingStatus] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [careNotes, setCareNotes] = useState<CareNote[]>([]);
  const [prayerRequests, setPrayerRequests] = useState<PrayerRequest[]>([]);
  const [leaderAssignment, setLeaderAssignment] = useState<LeaderAssignment | null>(null);
  const [eligibleStaff, setEligibleStaff] = useState<EligibleStaff[]>([]);
  const [sensitiveNotes, setSensitiveNotes] = useState<SensitiveNote[]>([]);

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
      const headers = { Authorization: `Bearer ${t}` };
      const [familyRes, careRes, prayerRes, leaderRes] = await Promise.all([
        fetch(`/api/children-ministry/parents/${familyId}`, { headers }),
        fetch(`/api/children-ministry/parents/${familyId}/care-notes`, { headers }),
        fetch(`/api/children-ministry/parents/${familyId}/prayer-requests`, { headers }),
        fetch(`/api/children-ministry/parents/${familyId}/leader`, { headers }),
      ]);
      if (!familyRes.ok) { setLoading(false); return; }
      const d = await familyRes.json();
      setFamily(d.family);
      setChildren(d.children ?? []);
      setCheckinHistory(d.checkinHistory ?? []);
      const role = d.role ?? "";
      setUserRole(role);
      if (careRes.ok) setCareNotes((await careRes.json()).notes ?? []);
      if (prayerRes.ok) setPrayerRequests((await prayerRes.json()).requests ?? []);
      if (leaderRes.ok) {
        const ld = await leaderRes.json();
        setLeaderAssignment(ld.assignment ?? null);
        setEligibleStaff(ld.eligibleStaff ?? []);
      }
      if (isAdminRole(role)) {
        const sensitiveRes = await fetch(`/api/children-ministry/parents/${familyId}/sensitive-notes`, { headers });
        if (sensitiveRes.ok) setSensitiveNotes((await sensitiveRes.json()).notes ?? []);
      }
      setLoading(false);
    }
    init();
  }, [familyId]);

  async function handleStatusChange(newStatus: string) {
    if (!token || !family) return;
    setSavingStatus(true);
    await fetch(`/api/children-ministry/parents/${familyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: newStatus }),
    });
    setFamily(f => f ? { ...f, status: newStatus } : f);
    setSavingStatus(false);
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#08060D" }}>
      <div style={{ color: BODY }}>Loading…</div>
    </div>
  );

  if (!family) return (
    <AppShell navItems={[]}>
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#08060D" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#ffffff", fontSize: "18px", fontWeight: 700, margin: 0 }}>Family not found</p>
          <button onClick={() => router.push("/dashboard/children-ministry/parents")} style={{ marginTop: "16px", color: ACCENT2, background: "none", border: "none", cursor: "pointer", fontSize: "14px" }}>
            ← Back to Families
          </button>
        </div>
      </div>
    </AppShell>
  );

  const sm = STATUS_META[family.status] ?? { label: family.status, bg: "rgba(255,255,255,0.08)", text: MUTED };
  const lastContactDate = family.follow_up_sent_at && family.next_day_sent_at
    ? (new Date(family.follow_up_sent_at) > new Date(family.next_day_sent_at) ? family.follow_up_sent_at : family.next_day_sent_at)
    : (family.follow_up_sent_at ?? family.next_day_sent_at ?? null);
  const needsFollowUp = !family.follow_up_sent && !family.next_day_sent && family.status === "new";

  // Group check-in records by visit (session_date) for the summary display
  const visitGroups: Record<string, { session_date: string | null; service_name: string | null; children: string[] }> = {};
  for (const c of checkinHistory) {
    const key = c.session_date ?? c.checked_in_at.slice(0, 10);
    if (!visitGroups[key]) visitGroups[key] = { session_date: c.session_date, service_name: c.service_name, children: [] };
    if (!visitGroups[key].children.includes(c.child_name)) visitGroups[key].children.push(c.child_name);
  }
  const visitList = Object.entries(visitGroups)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 12);

  return (
    <AppShell navItems={[]}>
      {/* Hero Header */}
      <div style={{ padding: "32px 32px 28px", background: "linear-gradient(135deg, #08060D 0%, #1C0A30 60%, #08060D 100%)", borderBottom: "1px solid rgba(212,175,55,0.15)" }}>
        {/* Breadcrumb */}
        <button
          onClick={() => router.push("/dashboard/children-ministry/parents")}
          style={{ background: "none", border: "none", cursor: "pointer", color: MUTED, fontSize: "13px", padding: 0, marginBottom: "16px", display: "flex", alignItems: "center", gap: "5px" }}
        >
          ← Families
        </button>

        <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: GOLD, textTransform: "uppercase", margin: "0 0 12px" }}>
          ShepherdKids · Household Record
        </p>

        {/* Avatar + Name */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "20px", flexWrap: "wrap" }}>
          <div style={{
            width: "72px", height: "72px", borderRadius: "50%", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "26px", fontWeight: 900, color: "#ffffff",
            background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`,
            border: "2px solid rgba(212,175,55,0.35)",
            boxShadow: "0 0 24px rgba(123,44,191,0.4)",
          }}>
            {family.parent1_last_name[0].toUpperCase()}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: "30px", fontWeight: 700, color: "#ffffff", margin: 0, fontFamily: "Georgia, serif" }}>
              {family.parent1_last_name} Family
            </h1>

            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px", marginTop: "10px" }}>
              <span style={{ fontSize: "12px", padding: "3px 12px", borderRadius: "20px", fontWeight: 700, backgroundColor: sm.bg, color: sm.text }}>
                {sm.label}
              </span>
              <span style={{ fontSize: "12px", padding: "3px 12px", borderRadius: "20px", fontWeight: 600, backgroundColor: "rgba(157,78,221,0.15)", color: "#c084fc" }}>
                🧒 {children.length} {children.length === 1 ? "Child" : "Children"}
              </span>
              {needsFollowUp && (
                <span style={{ fontSize: "12px", padding: "3px 12px", borderRadius: "20px", fontWeight: 700, backgroundColor: "rgba(245,158,11,0.15)", color: "#fbbf24" }}>
                  ⚡ Needs Follow-Up
                </span>
              )}
              {family.notes && (
                <span style={{ fontSize: "12px", padding: "3px 12px", borderRadius: "20px", fontWeight: 600, backgroundColor: "rgba(239,68,68,0.15)", color: "#f87171" }}>
                  ❤️ Care Note
                </span>
              )}
              {family.visit_date && (
                <span style={{ fontSize: "12px", color: MUTED }}>First visit {fmtDateShort(family.visit_date)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "24px" }}>
          {[
            { icon: "📧", label: "Email Family" },
            { icon: "🏷", label: "Print Pickup Labels" },
            { icon: "🎉", label: "View Celebrations" },
            { icon: "🌱", label: "View Faith Journey" },
            { icon: "❤️", label: "Add Care Note" },
          ].map(({ icon, label }) => (
            <button
              key={label}
              style={{
                padding: "8px 16px",
                borderRadius: "10px",
                border: "1px solid rgba(212,175,55,0.25)",
                background: "rgba(255,255,255,0.04)",
                color: BODY,
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ backgroundColor: "#0A0814", minHeight: "100vh", padding: "32px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

          {/* Section 1: Household Members */}
          <SectionCard title="Household Members" icon="👥">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "14px" }}>
              <AdultCard
                firstName={family.parent1_first_name}
                lastName={family.parent1_last_name}
                role="Parent"
                phone={family.parent1_phone}
                email={family.parent1_email}
              />
              {family.parent2_first_name && (
                <AdultCard
                  firstName={family.parent2_first_name}
                  lastName={family.parent2_last_name ?? ""}
                  role="Parent"
                  phone={family.parent2_phone}
                  email={family.parent2_email}
                />
              )}
              <div
                style={{
                  border: "1px dashed rgba(212,175,55,0.2)",
                  borderRadius: "14px",
                  padding: "24px 20px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  cursor: "pointer",
                  minHeight: "120px",
                }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(123,44,191,0.5)"}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(212,175,55,0.2)"}
              >
                <span style={{ fontSize: "20px", color: MUTED }}>+</span>
                <span style={{ fontSize: "12px", color: MUTED, textAlign: "center" }}>
                  Add Guardian, Grandparent,<br />or Authorized Pickup
                </span>
              </div>
            </div>
          </SectionCard>

          {/* Section 2: ShepherdKids */}
          <SectionCard title="ShepherdKids" icon="🧒">
            {children.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <div style={{ fontSize: "36px", marginBottom: "10px" }}>🧒</div>
                <p style={{ color: MUTED, fontSize: "13px", margin: 0 }}>No children linked to this family yet.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "14px" }}>
                {children.map(child => <ChildCard key={child.id} child={child} />)}
              </div>
            )}
          </SectionCard>

          {/* Row: Family Care + Parent Communication */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>

            {/* Section 3: Family Care */}
            <div style={{ background: CARD, border: "1px solid rgba(212,175,55,0.22)", borderRadius: "16px", overflow: "hidden" }}>
              <div style={{ padding: "16px 24px", borderBottom: "1px solid rgba(212,175,55,0.12)", display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "18px" }}>❤️</span>
                <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#ffffff", margin: 0, fontFamily: "Georgia, serif" }}>Family Care</h2>
              </div>
              <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "20px" }}>

                {/* Follow-Up Status */}
                <div>
                  <p style={{ fontSize: "11px", fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>Follow-Up Status</p>
                  <select
                    value={family.status}
                    onChange={e => handleStatusChange(e.target.value)}
                    disabled={savingStatus}
                    style={{ width: "100%", padding: "7px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: "8px", fontSize: "13px", color: "#ffffff", outline: "none", cursor: "pointer" }}
                  >
                    <option value="new" style={{ background: "#ffffff", color: "#000000" }}>New</option>
                    <option value="contacted" style={{ background: "#ffffff", color: "#000000" }}>Contacted</option>
                    <option value="returning" style={{ background: "#ffffff", color: "#000000" }}>Returning</option>
                    <option value="converted" style={{ background: "#ffffff", color: "#000000" }}>Converted</option>
                  </select>
                </div>

                {/* Care Notes */}
                {token && (
                  <CareNotesSection familyId={familyId} token={token} initialNotes={careNotes} />
                )}

                {/* Prayer Requests */}
                {token && (
                  <PrayerRequestsSection familyId={familyId} token={token} initialRequests={prayerRequests} />
                )}

                {/* Assigned Leader */}
                {token && (
                  <AssignedLeaderSection
                    familyId={familyId}
                    token={token}
                    canAssign={isAdminRole(userRole)}
                    initialAssignment={leaderAssignment}
                    eligibleStaff={eligibleStaff}
                  />
                )}

                {/* Sensitive Notes */}
                {token && isAdminRole(userRole) && (
                  <SensitiveNotesSection familyId={familyId} token={token} initialNotes={sensitiveNotes} />
                )}
              </div>
            </div>

            {/* Section 4: Parent Communication */}
            <div style={{ background: CARD, border: "1px solid rgba(212,175,55,0.22)", borderRadius: "16px", overflow: "hidden" }}>
              <div style={{ padding: "16px 24px", borderBottom: "1px solid rgba(212,175,55,0.12)", display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "18px" }}>💬</span>
                <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#ffffff", margin: 0, fontFamily: "Georgia, serif" }}>Parent Communication</h2>
              </div>
              <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "20px", height: "calc(100% - 57px)", boxSizing: "border-box" }}>

                {/* Last Email Sent */}
                <div>
                  <p style={{ fontSize: "11px", fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>Last Email Sent</p>
                  {lastContactDate ? (
                    <p style={{ fontSize: "13px", color: BODY, margin: 0 }}>{fmtDateTime(lastContactDate)}</p>
                  ) : (
                    <p style={{ fontSize: "12px", color: MUTED, margin: 0, fontStyle: "italic" }}>No email sent yet.</p>
                  )}
                </div>

                {/* Follow-up status */}
                <div>
                  <p style={{ fontSize: "11px", fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>Follow-Up Emails</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {[
                      { sent: family.follow_up_sent, label: "Follow-up email" },
                      { sent: family.next_day_sent, label: "Next-day email" },
                    ].map(({ sent, label }) => (
                      <div key={label} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: sent ? "#4ade80" : "#f87171", flexShrink: 0 }} />
                        <span style={{ fontSize: "13px", color: BODY }}>{label} — {sent ? "sent" : "not sent"}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Parent Update Needed */}
                {needsFollowUp && (
                  <div style={{ padding: "10px 14px", borderRadius: "10px", backgroundColor: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)" }}>
                    <p style={{ fontSize: "13px", fontWeight: 700, color: "#fbbf24", margin: 0 }}>⚡ Parent Update Needed</p>
                    <p style={{ fontSize: "12px", color: MUTED, margin: "3px 0 0" }}>This family has not been contacted yet.</p>
                  </div>
                )}

                {/* Last Newsletter */}
                <div>
                  <p style={{ fontSize: "11px", fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>Last Newsletter</p>
                  <p style={{ fontSize: "12px", color: MUTED, margin: 0, fontStyle: "italic" }}>Newsletter history coming soon.</p>
                </div>

                {/* How did you hear */}
                {family.how_did_you_hear && (
                  <div>
                    <p style={{ fontSize: "11px", fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>How They Found Us</p>
                    <p style={{ fontSize: "13px", color: BODY, margin: 0 }}>{family.how_did_you_hear}</p>
                  </div>
                )}

                {/* Communication History placeholder */}
                <div>
                  <p style={{ fontSize: "11px", fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>Communication History</p>
                  <p style={{ fontSize: "12px", color: MUTED, margin: 0, fontStyle: "italic" }}>Full history coming soon.</p>
                </div>

                {/* Send button */}
                <button
                  style={{
                    marginTop: "auto",
                    padding: "10px 20px",
                    borderRadius: "10px",
                    border: "none",
                    cursor: "pointer",
                    background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`,
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 700,
                  }}
                >
                  📧 Send Parent Communication
                </button>
              </div>
            </div>
          </div>

          {/* Section 5: Check-In History */}
          <SectionCard title="Check-In History" icon="📋">
            {visitList.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <div style={{ fontSize: "36px", marginBottom: "10px" }}>📋</div>
                <p style={{ color: MUTED, fontSize: "13px", margin: 0 }}>No check-in records for this family yet.</p>
              </div>
            ) : (
              <>
                {/* Stats */}
                <div style={{ display: "flex", gap: "32px", marginBottom: "20px", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: "32px", fontWeight: 900, color: ACCENT2, lineHeight: 1 }}>{visitList.length}</div>
                    <div style={{ fontSize: "11px", color: MUTED, marginTop: "2px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Visits</div>
                  </div>
                  {family.visit_date && (
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 700, color: "#ffffff", lineHeight: 1.3 }}>{fmtDateShort(family.visit_date)}</div>
                      <div style={{ fontSize: "11px", color: MUTED, marginTop: "2px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>First Visit</div>
                    </div>
                  )}
                </div>

                {/* Visit list */}
                <div>
                  {visitList.map(([key, visit], idx) => (
                    <div
                      key={key}
                      style={{
                        padding: "12px 0",
                        borderTop: idx > 0 ? "1px solid rgba(212,175,55,0.08)" : "none",
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                      }}
                    >
                      {/* Date badge */}
                      <div style={{
                        width: "48px", height: "48px", borderRadius: "10px", flexShrink: 0,
                        background: "rgba(123,44,191,0.2)", border: "1px solid rgba(123,44,191,0.3)",
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      }}>
                        {visit.session_date ? (
                          <>
                            <span style={{ fontSize: "15px", fontWeight: 900, color: "#c084fc", lineHeight: 1 }}>
                              {new Date(visit.session_date + "T00:00:00").getDate()}
                            </span>
                            <span style={{ fontSize: "9px", color: MUTED, fontWeight: 600, textTransform: "uppercase", lineHeight: 1.2, marginTop: "1px" }}>
                              {new Date(visit.session_date + "T00:00:00").toLocaleDateString("en-US", { month: "short" })}
                            </span>
                          </>
                        ) : (
                          <span style={{ fontSize: "11px", color: MUTED }}>—</span>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 600, color: "#ffffff", fontSize: "13px", margin: 0 }}>
                          {visit.service_name ?? "Service"}
                        </p>
                        <p style={{ fontSize: "12px", color: MUTED, margin: "3px 0 0" }}>
                          {visit.children.join(", ")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </SectionCard>

          {/* Section 6: Household Settings */}
          <SectionCard title="Household Settings" icon="🏠">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              {/* Left column */}
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* Address */}
                <div>
                  <p style={{ fontSize: "11px", fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>Address</p>
                  {family.address ? (
                    <p style={{ fontSize: "13px", color: BODY, margin: 0, lineHeight: 1.6 }}>{family.address}</p>
                  ) : (
                    <p style={{ fontSize: "12px", color: MUTED, margin: 0, fontStyle: "italic" }}>No address on file.</p>
                  )}
                </div>

                {/* Preferred Language */}
                <div>
                  <p style={{ fontSize: "11px", fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>Preferred Language</p>
                  <div style={{ padding: "8px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,175,55,0.15)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "13px", color: BODY }}>English</span>
                    <span style={{ fontSize: "11px", color: MUTED, fontStyle: "italic" }}>default</span>
                  </div>
                  <p style={{ fontSize: "11px", color: MUTED, margin: "5px 0 0", fontStyle: "italic" }}>Spanish · Chinese available soon</p>
                </div>
              </div>

              {/* Right column */}
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* Emergency Contact */}
                <div>
                  <p style={{ fontSize: "11px", fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>Emergency Contact</p>
                  {family.emergency_contact_name || family.emergency_contact_phone ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      {family.emergency_contact_name && (
                        <p style={{ fontSize: "13px", color: BODY, margin: 0 }}>{family.emergency_contact_name}</p>
                      )}
                      {family.emergency_contact_phone && (
                        <p style={{ fontSize: "13px", color: BODY, margin: 0 }}>{family.emergency_contact_phone}</p>
                      )}
                    </div>
                  ) : (
                    <p style={{ fontSize: "12px", color: MUTED, margin: 0, fontStyle: "italic" }}>No emergency contact provided</p>
                  )}
                </div>

                {/* Authorized Pickups */}
                <div>
                  <p style={{ fontSize: "11px", fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>Authorized Pickups</p>
                  <p style={{ fontSize: "12px", color: MUTED, margin: 0, fontStyle: "italic" }}>
                    Additional authorized adults will appear here when added from Household Members.
                  </p>
                </div>
              </div>
            </div>
          </SectionCard>

        </div>
      </div>
    </AppShell>
  );
}
