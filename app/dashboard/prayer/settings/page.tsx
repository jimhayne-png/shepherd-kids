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

type Member = { id: string; first_name: string; last_name: string; email: string | null };
type PrayerTeamMember = { id: string; member_id: string; members: { first_name: string; last_name: string; email: string | null } };

export default function PrayerSettingsPage() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [churchId, setChurchId] = useState<string | null>(null);
  const [pastorEmail, setPastorEmail] = useState<string>("");
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [teamMembers, setTeamMembers] = useState<PrayerTeamMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/"); return; }
      setToken(session.access_token);

      const { data: cu } = await supabase
        .from("church_users")
        .select("church_id, churches(pastor_email)")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!cu) { router.replace("/onboarding"); return; }
      setChurchId(cu.church_id);

      const church = cu.churches as unknown as { pastor_email: string | null } | null;
      setPastorEmail(church?.pastor_email ?? "");
      setAuthLoading(false);
    }
    init();
  }, [router]);

  useEffect(() => {
    if (!token || !churchId) return;

    fetch("/api/members", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setAllMembers(d.members ?? []));

    // Load prayer team directly from supabase (no dedicated API yet)
    supabase
      .from("prayer_team_members")
      .select("id, member_id, members(first_name, last_name, email)")
      .eq("church_id", churchId)
      .order("created_at")
      .then(({ data }) => setTeamMembers((data as unknown as PrayerTeamMember[]) ?? []));
  }, [token, churchId]);

  const teamMemberIds = new Set(teamMembers.map((t) => t.member_id));
  const availableMembers = allMembers.filter((m) => !teamMemberIds.has(m.id));

  async function handleAdd() {
    if (!selectedMemberId || !churchId) return;
    setAdding(true);
    setError("");
    const { data, error: err } = await supabase
      .from("prayer_team_members")
      .insert({ church_id: churchId, member_id: selectedMemberId })
      .select("id, member_id, members(first_name, last_name, email)")
      .single();

    if (err) {
      setError(err.message);
    } else {
      setTeamMembers((prev) => [...prev, data as unknown as PrayerTeamMember]);
      setSelectedMemberId("");
      setSuccess("Prayer team member added.");
      setTimeout(() => setSuccess(""), 3000);
    }
    setAdding(false);
  }

  async function handleRemove(id: string) {
    if (!confirm("Remove this member from the prayer team?")) return;
    setRemovingId(id);
    const { error: err } = await supabase
      .from("prayer_team_members")
      .delete()
      .eq("id", id)
      .eq("church_id", churchId!);

    if (err) {
      setError(err.message);
    } else {
      setTeamMembers((prev) => prev.filter((t) => t.id !== id));
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

  return (
    <AppShell navItems={navItems}>
      {/* Hero */}
      <div
        className="px-8 py-8"
        style={{ background: "linear-gradient(135deg, #1A4A2E 0%, #2D6B42 100%)" }}
      >
        <div className="flex items-center gap-3 mb-2">
          <Link href="/dashboard/prayer" className="text-green-300 hover:text-white text-sm transition-colors">
            ← Prayer Requests
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-white">Prayer Team Settings</h1>
        <p className="text-green-200 text-sm mt-1">Manage who receives prayer request notifications</p>
      </div>

      <div className="px-8 py-8 bg-gray-50 min-h-screen">
        <div className="max-w-2xl space-y-8">

          {/* Pastor Email Info */}
          <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">Notification Email</h2>
            <p className="text-sm text-gray-500 mb-3">
              Prayer request notifications are sent to the pastor email on file. Update it in church settings.
            </p>
            <div className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
              <p className="text-xs text-gray-400 mb-0.5">Pastor email</p>
              <p className="text-sm font-medium text-gray-900">
                {pastorEmail || <span className="text-gray-400 italic">Not set — update in Settings</span>}
              </p>
            </div>
          </section>

          {/* Current Team */}
          <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">Prayer Team Members</h2>
            <p className="text-sm text-gray-500 mb-4">
              These members will receive email notifications for Prayer Team and Congregation level requests.
            </p>

            {error && (
              <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
            )}
            {success && (
              <p className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">{success}</p>
            )}

            {teamMembers.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No prayer team members yet.</p>
            ) : (
              <div className="space-y-2 mb-6">
                {teamMembers.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 border border-gray-100"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {t.members.first_name} {t.members.last_name}
                      </p>
                      {t.members.email && (
                        <p className="text-xs text-gray-400">{t.members.email}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemove(t.id)}
                      disabled={removingId === t.id}
                      className="text-xs font-medium text-red-500 hover:text-red-700 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40"
                    >
                      {removingId === t.id ? "Removing…" : "Remove"}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add member */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Add Prayer Team Member</h3>
              <div className="flex gap-3">
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-800 bg-white"
                >
                  <option value="">— Select a member —</option>
                  {availableMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.first_name} {m.last_name}{m.email ? ` (${m.email})` : ""}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAdd}
                  disabled={!selectedMemberId || adding}
                  className="px-5 py-2.5 rounded-lg font-semibold text-sm text-white disabled:opacity-50 transition-opacity"
                  style={{ backgroundColor: "#1A4A2E" }}
                >
                  {adding ? "Adding…" : "Add"}
                </button>
              </div>
              {availableMembers.length === 0 && allMembers.length > 0 && (
                <p className="text-xs text-gray-400 mt-2">All members are already on the prayer team.</p>
              )}
            </div>
          </section>

          {/* Privacy Level Guide */}
          <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">Privacy Level Guide</h2>
            <div className="space-y-3">
              {[
                { level: "Anonymous", color: "#6b7280", desc: "No name shared. Notification sent to pastor only." },
                { level: "Private", color: "#1d4ed8", desc: "Name shared privately with pastor only." },
                { level: "Prayer Team", color: "#166534", desc: "Name and request shared with pastor + prayer team members above." },
                { level: "Congregation", color: "#7e22ce", desc: "Shared with pastor, prayer team, and added to bulletin queue." },
              ].map((p) => (
                <div key={p.level} className="flex items-start gap-3">
                  <span
                    className="mt-0.5 w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: p.color, marginTop: "6px" }}
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-800">{p.level} — </span>
                    <span className="text-sm text-gray-500">{p.desc}</span>
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
