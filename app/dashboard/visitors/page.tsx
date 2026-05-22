"use client";

import { useEffect, useState, useMemo } from "react";
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

type Visitor = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  visit_date: string;
  source: string;
  department_id: string | null;
  status: string;
  notes: string | null;
  enrollments: Enrollment[];
};

type Enrollment = {
  id: string;
  sequence_id: string;
  status: string;
  current_step: number;
  enrolled_at: string;
  next_step_at: string | null;
  visitor_sequences: { name: string } | null;
};

type Department = { id: string; name: string };

type Stats = {
  total: number;
  inSequence: number;
  convertedThisMonth: number;
  newThisMonth: number;
};

const STATUS_STYLES: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  in_sequence: "bg-amber-100 text-amber-700",
  converted: "bg-green-100 text-green-700",
  opted_out: "bg-gray-100 text-gray-500",
};

const STATUS_LABEL: Record<string, string> = {
  new: "New",
  in_sequence: "In Sequence",
  converted: "Converted",
  opted_out: "Opted Out",
};

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function VisitorsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, inSequence: 0, convertedThisMonth: 0, newThisMonth: 0 });
  const [departments, setDepartments] = useState<Department[]>([]);

  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState("");

  // Add modal
  const [showAdd, setShowAdd] = useState(false);
  const [addFirst, setAddFirst] = useState("");
  const [addLast, setAddLast] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addDate, setAddDate] = useState(new Date().toISOString().slice(0, 10));
  const [addDept, setAddDept] = useState("");
  const [addNotes, setAddNotes] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

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

      const [vRes, dRes] = await Promise.all([
        fetch("/api/visitors", { headers: { Authorization: `Bearer ${session.access_token}` } }),
        fetch("/api/departments", { headers: { Authorization: `Bearer ${session.access_token}` } }),
      ]);

      const vData = await vRes.json();
      const dData = await dRes.json();
      setVisitors(vData.visitors ?? []);
      setStats(vData.stats ?? { total: 0, inSequence: 0, convertedThisMonth: 0, newThisMonth: 0 });
      setDepartments(dData.departments ?? []);
      setLoading(false);
    }
    init();
  }, []);

  const filtered = useMemo(() => {
    let list = visitors;
    if (statusFilter !== "all") list = list.filter((v) => v.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((v) => `${v.first_name} ${v.last_name} ${v.email ?? ""}`.toLowerCase().includes(q));
    }
    return list;
  }, [visitors, statusFilter, search]);

  async function loadDetail(v: Visitor) {
    if (!token) return;
    setSelectedVisitor(v);
    setDetailLoading(true);
    setEnrollError("");
    const res = await fetch(`/api/visitors/${v.id}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setSelectedVisitor((prev) => prev ? { ...prev, enrollments: data.enrollments ?? [] } : prev);
    setDetailLoading(false);
  }

  async function handleEnroll() {
    if (!token || !selectedVisitor) return;
    setEnrolling(true);
    setEnrollError("");
    const res = await fetch(`/api/visitors/${selectedVisitor.id}/enroll`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (!res.ok) { setEnrollError(data.error ?? "Failed to enroll."); setEnrolling(false); return; }
    // Refresh visitor list and detail
    const vRes = await fetch("/api/visitors", { headers: { Authorization: `Bearer ${token}` } });
    const vData = await vRes.json();
    setVisitors(vData.visitors ?? []);
    setStats(vData.stats ?? stats);
    const updated = (vData.visitors ?? []).find((v: Visitor) => v.id === selectedVisitor.id);
    if (updated) await loadDetail(updated);
    setEnrolling(false);
  }

  async function handleStatusChange(visitorId: string, newStatus: string) {
    if (!token) return;
    await fetch(`/api/visitors/${visitorId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: newStatus }),
    });
    setVisitors((prev) => prev.map((v) => v.id === visitorId ? { ...v, status: newStatus } : v));
    setSelectedVisitor((prev) => prev?.id === visitorId ? { ...prev, status: newStatus } : prev);
  }

  async function handleAdd() {
    if (!token || !addFirst.trim() || !addLast.trim()) { setAddError("First and last name required."); return; }
    setAdding(true);
    setAddError("");
    const res = await fetch("/api/visitors", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        firstName: addFirst, lastName: addLast, email: addEmail, phone: addPhone,
        visitDate: addDate, departmentId: addDept || null, notes: addNotes,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setAddError(data.error ?? "Failed to add."); setAdding(false); return; }
    const vRes = await fetch("/api/visitors", { headers: { Authorization: `Bearer ${token}` } });
    const vData = await vRes.json();
    setVisitors(vData.visitors ?? []);
    setStats(vData.stats ?? stats);
    setShowAdd(false);
    setAddFirst(""); setAddLast(""); setAddEmail(""); setAddPhone("");
    setAddDate(new Date().toISOString().slice(0, 10)); setAddDept(""); setAddNotes("");
    setAdding(false);
  }

  if (loading) {
    return (
      <AppShell navItems={navItems}>
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-400 font-serif">Loading…</p>
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
            <p className="text-green-200 text-sm mb-1">Visitor Onboarding</p>
            <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>
              🤝 Visitors
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/visitors/sequences"
              className="px-4 py-2 rounded-lg text-sm font-semibold border border-white/30 text-white hover:bg-white/10 transition-colors"
            >
              Manage Sequences
            </Link>
            <button
              onClick={() => setShowAdd(true)}
              className="px-5 py-2.5 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "#F28C28", color: "#1A4A2E" }}
            >
              + Add Visitor
            </button>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 bg-gray-50 min-h-screen">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8 -mt-6">
          {[
            { label: "Total Visitors", value: stats.total, icon: "🤝", color: "#3b82f6" },
            { label: "New This Month", value: stats.newThisMonth, icon: "✨", color: "#F28C28" },
            { label: "In Sequence", value: stats.inSequence, icon: "📬", color: "#f59e0b" },
            { label: "Converted", value: stats.convertedThisMonth, icon: "🎉", color: "#22c55e" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl shadow-md px-5 py-4 flex items-center gap-3 border border-gray-100">
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-xl flex-shrink-0" style={{ backgroundColor: s.color + "18" }}>
                {s.icon}
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-6">
          {/* Left: visitor list */}
          <div className="flex-1 min-w-0">
            {/* Filters */}
            <div className="flex items-center gap-3 mb-4">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search visitors…"
                className="flex-1 max-w-xs px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-green-700"
              />
              <div className="flex gap-1">
                {["all", "new", "in_sequence", "converted", "opted_out"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${statusFilter === s ? "bg-green-800 text-white" : "bg-white border border-gray-200 text-gray-500 hover:border-gray-300"}`}
                  >
                    {s === "all" ? "All" : STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
                <div className="text-5xl mb-4">🤝</div>
                <p className="text-gray-500 font-medium" style={{ fontFamily: "Georgia, serif" }}>No visitors yet</p>
                <p className="text-gray-400 text-sm mt-1 mb-6">Add a visitor manually or have them check in via QR code.</p>
                <button
                  onClick={() => setShowAdd(true)}
                  className="px-6 py-2.5 rounded-lg font-bold text-sm text-white"
                  style={{ backgroundColor: "#1A4A2E" }}
                >
                  Add Visitor
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((v) => {
                  const activeEnroll = v.enrollments?.find((e) => e.status === "active");
                  const isSelected = selectedVisitor?.id === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => loadDetail(v)}
                      className={`w-full text-left bg-white rounded-xl border shadow-sm flex items-center gap-4 px-5 py-4 transition-all ${isSelected ? "border-green-600 ring-1 ring-green-600" : "border-gray-100 hover:border-gray-200"}`}
                    >
                      {/* Avatar */}
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                        style={{ backgroundColor: "#1A4A2E" }}
                      >
                        {v.first_name[0]}{v.last_name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-900 text-sm">{v.first_name} {v.last_name}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[v.status] ?? "bg-gray-100 text-gray-500"}`}>
                            {STATUS_LABEL[v.status] ?? v.status}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${v.source === "qr" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-500"}`}>
                            {v.source === "qr" ? "QR" : "Manual"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <p className="text-xs text-gray-400">Visited {formatDate(v.visit_date)}</p>
                          {v.email && <p className="text-xs text-gray-400">{v.email}</p>}
                          {activeEnroll && (
                            <p className="text-xs text-amber-600 font-medium">
                              Step {activeEnroll.current_step} — {activeEnroll.visitor_sequences?.name}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-gray-300 text-lg flex-shrink-0">›</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: detail panel */}
          {selectedVisitor && (
            <div className="w-80 flex-shrink-0">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden sticky top-6">
                {/* Panel header */}
                <div className="px-6 py-5 border-b border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: "#1A4A2E" }}
                    >
                      {selectedVisitor.first_name[0]}{selectedVisitor.last_name[0]}
                    </div>
                    <button onClick={() => setSelectedVisitor(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
                  </div>
                  <h3 className="font-bold text-gray-900" style={{ fontFamily: "Georgia, serif" }}>
                    {selectedVisitor.first_name} {selectedVisitor.last_name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[selectedVisitor.status] ?? ""}`}>
                      {STATUS_LABEL[selectedVisitor.status] ?? selectedVisitor.status}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${selectedVisitor.source === "qr" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-500"}`}>
                      {selectedVisitor.source === "qr" ? "QR check-in" : "Manual"}
                    </span>
                  </div>
                </div>

                <div className="px-6 py-4 space-y-2 border-b border-gray-100">
                  {selectedVisitor.email && (
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <span className="text-gray-400">✉</span> {selectedVisitor.email}
                    </p>
                  )}
                  {selectedVisitor.phone && (
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <span className="text-gray-400">📞</span> {selectedVisitor.phone}
                    </p>
                  )}
                  <p className="text-sm text-gray-600 flex items-center gap-2">
                    <span className="text-gray-400">📅</span> Visited {formatDate(selectedVisitor.visit_date)}
                  </p>
                  {selectedVisitor.notes && (
                    <p className="text-sm text-gray-500 italic mt-2">{selectedVisitor.notes}</p>
                  )}
                </div>

                {/* Sequence status */}
                <div className="px-6 py-4 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Sequence Status</p>
                  {detailLoading ? (
                    <p className="text-sm text-gray-400">Loading…</p>
                  ) : selectedVisitor.enrollments?.length > 0 ? (
                    <div className="space-y-2">
                      {selectedVisitor.enrollments.map((e) => (
                        <div key={e.id} className="bg-gray-50 rounded-lg px-3 py-2">
                          <p className="text-sm font-medium text-gray-800">{e.visitor_sequences?.name ?? "Sequence"}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Step {e.current_step} · {e.status === "active" ? "Active" : e.status === "completed" ? "Completed" : "Opted out"}
                          </p>
                          {e.next_step_at && e.status === "active" && (
                            <p className="text-xs text-amber-600 mt-0.5">
                              Next: {new Date(e.next_step_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-400 mb-3">Not enrolled in any sequence.</p>
                      {enrollError && <p className="text-xs text-red-500 mb-2">{enrollError}</p>}
                      <button
                        onClick={handleEnroll}
                        disabled={enrolling}
                        className="w-full py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: enrolling ? "#4b7a5e" : "#1A4A2E" }}
                      >
                        {enrolling ? "Enrolling…" : "Enroll in Sequence →"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Status change */}
                <div className="px-6 py-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Update Status</p>
                  <div className="grid grid-cols-2 gap-2">
                    {["new", "in_sequence", "converted", "opted_out"].map((s) => (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(selectedVisitor.id, s)}
                        className={`py-1.5 rounded-lg text-xs font-semibold transition-colors border ${selectedVisitor.status === s ? "border-green-700 text-green-700 bg-green-50" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                      >
                        {STATUS_LABEL[s]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Visitor Modal */}
      {showAdd && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowAdd(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: "Georgia, serif" }}>Add Visitor</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">First name *</label>
                <input type="text" value={addFirst} onChange={(e) => setAddFirst(e.target.value)} placeholder="Jane"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-700" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Last name *</label>
                <input type="text" value={addLast} onChange={(e) => setAddLast(e.target.value)} placeholder="Doe"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-700" />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input type="email" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} placeholder="jane@example.com"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-700" />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
              <input type="tel" value={addPhone} onChange={(e) => setAddPhone(e.target.value)} placeholder="(555) 000-0000"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-700" />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Visit date</label>
                <input type="date" value={addDate} onChange={(e) => setAddDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-700" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Ministry interest</label>
                <select value={addDept} onChange={(e) => setAddDept(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-green-700">
                  <option value="">— None —</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
              <textarea value={addNotes} onChange={(e) => setAddNotes(e.target.value)} rows={2} placeholder="How they heard about us, prayer requests, etc."
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-700 resize-none" />
            </div>

            {addError && <p className="text-sm text-red-600 mb-4">{addError}</p>}

            <button
              onClick={handleAdd}
              disabled={adding}
              className="w-full py-3 rounded-xl font-bold text-white hover:opacity-90 transition-opacity"
              style={{ backgroundColor: adding ? "#4b7a5e" : "#1A4A2E", fontFamily: "Georgia, serif" }}
            >
              {adding ? "Adding…" : "Add Visitor →"}
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
