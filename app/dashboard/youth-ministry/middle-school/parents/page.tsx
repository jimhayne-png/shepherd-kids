"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AppShell, { type NavItem } from "@/components/layout/AppShell";
import { MINISTRY_NAV_ITEMS } from "@/lib/ministry-config";

const ACCENT = "#F28C28";

type Parent = {
  id: string; first_name: string; last_name: string; phone: string | null; email: string | null;
  youth_students: { first_name: string; last_name: string; grade: string | null } | null;
};

const MS_GRADES = new Set(["6th", "7th", "8th"]);

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

export default function MiddleSchoolParentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [parents, setParents] = useState<Parent[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/"); return; }
      const t = session.access_token;
      const res = await fetch('/api/youth-ministry/parents', { headers: { Authorization: `Bearer ${t}` } });
      if (res.ok) { const d = await res.json(); setParents(d.parents ?? []); }
      setLoading(false);
    }
    init();
  }, [router]);

  const filtered = useMemo(() => {
    const list = parents.filter(p => p.youth_students?.grade != null && MS_GRADES.has(p.youth_students.grade));
    const q = search.toLowerCase();
    if (!q) return list;
    return list.filter(p =>
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
      (p.phone ?? "").includes(q)
    );
  }, [parents, search]);

  return (
    <AppShell navItems={navItems}>
      <div className="px-8 py-10" style={{ background: `linear-gradient(135deg, #c2570a 0%, ${ACCENT} 100%)` }}>
        <Link href="/dashboard/ministry/middle-school" className="text-orange-200 text-xs mb-1 block hover:text-white">← Middle School</Link>
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>Middle School Parents</h1>
        <p className="text-orange-100 text-sm mt-1">{filtered.length} parent{filtered.length !== 1 ? "s" : ""} on file</p>
      </div>

      <div className="px-8 py-8 bg-gray-50 min-h-screen">
        <div className="mb-5">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or phone…"
            className="w-full max-w-md px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white" />
        </div>

        {loading ? (
          <div className="text-gray-400 text-sm py-12 text-center">Loading parents…</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl shadow border border-gray-100 p-12 text-center">
            <p className="text-gray-400">{search ? "No parents match your search." : "No middle school parents on file yet."}</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">Parent</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">Phone</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">Student</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-orange-50 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: "#6366f1" }}>
                          {p.first_name[0]}{p.last_name[0]}
                        </div>
                        <span className="font-medium text-sm text-gray-900">{p.first_name} {p.last_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{p.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{p.email ?? "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {p.youth_students ? `${p.youth_students.first_name} ${p.youth_students.last_name}${p.youth_students.grade ? ` (${p.youth_students.grade})` : ""}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
