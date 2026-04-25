"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
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

type Department = { id: string; name: string };
type Member = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  member_type: string;
  status: string;
  member_departments: { departments: Department | null }[];
};

const TYPE_COLORS: Record<string, string> = {
  member: "bg-blue-100 text-blue-700",
  visitor: "bg-amber-100 text-amber-700",
  staff: "bg-purple-100 text-purple-700",
  child: "bg-pink-100 text-pink-700",
  youth: "bg-teal-100 text-teal-700",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-500",
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

export default function MembersPage() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [churchId, setChurchId] = useState<string | null>(null);
  const [churchName, setChurchName] = useState<string | null>(null);
  const [churchSlug, setChurchSlug] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/"); return; }

      setToken(session.access_token);

      const { data: cu } = await supabase
        .from("church_users")
        .select("church_id, churches(name, slug)")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!cu) { router.replace("/onboarding"); return; }

      const ch = cu.churches as unknown as { name: string; slug: string } | null;
      setChurchName(ch?.name ?? null);
      setChurchSlug(ch?.slug ?? null);
      setChurchId(cu.church_id);
      setAuthLoading(false);
    }
    init();
  }, [router]);

  useEffect(() => {
    if (!churchId || !token) return;
    setMembersLoading(true);
    fetch("/api/members", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setMembers(d.members ?? []);
        setMembersLoading(false);
      })
      .catch(() => setMembersLoading(false));
  }, [churchId, token]);

  const allDepts = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((m) =>
      m.member_departments?.forEach(({ departments: d }) => {
        if (d) map.set(d.id, d.name);
      })
    );
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [members]);

  const filtered = useMemo(() => {
    return members.filter((m) => {
      const fullName = `${m.first_name} ${m.last_name}`.toLowerCase();
      if (search && !fullName.includes(search.toLowerCase())) return false;
      if (deptFilter !== "all") {
        const deptIds = m.member_departments?.map((md) => md.departments?.id) ?? [];
        if (!deptIds.includes(deptFilter)) return false;
      }
      return true;
    });
  }, [members, search, deptFilter]);

  const stats = useMemo(() => ({
    total: members.length,
    active: members.filter((m) => m.status === "active").length,
    inactive: members.filter((m) => m.status === "inactive").length,
  }), [members]);

  const joinUrl = churchSlug
    ? `https://shepherd-well.vercel.app/join/${churchSlug}`
    : null;

  useEffect(() => {
    if (!showQrModal || !joinUrl) return;
    QRCode.toDataURL(joinUrl, { width: 280, margin: 2, color: { dark: "#1A4A2E", light: "#ffffff" } })
      .then((url) => setQrDataUrl(url));
  }, [showQrModal, joinUrl]);

  function handleCopyLink() {
    if (!joinUrl) return;
    navigator.clipboard.writeText(joinUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleDownloadQr() {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `${churchSlug ?? "church"}-qr-code.png`;
    a.click();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this member? This cannot be undone.")) return;
    setDeletingId(id);
    setError("");
    const res = await fetch(`/api/members/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setMembers((prev) => prev.filter((m) => m.id !== id));
    } else {
      const d = await res.json();
      setError(d.error ?? "Delete failed");
    }
    setDeletingId(null);
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
            <p className="text-green-200 text-sm mb-1">{churchName}</p>
            <h1 className="text-3xl font-bold text-white">Members</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowQrModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm border-2 border-white/30 text-white hover:border-white/60 transition-colors"
            >
              <span>⬛</span> QR Code
            </button>
            <Link
              href="/dashboard/members/import"
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm border-2 border-white/30 text-white hover:border-white/60 transition-colors"
            >
              ↑ Import CSV
            </Link>
            <Link
              href="/dashboard/members/add"
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#F28C28", color: "#1A4A2E" }}
            >
              <span className="text-lg leading-none">+</span> Add Member
            </Link>
          </div>
        </div>
      </div>

      <div className="px-8 py-8 bg-gray-50 min-h-screen">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8 -mt-6">
          {[
            { label: "Total Members", value: stats.total, color: "#3b82f6", emoji: "👥" },
            { label: "Active", value: stats.active, color: "#22c55e", emoji: "✅" },
            { label: "Inactive", value: stats.inactive, color: "#9ca3af", emoji: "💤" },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-xl shadow-md px-6 py-5 flex items-center gap-4 border border-gray-100"
            >
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center text-xl flex-shrink-0"
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
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name…"
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-800 bg-white"
          />
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-800 bg-white"
          >
            <option value="all">All Departments</option>
            {allDepts.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        {error && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        {/* List */}
        {membersLoading ? (
          <div className="text-center py-20 text-gray-400">Loading members…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">👥</div>
            <p className="text-gray-500 font-medium mb-1">
              {members.length === 0 ? "No members yet" : "No results found"}
            </p>
            <p className="text-gray-400 text-sm mb-6">
              {members.length === 0
                ? "Add your first member to get started."
                : "Try adjusting your search or filter."}
            </p>
            {members.length === 0 && (
              <Link
                href="/dashboard/members/add"
                className="inline-block px-6 py-2.5 rounded-lg font-semibold text-sm text-white"
                style={{ backgroundColor: "#1A4A2E" }}
              >
                Add First Member
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Member</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Contact</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Departments</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => {
                  const fullName = `${m.first_name} ${m.last_name}`;
                  const depts = m.member_departments
                    ?.map((md) => md.departments)
                    .filter(Boolean) as Department[];
                  return (
                    <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Initials name={fullName} />
                          <span className="font-medium text-gray-900">{fullName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="text-gray-600">{m.email ?? "—"}</div>
                        <div className="text-gray-400 text-xs">{m.phone ?? ""}</div>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {depts.length === 0
                            ? <span className="text-gray-400">—</span>
                            : depts.map((d) => (
                                <span key={d.id} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                                  {d.name}
                                </span>
                              ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${TYPE_COLORS[m.member_type] ?? "bg-gray-100 text-gray-600"}`}>
                          {m.member_type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[m.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {m.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <Link
                            href={`/dashboard/members/${m.id}/faith-journey`}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                            style={{ borderColor: "#1A4A2E", color: "#1A4A2E", backgroundColor: "#f0fdf4" }}
                          >
                            ✝ Journey
                          </Link>
                          <Link
                            href={`/dashboard/members/${m.id}/edit`}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDelete(m.id)}
                            disabled={deletingId === m.id}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                          >
                            {deletingId === m.id ? "…" : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
              Showing {filtered.length} of {members.length} members
            </div>
          </div>
        )}
      </div>
    </AppShell>

    {/* QR Modal */}
    {showQrModal && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
        onClick={(e) => { if (e.target === e.currentTarget) setShowQrModal(false); }}
      >
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Member Self-Registration</h2>
            <button
              onClick={() => setShowQrModal(false)}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>

          {/* QR Code */}
          <div className="flex justify-center mb-4">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code" className="w-64 h-64 rounded-xl" />
            ) : (
              <div className="w-64 h-64 rounded-xl bg-gray-100 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-gray-200 border-t-green-700 animate-spin" />
              </div>
            )}
          </div>

          <p className="text-center text-xs text-gray-400 mb-5">
            Display this QR code during service or print it in your bulletin
          </p>

          {/* URL */}
          {joinUrl && (
            <div className="bg-gray-50 rounded-xl px-4 py-3 mb-5 border border-gray-200">
              <p className="text-xs text-gray-400 mb-1">Registration link</p>
              <p className="text-sm text-gray-700 break-all font-mono">{joinUrl}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleDownloadQr}
              disabled={!qrDataUrl}
              className="flex-1 py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-40 transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#1A4A2E" }}
            >
              ↓ Download QR
            </button>
            <button
              onClick={handleCopyLink}
              className="flex-1 py-3 rounded-xl font-semibold text-sm border-2 transition-colors"
              style={{
                borderColor: "#1A4A2E",
                color: copied ? "#fff" : "#1A4A2E",
                backgroundColor: copied ? "#1A4A2E" : "transparent",
              }}
            >
              {copied ? "✓ Copied!" : "Copy Link"}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
