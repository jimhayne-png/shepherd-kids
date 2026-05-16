"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AppShell, { type NavItem } from "@/components/layout/AppShell";
import { MINISTRY_NAV_ITEMS } from "@/lib/ministry-config";

const ACCENT = "#F28C28";
const HS_GRADES = ["9th", "10th", "11th", "12th"];

type Student = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  grade: string | null;
  parent_name: string | null;
  created_at: string;
};

type VisitorRecord = {
  id: string;
  student_id: string;
  is_new_visitor: boolean;
  checked_in_at: string;
  student: { id: string; first_name: string; last_name: string; grade: string | null } | null;
  session_name?: string;
};

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Church Family", href: "#", isSection: true },
  { label: "👥 Members", href: "/dashboard/members" },
  { label: "🏛️ Departments", href: "/dashboard/departments" },
  { label: "🆕 Visitors", href: "/dashboard/visitors" },
  { label: "Engagement", href: "#", isSection: true },
  { label: "📅 Calendar", href: "/dashboard/calendar" },
  { label: "✅ Attendance", href: "/dashboard/attendance" },
  { label: "📋 Bulletin", href: "/dashboard/bulletin" },
  { label: "📢 Communication Hub", href: "/dashboard/communication" },
  { label: "Pastoral Care", href: "#", isSection: true },
  { label: "🙏 Annual Pastor Touch", href: "/dashboard/pastor-touch" },
  { label: "🏥 Visitation", href: "/dashboard/visitation" },
  { label: "🎂 Birthdays", href: "/dashboard/birthdays" },
  { label: "🔄 Shepherd Pipeline", href: "/dashboard/shepherd" },
  { label: "🙋 Prayer", href: "/dashboard/prayer" },
  { label: "Ministry", href: "#", isSection: true },
  ...MINISTRY_NAV_ITEMS,
  { label: "Outreach", href: "#", isSection: true },
  { label: "✝️ Evangelism", href: "/dashboard/evangelism" },
  { label: "📧 Visitor Onboarding", href: "/dashboard/visitors/sequences" },
  { label: "Marketing", href: "#", isSection: true },
  { label: "⭐ Review Campaign", href: "/dashboard/reviews" },
  { label: "Settings", href: "#", isSection: true },
  { label: "⚙️ Settings", href: "/dashboard/settings" },
  { label: "💳 Billing", href: "/dashboard/billing" },
  { label: "📖 Tutorials", href: "/dashboard/tutorials" },
];

