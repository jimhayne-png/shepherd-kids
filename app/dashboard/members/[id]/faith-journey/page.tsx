"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AppShell, { type NavItem } from "@/components/layout/AppShell";

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Members", href: "/dashboard/members" },
  { label: "Departments", href: "/dashboard/departments" },
  { label: "Attendance", href: "/dashboard/attendance" },
  { label: "Calendar", href: "/dashboard/calendar" },
  { label: "Prayer", href: "/dashboard/prayer" },
  { label: "Bulletin", href: "/dashboard/bulletin" },
  { label: "Communication Hub", href: "/dashboard/communication" },
  { label: "Visitation", href: "/dashboard/visitation" },
  { label: "Shepherd Pipeline", href: "/dashboard/shepherd" },
  { label: "Reviews", href: "/dashboard/reviews" },
  { label: "Evangelism", href: "/dashboard/evangelism" },
  { label: "Birthdays", href: "/dashboard/birthdays" },
  { label: "Tutorials", href: "/dashboard/tutorials" },
  { label: "Settings", href: "/dashboard/settings" },
];

const DEFAULT_MILESTONES = [
  { type: "first_visit", label: "First Visit", icon: "⛪", description: "When they first walked through the doors", isPrivate: false },
  { type: "salvation", label: "Salvation", icon: "✝️", description: "Accepted Jesus as Lord and Savior", isPrivate: false },
  { type: "water_baptism", label: "Water Baptism", icon: "💧", description: "Publicly declared faith through baptism", isPrivate: false },
  { type: "church_membership", label: "Church Membership", icon: "📜", description: "Became an official church member", isPrivate: false },
  { type: "discipleship_class", label: "Discipleship Class", icon: "📖", description: "Completed discipleship training", isPrivate: false },
  { type: "small_group", label: "Small Group", icon: "🤝", description: "Joined a small group or Bible study", isPrivate: false },
  { type: "volunteerism", label: "Volunteerism", icon: "⭐", description: "Started serving in the church", isPrivate: false },
  { type: "leadership", label: "Leadership", icon: "👑", description: "Stepped into a leadership role", isPrivate: false },
  { type: "missions", label: "Missions", icon: "🌍", description: "Participated in a missions effort", isPrivate: false },
  { type: "tithing", label: "Tithing", icon: "💰", description: "Committed to regular tithing", isPrivate: true },
];

const CUSTOM_ICONS = ["⭐", "🔥", "🌱", "🕊️", "🎯", "🙏", "💡", "🎵", "📣", "🌟", "🏆", "❤️"];

type FaithRecord = {
  id: string;
  milestone_type: string;
  is_completed: boolean;
  completed_at: string | null;
  notes: string | null;
  is_private: boolean;
};

type CustomMilestone = {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
};

type PipelineItem = {
  type: string;
  label: string;
  icon: string;
  description: string;
  isPrivate: boolean;
};

