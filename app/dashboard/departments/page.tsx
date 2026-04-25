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

type Department = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string | null;
  member_departments: { count: number }[];
};

export default function DepartmentsPage() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [churchName, setChurchName] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [depsLoading, setDepsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/"); return; }
      setToken(session.access_token);

      const { data: cu } = await supabase
        .from("church_users")
        .select("church_id, churches(name)")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!cu) { router.replace("/onboarding"); return; }
      const ch = cu.churches as unknown as { name: string } | null;
      setChurchName(ch?.name ?? null);
      setAuthLoading(false);
    }
    init();
  }, [router]);

  useEffect(() => {
    if (authLoading || !token) return;
    setDepsLoading(true);
    fetch("/api/departments", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { setDepartments(d.departments ?? []); setDepsLoading(false); })
      .catch(() => setDepsLoading(false));
  }, [authLoading, token]);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? All member assignments will also be removed.`)) return;
    setDeletingId(id);
    setError("");
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`/api/departments/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (res.ok) {
      setDepartments((prev) => prev.filter((d) => d.id !== id));
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
    <AppShell navItems={navItems}>
      {/* Hero */}
      <div
        className="px-8 py-8"
        style={{ background: "linear-gradient(135deg, #1A4A2E 0%, #2D6B42 100%)" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-green-200 text-sm mb-1">{churchName}</p>
            <h1 className="text-3xl font-bold text-white">Departments</h1>
          </div>
          <Link
            href="/dashboard/departments/add"
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#F28C28", color: "#1A4A2E" }}
          >
            <span className="text-lg leading-none">+</span> Add Department
          </Link>
        </div>
      </div>

      <div className="px-8 py-8 bg-gray-50 min-h-screen">
        {error && (
          <p className="mb-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        {depsLoading ? (
          <div className="text-center py-20 text-gray-400">Loading departments…</div>
        ) : departments.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🏛️</div>
            <p className="text-gray-500 font-medium mb-1">No departments yet</p>
            <p className="text-gray-400 text-sm mb-6">
              Create departments to organize your members into ministries and teams.
            </p>
            <Link
              href="/dashboard/departments/add"
              className="inline-block px-6 py-2.5 rounded-lg font-semibold text-sm text-white"
              style={{ backgroundColor: "#1A4A2E" }}
            >
              Add First Department
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {departments.map((dept) => {
              const memberCount = dept.member_departments?.[0]?.count ?? 0;
              return (
                <div
                  key={dept.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col"
                >
                  {/* Color bar */}
                  <div className="h-2 w-full" style={{ backgroundColor: dept.color }} />

                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        {dept.icon ? (
                          <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                            style={{ backgroundColor: dept.color + "22" }}
                          >
                            {dept.icon}
                          </div>
                        ) : (
                          <div
                            className="w-11 h-11 rounded-xl flex-shrink-0"
                            style={{ backgroundColor: dept.color + "22" }}
                          />
                        )}
                        <div>
                          <h3 className="font-bold text-gray-900 leading-tight">{dept.name}</h3>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {memberCount} member{memberCount !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                    </div>

                    {dept.description && (
                      <p className="text-sm text-gray-500 leading-relaxed flex-1 mb-4">
                        {dept.description}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mt-auto pt-4 border-t border-gray-50">
                      <Link
                        href={`/dashboard/departments/${dept.id}/edit`}
                        className="flex-1 py-2 rounded-lg text-xs font-medium text-center border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(dept.id, dept.name)}
                        disabled={deletingId === dept.id}
                        className="flex-1 py-2 rounded-lg text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                      >
                        {deletingId === dept.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
