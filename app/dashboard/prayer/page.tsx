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

type PrayerRequest = {
  id: string;
  privacy_level: "anonymous" | "private" | "prayer_team" | "congregation";
  request_text: string;
  is_urgent: boolean;
  status: "open" | "prayed_for" | "closed";
  submitted_at: string;
  pastor_notes: string | null;
  assigned_to: string | null;
  member_name: string | null;
};

type Member = { id: string; first_name: string; last_name: string };

const PRIVACY_CONFIG = {
  anonymous: { label: "Anonymous", bg: "#f3f4f6", text: "#6b7280", border: "#d1d5db" },
  private: { label: "Private", bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  prayer_team: { label: "Prayer Team", bg: "#f0fdf4", text: "#166534", border: "#bbf7d0" },
  congregation: { label: "Congregation", bg: "#fdf4ff", text: "#7e22ce", border: "#e9d5ff" },
};

const STATUS_CONFIG = {
  open: { label: "Open", bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
  prayed_for: { label: "Prayed For", bg: "#f0fdf4", text: "#166534", border: "#bbf7d0" },
  closed: { label: "Closed", bg: "#f9fafb", text: "#6b7280", border: "#e5e7eb" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function PrayerPage() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [requests, setRequests] = useState<PrayerRequest[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"all" | "open" | "prayed_for" | "urgent">("all");
  const [error, setError] = useState("");

  // Add request modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    memberId: "",
    privacyLevel: "private" as PrayerRequest["privacy_level"],
    requestText: "",
    isUrgent: false,
  });
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState("");

  // Notes modal
  const [notesRequest, setNotesRequest] = useState<PrayerRequest | null>(null);
  const [notesText, setNotesText] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);

  // Assign modal
  const [assignRequest, setAssignRequest] = useState<PrayerRequest | null>(null);
  const [assignMemberId, setAssignMemberId] = useState("");
  const [assignSaving, setAssignSaving] = useState(false);

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
      setAuthLoading(false);
    }
    init();
  }, [router]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch("/api/prayer-requests", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { setRequests(d.requests ?? []); setLoading(false); })
      .catch(() => setLoading(false));

    fetch("/api/members", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setMembers(d.members ?? []));
  }, [token]);

  const filtered = useMemo(() => {
    if (tab === "all") return requests;
    if (tab === "urgent") return requests.filter((r) => r.is_urgent);
    return requests.filter((r) => r.status === tab);
  }, [requests, tab]);

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    return {
      total: requests.length,
      open: requests.filter((r) => r.status === "open").length,
      urgent: requests.filter((r) => r.is_urgent).length,
      prayedThisMonth: requests.filter(
        (r) => r.status === "prayed_for" && r.submitted_at >= monthStart
      ).length,
    };
  }, [requests]);

  async function handleMarkPrayed(req: PrayerRequest) {
    if (!token) return;
    const newStatus = req.status === "prayed_for" ? "open" : "prayed_for";
    setRequests((prev) =>
      prev.map((r) => (r.id === req.id ? { ...r, status: newStatus } : r))
    );
    const res = await fetch(`/api/prayer-requests/${req.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) {
      setRequests((prev) =>
        prev.map((r) => (r.id === req.id ? { ...r, status: req.status } : r))
      );
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this prayer request? This cannot be undone.")) return;
    if (!token) return;
    await fetch(`/api/prayer-requests/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setRequests((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (!addForm.requestText.trim()) { setAddError("Request text is required."); return; }
    setAddSubmitting(true);
    setAddError("");
    const res = await fetch("/api/prayer-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        memberId: addForm.memberId || null,
        privacyLevel: addForm.privacyLevel,
        requestText: addForm.requestText,
        isUrgent: addForm.isUrgent,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setAddError(data.error ?? "Failed to submit"); setAddSubmitting(false); return; }
    setShowAddModal(false);
    setAddForm({ memberId: "", privacyLevel: "private", requestText: "", isUrgent: false });
    // Refresh
    fetch("/api/prayer-requests", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setRequests(d.requests ?? []));
    setAddSubmitting(false);
  }

  async function handleSaveNotes() {
    if (!token || !notesRequest) return;
    setNotesSaving(true);
    const res = await fetch(`/api/prayer-requests/${notesRequest.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ pastorNotes: notesText }),
    });
    if (res.ok) {
      setRequests((prev) =>
        prev.map((r) => (r.id === notesRequest.id ? { ...r, pastor_notes: notesText } : r))
      );
    }
    setNotesRequest(null);
    setNotesSaving(false);
  }

  async function handleAssign() {
    if (!token || !assignRequest) return;
    setAssignSaving(true);
    const res = await fetch(`/api/prayer-requests/${assignRequest.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ assignedTo: assignMemberId || null }),
    });
    if (res.ok) {
      setRequests((prev) =>
        prev.map((r) =>
          r.id === assignRequest.id ? { ...r, assigned_to: assignMemberId || null } : r
        )
      );
    }
    setAssignRequest(null);
    setAssignSaving(false);
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading…</div>
      </div>
    );
  }

  return (
    <>
    <AppShell navItems={navItems}>
      {/* Hero */}
      <div
        className="px-8 py-8"
        style={{ background: "linear-gradient(135deg, #1A4A2E 0%, #2D6B42 100%)" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">🙏 Prayer Requests</h1>
            <p className="text-green-200 text-sm mt-1">Intercede for your congregation</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/dashboard/prayer/settings"
              className="px-4 py-2.5 rounded-lg text-sm font-medium border-2 border-white/30 text-white hover:border-white/60 transition-colors"
            >
              ⚙ Prayer Team
            </Link>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#F28C28", color: "#1A4A2E" }}
            >
              + New Request
            </button>
          </div>
        </div>
      </div>

      <div className="px-8 py-8 bg-gray-50 min-h-screen">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8 -mt-6">
          {[
            { label: "Total", value: stats.total, emoji: "🙏", color: "#3b82f6" },
            { label: "Open", value: stats.open, emoji: "📬", color: "#f97316" },
            { label: "Urgent", value: stats.urgent, emoji: "⚠️", color: "#dc2626" },
            { label: "Prayed For (month)", value: stats.prayedThisMonth, emoji: "✅", color: "#16a34a" },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-xl shadow-md px-5 py-4 flex items-center gap-3 border border-gray-100"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                style={{ backgroundColor: s.color + "18" }}
              >
                {s.emoji}
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-400">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white rounded-xl border border-gray-100 p-1 w-fit shadow-sm">
          {(["all", "open", "prayed_for", "urgent"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-5 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: tab === t ? "#1A4A2E" : "transparent",
                color: tab === t ? "#fff" : "#6b7280",
              }}
            >
              {t === "all" ? "All" : t === "prayed_for" ? "Prayed For" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {error && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
        )}

        {/* Cards */}
        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🙏</div>
            <p className="text-gray-500 font-medium mb-1">No prayer requests yet</p>
            <p className="text-gray-400 text-sm mb-6">
              {tab === "all"
                ? "Submit the first prayer request to get started."
                : "No requests match this filter."}
            </p>
            {tab === "all" && (
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-block px-6 py-2.5 rounded-lg font-semibold text-sm text-white"
                style={{ backgroundColor: "#1A4A2E" }}
              >
                New Request
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((req) => {
              const pc = PRIVACY_CONFIG[req.privacy_level] ?? PRIVACY_CONFIG.private;
              const sc = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.open;
              return (
                <div
                  key={req.id}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm p-6"
                >
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Privacy badge */}
                      <span
                        className="px-2.5 py-0.5 rounded-full text-xs font-medium border"
                        style={{ backgroundColor: pc.bg, color: pc.text, borderColor: pc.border }}
                      >
                        {pc.label}
                      </span>
                      {/* Urgent badge */}
                      {req.is_urgent && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border"
                          style={{ backgroundColor: "#fef2f2", color: "#dc2626", borderColor: "#fca5a5" }}>
                          ⚠ URGENT
                        </span>
                      )}
                      {/* Status badge */}
                      <span
                        className="px-2.5 py-0.5 rounded-full text-xs font-medium border"
                        style={{ backgroundColor: sc.bg, color: sc.text, borderColor: sc.border }}
                      >
                        {sc.label}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(req.submitted_at)}</span>
                  </div>

                  {/* Member name */}
                  <p className="text-sm font-semibold text-gray-800 mb-2">
                    {req.member_name ?? "Anonymous Member"}
                  </p>

                  {/* Request text */}
                  <p className="text-gray-700 text-sm leading-relaxed mb-4 italic">
                    &ldquo;{req.request_text}&rdquo;
                  </p>

                  {/* Pastor notes (always show section) */}
                  {req.pastor_notes && (
                    <div className="mb-4 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
                      <p className="text-xs font-semibold text-amber-700 mb-1">Pastor Notes</p>
                      <p className="text-sm text-amber-900">{req.pastor_notes}</p>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleMarkPrayed(req)}
                      className="px-4 py-2 rounded-lg text-xs font-semibold border transition-colors"
                      style={
                        req.status === "prayed_for"
                          ? { backgroundColor: "#f0fdf4", color: "#166534", borderColor: "#bbf7d0" }
                          : { backgroundColor: "#1A4A2E", color: "#fff", borderColor: "#1A4A2E" }
                      }
                    >
                      {req.status === "prayed_for" ? "✓ Prayed For" : "🙏 Mark as Prayed For"}
                    </button>
                    <button
                      onClick={() => { setNotesRequest(req); setNotesText(req.pastor_notes ?? ""); }}
                      className="px-4 py-2 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      📝 {req.pastor_notes ? "Edit Notes" : "Add Notes"}
                    </button>
                    {req.privacy_level === "prayer_team" && (
                      <button
                        onClick={() => { setAssignRequest(req); setAssignMemberId(req.assigned_to ?? ""); }}
                        className="px-4 py-2 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        👤 {req.assigned_to ? "Reassign" : "Assign to Prayer Team"}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(req.id)}
                      className="ml-auto px-4 py-2 rounded-lg text-xs font-medium border border-red-100 text-red-500 hover:bg-red-50 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>

    {/* Add Request Modal */}
    {showAddModal && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
        onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}
      >
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">New Prayer Request</h2>
            <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
          </div>
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Member (optional)</label>
              <select
                value={addForm.memberId}
                onChange={(e) => setAddForm((p) => ({ ...p, memberId: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-800 bg-white"
              >
                <option value="">— Select member —</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Privacy Level</label>
              <select
                value={addForm.privacyLevel}
                onChange={(e) => setAddForm((p) => ({ ...p, privacyLevel: e.target.value as PrayerRequest["privacy_level"] }))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-800 bg-white"
              >
                <option value="anonymous">Anonymous — pastor only, no name</option>
                <option value="private">Private — pastor only, with name</option>
                <option value="prayer_team">Prayer Team — pastor + prayer team</option>
                <option value="congregation">Congregation — shared with all</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prayer Request</label>
              <textarea
                value={addForm.requestText}
                onChange={(e) => setAddForm((p) => ({ ...p, requestText: e.target.value }))}
                rows={4}
                placeholder="Please share what you would like prayer for…"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-800 resize-none"
              />
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={addForm.isUrgent}
                onChange={(e) => setAddForm((p) => ({ ...p, isUrgent: e.target.checked }))}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm font-medium text-gray-700">⚠ Mark as urgent — needs immediate prayer</span>
            </label>
            {addError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{addError}</p>
            )}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={addSubmitting}
                className="flex-1 py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-60 transition-opacity"
                style={{ backgroundColor: "#1A4A2E" }}
              >
                {addSubmitting ? "Submitting…" : "Submit Request"}
              </button>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-6 py-3 rounded-xl font-medium text-sm text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* Notes Modal */}
    {notesRequest && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
        onClick={(e) => { if (e.target === e.currentTarget) setNotesRequest(null); }}
      >
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Pastor Notes</h2>
            <button onClick={() => setNotesRequest(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
          </div>
          <p className="text-sm text-gray-500 mb-3">
            Private notes — only visible to pastor/admin. Not shared with the member.
          </p>
          <textarea
            value={notesText}
            onChange={(e) => setNotesText(e.target.value)}
            rows={5}
            placeholder="Add your pastoral notes here…"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-800 resize-none mb-4"
          />
          <div className="flex gap-3">
            <button
              onClick={handleSaveNotes}
              disabled={notesSaving}
              className="flex-1 py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-60"
              style={{ backgroundColor: "#1A4A2E" }}
            >
              {notesSaving ? "Saving…" : "Save Notes"}
            </button>
            <button
              onClick={() => setNotesRequest(null)}
              className="px-6 py-3 rounded-xl font-medium text-sm text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Assign Modal */}
    {assignRequest && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
        onClick={(e) => { if (e.target === e.currentTarget) setAssignRequest(null); }}
      >
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Assign to Prayer Team</h2>
            <button onClick={() => setAssignRequest(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Prayer Team Member</label>
            <select
              value={assignMemberId}
              onChange={(e) => setAssignMemberId(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-800 bg-white"
            >
              <option value="">— Unassigned —</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleAssign}
              disabled={assignSaving}
              className="flex-1 py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-60"
              style={{ backgroundColor: "#1A4A2E" }}
            >
              {assignSaving ? "Saving…" : "Assign"}
            </button>
            <button
              onClick={() => setAssignRequest(null)}
              className="px-6 py-3 rounded-xl font-medium text-sm text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors"
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