export default function HighSchoolRosterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [visitors, setVisitors] = useState<VisitorRecord[]>([]);
  const [tab, setTab] = useState<"students" | "visitors">("students");
  const [search, setSearch] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState("");
  const [newFirst, setNewFirst] = useState("");
  const [newLast, setNewLast] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newGrade, setNewGrade] = useState("");
  const [newDob, setNewDob] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newState, setNewState] = useState("");
  const [newZip, setNewZip] = useState("");

  async function loadStudents(t: string) {
    const res = await fetch("/api/high-school-ministry/students", {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (res.ok) {
      const d = await res.json();
      setStudents(d.students ?? []);
    }
  }

  async function loadVisitors(t: string) {
    const sessRes = await fetch("/api/high-school-ministry/attendance", {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (!sessRes.ok) return;
    const sessData = await sessRes.json();
    const sessions: any[] = sessData.sessions ?? [];
    if (sessions.length === 0) return;

    const recentSession = sessions[0];
    const recRes = await fetch(
      `/api/high-school-ministry/attendance?sessionId=${recentSession.id}`,
      { headers: { Authorization: `Bearer ${t}` } }
    );
    if (!recRes.ok) return;
    const recData = await recRes.json();
    const records: VisitorRecord[] = (recData.records ?? [])
      .filter((r: any) => r.is_new_visitor === true)
      .map((r: any) => ({ ...r, session_name: recentSession.name }));
    setVisitors(records);
  }

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/"); return; }
      const t = session.access_token;
      setToken(t);
      await Promise.all([loadStudents(t), loadVisitors(t)]);
      setLoading(false);
    }
    init();
  }, [router]);

  async function handleAddStudent() {
    if (!token || !newFirst.trim() || !newLast.trim()) return;
    setAddSaving(true);
    setAddError("");
    const res = await fetch("/api/high-school-ministry/students", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        first_name: newFirst.trim(),
        last_name: newLast.trim(),
        phone: newPhone.trim() || null,
        email: newEmail.trim() || null,
        grade: newGrade || null,
        date_of_birth: newDob || null,
        address: newAddress.trim() || null,
        city: newCity.trim() || null,
        state: newState.trim() || null,
        zip: newZip.trim() || null,
      }),
    });
    const data = await res.json();
    setAddSaving(false);
    if (res.ok) {
      setShowAddModal(false);
      setNewFirst(""); setNewLast(""); setNewPhone(""); setNewEmail("");
      setNewGrade(""); setNewDob(""); setNewAddress(""); setNewCity("");
      setNewState(""); setNewZip("");
      if (token) await loadStudents(token);
    } else {
      setAddError(data.error ?? "Failed to add student.");
    }
  }

  const filteredStudents = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return students;
    return students.filter(s =>
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) ||
      (s.phone ?? "").includes(q) ||
      (s.parent_name ?? "").toLowerCase().includes(q)
    );
  }, [students, search]);

  const filteredVisitors = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return visitors;
    return visitors.filter(v => {
      const name = v.student ? `${v.student.first_name} ${v.student.last_name}`.toLowerCase() : "";
      return name.includes(q);
    });
  }, [visitors, search]);

  return (
    <AppShell navItems={navItems}>
      {/* Header */}
      <div className="px-8 py-10" style={{ background: `linear-gradient(135deg, #c2570a 0%, ${ACCENT} 100%)` }}>
        <Link href="/dashboard/ministry/high-school" className="text-orange-200 text-xs mb-1 block hover:text-white">
          ← Senior High
        </Link>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>
              Members &amp; Visitors
            </h1>
            <p className="text-orange-100 text-sm mt-1">
              {tab === "students"
                ? `${filteredStudents.length} student${filteredStudents.length !== 1 ? "s" : ""}`
                : `${filteredVisitors.length} recent visitor${filteredVisitors.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl text-sm font-bold bg-white flex-shrink-0"
            style={{ color: ACCENT }}
          >
            + Add Student
          </button>
        </div>
      </div>

      <div className="px-8 py-8 bg-gray-50 min-h-screen">
        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          {(["students", "visitors"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              style={{
                backgroundColor: tab === t ? ACCENT : "white",
                color: tab === t ? "white" : "#6b7280",
                border: `1px solid ${tab === t ? ACCENT : "#e5e7eb"}`,
              }}
            >
              {t === "students" ? "👤 Students" : "🆕 Visitors"}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="mb-5">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name…"
            className="w-full max-w-md px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
          />
        </div>

        {loading ? (
          <div className="text-gray-400 text-sm py-12 text-center">Loading…</div>
        ) : tab === "students" ? (
          filteredStudents.length === 0 ? (
            <div className="bg-white rounded-2xl shadow border border-gray-100 p-12 text-center">
              <p className="text-gray-400">
                {search ? "No students match your search." : "No senior high students registered yet."}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">Grade</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">Phone</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">Parent Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">Added</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map(s => (
                    <tr key={s.id} className="border-b border-gray-50 hover:bg-orange-50 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                            style={{ backgroundColor: ACCENT }}
                          >
                            {s.first_name[0]}{s.last_name[0]}
                          </div>
                          <span className="font-medium text-sm text-gray-900">{s.first_name} {s.last_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{s.grade ?? "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{s.phone ?? "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{s.parent_name ?? "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{fmtDate(s.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* Visitors tab */
          filteredVisitors.length === 0 ? (
            <div className="bg-white rounded-2xl shadow border border-gray-100 p-12 text-center">
              <p className="text-gray-400">
                {search ? "No visitors match your search." : "No new visitors found in the most recent session."}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">Grade</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">Check-In Time</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">Session</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVisitors.map(v => (
                    <tr key={v.id} className="border-b border-gray-50 hover:bg-orange-50 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                            style={{ backgroundColor: "#10b981" }}
                          >
                            {v.student ? `${v.student.first_name[0]}${v.student.last_name[0]}` : "?"}
                          </div>
                          <span className="font-medium text-sm text-gray-900">
                            {v.student ? `${v.student.first_name} ${v.student.last_name}` : "Unknown"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{v.student?.grade ?? "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(v.checked_in_at).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">{v.session_name ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: "Georgia, serif" }}>
                Add Student
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {addError && (
                <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{addError}</p>
              )}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "First Name *", value: newFirst, set: setNewFirst },
                  { label: "Last Name *", value: newLast, set: setNewLast },
                ].map(({ label, value, set }) => (
                  <div key={label}>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">{label}</label>
                    <input
                      value={value}
                      onChange={e => set(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Phone</label>
                  <input type="tel" value={newPhone} onChange={e => setNewPhone(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Email</label>
                  <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Grade</label>
                  <select value={newGrade} onChange={e => setNewGrade(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white">
                    <option value="">—</option>
                    {HS_GRADES.map(g => <option key={g} value={g}>{g} Grade</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={newDob}
                    onChange={e => setNewDob(e.target.value)}
                    max={new Date().toISOString().slice(0, 10)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Address</label>
                <input value={newAddress} onChange={e => setNewAddress(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">City</label>
                  <input value={newCity} onChange={e => setNewCity(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">State</label>
                  <input value={newState} onChange={e => setNewState(e.target.value)} maxLength={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Zip</label>
                  <input value={newZip} onChange={e => setNewZip(e.target.value)} maxLength={10} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleAddStudent}
                disabled={addSaving || !newFirst.trim() || !newLast.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{
                  backgroundColor: ACCENT,
                  opacity: addSaving || !newFirst.trim() || !newLast.trim() ? 0.6 : 1,
                }}
              >
                {addSaving ? "Saving…" : "Add Student"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
