"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AppShell, { type NavItem } from "@/components/layout/AppShell";

const supabase = createClient();

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Members", href: "/dashboard/members" },
  { label: "Departments", href: "/dashboard/departments" },
  { label: "Attendance", href: "/dashboard/attendance" },
  { label: "Visitors", href: "/dashboard/visitors" },
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

type Sequence = {
  id: string;
  name: string;
  department_id: string | null;
  department_name: string | null;
  is_active: boolean;
  step_count: number;
  active_enrollments: number;
};

type Step = {
  id: string;
  step_number: number;
  day_offset: number;
  step_type: string;
  email_subject: string | null;
  email_body: string | null;
  task_description: string | null;
  assigned_to_role: string | null;
};

type Department = { id: string; name: string };

export default function SequencesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedSeq, setSelectedSeq] = useState<Sequence | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [stepsLoading, setStepsLoading] = useState(false);

  // Create sequence modal
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDept, setNewDept] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Add step modal
  const [showAddStep, setShowAddStep] = useState(false);
  const [stepType, setStepType] = useState<"email" | "task">("email");
  const [stepDayOffset, setStepDayOffset] = useState(0);
  const [stepEmailSubject, setStepEmailSubject] = useState("");
  const [stepEmailBody, setStepEmailBody] = useState("");
  const [stepTaskDesc, setStepTaskDesc] = useState("");
  const [stepRole, setStepRole] = useState("staff");
  const [addingStep, setAddingStep] = useState(false);
  const [stepError, setStepError] = useState("");

  // Edit step
  const [editingStep, setEditingStep] = useState<Step | null>(null);

  // Process
  const [processing, setProcessing] = useState(false);
  const [processResult, setProcessResult] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!user || error) {
        console.log("Dashboard client user unavailable:", error?.message ?? null);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setToken(session.access_token);

      const [sRes, dRes] = await Promise.all([
        fetch("/api/visitor-sequences", { headers: { Authorization: `Bearer ${session.access_token}` } }),
        fetch("/api/departments", { headers: { Authorization: `Bearer ${session.access_token}` } }),
      ]);
      const sData = await sRes.json();
      const dData = await dRes.json();
      setSequences(sData.sequences ?? []);
      setDepartments(dData.departments ?? []);
      setLoading(false);
    }
    init();
  }, []);

  async function loadSteps(seq: Sequence) {
    if (!token) return;
    setSelectedSeq(seq);
    setStepsLoading(true);
    setEditingStep(null);
    const res = await fetch(`/api/visitor-sequences/${seq.id}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setSteps(data.steps ?? []);
    setStepsLoading(false);
  }

  async function handleCreate() {
    if (!token || !newName.trim()) { setCreateError("Name is required."); return; }
    setCreating(true);
    setCreateError("");
    const res = await fetch("/api/visitor-sequences", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: newName, departmentId: newDept || null }),
    });
    const data = await res.json();
    if (!res.ok) { setCreateError(data.error ?? "Failed."); setCreating(false); return; }
    const sRes = await fetch("/api/visitor-sequences", { headers: { Authorization: `Bearer ${token}` } });
    const sData = await sRes.json();
    setSequences(sData.sequences ?? []);
    setShowCreate(false);
    setNewName(""); setNewDept("");
    setCreating(false);
  }

  async function handleToggleActive(seq: Sequence) {
    if (!token) return;
    await fetch(`/api/visitor-sequences/${seq.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ isActive: !seq.is_active }),
    });
    setSequences((prev) => prev.map((s) => s.id === seq.id ? { ...s, is_active: !s.is_active } : s));
    if (selectedSeq?.id === seq.id) setSelectedSeq((prev) => prev ? { ...prev, is_active: !prev.is_active } : prev);
  }

  async function handleDeleteSeq(seq: Sequence) {
    if (!token || !confirm(`Delete "${seq.name}"? This cannot be undone.`)) return;
    await fetch(`/api/visitor-sequences/${seq.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setSequences((prev) => prev.filter((s) => s.id !== seq.id));
    if (selectedSeq?.id === seq.id) { setSelectedSeq(null); setSteps([]); }
  }

  async function handleAddStep() {
    if (!token || !selectedSeq) return;
    if (stepType === "email" && !stepEmailSubject.trim()) { setStepError("Email subject is required."); return; }
    if (stepType === "task" && !stepTaskDesc.trim()) { setStepError("Task description is required."); return; }
    setAddingStep(true);
    setStepError("");
    const res = await fetch(`/api/visitor-sequences/${selectedSeq.id}/steps`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        stepType, dayOffset: stepDayOffset,
        emailSubject: stepEmailSubject, emailBody: stepEmailBody,
        taskDescription: stepTaskDesc, assignedToRole: stepRole,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setStepError(data.error ?? "Failed."); setAddingStep(false); return; }
    await loadSteps(selectedSeq);
    setShowAddStep(false);
    setStepType("email"); setStepDayOffset(0);
    setStepEmailSubject(""); setStepEmailBody(""); setStepTaskDesc(""); setStepRole("staff");
    setAddingStep(false);
    setSequences((prev) => prev.map((s) => s.id === selectedSeq.id ? { ...s, step_count: s.step_count + 1 } : s));
  }

  async function handleSaveStep(step: Step) {
    if (!token || !selectedSeq) return;
    await fetch(`/api/visitor-sequences/${selectedSeq.id}/steps/${step.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        dayOffset: step.day_offset,
        emailSubject: step.email_subject,
        emailBody: step.email_body,
        taskDescription: step.task_description,
        assignedToRole: step.assigned_to_role,
      }),
    });
    setEditingStep(null);
  }

  async function handleDeleteStep(step: Step) {
    if (!token || !selectedSeq || !confirm("Delete this step?")) return;
    await fetch(`/api/visitor-sequences/${selectedSeq.id}/steps/${step.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setSteps((prev) => prev.filter((s) => s.id !== step.id));
    setSequences((prev) => prev.map((s) => s.id === selectedSeq.id ? { ...s, step_count: Math.max(0, s.step_count - 1) } : s));
  }

  async function handleProcess() {
    if (!token) return;
    setProcessing(true);
    setProcessResult(null);
    const res = await fetch("/api/visitor-sequences/process", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setProcessResult(`Processed ${data.processed ?? 0} enrollment${data.processed === 1 ? "" : "s"}.`);
    setProcessing(false);
  }

  function resetStepForm() {
    setStepType("email"); setStepDayOffset(0);
    setStepEmailSubject(""); setStepEmailBody(""); setStepTaskDesc(""); setStepRole("staff");
    setStepError("");
  }

  if (loading) {
    return (
      <AppShell navItems={navItems}>
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-400">Loading…</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell navItems={navItems}>
      {/* Hero */}
      <div className="px-8 py-8" style={{ background: "linear-gradient(135deg, #1A4A2E 0%, #2D6B42 100%)" }}>
        <div className="flex items-center justify-between">
          <div>
            <Link href="/dashboard/visitors" className="text-green-300 text-sm hover:text-white transition-colors">← Visitors</Link>
            <h1 className="text-2xl font-bold text-white mt-1" style={{ fontFamily: "Georgia, serif" }}>
              📬 Onboarding Sequences
            </h1>
            <p className="text-green-200 text-sm mt-1">Build automated follow-up journeys for new visitors</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleProcess}
              disabled={processing}
              className="px-4 py-2 rounded-lg text-sm font-semibold border border-white/30 text-white hover:bg-white/10 transition-colors"
            >
              {processing ? "Running…" : "▶ Run Sequences"}
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="px-5 py-2.5 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "#F28C28", color: "#1A4A2E" }}
            >
              + New Sequence
            </button>
          </div>
        </div>
        {processResult && (
          <p className="text-green-100 text-sm mt-3 bg-white/10 px-4 py-2 rounded-lg inline-block">{processResult}</p>
        )}
      </div>

      <div className="px-8 py-6 bg-gray-50 min-h-screen flex gap-6">
        {/* Sequence list */}
        <div className="w-72 flex-shrink-0 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Sequences</p>
          {sequences.length === 0 && (
            <div className="bg-white rounded-xl border border-dashed border-gray-200 p-8 text-center">
              <p className="text-gray-400 text-sm">No sequences yet.</p>
              <button onClick={() => setShowCreate(true)} className="mt-3 text-sm font-semibold text-green-700 hover:underline">Create one →</button>
            </div>
          )}
          {sequences.map((seq) => (
            <div
              key={seq.id}
              onClick={() => loadSteps(seq)}
              className={`bg-white rounded-xl border shadow-sm px-4 py-4 cursor-pointer transition-all ${selectedSeq?.id === seq.id ? "border-green-600 ring-1 ring-green-600" : "border-gray-100 hover:border-gray-200"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{seq.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {seq.department_name ? seq.department_name : "Church-wide (default)"}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${seq.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                  {seq.is_active ? "Active" : "Off"}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs text-gray-500">{seq.step_count} step{seq.step_count !== 1 ? "s" : ""}</span>
                <span className="text-xs text-amber-600">{seq.active_enrollments} active</span>
              </div>
            </div>
          ))}
        </div>

        {/* Step builder */}
        <div className="flex-1 min-w-0">
          {!selectedSeq ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
              <div className="text-5xl mb-4">📬</div>
              <p className="text-gray-500 font-medium" style={{ fontFamily: "Georgia, serif" }}>Select a sequence to edit its steps</p>
              <p className="text-gray-400 text-sm mt-1">Or create a new sequence to get started.</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4">
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="font-bold text-gray-900 text-lg" style={{ fontFamily: "Georgia, serif" }}>{selectedSeq.name}</h2>
                    <p className="text-sm text-gray-400 mt-0.5">
                      {selectedSeq.department_name ? `For ${selectedSeq.department_name} visitors` : "Church-wide default sequence"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(selectedSeq)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${selectedSeq.is_active ? "bg-gray-100 text-gray-600 hover:bg-gray-200" : "bg-green-100 text-green-700 hover:bg-green-200"}`}
                    >
                      {selectedSeq.is_active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => handleDeleteSeq(selectedSeq)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => { resetStepForm(); setShowAddStep(true); }}
                      className="px-4 py-1.5 rounded-lg text-xs font-bold text-white hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: "#1A4A2E" }}
                    >
                      + Add Step
                    </button>
                  </div>
                </div>

                <div className="px-6 py-5">
                  {stepsLoading ? (
                    <p className="text-gray-400 text-sm">Loading steps…</p>
                  ) : steps.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-400 text-sm mb-3">No steps yet. Add the first step to this sequence.</p>
                      <button
                        onClick={() => { resetStepForm(); setShowAddStep(true); }}
                        className="px-4 py-2 rounded-lg text-sm font-bold text-white"
                        style={{ backgroundColor: "#1A4A2E" }}
                      >
                        + Add Step
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Timeline line */}
                      <div className="absolute left-5 top-6 bottom-0 w-px bg-gray-200" />
                      <div className="space-y-4">
                        {steps.map((step, idx) => (
                          <div key={step.id} className="relative flex gap-4">
                            {/* Step number bubble */}
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 z-10"
                              style={{ backgroundColor: step.step_type === "email" ? "#1A4A2E" : "#F28C28" }}
                            >
                              {step.step_number}
                            </div>
                            <div className="flex-1 bg-gray-50 rounded-xl px-5 py-4 border border-gray-100">
                              {editingStep?.id === step.id ? (
                                /* Edit form */
                                <div className="space-y-3">
                                  <div className="flex gap-3">
                                    <div className="flex-1">
                                      <label className="block text-xs font-medium text-gray-600 mb-1">Day offset</label>
                                      <input
                                        type="number" min={0}
                                        value={editingStep.day_offset}
                                        onChange={(e) => setEditingStep({ ...editingStep, day_offset: Number(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-700"
                                      />
                                    </div>
                                    <div className="flex-1">
                                      <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                                      <select
                                        value={editingStep.step_type}
                                        onChange={(e) => setEditingStep({ ...editingStep, step_type: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-green-700"
                                      >
                                        <option value="email">Email</option>
                                        <option value="task">Task</option>
                                      </select>
                                    </div>
                                  </div>
                                  {editingStep.step_type === "email" ? (
                                    <>
                                      <input
                                        type="text"
                                        value={editingStep.email_subject ?? ""}
                                        onChange={(e) => setEditingStep({ ...editingStep, email_subject: e.target.value })}
                                        placeholder="Email subject"
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-700"
                                      />
                                      <textarea
                                        value={editingStep.email_body ?? ""}
                                        onChange={(e) => setEditingStep({ ...editingStep, email_body: e.target.value })}
                                        rows={4}
                                        placeholder="Email body…"
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:border-green-700"
                                      />
                                    </>
                                  ) : (
                                    <>
                                      <textarea
                                        value={editingStep.task_description ?? ""}
                                        onChange={(e) => setEditingStep({ ...editingStep, task_description: e.target.value })}
                                        rows={2}
                                        placeholder="Task description"
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:border-green-700"
                                      />
                                      <select
                                        value={editingStep.assigned_to_role ?? "staff"}
                                        onChange={(e) => setEditingStep({ ...editingStep, assigned_to_role: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-green-700"
                                      >
                                        <option value="staff">Staff</option>
                                        <option value="pastor">Pastor</option>
                                      </select>
                                    </>
                                  )}
                                  <div className="flex gap-2 pt-1">
                                    <button onClick={() => handleSaveStep(editingStep)}
                                      className="px-4 py-1.5 rounded-lg text-xs font-bold text-white" style={{ backgroundColor: "#1A4A2E" }}>Save</button>
                                    <button onClick={() => setEditingStep(null)}
                                      className="px-4 py-1.5 rounded-lg text-xs font-semibold text-gray-500 border border-gray-200">Cancel</button>
                                  </div>
                                </div>
                              ) : (
                                /* Display */
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${step.step_type === "email" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>
                                        {step.step_type === "email" ? "✉ Email" : "✓ Task"}
                                      </span>
                                      <span className="text-xs text-gray-400">
                                        Day {step.day_offset}{step.day_offset === 0 ? " (immediately)" : ""}
                                      </span>
                                    </div>
                                    {step.step_type === "email" ? (
                                      <>
                                        <p className="text-sm font-semibold text-gray-800">{step.email_subject || "No subject"}</p>
                                        {step.email_body && (
                                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{step.email_body}</p>
                                        )}
                                      </>
                                    ) : (
                                      <>
                                        <p className="text-sm font-semibold text-gray-800">{step.task_description || "No description"}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">Assigned to: {step.assigned_to_role ?? "staff"}</p>
                                      </>
                                    )}
                                  </div>
                                  <div className="flex gap-1 flex-shrink-0">
                                    <button onClick={() => setEditingStep(step)}
                                      className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors text-xs">Edit</button>
                                    <button onClick={() => handleDeleteStep(step)}
                                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors text-xs">Del</button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create Sequence Modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: "Georgia, serif" }}>New Sequence</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Sequence name *</label>
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Welcome Series"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-700" />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Department (optional)</label>
              <select value={newDept} onChange={(e) => setNewDept(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-green-700">
                <option value="">— Church-wide default —</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            {createError && <p className="text-sm text-red-600 mb-4">{createError}</p>}
            <button onClick={handleCreate} disabled={creating}
              className="w-full py-3 rounded-xl font-bold text-white hover:opacity-90 transition-opacity"
              style={{ backgroundColor: creating ? "#4b7a5e" : "#1A4A2E", fontFamily: "Georgia, serif" }}>
              {creating ? "Creating…" : "Create Sequence →"}
            </button>
          </div>
        </div>
      )}

      {/* Add Step Modal */}
      {showAddStep && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddStep(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: "Georgia, serif" }}>Add Step</h2>
              <button onClick={() => setShowAddStep(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            {/* Type toggle */}
            <div className="flex gap-2 mb-5 p-1 bg-gray-100 rounded-xl">
              {(["email", "task"] as const).map((t) => (
                <button key={t} onClick={() => setStepType(t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${stepType === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
                  {t === "email" ? "✉ Email" : "✓ Task"}
                </button>
              ))}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Send on day</label>
              <div className="flex items-center gap-2">
                <input type="number" min={0} value={stepDayOffset} onChange={(e) => setStepDayOffset(Number(e.target.value))}
                  className="w-24 px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-700" />
                <span className="text-sm text-gray-400">after enrollment {stepDayOffset === 0 ? "(immediately)" : ""}</span>
              </div>
            </div>

            {stepType === "email" ? (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject *</label>
                  <input type="text" value={stepEmailSubject} onChange={(e) => setStepEmailSubject(e.target.value)} placeholder="Welcome to our church!"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-700" />
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Body</label>
                  <textarea value={stepEmailBody} onChange={(e) => setStepEmailBody(e.target.value)} rows={5}
                    placeholder="Hi [Name], we're so glad you visited…"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:border-green-700" />
                </div>
              </>
            ) : (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Task description *</label>
                  <textarea value={stepTaskDesc} onChange={(e) => setStepTaskDesc(e.target.value)} rows={3}
                    placeholder="Call visitor to check in…"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:border-green-700" />
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Assign to</label>
                  <select value={stepRole} onChange={(e) => setStepRole(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-green-700">
                    <option value="staff">Staff</option>
                    <option value="pastor">Pastor</option>
                  </select>
                </div>
              </>
            )}

            {stepError && <p className="text-sm text-red-600 mb-4">{stepError}</p>}
            <button onClick={handleAddStep} disabled={addingStep}
              className="w-full py-3 rounded-xl font-bold text-white hover:opacity-90 transition-opacity"
              style={{ backgroundColor: addingStep ? "#4b7a5e" : "#1A4A2E", fontFamily: "Georgia, serif" }}>
              {addingStep ? "Adding…" : "Add Step →"}
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
