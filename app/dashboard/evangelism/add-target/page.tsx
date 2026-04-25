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

const RELATIONSHIPS = [
  "Friend",
  "Family",
  "Coworker",
  "Neighbor",
  "Classmate",
  "Acquaintance",
  "Stranger",
];

function Field({ label, required, children, hint }: { label: string; required?: boolean; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

export default function AddPrayerTargetPage() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/"); return; }
      setToken(session.access_token);
      const { data: cu } = await supabase.from("church_users").select("church_id").eq("user_id", session.user.id).maybeSingle();
      if (!cu) { router.replace("/onboarding"); return; }
      setAuthLoading(false);
    }
    init();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim()) { setError("First name is required."); return; }
    if (!relationship) { setError("Please select a relationship."); return; }
    setSubmitting(true);
    setError("");

    const res = await fetch("/api/prayer-targets", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ firstName, relationship, notes }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Failed to save"); setSubmitting(false); return; }
    router.push("/dashboard/evangelism");
  }

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-gray-500">Loading…</div></div>;
  }

  const inputCls = "w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-800 bg-white";

  return (
    <AppShell navItems={navItems}>
      <div className="px-8 py-8" style={{ background: "linear-gradient(135deg, #1A4A2E 0%, #2D6B42 100%)" }}>
        <Link href="/dashboard/evangelism" className="text-green-300 hover:text-white text-sm transition-colors block mb-2">← Evangelism</Link>
        <h1 className="text-3xl font-bold text-white">Add Prayer Target</h1>
        <p className="text-green-200 text-sm mt-1 italic">Who is God laying on your heart?</p>
      </div>

      <div className="px-8 py-8 bg-gray-50 min-h-screen">
        <form onSubmit={handleSubmit} className="max-w-md space-y-6">

          <div className="bg-white rounded-xl border border-green-100 shadow-sm p-5 text-sm text-green-800" style={{ backgroundColor: "#f0fdf4" }}>
            <p className="font-semibold mb-1">✝️ A simple commitment</p>
            <p className="text-green-700 leading-relaxed">
              Choose one person you know who doesn't yet follow Jesus. Commit to praying for them daily —
              for an open heart, for the right opportunity, and for the Holy Spirit to prepare the way.
            </p>
          </div>

          <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
            <Field label="First Name" required hint="First name only — this is your personal prayer list">
              <input
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="e.g. Michael"
                className={inputCls}
                autoFocus
              />
            </Field>

            <Field label="Relationship" required>
              <select
                value={relationship}
                onChange={e => setRelationship(e.target.value)}
                className={inputCls}
              >
                <option value="">Select relationship…</option>
                {RELATIONSHIPS.map(r => (
                  <option key={r} value={r.toLowerCase()}>{r}</option>
                ))}
              </select>
            </Field>

            <Field label="Notes" hint="Private — only you can see this">
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Where you met, prayer context, anything that helps you pray for them…"
                rows={3}
                className={inputCls + " resize-none"}
              />
            </Field>
          </section>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
          )}

          <div className="flex gap-3 pb-8">
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3 rounded-lg font-semibold text-sm text-white disabled:opacity-60 hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "#1A4A2E" }}
            >
              {submitting ? "Saving…" : "Add to My Prayer List"}
            </button>
            <Link
              href="/dashboard/evangelism"
              className="px-6 py-3 rounded-lg font-medium text-sm text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
