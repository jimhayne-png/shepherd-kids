"use client";

import { use, useEffect, useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import MinistryShell from "@/components/layout/MinistryShell";
import { MINISTRY_CONFIG } from "@/lib/ministry-config";

const ACCENT = "#F28C28";

const TABS = ["Overview", "Students", "Mentors", "Sessions", "Parent Updates"];

const TYPE_FROM_COHORT: Record<string, string> = {
  junior: "childrens",
  senior: "middle-school",
};

const DEST_FROM_COHORT: Record<string, string> = {
  junior: "middle-school",
  senior: "high-school",
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function currentWeek(startDate: string): number {
  const diff = Date.now() - new Date(startDate + "T00:00:00").getTime();
  return Math.min(6, Math.max(1, Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1));
}

function ProgressRing({ week }: { week: number }) {
  const pct = (week / 6) * 100;
  const r = 40, circ = 2 * Math.PI * r;
  return (
    <svg width={100} height={100} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={50} cy={50} r={r} fill="none" stroke="#e5e7eb" strokeWidth={10} />
      <circle cx={50} cy={50} r={r} fill="none" stroke={ACCENT} strokeWidth={10}
        strokeDasharray={circ} strokeDashoffset={circ - (pct / 100) * circ}
        strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.5s ease" }} />
      <text x={50} y={50} textAnchor="middle" dominantBaseline="middle" style={{ fill: "#1f2937", fontSize: 18, fontWeight: 900, transform: "rotate(90deg)", transformOrigin: "50px 50px" }}>
        {week}/6
      </text>
    </svg>
  );
}

function CohortContent({ cohortId }: { cohortId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") ?? "Overview";

  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [cohort, setCohort] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [mentors, setMentors] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [rosterMembers, setRosterMembers] = useState<any[]>([]);
  const [hsRosterMembers, setHsRosterMembers] = useState<any[]>([]);
  const [yaRosterMembers, setYaRosterMembers] = useState<any[]>([]);

  // Student search
  const [studentSearch, setStudentSearch] = useState("");
  const [addingStudent, setAddingStudent] = useState(false);

  // Mentor add
  const [mentorSearch, setMentorSearch] = useState("");
  const [mentorGrade, setMentorGrade] = useState("11th");
  const [addingMentor, setAddingMentor] = useState(false);
  const [mentorError, setMentorError] = useState("");

  // Assign modal
  const [assignMentor, setAssignMentor] = useState<any>(null);
  const [assignedIds, setAssignedIds] = useState<string[]>([]);

  // Graduate
  const [graduating, setGraduating] = useState(false);
  const [gradResult, setGradResult] = useState<string | null>(null);
  const [showGradConfirm, setShowGradConfirm] = useState(false);

  // Parent update
  const [puForm, setPuForm] = useState({ week_number: 1, topic: "", memory_verse: "", notes: "" });
  const [sendingPU, setSendingPU] = useState(false);
  const [puMsg, setPuMsg] = useState("");

  // Session edit
  const [editSession, setEditSession] = useState<any>(null);

  async function load(t: string) {
    const res = await fetch(`/api/metamorphosis/cohorts/${cohortId}`, { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) { router.replace("/dashboard"); return; }
    const d = await res.json();
    setCohort(d.cohort);
    setStudents(d.students ?? []);
    setMentors(d.mentors ?? []);
    setSessions(d.sessions ?? []);

    const sourceType = TYPE_FROM_COHORT[d.cohort?.cohort_type] ?? "childrens";
    const [srcRes, hsRes, yaRes] = await Promise.all([
      fetch(`/api/ministry/${sourceType}/roster`, { headers: { Authorization: `Bearer ${t}` } }),
      fetch(`/api/ministry/high-school/roster`, { headers: { Authorization: `Bearer ${t}` } }),
      fetch(`/api/ministry/young-adults/roster`, { headers: { Authorization: `Bearer ${t}` } }),
    ]);
    if (srcRes.ok) { const d2 = await srcRes.json(); setRosterMembers((d2.roster ?? []).map((r: any) => r.member)); }
    if (hsRes.ok) { const d2 = await hsRes.json(); setHsRosterMembers(d2.roster ?? []); }
    if (yaRes.ok) { const d2 = await yaRes.json(); setYaRosterMembers(d2.roster ?? []); }
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
  }, [cohortId, router]);

  async function addStudent(member: any) {
    if (!token || !member) return;
    setAddingStudent(true);
    await fetch(`/api/metamorphosis/cohorts/${cohortId}/students`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ member_id: member.id, first_name: member.first_name, last_name: member.last_name, current_ministry: TYPE_FROM_COHORT[cohort.cohort_type], destination_ministry: DEST_FROM_COHORT[cohort.cohort_type] }),
    });
    setStudentSearch("");
    setAddingStudent(false);
    if (token) await load(token);
  }

  async function removeStudent(id: string) {
    if (!token || !confirm("Remove this student?")) return;
    await fetch(`/api/metamorphosis/cohorts/${cohortId}/students/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    if (token) await load(token);
  }

  async function addMentor(member: any, grade?: string) {
    if (!token || !member) return;
    setAddingMentor(true); setMentorError("");
    const isJunior = cohort.cohort_type === "junior";
    const res = await fetch(`/api/metamorphosis/cohorts/${cohortId}/mentors`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        member_id: member.id ?? member.member_id,
        first_name: member.first_name, last_name: member.last_name,
        grade: isJunior ? (grade ?? mentorGrade) : null,
        mentor_type: isJunior ? "junior_mentor" : "senior_mentor",
      }),
    });
    setAddingMentor(false);
    if (!res.ok) { const d = await res.json(); setMentorError(d.error ?? "Error"); return; }
    setMentorSearch(""); setMentorError("");
    if (token) await load(token);
  }

  async function removeMentor(id: string) {
    if (!token || !confirm("Remove this mentor?")) return;
    await fetch(`/api/metamorphosis/cohorts/${cohortId}/mentors/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    if (token) await load(token);
  }

  async function saveAssignment() {
    if (!token || !assignMentor) return;
    await fetch(`/api/metamorphosis/cohorts/${cohortId}/mentors/${assignMentor.id}/assign`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ student_ids: assignedIds }),
    });
    setAssignMentor(null);
    if (token) await load(token);
  }

  async function saveSession(weekNumber: number, updates: any) {
    if (!token) return;
    await fetch(`/api/metamorphosis/cohorts/${cohortId}/sessions/${weekNumber}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(updates),
    });
    if (token) await load(token);
  }

  async function graduateCohort() {
    if (!token) return;
    setGraduating(true);
    const res = await fetch(`/api/metamorphosis/cohorts/${cohortId}/graduate`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    const d = await res.json();
    setGraduating(false); setShowGradConfirm(false);
    setGradResult(res.ok ? `✅ ${d.graduated} students graduated · ${d.emails_sent} emails sent` : d.error ?? "Error");
    if (res.ok && token) await load(token);
  }

  async function sendParentUpdate() {
    if (!token) return;
    setSendingPU(true); setPuMsg("");
    const res = await fetch(`/api/metamorphosis/cohorts/${cohortId}/send-parent-update`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(puForm),
    });
    const d = await res.json();
    setSendingPU(false);
    setPuMsg(res.ok ? `✅ Sent to ${d.sent} families` : d.error ?? "Error");
    setTimeout(() => setPuMsg(""), 4000);
  }

  async function updateCohortStatus(status: string) {
    if (!token) return;
    await fetch(`/api/metamorphosis/cohorts/${cohortId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    if (token) await load(token);
  }

  const existingStudentIds = new Set(students.map((s: any) => s.member_id).filter(Boolean));
  const filteredRoster = rosterMembers.filter((m: any) => m && !existingStudentIds.has(m.id) && `${m.first_name} ${m.last_name}`.toLowerCase().includes(studentSearch.toLowerCase())).slice(0, 8);

  const isJunior = cohort?.cohort_type === "junior";
  const mentorPool = isJunior
    ? hsRosterMembers.filter((r: any) => {
        const m = r.member ?? r;
        return `${m?.first_name ?? ""} ${m?.last_name ?? ""}`.toLowerCase().includes(mentorSearch.toLowerCase());
      }).slice(0, 8)
    : yaRosterMembers.filter((r: any) => {
        const m = r.member ?? r;
        return `${m?.first_name ?? ""} ${m?.last_name ?? ""}`.toLowerCase().includes(mentorSearch.toLowerCase());
      }).slice(0, 8);

  const week = cohort ? currentWeek(cohort.start_date) : 1;
  const completedSessions = sessions.filter((s: any) => s.completed).length;
  const sourceType = cohort ? (TYPE_FROM_COHORT[cohort.cohort_type] ?? "childrens") : "childrens";

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-gray-400">Loading…</div></div>;
  if (!cohort) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">Cohort not found.</p></div>;

  return (
    <MinistryShell type={sourceType}>
      {/* Header */}
      <div className="px-8 py-8" style={{ background: "linear-gradient(135deg, #1a2e1a 0%, #2d5a2d 100%)" }}>
        <Link href={`/dashboard/ministry/${sourceType}/metamorphosis`} className="text-green-300 text-xs mb-1 block hover:text-white">← Metamorphosis</Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>🦋 {cohort.name}</h1>
            <p className="text-green-200 text-sm mt-1">{fmtDate(cohort.start_date)} → {fmtDate(cohort.end_date)} · <span className="capitalize">{cohort.cohort_type === "junior" ? "Jr." : "Sr."}</span></p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <select value={cohort.status} onChange={e => updateCohortStatus(e.target.value)} className="px-3 py-2 rounded-xl text-xs font-bold border border-white/30 bg-white/20 text-white focus:outline-none">
              <option value="upcoming">Upcoming</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 px-8 pt-4 overflow-x-auto bg-white" style={{ borderBottom: "1px solid #e5e7eb" }}>
        {TABS.map(tab => (
          <Link key={tab} href={`/dashboard/metamorphosis/${cohortId}?tab=${tab}`} className="px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors"
            style={{ borderColor: activeTab === tab ? ACCENT : "transparent", color: activeTab === tab ? ACCENT : "#6b7280" }}>
            {tab}
          </Link>
        ))}
      </div>

      <div className="px-8 py-8 bg-gray-50 min-h-screen">

        {/* ── OVERVIEW ── */}
        {activeTab === "Overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl shadow p-6 flex flex-col items-center">
              <ProgressRing week={week} />
              <p className="text-sm text-gray-400 mt-2">Week {week} of 6</p>
              <p className="text-xs text-gray-300 mt-1">{completedSessions} sessions completed</p>
            </div>
            <div className="lg:col-span-2 grid grid-cols-2 gap-4">
              {[
                { label: "Students", value: students.length, emoji: "👩‍🎓" },
                { label: "Mentors", value: mentors.length, emoji: "🤝" },
                { label: "Sessions Done", value: completedSessions, emoji: "✅" },
                { label: "Status", value: cohort.status.charAt(0).toUpperCase() + cohort.status.slice(1), emoji: "📊" },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-xl shadow-sm px-5 py-4 border border-gray-100">
                  <p className="text-2xl font-black text-gray-900">{s.emoji} {s.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {cohort.notes && (
              <div className="bg-white rounded-2xl shadow p-5 lg:col-span-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Notes</p>
                <p className="text-sm text-gray-700">{cohort.notes}</p>
              </div>
            )}

            <div className="lg:col-span-3">
              {gradResult && <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">{gradResult}</div>}
              {cohort.status !== "completed" && (
                <button onClick={() => setShowGradConfirm(true)} className="px-6 py-3 rounded-xl font-bold text-white text-sm" style={{ backgroundColor: "#1A4A2E" }}>
                  🎓 Graduate Cohort
                </button>
              )}
              {cohort.status === "completed" && cohort.graduation_date && (
                <p className="text-sm text-green-600 font-semibold">🎓 Graduated on {fmtDate(cohort.graduation_date)}</p>
              )}
            </div>
          </div>
        )}

        {/* ── STUDENTS ── */}
        {activeTab === "Students" && (
          <div>
            <div className="mb-5">
              <label className="block text-xs font-medium text-gray-600 mb-1">Search roster to add student</label>
              <input value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Search by name…" className="w-full max-w-sm px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white shadow-sm" />
              {studentSearch && filteredRoster.length > 0 && (
                <div className="mt-2 max-w-sm bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
                  {filteredRoster.map((m: any) => (
                    <button key={m.id} onClick={() => addStudent(m)} disabled={addingStudent} className="w-full text-left px-4 py-2.5 text-sm hover:bg-orange-50 border-b border-gray-50 last:border-0 transition-colors">
                      {m.first_name} {m.last_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {students.length === 0 ? (
              <div className="bg-white rounded-2xl shadow p-8 text-center text-gray-400">No students yet. Search above to add.</div>
            ) : (
              <div className="bg-white rounded-2xl shadow overflow-hidden">
                {students.map((s: any) => {
                  const mentor = mentors.find((m: any) => (m.assigned_student_ids ?? []).includes(s.id));
                  return (
                    <div key={s.id} className="flex items-center gap-4 px-5 py-4 border-b border-gray-50 last:border-0">
                      <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-sm font-bold text-green-700 flex-shrink-0">{s.first_name[0]}{s.last_name[0]}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">{s.first_name} {s.last_name}</p>
                        {mentor && <p className="text-xs text-gray-400">Mentor: {mentor.first_name} {mentor.last_name}</p>}
                      </div>
                      <button onClick={() => removeStudent(s.id)} className="text-xs text-red-400 hover:text-red-600 flex-shrink-0">Remove</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── MENTORS ── */}
        {activeTab === "Mentors" && (
          <div>
            <div className="mb-5">
              <p className="text-sm text-gray-500 mb-3">
                {isJunior ? "Junior cohort mentors must be 11th or 12th grade from the High School roster." : "Senior cohort mentors must be active members of the Young Adults ministry."}
              </p>
              {isJunior && (
                <div className="flex gap-2 mb-2">
                  {["11th", "12th"].map(g => (
                    <button key={g} onClick={() => setMentorGrade(g)} className="px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors" style={{ borderColor: mentorGrade === g ? ACCENT : "#e5e7eb", backgroundColor: mentorGrade === g ? "#fff7ed" : "white", color: mentorGrade === g ? ACCENT : "#374151" }}>
                      {g} Grade
                    </button>
                  ))}
                </div>
              )}
              <input value={mentorSearch} onChange={e => setMentorSearch(e.target.value)} placeholder="Search eligible mentors…" className="w-full max-w-sm px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white shadow-sm" />
              {mentorError && <p className="text-sm text-red-600 mt-2">{mentorError}</p>}
              {mentorSearch && mentorPool.length > 0 && (
                <div className="mt-2 max-w-sm bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
                  {mentorPool.map((r: any) => {
                    const m = r.member ?? r;
                    if (!m?.first_name) return null;
                    return (
                      <button key={m.id ?? r.member_id} onClick={() => addMentor(m, mentorGrade)} disabled={addingMentor} className="w-full text-left px-4 py-2.5 text-sm hover:bg-orange-50 border-b border-gray-50 last:border-0 transition-colors flex items-center justify-between">
                        <span>{m.first_name} {m.last_name}</span>
                        {isJunior && <span className="text-xs text-gray-400">{mentorGrade}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {mentors.length === 0 ? (
              <div className="bg-white rounded-2xl shadow p-8 text-center text-gray-400">No mentors yet.</div>
            ) : (
              <div className="space-y-3">
                {mentors.map((m: any) => {
                  const assignedStudents = students.filter((s: any) => (m.assigned_student_ids ?? []).includes(s.id));
                  return (
                    <div key={m.id} className="bg-white rounded-2xl shadow p-5">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="font-bold text-gray-900">{m.first_name} {m.last_name}</p>
                          {m.grade && <p className="text-xs text-gray-400">{m.grade} Grade</p>}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => { setAssignMentor(m); setAssignedIds(m.assigned_student_ids ?? []); }} className="px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 text-gray-600 hover:border-orange-300 transition-colors">Assign Students</button>
                          <button onClick={() => removeMentor(m.id)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                        </div>
                      </div>
                      {assignedStudents.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {assignedStudents.map((s: any) => (
                            <span key={s.id} className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">{s.first_name} {s.last_name}</span>
                          ))}
                        </div>
                      )}
                      {assignedStudents.length === 0 && <p className="text-xs text-gray-400">No students assigned</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── SESSIONS ── */}
        {activeTab === "Sessions" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.map((s: any) => (
              <div key={s.id} className={`bg-white rounded-2xl shadow p-5 border-l-4 ${s.completed ? "border-green-400" : "border-gray-200"}`}>
                <div className="flex items-center justify-between mb-3">
                  <p className="font-bold text-gray-900">Week {s.week_number}</p>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={s.completed ?? false} onChange={e => saveSession(s.week_number, { completed: e.target.checked })} className="rounded" />
                    <span className="text-xs text-gray-400">Done</span>
                  </label>
                </div>
                {editSession?.week_number === s.week_number ? (
                  <div className="space-y-2">
                    <input value={editSession.session_date ?? ""} type="date" onChange={e => setEditSession({ ...editSession, session_date: e.target.value })} className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs" />
                    <input value={editSession.topic ?? ""} onChange={e => setEditSession({ ...editSession, topic: e.target.value })} placeholder="Topic" className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs" />
                    <textarea value={editSession.notes ?? ""} onChange={e => setEditSession({ ...editSession, notes: e.target.value })} placeholder="Notes" rows={2} className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs resize-none" />
                    <div className="flex gap-2">
                      <button onClick={async () => { await saveSession(s.week_number, editSession); setEditSession(null); }} className="flex-1 py-1.5 rounded text-xs font-bold text-white" style={{ backgroundColor: ACCENT }}>Save</button>
                      <button onClick={() => setEditSession(null)} className="flex-1 py-1.5 rounded text-xs border border-gray-200">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {s.session_date && <p className="text-xs text-gray-400 mb-1">📅 {fmtDate(s.session_date)}</p>}
                    {s.topic && <p className="text-sm font-medium text-gray-800 mb-1">{s.topic}</p>}
                    {s.notes && <p className="text-xs text-gray-500 mb-2">{s.notes}</p>}
                    {s.attendance_count > 0 && <p className="text-xs text-gray-400">👥 {s.attendance_count} attended</p>}
                    <button onClick={() => setEditSession({ ...s })} className="text-xs text-orange-400 hover:text-orange-600 mt-2">Edit →</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── PARENT UPDATES ── */}
        {activeTab === "Parent Updates" && (
          <div className="max-w-lg">
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="font-bold text-gray-800 mb-4" style={{ fontFamily: "Georgia, serif" }}>Send Weekly Parent Update</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Week Number</label>
                  <select value={puForm.week_number} onChange={e => setPuForm(f => ({ ...f, week_number: parseInt(e.target.value) }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                    {[1,2,3,4,5,6].map(n => <option key={n} value={n}>Week {n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Topic</label>
                  <input value={puForm.topic} onChange={e => setPuForm(f => ({ ...f, topic: e.target.value }))} placeholder={sessions.find((s: any) => s.week_number === puForm.week_number)?.topic ?? "This week's topic"} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Memory Verse</label>
                  <input value={puForm.memory_verse} onChange={e => setPuForm(f => ({ ...f, memory_verse: e.target.value }))} placeholder="John 3:16…" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Recap / Notes</label>
                  <textarea value={puForm.notes} onChange={e => setPuForm(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="What happened this week…" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none" />
                </div>
                {puMsg && <p className="text-sm font-medium" style={{ color: puMsg.startsWith("✅") ? "#16a34a" : "#dc2626" }}>{puMsg}</p>}
                <button onClick={sendParentUpdate} disabled={sendingPU} className="w-full py-3 rounded-xl font-bold text-white" style={{ backgroundColor: ACCENT }}>
                  {sendingPU ? "Sending…" : `📧 Send Week ${puForm.week_number} Update to All Parents`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Assign Students Modal */}
      {assignMentor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={() => setAssignMentor(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100"><h2 className="text-lg font-bold" style={{ fontFamily: "Georgia, serif" }}>Assign Students — {assignMentor.first_name}</h2><p className="text-xs text-gray-400 mt-0.5">Max 3 students per mentor</p></div>
            <div className="p-6">
              <div className="space-y-2 mb-4">
                {students.map((s: any) => (
                  <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={assignedIds.includes(s.id)} onChange={e => {
                      if (e.target.checked && assignedIds.length >= 3) return;
                      setAssignedIds(ids => e.target.checked ? [...ids, s.id] : ids.filter(i => i !== s.id));
                    }} className="rounded" disabled={!assignedIds.includes(s.id) && assignedIds.length >= 3} />
                    <span className="text-sm">{s.first_name} {s.last_name}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setAssignMentor(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">Cancel</button>
                <button onClick={saveAssignment} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: ACCENT }}>Save ({assignedIds.length}/3)</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Graduate Confirm Modal */}
      {showGradConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={() => setShowGradConfirm(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8 text-center" onClick={e => e.stopPropagation()}>
            <div className="text-4xl mb-3">🎓</div>
            <h2 className="font-bold text-gray-900 mb-2" style={{ fontFamily: "Georgia, serif" }}>Graduate this cohort?</h2>
            <p className="text-sm text-gray-500 mb-6">This will move {students.length} student{students.length !== 1 ? "s" : ""} to {DEST_FROM_COHORT[cohort.cohort_type] === "middle-school" ? "Middle School" : "High School"} and send congratulation emails to parents.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowGradConfirm(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">Cancel</button>
              <button onClick={graduateCohort} disabled={graduating} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: "#1A4A2E" }}>{graduating ? "Graduating…" : "🎓 Graduate"}</button>
            </div>
          </div>
        </div>
      )}
    </MinistryShell>
  );
}

export default function CohortPage({ params }: { params: Promise<{ cohortId: string }> }) {
  const { cohortId } = use(params);
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-gray-400">Loading…</div></div>}>
      <CohortContent cohortId={cohortId} />
    </Suspense>
  );
}
