"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AppShell, { type NavItem } from "@/components/layout/AppShell";
import { MINISTRY_CONFIG, STAGE_COLORS } from "@/lib/ministry-config";

const supabase = createClient();
const TYPE = "childrens";
const navItems: NavItem[] = [];

type PipelineMember = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  pipeline_stage: string | null;
  weeks_attending: number;
  last_contact_date: string | null;
};

type StageData = {
  id: string | null;
  stage_key: string;
  name: string;
  description: string | null;
  color: string | null;
  display_order: number;
  is_active: boolean;
  is_default: boolean;
};

type MoveModal = { member: PipelineMember } | null;

const STAGE_ICONS: Record<string, string> = {
  Visitor: "🚪",
  Regular: "🎒",
  Engaged: "💚",
  "Growing in God's Word": "📖",
  "Faith Decision": "✝️",
  Baptism: "💧",
  Discipleship: "👣",
  "Discipleship Step": "👣",
};

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function stageIcon(name: string) {
  return STAGE_ICONS[name] ?? "•";
}

function stageColorAt(stage: StageData, idx: number): string {
  return stage.color ?? STAGE_COLORS[Math.min(idx, STAGE_COLORS.length - 1)];
}

function defaultsFromConfig(): StageData[] {
  const cfg = MINISTRY_CONFIG[TYPE];
  if (!cfg) return [];
  return (cfg.pipelineStages ?? cfg.stages ?? []).map((name, idx) => ({
    id: null,
    stage_key: name,
    name,
    description: cfg.stageDescriptions?.[name] ?? null,
    color: STAGE_COLORS[Math.min(idx, STAGE_COLORS.length - 1)],
    display_order: idx,
    is_active: true,
    is_default: true,
  }));
}

