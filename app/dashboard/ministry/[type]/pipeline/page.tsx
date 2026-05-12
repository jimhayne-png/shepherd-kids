"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import MinistryShell from "@/components/layout/MinistryShell";
import { MINISTRY_CONFIG, STAGE_COLORS } from "@/lib/ministry-config";

const ACCENT = "#F28C28";


type PipelineMember = {
  id: string; first_name: string; last_name: string; email: string | null;
  pipeline_stage: string | null; weeks_attending: number; last_contact_date: string | null;
};

type MoveModal = { member: PipelineMember } | null;

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function PipelinePage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = use(params);
  const router = useRouter();
  const cfg = MINISTRY_CONFIG[type];

  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [members, setMembers] = useState<PipelineMember[]>([]);
  const [total, setTotal] = useState(0);
  const [moveModal, setMoveModal] = useState<MoveModal>(null);
  const [selectedStage, setSelectedStage] = useState("");
  const [moveNote, setMoveNote] = useState("");
  const [moving, setMoving] = useState(false);

  async function load(t: string) {
    const res = await fetch(`/api/ministry/${type}/pipeline`, { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) return;
    const data = await res.json();
    setMembers(data.members ?? []);
    setTotal(data.total ?? 0);
  }

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/"); return; }
      const t = session.access_token;
      setToken(t);
      await load(t);
      setLoading(false);
    }
    init();
  }, [type, router]);

  function openMove(member: PipelineMember) {
    setMoveModal({ member });
    setSelectedStage(member.pipeline_stage ?? cfg?.stages[0] ?? "");
    setMoveNote("");
  }

  async function moveStage() {
    if (!moveModal || !token || !selectedStage) return;
    setMoving(true);
    await fetch(`/api/ministry/${type}/pipeline/${moveModal.member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ pipeline_stage: selectedStage, note: moveNote }),
    });
    setMoving(false);
    setMoveModal(null);
    await load(token);
  }

  if (!cfg) return <MinistryShell type={type}><div className="p-8 text-gray-500">Ministry not found.</div></MinistryShell>;
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-gray-400">Loading…</div></div>;

  // Group members by stage
  const stageGroups: Record<string, PipelineMember[]> = {};
  for (const stage of cfg.stages) stageGroups[stage] = [];
  stageGroups["Unassigned"] = [];
  for (const m of members) {
    const matchedStage = m.pipeline_stage ? cfg.stages.find(s => s.toLowerCase() === m.pipeline_stage!.toLowerCase()) : undefined;
    const stage = matchedStage ?? "Unassigned";
    stageGroups[stage].push(m);
  }

  const columns = cfg.stages.map((stage, idx) => ({
    stage,
    members: stageGroups[stage] ?? [],
    color: STAGE_COLORS[Math.min(idx, STAGE_COLORS.length - 1)],
  }));

  // Add unassigned column only if any unassigned
  const unassigned = stageGroups["Unassigned"] ?? [];

  return (
    <MinistryShell type={type}>
      <div className="px-8 py-8" style={{ background: `linear-gradient(135deg, #c2570a 0%, ${ACCENT} 100%)` }}>
        <Link href={`/dashboard/ministry/${type}`} className="text-orange-200 text-xs mb-1 block hover:text-white">← {cfg.name}</Link>
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>Shepherd Pipeline</h1>
        <p className="text-orange-100 text-sm mt-1">{total} members · {cfg.stages.length} stages</p>
      </div>


      {/* Kanban board */}
      <div className="overflow-x-auto" style={{ backgroundColor: "#f9fafb", minHeight: "calc(100vh - 200px)" }}>
        <div className="flex gap-4 p-6" style={{ minWidth: `${(columns.length + (unassigned.length > 0 ? 1 : 0)) * 280 + 48}px` }}>

          {/* Stage columns */}
          {columns.map(col => (
            <div key={col.stage} className="flex-shrink-0" style={{ width: "272px" }}>
              {/* Column header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: col.color }} />
                  <span className="text-sm font-bold text-gray-700">{col.stage}</span>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: col.color }}>
                  {col.members.length}
                </span>
              </div>

              {/* Cards */}
              <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pb-4">
                {col.members.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed border-gray-200 py-6 text-center">
                    <p className="text-xs text-gray-300">No members</p>
                  </div>
                ) : col.members.map(m => (
                  <div
                    key={m.id}
                    className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 hover:border-orange-200 hover:shadow-md transition-all cursor-pointer group"
                    onClick={() => openMove(m)}
                    style={{ borderLeft: `4px solid ${col.color}` }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{m.first_name} {m.last_name}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {m.weeks_attending > 0 && (
                            <span className="text-xs text-gray-400">📅 {m.weeks_attending}w</span>
                          )}
                          {m.last_contact_date && (
                            <span className="text-xs text-gray-400">📞 {fmtDate(m.last_contact_date)}</span>
                          )}
                        </div>
                      </div>
                      <span className="text-gray-300 text-lg group-hover:text-orange-400 transition-colors flex-shrink-0">⇄</span>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                      <Link
                        href={`/dashboard/members/${m.id}/edit`}
                        onClick={e => e.stopPropagation()}
                        className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        View member →
                      </Link>
                      <span className="text-xs text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity font-medium">Click to move</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Unassigned column */}
          {unassigned.length > 0 && (
            <div className="flex-shrink-0" style={{ width: "272px" }}>
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full flex-shrink-0 bg-gray-300" />
                  <span className="text-sm font-bold text-gray-400">Unassigned</span>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-500">{unassigned.length}</span>
              </div>
              <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pb-4">
                {unassigned.map(m => (
                  <div key={m.id} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 border-l-4 border-l-gray-300 hover:border-orange-200 hover:shadow-md transition-all cursor-pointer group" onClick={() => openMove(m)}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-gray-900 truncate">{m.first_name} {m.last_name}</p>
                      <span className="text-gray-300 group-hover:text-orange-400 transition-colors">⇄</span>
                    </div>
                    <p className="text-xs text-orange-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Click to assign stage</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Move Stage Modal */}
      {moveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={() => setMoveModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: "Georgia, serif" }}>
                Move {moveModal.member.first_name} {moveModal.member.last_name}
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Current: <strong>{moveModal.member.pipeline_stage ?? "Unassigned"}</strong>
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Select new stage</label>
                <div className="space-y-2">
                  {cfg.stages.map((stage, idx) => {
                    const color = STAGE_COLORS[Math.min(idx, STAGE_COLORS.length - 1)];
                    const isSelected = selectedStage === stage;
                    return (
                      <button
                        key={stage}
                        onClick={() => setSelectedStage(stage)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 transition-all text-left"
                        style={{ borderColor: isSelected ? color : "#e5e7eb", backgroundColor: isSelected ? color + "11" : "white" }}
                      >
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-sm font-medium text-gray-800">{stage}</span>
                        {isSelected && <span className="ml-auto text-xs font-bold" style={{ color }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Note (optional)</label>
                <input value={moveNote} onChange={e => setMoveNote(e.target.value)} placeholder="Reason for stage change…" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setMoveModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">Cancel</button>
                <button onClick={moveStage} disabled={moving || !selectedStage} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: ACCENT }}>
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
