"use client";

import { useEffect, useState } from "react";
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

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
];

type Department = { id: string; name: string };

type FormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  birthdate: string;
  anniversary: string;
  spiritualBirthday: string;
  memberType: string;
  status: string;
  notes: string;
  departmentIds: string[];
};

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function Input({ value, onChange, type = "text", placeholder }: {
  value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-800"
    />
  );
}

export default function AddMemberPage() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [churchId, setChurchId] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<FormData>({
    firstName: "", lastName: "",
    email: "", phone: "",
    address: "", city: "", state: "", zip: "",
    birthdate: "", anniversary: "", spiritualBirthday: "",
    memberType: "member", status: "active",
    notes: "", departmentIds: [],
  });

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleDept(id: string) {
    setForm((prev) => ({
      ...prev,
      departmentIds: prev.departmentIds.includes(id)
        ? prev.departmentIds.filter((d) => d !== id)
        : [...prev.departmentIds, id],
    }));
  }

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

      const { data: cu } = await supabase
        .from("church_users")
        .select("church_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!cu) { router.replace("/onboarding"); return; }
      setChurchId(cu.church_id);
      setAuthLoading(false);
    }
    init();
  }, [router]);

  useEffect(() => {
    if (!token) return;
    fetch("/api/departments", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setDepartments(d.departments ?? []));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("First and last name are required.");
      return;
    }
    setSubmitting(true);
    setError("");

    const res = await fetch("/api/members", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to save member");
      setSubmitting(false);
      return;
    }

    router.push("/dashboard/members");
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
        <div className="flex items-center gap-3 mb-1">
          <Link href="/dashboard/members" className="text-green-300 hover:text-white text-sm transition-colors">
            ← Members
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-white">Add Member</h1>
      </div>

      <div className="px-8 py-8 bg-gray-50 min-h-screen">
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-8">
          {/* Personal Info */}
          <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-5">Personal Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="First Name" required>
                <Input value={form.firstName} onChange={(v) => set("firstName", v)} placeholder="Jane" />
              </Field>
              <Field label="Last Name" required>
                <Input value={form.lastName} onChange={(v) => set("lastName", v)} placeholder="Smith" />
              </Field>
              <Field label="Email">
                <Input value={form.email} onChange={(v) => set("email", v)} type="email" placeholder="jane@email.com" />
              </Field>
              <Field label="Phone">
                <Input value={form.phone} onChange={(v) => set("phone", v)} type="tel" placeholder="(555) 000-0000" />
              </Field>
              <Field label="Birthdate">
                <Input value={form.birthdate} onChange={(v) => set("birthdate", v)} type="date" />
              </Field>
              <Field label="Anniversary">
                <Input value={form.anniversary} onChange={(v) => set("anniversary", v)} type="date" />
              </Field>
              <Field label="Spiritual Birthday">
                <Input value={form.spiritualBirthday} onChange={(v) => set("spiritualBirthday", v)} type="date" />
              </Field>
            </div>
          </section>

          {/* Address */}
          <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-5">Address</h2>
            <div className="space-y-4">
              <Field label="Street Address">
                <Input value={form.address} onChange={(v) => set("address", v)} placeholder="123 Main St" />
              </Field>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <Field label="City">
                    <Input value={form.city} onChange={(v) => set("city", v)} placeholder="Springfield" />
                  </Field>
                </div>
                <Field label="State">
                  <select
                    value={form.state}
                    onChange={(e) => set("state", e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-800 bg-white"
                  >
                    <option value="">Select…</option>
                    {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Zip">
                  <Input value={form.zip} onChange={(v) => set("zip", v)} placeholder="62701" />
                </Field>
              </div>
            </div>
          </section>

          {/* Classification */}
          <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-5">Classification</h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Member Type">
                <select
                  value={form.memberType}
                  onChange={(e) => set("memberType", e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-800 bg-white"
                >
                  {["member","visitor","staff","child","youth"].map((t) => (
                    <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select
                  value={form.status}
                  onChange={(e) => set("status", e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-800 bg-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </Field>
            </div>
          </section>

          {/* Departments */}
          <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-5">Departments</h2>
            {departments.length === 0 ? (
              <p className="text-sm text-gray-400">No departments yet. Add departments in the Departments section.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {departments.map((d) => {
                  const selected = form.departmentIds.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toggleDept(d.id)}
                      className="px-4 py-2 rounded-full text-sm font-medium border transition-colors"
                      style={{
                        backgroundColor: selected ? "#1A4A2E" : "transparent",
                        borderColor: selected ? "#1A4A2E" : "#d1d5db",
                        color: selected ? "#fff" : "#374151",
                      }}
                    >
                      {d.name}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Notes */}
          <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-5">Notes</h2>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Any additional notes about this member…"
              rows={4}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-800 resize-none"
            />
          </section>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          <div className="flex items-center gap-4 pb-8">
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3 rounded-lg font-semibold text-sm text-white transition-opacity disabled:opacity-60"
              style={{ backgroundColor: "#1A4A2E" }}
            >
              {submitting ? "Saving…" : "Save Member"}
            </button>
            <Link
              href="/dashboard/members"
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