export default function FaithJourneyPage() {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [members, setMembers] = useState<PipelineMember[]>([]);
  const [total, setTotal] = useState(0);
  const [stages, setStages] = useState<StageData[]>(() => defaultsFromConfig());
  const [moveModal, setMoveModal] = useState<MoveModal>(null);
  const [selectedStage, setSelectedStage] = useState("");
  const [moveNote, setMoveNote] = useState("");
  const [moving, setMoving] = useState(false);
  const [moveError, setMoveError] = useState("");
  const [customizing, setCustomizing] = useState(false);
  const [editStages, setEditStages] = useState<StageData[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const activeStages = stages.filter((s) => s.is_active);

  async function loadStages(t: string) {
    try {
      const res = await fetch(`/api/ministry/${TYPE}/pipeline/stages`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.stages)) { setStages(data.stages); return; }
      }
    } catch { /* fall through */ }
    setStages(defaultsFromConfig());
  }

  async function loadMembers(t: string) {
    const res = await fetch(`/api/ministry/${TYPE}/pipeline`, {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      console.error('[Faith Journey] loadMembers failed:', d.error ?? res.status);
      return;
    }
    const data = await res.json();
    setMembers(data.members ?? []);
    setTotal(data.total ?? 0);
  }

  useEffect(() => {
    async function init() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!user || error) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const t = session.access_token;
      setToken(t);
      await Promise.all([loadStages(t), loadMembers(t)]);
      setLoading(false);
    }
    init();
  }, []);

  function openMove(member: PipelineMember) {
    setMoveModal({ member });
    setSelectedStage(member.pipeline_stage ?? activeStages[0]?.name ?? "");
    setMoveNote("");
    setMoveError("");
  }

  async function moveStage() {
    if (!moveModal || !token || !selectedStage) return;
    setMoving(true);
    setMoveError("");
    const res = await fetch(`/api/ministry/${TYPE}/pipeline/${moveModal.member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ pipeline_stage: selectedStage, note: moveNote }),
    });
    setMoving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setMoveError(d.error ?? "Failed to update stage. Please try again.");
      return;
    }
    // Optimistic update so the board reflects the change immediately
    setMembers(prev => prev.map(m =>
      m.id === moveModal.member.id ? { ...m, pipeline_stage: selectedStage } : m
    ));
    setMoveModal(null);
    if (token) await loadMembers(token);
  }

  function openCustomize() {
    const allDefaults = defaultsFromConfig();
    const current = [...stages];
    for (const def of allDefaults) {
      if (!current.some((s) => s.stage_key === def.stage_key)) {
        current.push({ ...def, is_active: false });
      }
    }
    setEditStages(current.sort((a, b) => a.display_order - b.display_order));
    setSaveError("");
    setCustomizing(true);
  }

  function restoreDefaults() { setEditStages(defaultsFromConfig()); }

  function addStep() {
    setEditStages((prev) => [
      ...prev,
      { id: null, stage_key: `new-step-${Date.now()}`, name: "New Step", description: "Describe this step", color: "#64748b", display_order: prev.length, is_active: true, is_default: false },
    ]);
  }

  function moveEditStage(idx: number, dir: -1 | 1) {
    setEditStages((prev) => {
      const next = [...prev];
      const swapIdx = idx + dir;
      if (swapIdx < 0 || swapIdx >= next.length) return prev;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next.map((s, i) => ({ ...s, display_order: i }));
    });
  }

  async function saveCustomization() {
    if (!token) return;
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch(`/api/ministry/${TYPE}/pipeline/stages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          stages: editStages.map((s, idx) => ({
            stage_key: s.stage_key,
            name: s.name,
            description: s.description,
            color: s.color,
            display_order: idx,
            is_active: s.is_active,
          })),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setSaveError(d.error ?? "Failed to save. Please try again.");
        setSaving(false);
        return;
      }
      if (token) await loadStages(token);
      setCustomizing(false);
    } catch {
      setSaveError("Network error. Please try again.");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <AppShell navItems={navItems}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", backgroundColor: "#08060D" }}>
          <p style={{ color: "#A9A9B8", fontFamily: "Georgia, serif" }}>Loading…</p>
        </div>
      </AppShell>
    );
  }

  // Build board columns — match on both "Discipleship" and "Discipleship Step" for legacy data
  const stageGroups: Record<string, PipelineMember[]> = {};
  for (const s of activeStages) stageGroups[s.name] = [];
  stageGroups.Unassigned = [];
  for (const member of members) {
    const matched = member.pipeline_stage
      ? activeStages.find((s) =>
          s.name.toLowerCase() === member.pipeline_stage!.toLowerCase() ||
          (s.name === "Discipleship" && member.pipeline_stage === "Discipleship Step")
        )
      : undefined;
    stageGroups[matched?.name ?? "Unassigned"].push(member);
  }

  const columns = activeStages.map((stage, idx) => ({
    stage,
    members: stageGroups[stage.name] ?? [],
    color: stageColorAt(stage, idx),
    icon: stageIcon(stage.name),
  }));
  const unassigned = stageGroups.Unassigned ?? [];

  function countStage(name: string) {
    return members.filter((m) => m.pipeline_stage?.toLowerCase() === name.toLowerCase()).length;
  }
  const faithDecisionCount = countStage("Faith Decision");
  const baptismCount = countStage("Baptism");
  const discipleshipCount = countStage("Discipleship") + countStage("Discipleship Step");
  const activeCount = members.filter((m) => m.pipeline_stage).length;

  const METRICS = [
    { label: "Total Children", value: total, icon: "👥" },
    { label: "Active in Journey", value: activeCount, icon: "🌱" },
    { label: "Faith Decisions", value: faithDecisionCount, icon: "✝️" },
    { label: "Baptism", value: baptismCount, icon: "💧" },
    { label: "Discipleship", value: discipleshipCount, icon: "👣" },
  ];

  return (
    <AppShell navItems={navItems}>
      {/* Hero */}
      <div style={{ padding: "32px", background: "linear-gradient(135deg, #08060D 0%, #1C0A30 100%)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "24px" }}>
          <div>
            <p style={{ color: "#D4AF37", fontSize: "13px", marginBottom: "4px", fontWeight: 600 }}>ShepherdKids</p>
            <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#FFFFFF", fontFamily: "Georgia, serif", margin: 0 }}>
              Faith Journey
            </h1>
            <p style={{ color: "#D8D8E8", fontSize: "14px", marginTop: "8px" }}>
              Helping every child take their next step toward Christ.
            </p>
          </div>
          <button
            type="button"
            onClick={openCustomize}
            style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "10px", border: "1px solid rgba(212,175,55,0.4)", background: "rgba(212,175,55,0.08)", color: "#D4AF37", fontSize: "13px", fontWeight: 700, cursor: "pointer", flexShrink: 0 }}
          >
            ⚙️ Customize
          </button>
        </div>
      </div>

      <div style={{ padding: "24px 32px", backgroundColor: "#0A0814", minHeight: "100vh" }}>
        {/* Metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px", marginBottom: "24px", marginTop: "-24px" }}>
          {METRICS.map((m) => (
            <div key={m.label} style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.25)", borderRadius: "12px", padding: "16px" }}>
              <div style={{ fontSize: "22px" }}>{m.icon}</div>
              <p style={{ fontSize: "24px", fontWeight: 700, color: "#FFFFFF", margin: "6px 0 2px" }}>{m.value}</p>
              <p style={{ fontSize: "11px", color: "#A9A9B8", margin: 0 }}>{m.label}</p>
            </div>
          ))}
        </div>

        {/* About */}
        <div style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.2)", borderRadius: "16px", padding: "20px", marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(123,44,191,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>ℹ️</div>
            <div>
              <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#FFFFFF", margin: 0 }}>About the Faith Journey</h2>
              <p style={{ fontSize: "12px", color: "#A9A9B8", margin: 0 }}>{"This is a guide, not a box. Every child's journey is unique."}</p>
            </div>
          </div>
          <p style={{ fontSize: "13px", color: "#D8D8E8", lineHeight: 1.6, margin: 0 }}>
            The Faith Journey helps ministry leaders see where children are spiritually, pray intentionally, and encourage their next step with care and wisdom.
          </p>
        </div>

        {/* Pipeline Board */}
        <div style={{ overflowX: "auto", paddingBottom: "8px" }}>
          <div style={{ display: "flex", gap: "14px", minWidth: `${(columns.length + (unassigned.length > 0 ? 1 : 0)) * 230}px` }}>
            {columns.map((col, idx) => (
              <div
                key={col.stage.stage_key}
                style={{ flexShrink: 0, width: "218px", borderRadius: "16px", overflow: "hidden", background: `linear-gradient(180deg, ${col.color}18 0%, #120A1F 60%)`, border: `1px solid ${col.color}40` }}
              >
                <div style={{ padding: "16px", textAlign: "center", borderBottom: `1px solid ${col.color}20` }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: col.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#FFFFFF", fontSize: "12px", fontWeight: 900, margin: "0 auto 8px" }}>
                    {idx + 1}
                  </div>
                  <div style={{ fontSize: "30px", marginBottom: "8px" }}>{col.icon}</div>
                  <h3 style={{ fontSize: "14px", fontWeight: 900, color: "#FFFFFF", margin: 0, lineHeight: 1.2 }}>{col.stage.name}</h3>
                  <p style={{ fontSize: "11px", color: "#A9A9B8", margin: "6px 0 0", lineHeight: 1.5, minHeight: "32px" }}>{col.stage.description ?? ""}</p>
                  <p style={{ fontSize: "12px", fontWeight: 700, color: col.color, margin: "8px 0 0" }}>
                    {col.members.length} {col.members.length === 1 ? "child" : "children"}
                  </p>
                </div>
                <div style={{ padding: "10px", display: "flex", flexDirection: "column", gap: "8px", maxHeight: "calc(100vh - 440px)", overflowY: "auto" }}>
                  {col.members.length === 0 ? (
                    <div style={{ borderRadius: "10px", border: "2px dashed rgba(212,175,55,0.12)", padding: "20px", textAlign: "center" }}>
                      <p style={{ fontSize: "11px", color: "#3a2e55", margin: 0 }}>No children</p>
                    </div>
                  ) : (
                    col.members.map((member) => (
                      <ChildCard key={member.id} member={member} color={col.color} onMove={() => openMove(member)} />
                    ))
                  )}
                </div>
              </div>
            ))}

            {unassigned.length > 0 && (
              <div style={{ flexShrink: 0, width: "218px", borderRadius: "16px", overflow: "hidden", background: "#120A1F", border: "1px solid rgba(212,175,55,0.15)" }}>
                <div style={{ padding: "16px", textAlign: "center", borderBottom: "1px solid rgba(212,175,55,0.1)" }}>
                  <div style={{ fontSize: "28px", marginBottom: "8px" }}>❔</div>
                  <h3 style={{ fontSize: "14px", fontWeight: 900, color: "#A9A9B8", margin: 0 }}>Unassigned</h3>
                  <p style={{ fontSize: "11px", color: "#6b6b8a", margin: "6px 0 0" }}>Children who need a stage.</p>
                  <p style={{ fontSize: "12px", fontWeight: 700, color: "#A9A9B8", margin: "8px 0 0" }}>{unassigned.length} children</p>
                </div>
                <div style={{ padding: "10px", display: "flex", flexDirection: "column", gap: "8px", maxHeight: "calc(100vh - 440px)", overflowY: "auto" }}>
                  {unassigned.map((member) => (
                    <ChildCard key={member.id} member={member} color="#6b7280" onMove={() => openMove(member)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Make It Your Own */}
        <div style={{ background: "rgba(123,44,191,0.1)", border: "1px solid rgba(123,44,191,0.3)", borderRadius: "16px", padding: "20px", marginTop: "24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
          <div>
            <h3 style={{ color: "#FFFFFF", fontWeight: 700, fontSize: "15px", margin: 0 }}>🛠️ Make It Your Own</h3>
            <p style={{ color: "#D8D8E8", fontSize: "13px", margin: "6px 0 0" }}>
              {"Every church is unique. Customize stage names, descriptions, colors, and what moves a child from one stage to the next."}
            </p>
          </div>
          <button
            type="button"
            onClick={openCustomize}
            style={{ padding: "8px 20px", background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.4)", borderRadius: "10px", fontSize: "13px", fontWeight: 700, color: "#D4AF37", cursor: "pointer", flexShrink: 0 }}
          >
            Customize Faith Journey
          </button>
        </div>
      </div>

      {/* Move Stage Modal */}
      {moveModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "16px" }}
          onClick={() => setMoveModal(null)}
        >
          <div
            style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.3)", borderRadius: "16px", width: "100%", maxWidth: "380px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(212,175,55,0.15)" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#FFFFFF", fontFamily: "Georgia, serif", margin: 0 }}>
                Move {moveModal.member.first_name} {moveModal.member.last_name}
              </h2>
              <p style={{ fontSize: "12px", color: "#A9A9B8", margin: "4px 0 0" }}>
                Current: <strong style={{ color: "#D8D8E8" }}>{moveModal.member.pipeline_stage ?? "Unassigned"}</strong>
              </p>
            </div>
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <p style={{ fontSize: "11px", fontWeight: 600, color: "#A9A9B8", margin: "0 0 8px" }}>Select new stage</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {activeStages.map((stage, idx) => {
                    const color = stageColorAt(stage, idx);
                    const isSelected = selectedStage === stage.name;
                    return (
                      <button
                        key={stage.stage_key}
                        type="button"
                        onClick={() => setSelectedStage(stage.name)}
                        style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", borderRadius: "10px", border: `2px solid ${isSelected ? color : "rgba(212,175,55,0.15)"}`, background: isSelected ? color + "18" : "rgba(18,10,31,0.5)", cursor: "pointer", textAlign: "left" }}
                      >
                        <div style={{ width: 30, height: 30, borderRadius: "50%", background: color + "33", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", flexShrink: 0 }}>
                          {stageIcon(stage.name)}
                        </div>
                        <span style={{ fontSize: "13px", fontWeight: 500, color: isSelected ? "#FFFFFF" : "#D8D8E8" }}>{stage.name}</span>
                        {isSelected && <span style={{ marginLeft: "auto", fontSize: "12px", fontWeight: 700, color }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p style={{ fontSize: "11px", fontWeight: 600, color: "#A9A9B8", margin: "0 0 6px" }}>Note (optional)</p>
                <input
                  value={moveNote}
                  onChange={(e) => setMoveNote(e.target.value)}
                  placeholder="Reason for stage change…"
                  className="input-dark"
                  style={{ width: "100%", padding: "8px 12px", background: "#0E0C18", border: "1px solid rgba(212,175,55,0.2)", borderRadius: "8px", fontSize: "13px", color: "#FFFFFF", boxSizing: "border-box", outline: "none" }}
                />
              </div>
              {moveError && (
                <p style={{ fontSize: "12px", color: "#f87171", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "8px", padding: "8px 12px", margin: 0 }}>
                  ⚠ {moveError}
                </p>
              )}
              <div style={{ display: "flex", gap: "10px" }}>
                <button type="button" onClick={() => setMoveModal(null)} style={{ flex: 1, padding: "10px", border: "1px solid rgba(212,175,55,0.2)", borderRadius: "10px", fontSize: "13px", fontWeight: 500, color: "#A9A9B8", background: "transparent", cursor: "pointer" }}>Cancel</button>
                <button type="button" onClick={moveStage} disabled={moving || !selectedStage} style={{ flex: 1, padding: "10px", borderRadius: "10px", fontSize: "13px", fontWeight: 700, color: "#FFFFFF", background: "linear-gradient(135deg, #7B2CBF, #9D4EDD)", border: "none", cursor: moving ? "not-allowed" : "pointer", opacity: moving ? 0.7 : 1 }}>
                  {moving ? "Moving…" : "Move"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customize Modal */}
      {customizing && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "16px" }}
          onClick={() => setCustomizing(false)}
        >
          <div
            style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.3)", borderRadius: "16px", width: "100%", maxWidth: "640px", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(212,175,55,0.15)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
              <div>
                <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#FFFFFF", fontFamily: "Georgia, serif", margin: 0 }}>Customize Faith Journey</h2>
                <p style={{ fontSize: "12px", color: "#A9A9B8", margin: "2px 0 0" }}>Edit stage names, descriptions, and colors. Use arrows to reorder.</p>
              </div>
              <button type="button" onClick={restoreDefaults} style={{ flexShrink: 0, fontSize: "12px", color: "#D4AF37", fontWeight: 600, border: "1px solid rgba(212,175,55,0.3)", padding: "6px 12px", borderRadius: "8px", background: "transparent", cursor: "pointer" }}>
                Restore Defaults
              </button>
            </div>

            <div style={{ overflowY: "auto", flex: 1, padding: "20px 24px", display: "flex", flexDirection: "column", gap: "10px" }}>
              {editStages.map((stage, idx) => (
                <div
                  key={stage.stage_key}
                  style={{ borderRadius: "10px", border: `1px solid ${stage.is_active ? "rgba(212,175,55,0.2)" : "rgba(212,175,55,0.07)"}`, padding: "14px", opacity: stage.is_active ? 1 : 0.5, background: "#0D0A14" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px", flexShrink: 0 }}>
                      <button type="button" onClick={() => moveEditStage(idx, -1)} disabled={idx === 0} style={{ fontSize: "10px", color: "#A9A9B8", background: "none", border: "none", cursor: idx === 0 ? "not-allowed" : "pointer", opacity: idx === 0 ? 0.2 : 1, padding: "2px 4px", lineHeight: 1 }}>▲</button>
                      <button type="button" onClick={() => moveEditStage(idx, 1)} disabled={idx === editStages.length - 1} style={{ fontSize: "10px", color: "#A9A9B8", background: "none", border: "none", cursor: idx === editStages.length - 1 ? "not-allowed" : "pointer", opacity: idx === editStages.length - 1 ? 0.2 : 1, padding: "2px 4px", lineHeight: 1 }}>▼</button>
                    </div>
                    <div style={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: stage.color ?? "#6b7280", flexShrink: 0 }} />
                    <input
                      type="text"
                      value={stage.name}
                      onChange={(e) => setEditStages((prev) => prev.map((s, i) => i === idx ? { ...s, name: e.target.value } : s))}
                      placeholder="Stage name"
                      style={{ flex: 1, fontSize: "13px", fontWeight: 700, color: "#FFFFFF", borderBottom: "1px solid rgba(212,175,55,0.2)", background: "transparent", border: "none", outline: "none", paddingBottom: "2px", minWidth: 0 } as React.CSSProperties}
                    />
                    <input
                      type="color"
                      value={stage.color ?? "#6b7280"}
                      onChange={(e) => setEditStages((prev) => prev.map((s, i) => i === idx ? { ...s, color: e.target.value } : s))}
                      style={{ width: 28, height: 28, borderRadius: "6px", cursor: "pointer", border: "1px solid rgba(212,175,55,0.2)", background: "transparent", padding: "2px" }}
                      title="Choose color"
                    />
                    <label style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#A9A9B8", cursor: "pointer", flexShrink: 0 }}>
                      <input
                        type="checkbox"
                        checked={stage.is_active}
                        onChange={(e) => setEditStages((prev) => prev.map((s, i) => i === idx ? { ...s, is_active: e.target.checked } : s))}
                        style={{ accentColor: "#7B2CBF" }}
                      />
                      Active
                    </label>
                  </div>
                  <input
                    type="text"
                    value={stage.description ?? ""}
                    onChange={(e) => setEditStages((prev) => prev.map((s, i) => i === idx ? { ...s, description: e.target.value } : s))}
                    placeholder="Short description…"
                    style={{ width: "100%", fontSize: "12px", color: "#D8D8E8", background: "#0A0814", border: "1px solid rgba(212,175,55,0.15)", borderRadius: "8px", padding: "8px 12px", boxSizing: "border-box", outline: "none" }}
                  />
                </div>
              ))}
              <button type="button" onClick={addStep} style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "2px dashed rgba(212,175,55,0.25)", fontSize: "13px", fontWeight: 600, color: "#A9A9B8", background: "transparent", cursor: "pointer" }}>
                + Add Journey Step
              </button>
            </div>

            {saveError && <p style={{ padding: "0 24px 8px", fontSize: "13px", color: "#f87171", textAlign: "center" }}>{saveError}</p>}

            <div style={{ padding: "16px 24px", borderTop: "1px solid rgba(212,175,55,0.15)", display: "flex", gap: "10px" }}>
              <button type="button" onClick={() => setCustomizing(false)} style={{ flex: 1, padding: "10px", border: "1px solid rgba(212,175,55,0.2)", borderRadius: "10px", fontSize: "13px", fontWeight: 500, color: "#A9A9B8", background: "transparent", cursor: "pointer" }}>Cancel</button>
              <button type="button" onClick={saveCustomization} disabled={saving} style={{ flex: 1, padding: "10px", borderRadius: "10px", fontSize: "13px", fontWeight: 700, color: "#FFFFFF", background: "linear-gradient(135deg, #7B2CBF, #9D4EDD)", border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function ChildCard({ member, color, onMove }: { member: PipelineMember; color: string; onMove: () => void }) {
  return (
    <div
      onClick={onMove}
      style={{ background: "#0D0A14", borderRadius: "10px", border: "1px solid rgba(212,175,55,0.12)", padding: "12px", cursor: "pointer", borderLeft: `4px solid ${color}` }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: "13px", fontWeight: 700, color: "#FFFFFF", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {member.first_name} {member.last_name}
          </p>
          <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "3px" }}>
            {member.weeks_attending > 0 && (
              <p style={{ fontSize: "11px", color: "#A9A9B8", margin: 0 }}>📅 Visits: {member.weeks_attending}</p>
            )}
            {member.last_contact_date && (
              <p style={{ fontSize: "11px", color: "#A9A9B8", margin: 0 }}>Last touch: {fmtDate(member.last_contact_date)}</p>
            )}
          </div>
        </div>
        <span style={{ color: "rgba(212,175,55,0.35)", fontSize: "16px", flexShrink: 0 }}>⇄</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "10px", paddingTop: "8px", borderTop: "1px solid rgba(212,175,55,0.08)" }}>
        <Link
          href={`/dashboard/members/${member.id}/edit`}
          onClick={(e) => e.stopPropagation()}
          style={{ fontSize: "11px", color: "#A9A9B8", textDecoration: "none" }}
        >
          View profile →
        </Link>
        <span style={{ fontSize: "11px", color: "#9D4EDD", fontWeight: 600 }}>Move</span>
      </div>
    </div>
  );
}
