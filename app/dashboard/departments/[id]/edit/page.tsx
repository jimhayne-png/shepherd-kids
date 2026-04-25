"use client";

import { use, useEffect, useState } from "react";
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

const PRESET_COLORS = [
  "#1A4A2E","#2D6B42","#3b82f6","#6366f1","#8b5cf6",
  "#ec4899","#f43f5e","#f97316","#f59e0b","#eab308",
  "#22c55e","#14b8a6","#0ea5e9","#64748b","#1e293b",
];

const PRESET_ICONS = [
  "🙏","🎵","📖","✝️","🕊️","❤️","🌱","🏠","👨‍👩‍👧","👧","🧒",
  "🎓","🍞","🌍","⚡","🤝","🎺","🥁","🎹","🎸","💒","📢",
  "🌟","👑","🔥","💡","🌊","🌸","🦋","🌈",
];

export default function EditDepartmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [icon, setIcon] = useState("");

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/"); return; }

      const { data: cu } = await supabase
        .from("church_users")
        .select("church_id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!cu) { router.replace("/onboarding"); return; }
      setAuthLoading(false);

      // Load department data
      const res = await fetch(`/api/departments/${id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (res.ok && data.department) {
        setName(data.department.name ?? "");
        setDescription(data.department.description ?? "");
        setColor(data.department.color ?? "#3b82f6");
        setIcon(data.department.icon ?? "");
      }
      setDataLoading(false);
    }
    init();
  }, [router, id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Department name is required."); return; }
    setSubmitting(true);
    setError("");

    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`/api/departments/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ name, description, color, icon }),
    });

    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Failed to save"); setSubmitting(false); return; }
    router.push("/dashboard/departments");
  }

  async function handleDelete() {
    if (!confirm(`Delete "${name}"? All member assignments will also be removed.`)) return;
    setDeleting(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`/api/departments/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (res.ok) {
      router.push("/dashboard/departments");
    } else {
      const d = await res.json();
      setError(d.error ?? "Delete failed");
      setDeleting(false);
    }
  }

  if (authLoading || dataLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-gray-500">Loading…</div></div>;
  }

  return (
    <AppShell navItems={navItems}>
      <div className="px-8 py-8" style={{ background: "linear-gradient(135deg, #1A4A2E 0%, #2D6B42 100%)" }}>
        <Link href="/dashboard/departments" className="text-green-300 hover:text-white text-sm transition-colors block mb-2">
          ← Departments
        </Link>
        <h1 className="text-3xl font-bold text-white">Edit Department</h1>
      </div>

      <div className="px-8 py-8 bg-gray-50 min-h-screen">
        <form onSubmit={handleSubmit} className="max-w-xl space-y-6">

          <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department Name <span className="text-red-500">*</span>
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Worship Team"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this department do?"
                rows={3}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-800 resize-none"
              />
            </div>
          </section>

          {/* Color */}
          <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-4 mb-4">
              <label className="text-sm font-medium text-gray-700">Color</label>
              <div className="w-8 h-8 rounded-full border-2 border-white shadow-md" style={{ backgroundColor: color }} />
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-9 h-9 rounded-full transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    outline: color === c ? `3px solid ${c}` : "none",
                    outlineOffset: "2px",
                  }}
                />
              ))}
            </div>
          </section>

          {/* Icon */}
          <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-4 mb-4">
              <label className="text-sm font-medium text-gray-700">Icon</label>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                style={{ backgroundColor: color + "22" }}
              >
                {icon || "—"}
              </div>
              {icon && (
                <button type="button" onClick={() => setIcon("")} className="text-xs text-gray-400 hover:text-gray-600">
                  Clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESET_ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(ic)}
                  className="w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-colors hover:bg-gray-100"
                  style={{ backgroundColor: icon === ic ? color + "22" : undefined }}
                >
                  {ic}
                </button>
              ))}
            </div>
          </section>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
          )}

          <div className="flex items-center justify-between gap-3 pb-8">
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="px-8 py-3 rounded-lg font-semibold text-sm text-white disabled:opacity-60 transition-opacity hover:opacity-90"
                style={{ backgroundColor: "#1A4A2E" }}
              >
                {submitting ? "Saving…" : "Save Changes"}
              </button>
              <Link
                href="/dashboard/departments"
                className="px-6 py-3 rounded-lg font-medium text-sm text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
            </div>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="px-6 py-3 rounded-lg font-medium text-sm border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
            >
              {deleting ? "Deleting…" : "Delete Department"}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
