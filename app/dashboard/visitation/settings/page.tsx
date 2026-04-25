"use client";

import { useEffect, useState } from "react";
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

const STAFF_ROLES = [
  { value: "pastor", label: "Pastor" },
  { value: "associate_pastor", label: "Associate Pastor" },
  { value: "deacon", label: "Deacon" },
  { value: "ministry_leader", label: "Ministry Leader" },
];

const ROLE_LABELS: Record<string, string> = {
  pastor: "Pastor",
  associate_pastor: "Associate Pastor",
  deacon: "Deacon",
  ministry_leader: "Ministry Leader",
};

type Member = { id: string; first_name: string; last_name: string; email: string | null };
type StaffMember = {
  id: string;
  member_id: string;
  role: string;
  members: { first_name: string; last_name: string; email: string | null };
};

export default function VisitationSettingsPage() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [thresholdDays, setThresholdDays] = useState(30);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedRole, setSelectedRole] = useState("deacon");
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/"); return; }
      setToken(session.access_token);
      setAuthLoading(false);

      const [settingsRes, membersRes] = await Promise.all([
        fetch("/api/visitation/settings", { headers: { Authorization: `Bearer ${session.access_token}` } })
          .then((r) => r.json()),
        fetch("/api/members", { headers: { Authorization: `Bearer ${session.access_token}` } })
          .then((r) => r.json()),
      ]);

      if (settingsRes.settings) {
        setThresholdDays(settingsRes.settings.connection_threshold_days ?? 30);
        setWeeklyDigest(settingsRes.settings.weekly_digest ?? false);
      }
      setStaffMembers(settingsRes.staff ?? []);
      setAllMembers(membersRes.members ?? []);
      setDataLoading(false);
    }
    init();
  }, [router]);

  const staffMemberIds = new Set(staffMembers.map((s) => s.member_id));
  const availableMembers = allMembers.filter((m) => !staffMemberIds.has(m.id));

  async function handleSaveSettings() {
    if (!token) return;
    setSaving(true);
    setError("");
    const res = await fetch("/api/visitation/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ connectionThresholdDays: thresholdDays, weeklyDigest }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Failed to save"); }
    else { setSuccess("Settings saved."); setTimeout(() => setSuccess(""), 3000); }
    setSaving(false);
  }

  async function handleAddStaff() {
    if (!token || !selectedMemberId) return;
    setAdding(true);
    setError("");
    const res = await fetch("/api/visitation/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "add_staff", memberId: selectedMemberId, role: selectedRole }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to add");
    } else {
      // Refresh staff list
      const staffRes = await fetch("/api/visitation/settings", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json());
      setStaffMembers(staffRes.staff ?? []);
      setSelectedMemberId("");
      setSuccess("Staff member added.");
      setTimeout(() => setSuccess(""), 3000);
    }
    setAdding(false);
  }

  async function handleRemoveStaff(staffId: string) {
    if (!token || !confirm("Remove this staff member from visitation team?")) return;
    setRemovingId(staffId);
    setError("");
    const res = await fetch("/api/visitation/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "remove_staff", staffId }),
    });
    if (res.ok) {
      setStaffMembers((prev) => prev.filter((s) => s.id !== staffId));
    } else {
      const d = await res.json();
      setError(d.error ?? "Failed to remove staff member");
    }
    setRemovingId(null);
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading…</div>
      </div>
    );
  }

  if (dataLoading) {
    return (
      <AppShell navItems={navItems}>
        <div className="px-8 py-8" style={{ background: "linear-gradient(135deg, #1A4A2E 0%, #2D6B42 100%)" }}>
          <Link href="/dashboard/visitation" className="text-green-300 hover:text-white text-sm transition-colors block mb-2">← Visitation</Link>
          <h1 className="text-3xl font-bold text-white">Visitation Settings</h1>
        </div>
        <div className="flex items-center justify-center py-20 text-gray-400">Loading settings…</div>
      </AppShell>
    );
  }

  return (
    <AppShell navItems={navItems}>
      {/* Hero */}
      <div
        className="px-8 py-8"
        style={{ background: "linear-gradient(135deg, #1A4A2E 0%, #2D6B42 100%)" }}
      >
        <div className="flex items-center gap-3 mb-2">
          <Link href="/dashboard/visitation" className="text-green-300 hover:text-white text-sm transition-colors">
            ← Visitation
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-white">Visitation Settings</h1>
        <p className="text-green-200 text-sm mt-1">Configure your connection thresholds and pastoral team</p>
      </div>

      <div className="px-8 py-8 bg-gray-50 min-h-screen">
        <div className="max-w-2xl space-y-8">

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
          )}
          {success && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">{success}</p>
          )}

          {/* Connection threshold */}
          <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-1">Connection Threshold</h2>
            <p className="text-sm text-gray-500 mb-5">
              Members not contacted within this many days will appear in the Overdue section.
            </p>

            <div className="flex gap-3 mb-5">
              {[14, 30, 60, 90].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setThresholdDays(d)}
                  className="px-5 py-2.5 rounded-full text-sm font-medium border transition-colors"
                  style={{
                    backgroundColor: thresholdDays === d ? "#1A4A2E" : "transparent",
                    borderColor: thresholdDays === d ? "#1A4A2E" : "#d1d5db",
                    color: thresholdDays === d ? "#fff" : "#374151",
                  }}
                >
                  {d} days
                </button>
              ))}
            </div>

            <div className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-200 text-sm text-gray-600 mb-5">
              Currently: members contacted more than <strong>{thresholdDays} days ago</strong> are marked overdue.
              Members contacted within the last <strong>{Math.max(1, thresholdDays - 7)} days</strong> are connected.
            </div>

            {/* Weekly digest */}
            <label className="flex items-center gap-3 cursor-pointer mb-6">
              <input
                type="checkbox"
                checked={weeklyDigest}
                onChange={(e) => setWeeklyDigest(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <div>
                <p className="text-sm font-medium text-gray-800">Weekly digest email</p>
                <p className="text-xs text-gray-500">
                  Receive a weekly email listing all overdue connections and upcoming follow-ups.
                </p>
              </div>
            </label>

            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="px-6 py-2.5 rounded-lg font-semibold text-sm text-white disabled:opacity-60 transition-opacity"
              style={{ backgroundColor: "#1A4A2E" }}
            >
              {saving ? "Saving…" : "Save Settings"}
            </button>
          </section>

          {/* Visitation staff */}
          <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-1">Pastoral Team</h2>
            <p className="text-sm text-gray-500 mb-4">
              Deacons and associate pastors who can be assigned to member visitation.
            </p>

            {staffMembers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No staff assigned yet.</p>
            ) : (
              <div className="space-y-2 mb-6">
                {staffMembers.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 border border-gray-100"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {s.members.first_name} {s.members.last_name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-500">{ROLE_LABELS[s.role] ?? s.role}</span>
                        {s.members.email && (
                          <span className="text-xs text-gray-400">· {s.members.email}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveStaff(s.id)}
                      disabled={removingId === s.id}
                      className="text-xs font-medium text-red-500 hover:text-red-700 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40"
                    >
                      {removingId === s.id ? "Removing…" : "Remove"}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add staff */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Add Staff Member</h3>
              <div className="flex gap-3">
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-800 bg-white"
                >
                  <option value="">— Select member —</option>
                  {availableMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.first_name} {m.last_name}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-800 bg-white"
                >
                  {STAFF_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <button
                  onClick={handleAddStaff}
                  disabled={!selectedMemberId || adding}
                  className="px-5 py-2.5 rounded-lg font-semibold text-sm text-white disabled:opacity-50 transition-opacity"
                  style={{ backgroundColor: "#1A4A2E" }}
                >
                  {adding ? "Adding…" : "Add"}
                </button>
              </div>
            </div>
          </section>

          {/* Guide */}
          <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">Visitation Dashboard Guide</h2>
            <div className="space-y-3">
              {[
                { dot: "#dc2626", label: "Overdue", desc: `Members not contacted in more than ${thresholdDays} days, or never contacted.` },
                { dot: "#d97706", label: "Due Soon", desc: `Members within 7 days of their ${thresholdDays}-day threshold.` },
                { dot: "#16a34a", label: "Connected", desc: `Members contacted within the last ${Math.max(1, thresholdDays - 7)} days.` },
              ].map((s) => (
                <div key={s.label} className="flex items-start gap-3">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: s.dot }} />
                  <div>
                    <span className="text-sm font-medium text-gray-800">{s.label} — </span>
                    <span className="text-sm text-gray-500">{s.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>
    </AppShell>
  );
}
