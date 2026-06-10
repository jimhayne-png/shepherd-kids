"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/layout/AppShell";

const supabase = createClient();
const ACCENT = "#7B2CBF";
const GOLD = "#D4AF37";

// ── Types ────────────────────────────────────────────────────────────────────

type VisitorChild = {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  grade: string | null;
  allergies: string | null;
  medical_notes: string | null;
  special_instructions: string | null;
  family_id: string | null;
  created_at: string;
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
  notes: string | null;
  visit_date: string;
  status: string;
  follow_up_sent: boolean;
  follow_up_sent_at: string | null;
};

type Sibling = { id: string; first_name: string; last_name: string; date_of_birth: string | null };

type CheckinRecord = {
  id: string;
  checked_in_at: string;
  is_new_visitor: boolean;
  room_id: string | null;
  service_name: string | null;
  session_date: string | null;
};

type MilestoneRecord = {
  id: string;
  milestone_type: string;
  is_completed: boolean;
  completed_at: string | null;
  notes: string | null;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function calcAge(dob: string): number {
  const d = new Date(dob + "T00:00:00");
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  if (today.getMonth() < d.getMonth() || (today.getMonth() === d.getMonth() && today.getDate() < d.getDate())) age--;
  return age;
}

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function fmtShortDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtCheckinTime(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function nextBirthday(dob: string): { daysUntil: number; label: string } {
  const today = new Date();
  const d = new Date(dob + "T00:00:00");
  const next = new Date(today.getFullYear(), d.getMonth(), d.getDate());
  if (next < today) next.setFullYear(today.getFullYear() + 1);
  const days = Math.round((next.getTime() - today.getTime()) / 86400000);
  if (days === 0) return { daysUntil: 0, label: "Today! 🎉" };
  if (days === 1) return { daysUntil: 1, label: "Tomorrow!" };
  if (days <= 7) return { daysUntil: days, label: `In ${days} days` };
  if (days <= 30) return { daysUntil: days, label: `In ${days} days` };
  return { daysUntil: days, label: `In ${days} days` };
}

function deriveFaithStage(milestones: MilestoneRecord[]): number {
  const hasBaptism = milestones.some(m => m.milestone_type === "water_baptism" && m.is_completed && m.completed_at);
  const hasSalvation = milestones.some(m => m.milestone_type === "salvation" && m.is_completed && m.completed_at);
  if (hasBaptism) return 5;
  if (hasSalvation) return 4;
  return 1;
}

const FAITH_STAGES = [
  { id: 1, label: "Visitor",               icon: "👋", short: "Visitor" },
  { id: 2, label: "Regular",               icon: "📅", short: "Regular" },
  { id: 3, label: "Engaged",               icon: "⭐", short: "Engaged" },
  { id: 4, label: "Faith Decision",        icon: "✝️", short: "Faith Decision" },
  { id: 5, label: "Baptism",               icon: "🌊", short: "Baptism" },
  { id: 6, label: "Growing in God's Word", icon: "📖", short: "Growing" },
  { id: 7, label: "Discipleship",          icon: "🙏", short: "Discipleship" },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({ title, emoji, children }: { title: string; emoji: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.22)", borderRadius: "16px", overflow: "hidden" }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(212,175,55,0.12)", display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "16px" }}>{emoji}</span>
        <h3 style={{ fontSize: "13px", fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>{title}</h3>
      </div>
      <div style={{ padding: "20px" }}>{children}</div>
    </div>
  );
}

function DataRow({ label, value, placeholder }: { label: string; value?: string | null; placeholder?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginBottom: "12px" }}>
      <span style={{ fontSize: "10px", fontWeight: 700, color: "#A9A9B8", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
      <span style={{ fontSize: "13px", color: value ? "#D8D8E8" : "#5a5a78" }}>{value || (placeholder ?? "—")}</span>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ChildProfilePage() {
  const params = useParams();
  const router = useRouter();
  const childId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [child, setChild] = useState<VisitorChild | null>(null);
  const [family, setFamily] = useState<VisitorFamily | null>(null);
  const [siblings, setSiblings] = useState<Sibling[]>([]);
  const [checkinHistory, setCheckinHistory] = useState<CheckinRecord[]>([]);
  const [milestones, setMilestones] = useState<MilestoneRecord[]>([]);

  // Milestone editing
  const [editField, setEditField] = useState<"salvation" | "water_baptism" | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchProfile = useCallback(async (t: string) => {
    const [profileRes, milestonesRes] = await Promise.all([
      fetch(`/api/children-ministry/visitor-children/${childId}`, { headers: { Authorization: `Bearer ${t}` } }),
      fetch(`/api/children-ministry/children/${childId}/milestones`, { headers: { Authorization: `Bearer ${t}` } }),
    ]);
    if (!profileRes.ok) { router.push("/dashboard/children-ministry/children"); return; }
    const profileData = await profileRes.json();
    setChild(profileData.child);
    setFamily(profileData.family ?? null);
    setSiblings(profileData.siblings ?? []);
    setCheckinHistory(profileData.checkinHistory ?? []);
    if (milestonesRes.ok) {
      const milData = await milestonesRes.json();
      setMilestones(milData.milestones ?? []);
    }
  }, [childId, router]);

  useEffect(() => {
    async function init() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!user || error) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const t = session.access_token;
      setToken(t);
      await fetchProfile(t);
      setLoading(false);
    }
    init();
  }, [fetchProfile]);

  async function saveMilestone(type: "salvation" | "water_baptism") {
    if (!token || !editValue) return;
    setSaving(true);
    const res = await fetch(`/api/children-ministry/children/${childId}/milestones`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ milestoneType: type, completedAt: editValue }),
    });
    if (res.ok && token) {
      const milRes = await fetch(`/api/children-ministry/children/${childId}/milestones`, { headers: { Authorization: `Bearer ${token}` } });
      if (milRes.ok) setMilestones((await milRes.json()).milestones ?? []);
      setEditField(null);
      setEditValue("");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#08060D" }}>
        <div style={{ color: "#D8D8E8" }}>Loading…</div>
      </div>
    );
  }

  if (!child) {
    return (
      <AppShell navItems={[]}>
        <div style={{ padding: "64px 32px", textAlign: "center" }}>
          <p style={{ color: "#A9A9B8" }}>Child not found.</p>
          <Link href="/dashboard/children-ministry/children" style={{ color: ACCENT, fontSize: "14px", marginTop: "12px", display: "inline-block" }}>← Back to directory</Link>
        </div>
      </AppShell>
    );
  }

  const fullName = `${child.first_name} ${child.last_name}`;
  const familyName = family ? `${family.parent1_last_name} Family` : null;
  const age = child.date_of_birth ? calcAge(child.date_of_birth) : null;
  const faithStage = deriveFaithStage(milestones);
  const stageMeta = FAITH_STAGES.find(s => s.id === faithStage) ?? FAITH_STAGES[0];
  const salvationMilestone = milestones.find(m => m.milestone_type === "salvation") ?? null;
  const baptismMilestone = milestones.find(m => m.milestone_type === "water_baptism") ?? null;
  const hasAllergy = !!(child.allergies);
  const hasMedical = !!(child.medical_notes);
  const recentCheckin = checkinHistory[0] ?? null;
  const checkedInRecently = recentCheckin ? (Date.now() - new Date(recentCheckin.checked_in_at).getTime()) < 30 * 24 * 3600 * 1000 : false;

  const birthdayInfo = child.date_of_birth ? nextBirthday(child.date_of_birth) : null;

  const parent1Name = family ? [family.parent1_first_name, family.parent1_last_name].filter(Boolean).join(" ") : null;
  const parent2Name = family ? [family.parent2_first_name, family.parent2_last_name].filter(Boolean).join(" ") : null;

  return (
    <AppShell navItems={[]}>

      {/* ── Hero Header ─────────────────────────────────────────────────── */}
      <div style={{ background: "linear-gradient(135deg, #08060D 0%, #1C0A30 100%)", padding: "32px 32px 24px" }}>
        {/* Back link */}
        <Link href="/dashboard/children-ministry/children" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#A9A9B8", fontSize: "13px", marginBottom: "20px", textDecoration: "none" }}>
          ← ShepherdKids Directory
        </Link>

        <div style={{ display: "flex", alignItems: "flex-start", gap: "20px", flexWrap: "wrap" }}>
          {/* Avatar */}
          <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: `linear-gradient(135deg, ${ACCENT}, #9D4EDD)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", fontWeight: 900, color: "#ffffff", flexShrink: 0, border: "2px solid rgba(212,175,55,0.3)" }}>
            {child.first_name[0]}{child.last_name[0]}
          </div>

          {/* Name + info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: "28px", fontWeight: 900, color: "#ffffff", margin: "0 0 4px", fontFamily: "Georgia, serif" }}>{fullName}</h1>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center", marginBottom: "10px" }}>
              {age !== null && (
                <span style={{ fontSize: "13px", color: "#A9A9B8" }}>Age {age}</span>
              )}
              {child.date_of_birth && (
                <span style={{ fontSize: "13px", color: "#A9A9B8" }}>· {fmtShortDate(child.date_of_birth)}</span>
              )}
              {child.grade && (
                <span style={{ fontSize: "13px", color: "#A9A9B8" }}>· {child.grade}</span>
              )}
              {familyName && (
                <span style={{ fontSize: "13px", color: GOLD }}>· {familyName}</span>
              )}
            </div>

            {/* Quick badges */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {hasAllergy && (
                <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "20px", background: "rgba(220,38,38,0.25)", color: "#fca5a5", border: "1px solid rgba(220,38,38,0.4)" }}>
                  🚨 Allergy
                </span>
              )}
              {hasMedical && (
                <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "20px", background: "rgba(245,158,11,0.2)", color: "#fcd34d", border: "1px solid rgba(245,158,11,0.35)" }}>
                  🏥 Medical Note
                </span>
              )}
              <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "20px", background: "rgba(123,44,191,0.25)", color: "#c084fc", border: "1px solid rgba(123,44,191,0.4)" }}>
                {stageMeta.icon} {stageMeta.short}
              </span>
              {checkedInRecently && (
                <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "20px", background: "rgba(34,197,94,0.15)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)" }}>
                  ✅ Checked In Recently
                </span>
              )}
              {child.date_of_birth && birthdayInfo && birthdayInfo.daysUntil <= 14 && (
                <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "20px", background: `rgba(212,175,55,0.15)`, color: GOLD, border: `1px solid rgba(212,175,55,0.35)` }}>
                  🎂 Birthday {birthdayInfo.label}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div style={{ backgroundColor: "#0A0814", minHeight: "calc(100vh - 200px)", padding: "24px 32px 48px" }}>

        {/* ── Faith Journey (full width, prominent) ────────────────────── */}
        <div style={{ marginBottom: "20px" }}>
          <SectionCard title="Faith Journey" emoji="✝️">
            {/* Stage timeline */}
            <div style={{ marginBottom: "20px", overflowX: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0", minWidth: "560px" }}>
                {FAITH_STAGES.map((stage, idx) => {
                  const isAchieved = stage.id < faithStage;
                  const isCurrent = stage.id === faithStage;
                  const isFuture = stage.id > faithStage;
                  return (
                    <div key={stage.id} style={{ display: "flex", alignItems: "center", flex: idx < FAITH_STAGES.length - 1 ? "1" : "0" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", minWidth: "68px" }}>
                        <div style={{
                          width: "36px", height: "36px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "16px",
                          background: isCurrent ? `linear-gradient(135deg, ${ACCENT}, #9D4EDD)` : isAchieved ? "rgba(212,175,55,0.2)" : "rgba(255,255,255,0.05)",
                          border: isCurrent ? `2px solid ${ACCENT}` : isAchieved ? `2px solid rgba(212,175,55,0.5)` : "2px solid rgba(255,255,255,0.1)",
                          boxShadow: isCurrent ? `0 0 12px ${ACCENT}55` : "none",
                        }}>
                          {stage.icon}
                        </div>
                        <span style={{
                          fontSize: "9px", fontWeight: isCurrent ? 800 : 600, textAlign: "center", lineHeight: 1.2,
                          color: isCurrent ? "#ffffff" : isAchieved ? GOLD : "#4a4a65",
                        }}>
                          {stage.short}
                        </span>
                      </div>
                      {idx < FAITH_STAGES.length - 1 && (
                        <div style={{ flex: 1, height: "2px", margin: "0 4px", marginBottom: "18px", background: isAchieved ? `rgba(212,175,55,0.4)` : "rgba(255,255,255,0.08)" }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Milestone dates */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              {(["salvation", "water_baptism"] as const).map(type => {
                const label = type === "salvation" ? "✝️ Spiritual Birthday" : "🌊 Baptism Date";
                const current = type === "salvation" ? salvationMilestone : baptismMilestone;
                return (
                  <div key={type} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(212,175,55,0.12)", borderRadius: "10px", padding: "14px" }}>
                    <p style={{ fontSize: "11px", fontWeight: 700, color: "#A9A9B8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>{label}</p>
                    {editField === type ? (
                      <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                        <input
                          type="date"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          style={{ padding: "5px 8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: "6px", fontSize: "12px", color: "#ffffff", outline: "none" }}
                        />
                        <button
                          onClick={() => saveMilestone(type)}
                          disabled={saving || !editValue}
                          style={{ fontSize: "12px", fontWeight: 700, color: "#ffffff", padding: "5px 12px", borderRadius: "6px", border: "none", cursor: saving || !editValue ? "not-allowed" : "pointer", opacity: saving || !editValue ? 0.5 : 1, background: `linear-gradient(135deg, ${ACCENT}, #9D4EDD)` }}
                        >
                          {saving ? "Saving…" : "Save"}
                        </button>
                        <button
                          onClick={() => { setEditField(null); setEditValue(""); }}
                          style={{ fontSize: "12px", color: "#A9A9B8", background: "none", border: "none", cursor: "pointer" }}
                        >Cancel</button>
                      </div>
                    ) : current?.completed_at ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <p style={{ fontSize: "14px", fontWeight: 700, color: "#ffffff", margin: 0 }}>{fmtShortDate(current.completed_at)}</p>
                        <button
                          onClick={() => { setEditField(type); setEditValue(current.completed_at ?? ""); }}
                          style={{ fontSize: "12px", fontWeight: 600, color: "#9D4EDD", background: "none", border: "none", cursor: "pointer" }}
                        >Edit</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditField(type); setEditValue(""); }}
                        style={{ fontSize: "12px", fontWeight: 600, color: "#9D4EDD", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                      >+ Add date</button>
                    )}
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </div>

        {/* ── Two-column grid ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">

          {/* ── Family ── */}
          <SectionCard title="Family & Contact" emoji="👪">
            {parent1Name ? (
              <div style={{ marginBottom: "16px" }}>
                <p style={{ fontSize: "11px", fontWeight: 700, color: "#A9A9B8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>Parent / Guardian 1</p>
                <p style={{ fontSize: "15px", fontWeight: 700, color: "#ffffff", margin: "0 0 4px" }}>{parent1Name}</p>
                {family?.parent1_phone && (
                  <a href={`tel:${family.parent1_phone}`} style={{ display: "block", fontSize: "13px", color: "#A9A9B8", textDecoration: "none", marginBottom: "2px" }}>📞 {family.parent1_phone}</a>
                )}
                {family?.parent1_email && (
                  <a href={`mailto:${family.parent1_email}`} style={{ display: "block", fontSize: "13px", color: "#A9A9B8", textDecoration: "none" }}>✉️ {family.parent1_email}</a>
                )}
              </div>
            ) : (
              <DataRow label="Parent / Guardian" placeholder="No family info on file" />
            )}

            {parent2Name && (
              <div style={{ marginBottom: "16px", paddingTop: "14px", borderTop: "1px solid rgba(212,175,55,0.1)" }}>
                <p style={{ fontSize: "11px", fontWeight: 700, color: "#A9A9B8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>Parent / Guardian 2</p>
                <p style={{ fontSize: "15px", fontWeight: 700, color: "#ffffff", margin: "0 0 4px" }}>{parent2Name}</p>
                {family?.parent2_phone && (
                  <a href={`tel:${family.parent2_phone}`} style={{ display: "block", fontSize: "13px", color: "#A9A9B8", textDecoration: "none", marginBottom: "2px" }}>📞 {family.parent2_phone}</a>
                )}
                {family?.parent2_email && (
                  <a href={`mailto:${family.parent2_email}`} style={{ display: "block", fontSize: "13px", color: "#A9A9B8", textDecoration: "none" }}>✉️ {family.parent2_email}</a>
                )}
              </div>
            )}

            {family?.address && (
              <div style={{ paddingTop: "12px", borderTop: "1px solid rgba(212,175,55,0.08)", marginBottom: "12px" }}>
                <p style={{ fontSize: "11px", fontWeight: 700, color: "#A9A9B8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>Address</p>
                <p style={{ fontSize: "13px", color: "#D8D8E8", margin: 0 }}>{family.address}</p>
              </div>
            )}

            {siblings.length > 0 && (
              <div style={{ paddingTop: "12px", borderTop: "1px solid rgba(212,175,55,0.08)", marginBottom: "12px" }}>
                <p style={{ fontSize: "11px", fontWeight: 700, color: "#A9A9B8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>Siblings</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {siblings.map(s => (
                    <Link key={s.id} href={`/dashboard/children-ministry/children/${s.id}`} style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
                      <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: `rgba(123,44,191,0.3)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, color: "#ffffff", flexShrink: 0 }}>
                        {s.first_name[0]}{s.last_name[0]}
                      </div>
                      <div>
                        <p style={{ fontSize: "13px", fontWeight: 600, color: "#D8D8E8", margin: 0 }}>{s.first_name} {s.last_name}</p>
                        {s.date_of_birth && <p style={{ fontSize: "11px", color: "#A9A9B8", margin: 0 }}>Age {calcAge(s.date_of_birth)}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div style={{ paddingTop: "12px", borderTop: "1px solid rgba(212,175,55,0.08)" }}>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#A9A9B8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>Authorized Pickups</p>
              <p style={{ fontSize: "12px", color: "#4a4a65", fontStyle: "italic", margin: 0 }}>Recorded at check-in</p>
            </div>
          </SectionCard>

          {/* ── Safety & Care ── */}
          <SectionCard title="Safety & Care" emoji="🛡️">
            <div style={{ marginBottom: "16px" }}>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#A9A9B8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>Allergies</p>
              {child.allergies ? (
                <div style={{ background: "rgba(220,38,38,0.12)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: "8px", padding: "10px 14px" }}>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: "#fca5a5", margin: 0 }}>⚠️ {child.allergies}</p>
                </div>
              ) : (
                <p style={{ fontSize: "13px", color: "#4a4a65", fontStyle: "italic", margin: 0 }}>No allergies on file</p>
              )}
            </div>

            <div style={{ marginBottom: "16px" }}>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#A9A9B8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>Medical Notes</p>
              {child.medical_notes ? (
                <div style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: "8px", padding: "10px 14px" }}>
                  <p style={{ fontSize: "13px", color: "#fcd34d", margin: 0 }}>{child.medical_notes}</p>
                </div>
              ) : (
                <p style={{ fontSize: "13px", color: "#4a4a65", fontStyle: "italic", margin: 0 }}>None on file</p>
              )}
            </div>

            <div style={{ marginBottom: "16px" }}>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#A9A9B8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>Special Instructions</p>
              {child.special_instructions ? (
                <div style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: "8px", padding: "10px 14px" }}>
                  <p style={{ fontSize: "13px", color: "#a5b4fc", margin: 0 }}>{child.special_instructions}</p>
                </div>
              ) : (
                <p style={{ fontSize: "13px", color: "#4a4a65", fontStyle: "italic", margin: 0 }}>None on file</p>
              )}
            </div>

            <div>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#A9A9B8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>Ministry Care Notes</p>
              <p style={{ fontSize: "12px", color: "#4a4a65", fontStyle: "italic", margin: 0 }}>Coming soon — leadership notes</p>
            </div>
          </SectionCard>
        </div>

        {/* ── Two-column grid row 2 ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">

          {/* ── Celebrations ── */}
          <SectionCard title="Celebrations" emoji="🎉">
            {/* Birthday */}
            <div style={{ marginBottom: "16px" }}>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#A9A9B8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>🎂 Birthday</p>
              {child.date_of_birth ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ fontSize: "14px", fontWeight: 700, color: "#ffffff", margin: 0 }}>{fmtDate(child.date_of_birth)}</p>
                    {birthdayInfo && <p style={{ fontSize: "12px", color: birthdayInfo.daysUntil <= 7 ? GOLD : "#A9A9B8", margin: "2px 0 0", fontWeight: birthdayInfo.daysUntil <= 7 ? 700 : 400 }}>{birthdayInfo.label}</p>}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: "22px", fontWeight: 900, color: ACCENT, margin: 0, lineHeight: 1 }}>{age}</p>
                    <p style={{ fontSize: "10px", color: "#A9A9B8", margin: "2px 0 0" }}>years old</p>
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: "13px", color: "#4a4a65", fontStyle: "italic" }}>Not on file</p>
              )}
            </div>

            {/* Spiritual Birthday */}
            <div style={{ marginBottom: "16px", paddingTop: "14px", borderTop: "1px solid rgba(212,175,55,0.1)" }}>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#A9A9B8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>✝️ Spiritual Birthday</p>
              {salvationMilestone?.completed_at ? (
                <p style={{ fontSize: "14px", fontWeight: 700, color: "#ffffff", margin: 0 }}>{fmtDate(salvationMilestone.completed_at)}</p>
              ) : (
                <p style={{ fontSize: "13px", color: "#4a4a65", fontStyle: "italic" }}>Not recorded</p>
              )}
            </div>

            {/* Baptism */}
            <div style={{ marginBottom: "16px", paddingTop: "14px", borderTop: "1px solid rgba(212,175,55,0.1)" }}>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#A9A9B8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>🌊 Baptism</p>
              {baptismMilestone?.completed_at ? (
                <p style={{ fontSize: "14px", fontWeight: 700, color: "#ffffff", margin: 0 }}>{fmtDate(baptismMilestone.completed_at)}</p>
              ) : (
                <p style={{ fontSize: "13px", color: "#4a4a65", fontStyle: "italic" }}>Not recorded</p>
              )}
            </div>

            {/* Scripture Memory + Awards placeholders */}
            <div style={{ paddingTop: "14px", borderTop: "1px solid rgba(212,175,55,0.1)", display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "13px", color: "#4a4a65" }}>📖 Scripture Memory</span>
                <span style={{ fontSize: "11px", color: "#4a4a65", fontStyle: "italic" }}>Coming soon</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "13px", color: "#4a4a65" }}>🏆 Awards & Certificates</span>
                <span style={{ fontSize: "11px", color: "#4a4a65", fontStyle: "italic" }}>Coming soon</span>
              </div>
              <button
                disabled
                style={{ width: "100%", marginTop: "4px", padding: "9px", borderRadius: "10px", fontSize: "12px", fontWeight: 700, color: "rgba(255,255,255,0.3)", background: "rgba(123,44,191,0.12)", border: "1px solid rgba(123,44,191,0.2)", cursor: "not-allowed" }}
              >
                🖨️ Print Certificate (coming soon)
              </button>
            </div>
          </SectionCard>

          {/* ── Parent Communication ── */}
          <SectionCard title="Parent Communication" emoji="📧">
            <div style={{ marginBottom: "16px" }}>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#A9A9B8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>Family Visit Status</p>
              {family ? (
                <span style={{
                  display: "inline-block", fontSize: "12px", fontWeight: 700, padding: "3px 12px", borderRadius: "20px",
                  background: family.status === "returning" ? "rgba(34,197,94,0.15)" : family.status === "contacted" ? "rgba(99,102,241,0.2)" : family.status === "converted" ? "rgba(212,175,55,0.15)" : "rgba(123,44,191,0.2)",
                  color: family.status === "returning" ? "#4ade80" : family.status === "contacted" ? "#a5b4fc" : family.status === "converted" ? GOLD : "#c084fc",
                }}>
                  {family.status.charAt(0).toUpperCase() + family.status.slice(1)}
                </span>
              ) : (
                <p style={{ fontSize: "13px", color: "#4a4a65", fontStyle: "italic" }}>—</p>
              )}
            </div>

            <div style={{ marginBottom: "16px" }}>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#A9A9B8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>First Visit</p>
              <p style={{ fontSize: "13px", color: "#D8D8E8", margin: 0 }}>{family?.visit_date ? fmtDate(family.visit_date) : "—"}</p>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#A9A9B8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>Follow-Up Sent</p>
              {family?.follow_up_sent && family?.follow_up_sent_at ? (
                <p style={{ fontSize: "13px", color: "#4ade80", margin: 0 }}>✅ {fmtCheckinTime(family.follow_up_sent_at)}</p>
              ) : (
                <p style={{ fontSize: "13px", color: "#4a4a65", fontStyle: "italic", margin: 0 }}>Not yet sent</p>
              )}
            </div>

            <div style={{ paddingTop: "14px", borderTop: "1px solid rgba(212,175,55,0.1)" }}>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#A9A9B8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>Parent Updates</p>
              <p style={{ fontSize: "12px", color: "#4a4a65", fontStyle: "italic", margin: "0 0 12px" }}>No parent updates sent yet</p>
              <Link
                href="/dashboard/children-ministry/parent-update"
                style={{ display: "block", textAlign: "center", padding: "9px 16px", borderRadius: "10px", fontSize: "12px", fontWeight: 700, color: "#ffffff", background: `linear-gradient(135deg, ${ACCENT}, #9D4EDD)`, textDecoration: "none" }}
              >
                📧 Go to Parent Communication
              </Link>
            </div>

            {family?.notes && (
              <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px solid rgba(212,175,55,0.1)" }}>
                <p style={{ fontSize: "11px", fontWeight: 700, color: "#A9A9B8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>Family Notes</p>
                <p style={{ fontSize: "13px", color: "#D8D8E8", margin: 0 }}>{family.notes}</p>
              </div>
            )}
          </SectionCard>
        </div>

        {/* ── Attendance (full width) ───────────────────────────────────── */}
        <SectionCard title="Attendance History" emoji="📅">
          <div style={{ display: "flex", gap: "20px", marginBottom: "20px", flexWrap: "wrap" }}>
            <div style={{ background: "rgba(123,44,191,0.15)", border: "1px solid rgba(123,44,191,0.3)", borderRadius: "12px", padding: "16px 24px", textAlign: "center", minWidth: "100px" }}>
              <p style={{ fontSize: "32px", fontWeight: 900, color: "#ffffff", margin: 0, lineHeight: 1 }}>{checkinHistory.length}</p>
              <p style={{ fontSize: "11px", color: "#A9A9B8", margin: "4px 0 0", fontWeight: 600 }}>Total Check-Ins</p>
            </div>
            {family?.visit_date && (
              <div style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.2)", borderRadius: "12px", padding: "16px 24px", textAlign: "center", minWidth: "100px" }}>
                <p style={{ fontSize: "13px", fontWeight: 700, color: GOLD, margin: 0 }}>{fmtShortDate(family.visit_date)}</p>
                <p style={{ fontSize: "11px", color: "#A9A9B8", margin: "4px 0 0", fontWeight: 600 }}>First Visit</p>
              </div>
            )}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "16px 24px", textAlign: "center", minWidth: "100px", opacity: 0.5 }}>
              <p style={{ fontSize: "13px", fontWeight: 700, color: "#A9A9B8", margin: 0 }}>—</p>
              <p style={{ fontSize: "11px", color: "#A9A9B8", margin: "4px 0 0", fontWeight: 600 }}>Missed Sundays</p>
              <p style={{ fontSize: "9px", color: "#4a4a65", margin: "2px 0 0" }}>coming soon</p>
            </div>
          </div>

          {checkinHistory.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 0", color: "#4a4a65", fontSize: "13px" }}>
              No check-in history found.
            </div>
          ) : (
            <div>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#A9A9B8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>Recent Check-Ins</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {checkinHistory.slice(0, 8).map((c, idx) => (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: "8px", background: idx === 0 ? "rgba(123,44,191,0.1)" : "rgba(255,255,255,0.02)", border: "1px solid rgba(212,175,55,0.08)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "16px" }}>✅</span>
                      <div>
                        <p style={{ fontSize: "13px", fontWeight: 600, color: "#D8D8E8", margin: 0 }}>{c.service_name ?? "Check-In"}</p>
                        <p style={{ fontSize: "11px", color: "#A9A9B8", margin: "1px 0 0" }}>{fmtCheckinTime(c.checked_in_at)}</p>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      {c.is_new_visitor && (
                        <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px", background: `rgba(123,44,191,0.25)`, color: "#c084fc" }}>1st Visit</span>
                      )}
                      {idx === 0 && <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px", background: "rgba(34,197,94,0.15)", color: "#4ade80" }}>Most Recent</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionCard>

      </div>
    </AppShell>
  );
}
