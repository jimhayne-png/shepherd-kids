"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import MinistryShell from "@/components/layout/MinistryShell";
import { MINISTRY_CONFIG, STAGE_COLORS } from "@/lib/ministry-config";

const supabase = createClient();
const ACCENT = "#F28C28";

type PipelineMember = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  pipeline_stage: string | null;
  weeks_attending: number;
  last_contact_date: string | null;
};

type MoveModal = { member: PipelineMember } | null;

const STAGE_ICONS: Record<string, string> = {
  Visitor: "🚪",
  Regular: "🎒",
  Engaged: "💚",
  "Growing in God's Word": "📖",
  "Faith Decision": "✝️",
  Baptism: "💧",
  "Discipleship Step": "👣",
};

const DEFAULT_STAGE_DESCRIPTIONS: Record<string, string> = {
  Visitor: "First-time guest in the ministry.",
  Regular: "Attends 4+ times and begins to feel comfortable.",
  Engaged: "Participates in activities and builds relationships.",
  "Growing in God's Word": "Learning God’s Word and applying it to life.",
  "Faith Decision": "Makes a personal decision to follow Jesus Christ.",
  Baptism: "Publicly declares faith through baptism.",
  "Discipleship Step": "Taking next steps in discipleship and helping others grow.",
};

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function stageIcon(stage: string) {
  return STAGE_ICONS[stage] ?? "•";
}

function stageDescription(stage: string, cfgDescription?: string) {
  return cfgDescription ?? DEFAULT_STAGE_DESCRIPTIONS[stage] ?? "Custom stage for your ministry process.";
}

