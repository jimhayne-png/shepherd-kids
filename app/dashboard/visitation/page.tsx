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

type Department = { id: string; name: string };
type StaffMember = {
  id: string;
  member_id: string;
  role: string;
  members: { first_name: string; last_name: string };
};
type VisitationMember = {
  id: string;
  first_name: string;
  last_name: string;
  photo_url: string | null;
  member_type: string;
  last_contacted_at: string | null;
  days_since_contact: number | null;
  last_contact_type: string | null;
  follow_up_at: string | null;
  follow_up_notes: string | null;
  assigned_staff_id: string | null;
  departments: Department[];
};

const CONTACT_ICONS: Record<string, string> = {
  phone_call: "📞",
  in_person: "🤝",
  lunch: "🍽️",
  email: "📧",
  letter: "✉️",
  text: "💬",
};

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(" ");
  const initials = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  const hue = (name.charCodeAt(0) * 37 + name.charCodeAt(name.length - 1) * 13) % 360;
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
      style={{ backgroundColor: `hsl(${hue}, 55%, 45%)` }}
    >
      {initials.toUpperCase()}
    </div>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function nextDueDate(lastContactedAt: string | null, thresholdDays: number): string {
  if (!lastContactedAt) return "Overdue";
  const due = new Date(lastContactedAt);
  due.setDate(due.getDate() + thresholdDays);
  return due.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function MemberCard({
  member,
  token,
  staff,
  onAssign,
}: {
  member: VisitationMember;
  token: string;
  staff: StaffMember[];
  onAssign: (memberId: string, staffMemberId: string) => void;
}) {
  const fullName = `${member.first_name} ${member.last_name}`;
  const [assigning, setAssigning] = useState(false);

  async function handleAssign(staffMemberId: string) {
    setAssigning(true);
    await fetch("/api/visitation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ memberId: member.id, staffMemberId: staffMemberId || null }),
    });
    onAssign(member.id, staffMemberId);
    setAssigning(false);
  }

  const assignedStaff = staff.find((s) => s.member_id === member.assigned_staff_id);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <Initials name={fullName} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-gray-900 text-sm">{fullName}</p>
              {member.departments.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {member.departments.map((d) => (
                    <span key={d.id} className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">
                      {d.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {member.last_contact_type && (
              <span className="text-lg flex-shrink-0" title={member.last_contact_type.replace("_", " ")}>
                {CONTACT_ICONS[member.last_contact_type] ?? "📋"}
              </span>
            )}
          </div>

          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
            <span>Last contact: <strong className="text-gray-700">{formatDate(member.last_contacted_at)}</strong></span>
            <span>Days since: <strong className={member.days_since_contact === null ? "text-red-600" : "text-gray-700"}>
              {member.days_since_contact === null ? "Never" : `${member.days_since_contact}d`}
            </strong></span>
            {member.follow_up_at && (
              <span className="col-span-2 text-amber-600">
                📅 Follow-up due: <strong>{formatDate(member.follow_up_at)}</strong>
              </span>
            )}
          </div>

          {/* Assign select */}
          <div className="mt-3">
            <select
              value={member.assigned_staff_id ?? ""}
              onChange={(e) => handleAssign(e.target.value)}
              disabled={assigning}
              className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-green-700"
            >
              <option value="">— Unassigned —</option>
              {staff.map((s) => (
                <option key={s.id} value={s.member_id}>
                  {s.members.first_name} {s.members.last_name} ({s.role.replace("_", " ")})
                </option>
              ))}
            </select>
          </div>

          {/* Action buttons */}
          <div className="mt-3 flex gap-2">
            <Link
              href={`/dashboard/visitation/log/${member.id}`}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-center text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#1A4A2E" }}
            >
              Log Contact
            </Link>
            <Link
              href={`/dashboard/visitation/log/${member.id}?followup=1`}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium text-center border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Schedule Visit
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  color,
  dot,
  members,
  token,
  staff,
  onAssign,
}: {
  title: string;
  color: string;
  dot: string;
  members: VisitationMember[];
  token: string;
  staff: StaffMember[];
  onAssign: (memberId: string, staffId: string) => void;
}) {
  const [open, setOpen] = useState(true);
  if (members.length === 0) return null;
  return (
    <div className="mb-8">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 mb-3 group"
      >
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: dot }} />
        <h2 className="text-base font-bold text-gray-800">{title}</h2>
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: dot }}>
          {members.length}
        </span>
        <span className="text-gray-400 text-sm ml-1">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {members.map((m) => (
            <MemberCard key={m.id} member={m} token={token} staff={staff} onAssign={onAssign} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function VisitationPage() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [members, setMembers] = useState<VisitationMember[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [threshold, setThreshold] = useState(30);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [staffFilter, setStaffFilter] = useState("all");

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
    fetch("/api/visitation", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        setMembers(d.members ?? []);
        setStaff(d.staff ?? []);
        setThreshold(d.settings?.connection_threshold_days ?? 30);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token]);

  function handleAssign(memberId: string, staffMemberId: string) {
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, assigned_staff_id: staffMemberId || null } : m))
    );
  }

  // Collect all unique departments for filter
  const allDepts = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((m) => m.departments.forEach((d) => map.set(d.id, d.name)));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [members]);

  const filtered = useMemo(() => {
    return members.filter((m) => {
      const name = `${m.first_name} ${m.last_name}`.toLowerCase();
      if (search && !name.includes(search.toLowerCase())) return false;
      if (deptFilter !== "all" && !m.departments.some((d) => d.id === deptFilter)) return false;
      if (staffFilter !== "all" && m.assigned_staff_id !== staffFilter) return false;
      return true;
    });
  }, [members, search, deptFilter, staffFilter]);

  const overdue = useMemo(
    () => filtered.filter((m) => m.days_since_contact === null || m.days_since_contact > threshold),
    [filtered, threshold]
  );
  const dueSoon = useMemo(
    () => filtered.filter((m) => m.days_since_contact !== null && m.days_since_contact > threshold - 7 && m.days_since_contact <= threshold),
    [filtered, threshold]
  );
  const connected = useMemo(
    () => filtered.filter((m) => m.days_since_contact !== null && m.days_since_contact <= threshold - 7),
    [filtered, threshold]
  );

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const connectedThisMonth = members.filter(
    (m) => m.last_contacted_at && m.last_contacted_at >= monthStart
  ).length;
  const upcomingFollowups = members.filter(
    (m) => m.follow_up_at && new Date(m.follow_up_at) >= now && new Date(m.follow_up_at) <= new Date(now.getTime() + 7 * 86400000)
  ).length;

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">🤝 Visitation</h1>
            <p className="text-green-200 text-sm mt-1">Every member seen. Every need met.</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/dashboard/visitation/settings"
              className="px-4 py-2.5 rounded-lg text-sm font-medium border-2 border-white/30 text-white hover:border-white/60 transition-colors"
            >
              ⚙ Settings
            </Link>
          </div>
        </div>
      </div>

      <div className="px-8 py-8 bg-gray-50 min-h-screen">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8 -mt-6">
          {[
            { label: "Total Members", value: members.length, emoji: "👥", color: "#3b82f6" },
            { label: "Connected This Month", value: connectedThisMonth, emoji: "✅", color: "#16a34a" },
            { label: "Overdue", value: overdue.length, emoji: "🔴", color: "#dc2626" },
            { label: "Upcoming Follow-ups", value: upcomingFollowups, emoji: "📅", color: "#d97706" },
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

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members…"
            className="flex-1 min-w-48 px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-800"
          />
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-800"
          >
            <option value="all">All Departments</option>
            {allDepts.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <select
            value={staffFilter}
            onChange={(e) => setStaffFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-800"
          >
            <option value="all">All Staff</option>
            {staff.map((s) => (
              <option key={s.id} value={s.member_id}>
                {s.members.first_name} {s.members.last_name}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading members…</div>
        ) : members.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🤝</div>
            <p className="text-gray-500 font-medium mb-1">No active members yet</p>
            <p className="text-gray-400 text-sm">Add members to start tracking visitation.</p>
          </div>
        ) : (
          <>
            <Section
              title="Overdue"
              color="#dc2626"
              dot="#dc2626"
              members={overdue}
              token={token!}
              staff={staff}
              onAssign={handleAssign}
            />
            <Section
              title="Due Soon"
              color="#d97706"
              dot="#d97706"
              members={dueSoon}
              token={token!}
              staff={staff}
              onAssign={handleAssign}
            />
            <Section
              title="Connected"
              color="#16a34a"
              dot="#16a34a"
              members={connected}
              token={token!}
              staff={staff}
              onAssign={handleAssign}
            />
            {filtered.length === 0 && members.length > 0 && (
              <div className="text-center py-12 text-gray-400">No results match your filters.</div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