type EditState = {
  item: PipelineItem;
  record: FaithRecord | null;
  isCompleted: boolean;
  completedAt: string;
  notes: string;
};

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function FaithJourneyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [authLoading, setAuthLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [member, setMember] = useState<{ first_name: string; last_name: string } | null>(null);
  const [records, setRecords] = useState<FaithRecord[]>([]);
  const [customMilestones, setCustomMilestones] = useState<CustomMilestone[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editError, setEditError] = useState("");

  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customIcon, setCustomIcon] = useState("⭐");
  const [customDate, setCustomDate] = useState("");
  const [customNotes, setCustomNotes] = useState("");
  const [addingCustom, setAddingCustom] = useState(false);
  const [customError, setCustomError] = useState("");

  const loadMilestones = useCallback(async (tok: string) => {
    const res = await fetch(`/api/faith-milestones?memberId=${id}`, {
      headers: { Authorization: `Bearer ${tok}` },
    });
    const data = await res.json();
    if (res.ok) {
      setRecords(data.records ?? []);
      setCustomMilestones(data.customMilestones ?? []);
    }
    setDataLoading(false);
  }, [id]);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/"); return; }
      setToken(session.access_token);

      const { data: cu } = await supabase
        .from("church_users").select("church_id").eq("user_id", session.user.id).maybeSingle();
      if (!cu) { router.replace("/onboarding"); return; }

      const res = await fetch(`/api/members/${id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const d = await res.json();
      if (res.ok && d.member) {
        setMember({ first_name: d.member.first_name, last_name: d.member.last_name });
      }

      setAuthLoading(false);
      await loadMilestones(session.access_token);
    }
    init();
  }, [router, id, loadMilestones]);

  const pipeline: PipelineItem[] = [
    ...DEFAULT_MILESTONES,
    ...customMilestones.map(cm => ({
      type: cm.id,
      label: cm.name,
      icon: cm.icon || "⭐",
      description: "Custom church milestone",
      isPrivate: false,
    })),
  ];

  const knownTypes = new Set(pipeline.map(p => p.type));
  const memberCustomRecords = records.filter(r => !knownTypes.has(r.milestone_type));

  const completedCount = pipeline.filter(item => {
    const rec = records.find(r => r.milestone_type === item.type);
    return rec?.is_completed;
  }).length + memberCustomRecords.filter(r => r.is_completed).length;
  const totalCount = pipeline.length + memberCustomRecords.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  function openEdit(item: PipelineItem) {
    const record = records.find(r => r.milestone_type === item.type) ?? null;
    setEditState({
      item,
      record,
      isCompleted: record?.is_completed ?? false,
      completedAt: record?.completed_at ?? "",
      notes: record?.notes ?? "",
    });
    setEditError("");
  }

  async function handleSave() {
    if (!token || !editState) return;
    setSaving(true);
    setEditError("");

    const payload = {
      memberId: id,
      milestoneType: editState.item.type,
      isCompleted: editState.isCompleted,
      completedAt: editState.isCompleted ? editState.completedAt : null,
      notes: editState.notes,
      isPrivate: editState.item.isPrivate,
    };

    let res: Response;
    if (editState.record) {
      res = await fetch(`/api/faith-milestones/${editState.record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
    } else {
      res = await fetch("/api/faith-milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
    }

    const data = await res.json();
    if (!res.ok) { setEditError(data.error ?? "Failed to save"); setSaving(false); return; }
    setEditState(null);
    setSaving(false);
    await loadMilestones(token);
  }

  async function handleDelete() {
    if (!token || !editState?.record) return;
    setDeleting(true);
    const res = await fetch(`/api/faith-milestones/${editState.record.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setEditState(null);
      await loadMilestones(token);
    }
    setDeleting(false);
  }

  async function handleAddCustom() {
    if (!token || !customName.trim()) { setCustomError("Please enter a milestone name."); return; }
    setAddingCustom(true);
    setCustomError("");

    const res = await fetch("/api/faith-milestones", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        memberId: id,
        milestoneType: `custom:${customIcon} ${customName.trim()}`,
        isCompleted: true,
        completedAt: customDate || null,
        notes: customNotes.trim() || null,
        isPrivate: false,
      }),
    });

    const data = await res.json();
    if (!res.ok) { setCustomError(data.error ?? "Failed to add"); setAddingCustom(false); return; }
    setShowAddCustom(false);
    setCustomName("");
    setCustomIcon("⭐");
    setCustomDate("");
    setCustomNotes("");
    setAddingCustom(false);
    await loadMilestones(token);
  }

  function parseMemberCustomLabel(milestoneType: string) {
    const rest = milestoneType.startsWith("custom:") ? milestoneType.slice(7) : milestoneType;
    return { label: rest, icon: "" };
  }

  const inputCls = "w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-800 bg-white";

  if (authLoading || dataLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-gray-500">Loading…</div></div>;
  }

  const memberName = member ? `${member.first_name} ${member.last_name}` : "Member";

  return (
    <>
    <AppShell navItems={navItems}>
      {/* Hero */}
      <div className="px-8 py-8" style={{ background: "linear-gradient(135deg, #1A4A2E 0%, #2D6B42 100%)" }}>
        <Link href={`/dashboard/members/${id}/edit`} className="text-green-300 hover:text-white text-sm transition-colors block mb-2">
          ← {memberName}
        </Link>
        <h1 className="text-3xl font-bold text-white">{memberName}</h1>
        <p className="text-green-200 text-sm mt-1">Faith Journey</p>

        {/* Progress bar */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-white">{completedCount} of {totalCount} milestones completed</span>
            <span className="text-sm font-bold" style={{ color: "#F28C28" }}>{progressPct}%</span>
          </div>
          <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%`, backgroundColor: "#F28C28" }}
            />
          </div>
        </div>
      </div>

      <div className="px-6 py-8 bg-gray-50 min-h-screen max-w-2xl">

        {/* Pipeline */}
        <div className="relative">
          {pipeline.map((item, idx) => {
            const record = records.find(r => r.milestone_type === item.type);
            const completed = record?.is_completed ?? false;
            const isLast = idx === pipeline.length - 1 && memberCustomRecords.length === 0;
            return (
              <div key={item.type} className="flex gap-4 mb-0">
                {/* Left: connector */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 flex-shrink-0 z-10 shadow-sm"
                    style={{
                      backgroundColor: completed ? "#1A4A2E" : "#fff",
                      borderColor: completed ? "#1A4A2E" : "#d1d5db",
                    }}
                  >
                    {completed
                      ? <span className="text-white text-sm font-bold">✓</span>
                      : <span>{item.icon}</span>
                    }
                  </div>
                  {!isLast && <div className="w-0.5 flex-1 min-h-[24px]" style={{ backgroundColor: completed ? "#1A4A2E" : "#e5e7eb" }} />}
                </div>

                {/* Right: card */}
                <div className="flex-1 pb-4">
                  <div
                    className="bg-white rounded-xl border shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow"
                    style={{ borderColor: completed ? "#bbf7d0" : "#f3f4f6" }}
                    onClick={() => openEdit(item)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base font-semibold text-gray-900">{item.icon} {item.label}</span>
                          {item.isPrivate && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 font-medium">Private</span>
                          )}
                          {completed && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium text-white" style={{ backgroundColor: "#1A4A2E" }}>Completed</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
                        {completed && record?.completed_at && (
                          <p className="text-xs mt-1.5 font-medium" style={{ color: "#1A4A2E" }}>
                            {formatDate(record.completed_at)}
                          </p>
                        )}
                        {record?.notes && (
                          <p className="text-xs text-gray-500 mt-1 italic">"{record.notes}"</p>
                        )}
                      </div>
                      <button
                        className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors"
                        style={completed
                          ? { borderColor: "#bbf7d0", color: "#1A4A2E", backgroundColor: "#f0fdf4" }
                          : { borderColor: "#d1d5db", color: "#6b7280", backgroundColor: "#fff" }
                        }
                        onClick={e => { e.stopPropagation(); openEdit(item); }}
                      >
                        {completed ? "Edit" : "Mark Complete"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Member-specific custom milestones */}
          {memberCustomRecords.map((rec, idx) => {
            const { label } = parseMemberCustomLabel(rec.milestone_type);
            const isLast = idx === memberCustomRecords.length - 1;
            return (
              <div key={rec.id} className="flex gap-4 mb-0">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 flex-shrink-0 z-10 shadow-sm"
                    style={{ backgroundColor: "#1A4A2E", borderColor: "#1A4A2E" }}
                  >
                    <span className="text-white text-sm font-bold">✓</span>
                  </div>
                  {!isLast && <div className="w-0.5 flex-1 min-h-[24px]" style={{ backgroundColor: "#1A4A2E" }} />}
                </div>
                <div className="flex-1 pb-4">
                  <div className="bg-white rounded-xl border shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow" style={{ borderColor: "#bbf7d0" }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-semibold text-gray-900">{label}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200 font-medium">Custom</span>
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium text-white" style={{ backgroundColor: "#1A4A2E" }}>Completed</span>
                        </div>
                        {rec.completed_at && (
                          <p className="text-xs mt-1.5 font-medium" style={{ color: "#1A4A2E" }}>{formatDate(rec.completed_at)}</p>
                        )}
                        {rec.notes && (
                          <p className="text-xs text-gray-500 mt-1 italic">"{rec.notes}"</p>
                        )}
                      </div>
                      <button
                        className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors"
                        style={{ borderColor: "#bbf7d0", color: "#1A4A2E", backgroundColor: "#f0fdf4" }}
                        onClick={async () => {
                          if (!token || !confirm(`Remove this milestone?`)) return;
                          await fetch(`/api/faith-milestones/${rec.id}`, {
                            method: "DELETE",
                            headers: { Authorization: `Bearer ${token}` },
                          });
                          await loadMilestones(token);
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Custom Milestone */}
        <div className="mt-4 pb-8">
          <button
            onClick={() => setShowAddCustom(true)}
            className="w-full py-3 rounded-xl border-2 border-dashed text-sm font-semibold transition-colors"
            style={{ borderColor: "#1A4A2E", color: "#1A4A2E" }}
          >
            + Add Custom Milestone
          </button>
        </div>
      </div>
    </AppShell>

    {/* Edit milestone modal */}
    {editState && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
        onClick={e => { if (e.target === e.currentTarget) setEditState(null); }}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {editState.item.icon} {editState.item.label}
            </h2>
            <button onClick={() => setEditState(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
          </div>

          <div className="space-y-4">
            {/* Completed toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div>
                <p className="text-sm font-semibold text-gray-800">Mark as Completed</p>
                <p className="text-xs text-gray-400 mt-0.5">{editState.item.description}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditState(s => s ? { ...s, isCompleted: !s.isCompleted } : s)}
                className="relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0"
                style={{ backgroundColor: editState.isCompleted ? "#1A4A2E" : "#d1d5db" }}
                aria-pressed={editState.isCompleted}
              >
                <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
                  style={{ transform: editState.isCompleted ? "translateX(20px)" : "translateX(0)" }} />
              </button>
            </div>

            {editState.isCompleted && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Completed</label>
                <input
                  type="date"
                  value={editState.completedAt}
                  onChange={e => setEditState(s => s ? { ...s, completedAt: e.target.value } : s)}
                  className={inputCls}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={editState.notes}
                onChange={e => setEditState(s => s ? { ...s, notes: e.target.value } : s)}
                placeholder="Any notes about this milestone…"
                rows={3}
                className={inputCls + " resize-none"}
              />
            </div>

            {editState.item.isPrivate && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                🔒 This milestone is marked as private and is only visible to admins.
              </p>
            )}

            {editError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{editError}</p>
            )}
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 rounded-lg font-semibold text-sm text-white disabled:opacity-60 hover:opacity-90 transition-opacity"
                style={{ backgroundColor: "#1A4A2E" }}
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => setEditState(null)}
                className="px-5 py-2.5 rounded-lg font-medium text-sm border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
            {editState.record && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2.5 rounded-lg font-medium text-sm border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
              >
                {deleting ? "…" : "Remove"}
              </button>
            )}
          </div>
        </div>
      </div>
    )}

    {/* Add custom milestone modal */}
    {showAddCustom && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
        onClick={e => { if (e.target === e.currentTarget) setShowAddCustom(false); }}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Add Custom Milestone</h2>
            <button onClick={() => setShowAddCustom(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Milestone Name <span className="text-red-500">*</span></label>
              <input
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                placeholder="e.g. Alpha Course, Fasting Challenge…"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
              <div className="flex flex-wrap gap-2">
                {CUSTOM_ICONS.map(ico => (
                  <button
                    key={ico}
                    type="button"
                    onClick={() => setCustomIcon(ico)}
                    className="w-10 h-10 rounded-lg border-2 text-xl flex items-center justify-center transition-colors"
                    style={{
                      borderColor: customIcon === ico ? "#1A4A2E" : "#e5e7eb",
                      backgroundColor: customIcon === ico ? "#f0fdf4" : "#fff",
                    }}
                  >
                    {ico}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Completed</label>
              <input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)} className={inputCls} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={customNotes}
                onChange={e => setCustomNotes(e.target.value)}
                placeholder="Any details about this milestone…"
                rows={2}
                className={inputCls + " resize-none"}
              />
            </div>

            {customError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{customError}</p>
            )}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={handleAddCustom}
              disabled={addingCustom}
              className="flex-1 py-2.5 rounded-lg font-semibold text-sm text-white disabled:opacity-60 hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "#1A4A2E" }}
            >
              {addingCustom ? "Adding…" : "Add Milestone"}
            </button>
            <button
              onClick={() => setShowAddCustom(false)}
              className="flex-1 py-2.5 rounded-lg font-medium text-sm border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