export default function PipelinePage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = use(params);
  const cfg = MINISTRY_CONFIG[type];

  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [members, setMembers] = useState<PipelineMember[]>([]);
  const [total, setTotal] = useState(0);
  const [moveModal, setMoveModal] = useState<MoveModal>(null);
  const [selectedStage, setSelectedStage] = useState("");
  const [moveNote, setMoveNote] = useState("");
  const [moving, setMoving] = useState(false);

  const stages = cfg?.pipelineStages ?? cfg?.stages ?? [];

  async function load(t: string) {
    const res = await fetch(`/api/ministry/${type}/pipeline`, {
      headers: { Authorization: `Bearer ${t}` },
    });

    if (!res.ok) return;

    const data = await res.json();
    setMembers(data.members ?? []);
    setTotal(data.total ?? 0);
  }

  useEffect(() => {
    async function init() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!user || error) {
        console.log("Dashboard client user unavailable:", error?.message ?? null);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      const t = session.access_token;
      setToken(t);
      await load(t);
      setLoading(false);
    }

    init();
  }, [type]);

  function openMove(member: PipelineMember) {
    setMoveModal({ member });
    setSelectedStage(member.pipeline_stage ?? stages[0] ?? "");
    setMoveNote("");
  }

  async function moveStage() {
    if (!moveModal || !token || !selectedStage) return;

    setMoving(true);

    await fetch(`/api/ministry/${type}/pipeline/${moveModal.member.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        pipeline_stage: selectedStage,
        note: moveNote,
      }),
    });

    setMoving(false);
    setMoveModal(null);
    await load(token);
  }

  if (!cfg) {
    return (
      <MinistryShell type={type}>
        <div className="p-8 text-gray-500">Ministry not found.</div>
      </MinistryShell>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400">Loading…</div>
      </div>
    );
  }

  const stageGroups: Record<string, PipelineMember[]> = {};

  for (const stage of stages) stageGroups[stage] = [];
  stageGroups.Unassigned = [];

  for (const member of members) {
    const matchedStage = member.pipeline_stage
      ? stages.find((stage) => stage.toLowerCase() === member.pipeline_stage!.toLowerCase())
      : undefined;

    stageGroups[matchedStage ?? "Unassigned"].push(member);
  }

  const columns = stages.map((stage, idx) => ({
    stage,
    members: stageGroups[stage] ?? [],
    color: STAGE_COLORS[Math.min(idx, STAGE_COLORS.length - 1)],
    icon: stageIcon(stage),
    description: stageDescription(stage, cfg.stageDescriptions?.[stage]),
  }));

  const unassigned = stageGroups.Unassigned ?? [];

  const faithDecisionCount = stageGroups["Faith Decision"]?.length ?? 0;
  const baptismCount = stageGroups.Baptism?.length ?? 0;
  const discipleshipCount = stageGroups["Discipleship Step"]?.length ?? 0;
  const activeCount = members.filter((m) => m.pipeline_stage).length;

  return (
    <MinistryShell type={type}>
      <div
        className="px-8 py-8"
        style={{
          background: `linear-gradient(135deg, #c2570a 0%, ${ACCENT} 100%)`,
        }}
      >
        <div className="flex items-start justify-between gap-6">
          <div>
            <Link
              href={`/dashboard/ministry/${type}`}
              className="text-orange-100 text-xs mb-1 block hover:text-white"
            >
              ← {cfg.name}
            </Link>
            <h1
              className="text-4xl font-bold text-white"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Shepherd Pipeline
            </h1>
            <p className="text-orange-100 text-sm mt-2">
              Helping every child take their next step toward Christ.
            </p>
          </div>

          <button
            type="button"
            className="hidden md:flex items-center gap-3 px-5 py-3 rounded-xl border border-white/30 bg-white/10 text-white text-sm font-bold hover:bg-white/20 transition-colors"
          >
            ⚙️ Customize Pipeline
          </button>
        </div>
      </div>

      <div
        className="p-6 space-y-5"
        style={{
          backgroundColor: "#f9fafb",
          minHeight: "calc(100vh - 160px)",
        }}
      >
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_2fr] gap-5">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                  ℹ️
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">About the Pipeline</h2>
                  <p className="text-sm text-gray-500">
                    This is a guide, not a box. Every child’s journey is unique.
                  </p>
                </div>
              </div>

              <p className="text-sm text-gray-600 leading-6">
                The Shepherd Pipeline helps ministry leaders see where children are spiritually,
                pray intentionally, and encourage their next step with care.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Metric label="Total Children" value={total} icon="👥" />
              <Metric label="Active in Pipeline" value={activeCount} icon="🌱" />
              <Metric label="Faith Decisions" value={faithDecisionCount} icon="✝️" />
              <Metric label="Baptism" value={baptismCount} icon="💧" />
              <Metric label="Next Steps" value={discipleshipCount} icon="👣" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div
            className="flex gap-4 pb-4"
            style={{
              minWidth: `${(columns.length + (unassigned.length > 0 ? 1 : 0)) * 245}px`,
            }}
          >
            {columns.map((column, idx) => (
              <div
                key={column.stage}
                className="flex-shrink-0 rounded-2xl border bg-white shadow-sm overflow-hidden"
                style={{
                  width: "232px",
                  borderColor: `${column.color}33`,
                  background: `linear-gradient(180deg, ${column.color}0f 0%, #ffffff 42%)`,
                }}
              >
                <div className="p-4 text-center border-b border-gray-100">
                  <div
                    className="mx-auto -mt-1 mb-2 w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-black shadow-sm"
                    style={{ backgroundColor: column.color }}
                  >
                    {idx + 1}
                  </div>

                  <div className="text-4xl mb-2">{column.icon}</div>

                  <h3 className="text-base font-black text-gray-900 leading-tight">
                    {column.stage}
                  </h3>

                  <p className="text-xs text-gray-600 mt-2 leading-5 min-h-[48px]">
                    {column.description}
                  </p>

                  <div
                    className="text-sm font-bold mt-3"
                    style={{ color: column.color }}
                  >
                    {column.members.length} {column.members.length === 1 ? "child" : "children"}
                  </div>
                </div>

                <div className="p-3 space-y-3 max-h-[calc(100vh-430px)] overflow-y-auto">
                  {column.members.length === 0 ? (
                    <div className="rounded-xl border-2 border-dashed border-gray-200 py-6 text-center">
                      <p className="text-xs text-gray-300">No children</p>
                    </div>
                  ) : (
                    column.members.map((member) => (
                      <ChildPipelineCard
                        key={member.id}
                        member={member}
                        color={column.color}
                        onMove={() => openMove(member)}
                      />
                    ))
                  )}
                </div>
              </div>
            ))}

            {unassigned.length > 0 && (
              <div
                className="flex-shrink-0 rounded-2xl border bg-white shadow-sm overflow-hidden"
                style={{ width: "232px" }}
              >
                <div className="p-4 text-center border-b border-gray-100">
                  <div className="text-3xl mb-2">❔</div>
                  <h3 className="text-base font-black text-gray-500">Unassigned</h3>
                  <p className="text-xs text-gray-500 mt-2">
                    Children who need a pipeline stage.
                  </p>
                  <div className="text-sm font-bold mt-3 text-gray-400">
                    {unassigned.length} children
                  </div>
                </div>

                <div className="p-3 space-y-3 max-h-[calc(100vh-430px)] overflow-y-auto">
                  {unassigned.map((member) => (
                    <ChildPipelineCard
                      key={member.id}
                      member={member}
                      color="#9ca3af"
                      onMove={() => openMove(member)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-blue-900 font-black flex items-center gap-2">
              🛠️ Make It Your Own
            </h3>
            <p className="text-sm text-blue-800 mt-1">
              Every church is unique. Customize stage names, descriptions, goals, and what moves a child from one step to the next.
            </p>
          </div>

          <button
            type="button"
            className="px-5 py-3 bg-white border border-blue-200 rounded-xl text-sm font-bold text-blue-700 hover:bg-blue-100 transition-colors"
          >
            Customize Pipeline
          </button>
        </div>
      </div>

      {moveModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
          onClick={() => setMoveModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-100">
              <h2
                className="text-lg font-bold text-gray-900"
                style={{ fontFamily: "Georgia, serif" }}
              >
                Move {moveModal.member.first_name} {moveModal.member.last_name}
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Current: <strong>{moveModal.member.pipeline_stage ?? "Unassigned"}</strong>
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  Select new stage
                </label>

                <div className="space-y-2">
                  {stages.map((stage, idx) => {
                    const color = STAGE_COLORS[Math.min(idx, STAGE_COLORS.length - 1)];
                    const isSelected = selectedStage === stage;

                    return (
                      <button
                        key={stage}
                        type="button"
                        onClick={() => setSelectedStage(stage)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 transition-all text-left"
                        style={{
                          borderColor: isSelected ? color : "#e5e7eb",
                          backgroundColor: isSelected ? color + "11" : "white",
                        }}
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                          style={{ backgroundColor: color + "22" }}
                        >
                          {stageIcon(stage)}
                        </div>
                        <span className="text-sm font-medium text-gray-800">{stage}</span>
                        {isSelected && (
                          <span className="ml-auto text-xs font-bold" style={{ color }}>
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Note (optional)
                </label>
                <input
                  value={moveNote}
                  onChange={(e) => setMoveNote(e.target.value)}
                  placeholder="Reason for stage change…"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setMoveModal(null)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={moveStage}
                  disabled={moving || !selectedStage}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{ backgroundColor: ACCENT }}
                >
                  {moving ? "Moving…" : "Move"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MinistryShell>
  );
}

function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: string;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
      <div className="text-2xl">{icon}</div>
      <div className="text-2xl font-black text-gray-900 mt-1">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}

function ChildPipelineCard({
  member,
  color,
  onMove,
}: {
  member: PipelineMember;
  color: string;
  onMove: () => void;
}) {
  return (
    <div
      className="bg-white rounded-xl shadow-sm p-3 border border-gray-100 hover:shadow-md transition-all cursor-pointer group"
      onClick={onMove}
      style={{ borderLeft: `4px solid ${color}` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-black text-gray-900 truncate">
            {member.first_name} {member.last_name}
          </p>

          <div className="mt-2 space-y-1">
            {member.weeks_attending > 0 && (
              <p className="text-xs text-gray-500">
                📅 Visits/Weeks: {member.weeks_attending}
              </p>
            )}

            {member.last_contact_date && (
              <p className="text-xs text-gray-500">
                Last touch: {fmtDate(member.last_contact_date)}
              </p>
            )}
          </div>
        </div>

        <span className="text-gray-300 group-hover:text-orange-400 transition-colors">
          ⇄
        </span>
      </div>

      <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-50">
        <Link
          href={`/dashboard/members/${member.id}/edit`}
          onClick={(e) => e.stopPropagation()}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          View profile →
        </Link>

        <span className="text-xs text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
          Move
        </span>
      </div>
    </div>
  );
}