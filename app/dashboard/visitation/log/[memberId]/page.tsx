"use client";

import { use, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

const CONTACT_TYPES = [
  { value: "phone_call", label: "📞 Phone Call" },
  { value: "in_person", label: "🤝 In-Person Visit" },
  { value: "lunch", label: "🍽️ Lunch" },
  { value: "email", label: "📧 Email" },
  { value: "letter", label: "✉️ Letter" },
  { value: "text", label: "💬 Text" },
];

type StaffMember = {
  id: string;
  member_id: string;
  role: string;
  members: { first_name: string; last_name: string };
};

type LogEntry = {
  id: string;
  contact_type: string;
  contact_date: string;
  notes: string | null;
  follow_up_needed: boolean;
  follow_up_at: string | null;
  follow_up_notes: string | null;
};

function today() {
  return new Date().toISOString().split("T")[0];
}

export default function LogContactPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFollowupMode = searchParams.get("followup") === "1";

  const [authLoading, setAuthLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [memberName, setMemberName] = useState("");
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [recentLogs, setRecentLogs] = useState<LogEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    contactType: "in_person",
    contactDate: today(),
    notes: "",
    followUpNeeded: isFollowupMode,
    followUpAt: "",
    followUpNotes: "",
    assignedTo: "",
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/"); return; }
      setToken(session.access_token);

      const { data: cu } = await supabase
        .from("church_users")
        .select("church_id")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (!cu) { router.replace("/onboarding"); return; }

      // Load member name
      const { data: member } = await supabase
        .from("members")
        .select("first_name, last_name")
        .eq("id", memberId)
        .eq("church_id", cu.church_id)
        .maybeSingle();
      if (member) setMemberName(`${member.first_name} ${member.last_name}`);

      setAuthLoading(false);

      // Load staff and recent logs in parallel
      const [staffRes, logsRes] = await Promise.all([
        fetch("/api/visitation", { headers: { Authorization: `Bearer ${session.access_token}` } })
          .then((r) => r.json()),
        fetch(`/api/visitation/log?memberId=${memberId}`, { headers: { Authorization: `Bearer ${session.access_token}` } })
          .then((r) => r.json()),
      ]);

      setStaff(staffRes.staff ?? []);
      setRecentLogs((logsRes.logs ?? []).slice(0, 5));
    }
    init();
  }, [router, memberId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setError("");

    const res = await fetch("/api/visitation/log", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        memberId,
        contactType: form.contactType,
        contactDate: form.contactDate,
        notes: form.notes,
        followUpNeeded: form.followUpNeeded,
        followUpAt: form.followUpAt || null,
        followUpNotes: form.followUpNotes,
        assignedTo: form.assignedTo || null,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to save");
      setSubmitting(false);
      return;
    }
    router.push("/dashboard/visitation");
  }

  function formatContactDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  const CONTACT_LABELS: Record<string, string> = {
    phone_call: "📞 Phone Call", in_person: "🤝 In-Person", lunch: "🍽️ Lunch",
    email: "📧 Email", letter: "✉️ Letter", text: "💬 Text",
  };

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
          <Link href="/dashboard/visitation" className="text-green-300 hover:text-white text-sm transition-colors">
            ← Visitation
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-white">
          {isFollowupMode ? "📅 Schedule Visit" : "Log Contact"}
        </h1>
        {memberName && <p className="text-green-200 text-sm mt-1">{memberName}</p>}
      </div>

      <div className="px-8 py-8 bg-gray-50 min-h-screen">
        <div className="max-w-2xl space-y-6">
          {/* Log form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-800 mb-5">Contact Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Type</label>
                  <select
                    value={form.contactType}
                    onChange={(e) => set("contactType", e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-800 bg-white"
                  >
                    {CONTACT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Contact</label>
                  <input
                    type="date"
                    value={form.contactDate}
                    onChange={(e) => set("contactDate", e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-800"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes <span className="text-gray-400 font-normal">(private — pastor only)</span>
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  rows={4}
                  placeholder="How did the conversation go? Any pastoral needs or concerns…"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-800 resize-none"
                />
              </div>

              {staff.length > 0 && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Staff Member</label>
                  <select
                    value={form.assignedTo}
                    onChange={(e) => set("assignedTo", e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-800 bg-white"
                  >
                    <option value="">— Unassigned —</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.member_id}>
                        {s.members.first_name} {s.members.last_name} ({s.role.replace("_", " ")})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </section>

            {/* Follow-up section */}
            <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <label className="flex items-center gap-3 cursor-pointer mb-4">
                <input
                  type="checkbox"
                  checked={form.followUpNeeded}
                  onChange={(e) => set("followUpNeeded", e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm font-semibold text-gray-800">Follow-up needed</span>
              </label>

              {form.followUpNeeded && (
                <div className="space-y-4 pl-7">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up Date</label>
                    <input
                      type="date"
                      value={form.followUpAt}
                      onChange={(e) => set("followUpAt", e.target.value)}
                      min={today()}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up Notes</label>
                    <textarea
                      value={form.followUpNotes}
                      onChange={(e) => set("followUpNotes", e.target.value)}
                      rows={3}
                      placeholder="What do you want to follow up on?"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-800 resize-none"
                    />
                  </div>
                </div>
              )}
            </section>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
            )}

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={submitting}
                className="px-8 py-3 rounded-lg font-semibold text-sm text-white transition-opacity disabled:opacity-60"
                style={{ backgroundColor: "#1A4A2E" }}
              >
                {submitting ? "Saving…" : "Save Contact Log"}
              </button>
              <Link
                href="/dashboard/visitation"
                className="px-6 py-3 rounded-lg font-medium text-sm text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
            </div>
          </form>

          {/* Recent contact history */}
          {recentLogs.length > 0 && (
            <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-800 mb-4">Recent Contact History</h2>
              <div className="space-y-3">
                {recentLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                    <span className="text-lg flex-shrink-0 mt-0.5">
                      {CONTACT_LABELS[log.contact_type]?.split(" ")[0] ?? "📋"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800">
                          {CONTACT_LABELS[log.contact_type] ?? log.contact_type}
                        </span>
                        <span className="text-xs text-gray-400">{formatContactDate(log.contact_date)}</span>
                      </div>
                      {log.notes && (
                        <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{log.notes}</p>
                      )}
                      {log.follow_up_at && (
                        <p className="text-xs text-amber-600 mt-0.5">
                          📅 Follow-up: {formatContactDate(log.follow_up_at)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </AppShell>
  );
}
