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

type Department = { id: string; name: string; color: string };

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

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <button type="button" onClick={() => onChange(!value)}
        className="relative w-11 h-6 rounded-full transition-colors duration-200"
        style={{ backgroundColor: value ? "#1A4A2E" : "#d1d5db" }} aria-pressed={value}>
        <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
          style={{ transform: value ? "translateX(20px)" : "translateX(0)" }} />
      </button>
    </div>
  );
}

// Convert ISO datetime to datetime-local input value
function toInputValue(iso: string | null, allDay: boolean): string {
  if (!iso) return "";
  if (allDay) return iso.slice(0, 10);
  // datetime-local needs "YYYY-MM-DDTHH:MM"
  return iso.slice(0, 16);
}

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [eventTitle, setEventTitle] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState("weekly");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");
  const [isAllChurch, setIsAllChurch] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/"); return; }

      const { data: cu } = await supabase
        .from("church_users").select("church_id").eq("user_id", session.user.id).maybeSingle();
      if (!cu) { router.replace("/onboarding"); return; }
      setAuthLoading(false);

      supabase.from("departments").select("id, name, color").order("name")
        .then(({ data }) => setDepartments(data ?? []));

      const res = await fetch(`/api/events/${id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (res.ok && data.event) {
        const ev = data.event;
        setEventTitle(ev.title);
        setTitle(ev.title ?? "");
        setDescription(ev.description ?? "");
        setLocation(ev.location ?? "");
        setDepartmentId(ev.department_id ?? "");
        setAllDay(ev.all_day ?? false);
        setStartsAt(toInputValue(ev.starts_at, ev.all_day));
        setEndsAt(toInputValue(ev.ends_at, ev.all_day));
        setIsRecurring(ev.is_recurring ?? false);
        setRecurrenceFrequency(ev.recurrence_frequency ?? "weekly");
        setRecurrenceEndDate(ev.recurrence_end_date ? ev.recurrence_end_date.slice(0, 10) : "");
        setIsAllChurch(ev.is_all_church ?? false);
      }
      setDataLoading(false);
    }
    init();
  }, [router, id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("Event title is required."); return; }
    setSubmitting(true);
    setError("");

    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`/api/events/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({
        title, description, location, departmentId,
        startsAt, endsAt, allDay,
        isRecurring, recurrenceFrequency, recurrenceEndDate,
        isAllChurch,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Failed to save"); setSubmitting(false); return; }
    router.push("/dashboard/calendar");
  }

  async function handleDelete() {
    if (!confirm(`Delete "${eventTitle}"? This cannot be undone.`)) return;
    setDeleting(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`/api/events/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (res.ok) { router.push("/dashboard/calendar"); }
    else { const d = await res.json(); setError(d.error ?? "Delete failed"); setDeleting(false); }
  }

  if (authLoading || dataLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-gray-500">Loading…</div></div>;
  }

  const inputCls = "w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-800 bg-white";

  return (
    <AppShell navItems={navItems}>
      <div className="px-8 py-8" style={{ background: "linear-gradient(135deg, #1A4A2E 0%, #2D6B42 100%)" }}>
        <Link href="/dashboard/calendar" className="text-green-300 hover:text-white text-sm transition-colors block mb-2">← Calendar</Link>
        <h1 className="text-3xl font-bold text-white">Edit Event</h1>
        {eventTitle && <p className="text-green-200 text-sm mt-1">{eventTitle}</p>}
      </div>

      <div className="px-8 py-8 bg-gray-50 min-h-screen">
        <form onSubmit={handleSubmit} className="max-w-xl space-y-6">

          <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-800">Event Details</h2>
            <Field label="Event Title" required>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Sunday Service" className={inputCls} />
            </Field>
            <Field label="Description">
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Event details…" rows={3} className={inputCls + " resize-none"} />
            </Field>
            <Field label="Location">
              <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Main Sanctuary" className={inputCls} />
            </Field>
            <Field label="Department">
              <select value={departmentId} onChange={e => setDepartmentId(e.target.value)} className={inputCls}>
                <option value="">All Church / No Department</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
          </section>

          <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-800">Date & Time</h2>
            <Toggle value={allDay} onChange={setAllDay} label="All Day Event" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Start" required>
                <input type={allDay ? "date" : "datetime-local"} value={startsAt} onChange={e => setStartsAt(e.target.value)} className={inputCls} />
              </Field>
              <Field label="End">
                <input type={allDay ? "date" : "datetime-local"} value={endsAt} onChange={e => setEndsAt(e.target.value)} className={inputCls} />
              </Field>
            </div>
          </section>

          <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-2">Options</h2>
            <Toggle value={isAllChurch} onChange={setIsAllChurch} label="All-Church Event" />
            <Toggle value={isRecurring} onChange={setIsRecurring} label="Recurring Event" />
            {isRecurring && (
              <div className="pt-3 space-y-3">
                <Field label="Frequency">
                  <select value={recurrenceFrequency} onChange={e => setRecurrenceFrequency(e.target.value)} className={inputCls}>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Biweekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </Field>
                <Field label="Repeat Until" hint="Leave blank to repeat indefinitely">
                  <input type="date" value={recurrenceEndDate} onChange={e => setRecurrenceEndDate(e.target.value)} className={inputCls} />
                </Field>
              </div>
            )}
          </section>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}

          <div className="flex items-center justify-between gap-3 pb-8">
            <div className="flex gap-3">
              <button type="submit" disabled={submitting} className="px-8 py-3 rounded-lg font-semibold text-sm text-white disabled:opacity-60 hover:opacity-90 transition-opacity" style={{ backgroundColor: "#1A4A2E" }}>
                {submitting ? "Saving…" : "Save Changes"}
              </button>
              <Link href="/dashboard/calendar" className="px-6 py-3 rounded-lg font-medium text-sm text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors">
                Cancel
              </Link>
            </div>
            <button type="button" onClick={handleDelete} disabled={deleting}
              className="px-6 py-3 rounded-lg font-medium text-sm border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40">
              {deleting ? "Deleting…" : "Delete Event"}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
