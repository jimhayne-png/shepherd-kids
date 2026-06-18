"use client";

import { use, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AppShell, { type NavItem } from "@/components/layout/AppShell";
import { MINISTRY_CONFIG, getAutoMinistries } from "@/lib/ministry-config";

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
  gender: string;
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

export default function EditMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [churchId, setChurchId] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState<string | null>(null);

  // Prayer Button state
  const [portalToken, setPortalToken] = useState<string | null>(null);
  const [prayerLinkCopied, setPrayerLinkCopied] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [prayerMsg, setPrayerMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [form, setForm] = useState<FormData>({
    firstName: "", lastName: "",
    email: "", phone: "",
    address: "", city: "", state: "", zip: "",
    birthdate: "", anniversary: "", spiritualBirthday: "", gender: "",
    memberType: "member", status: "active",
    notes: "", departmentIds: [],
  });

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleDept(deptId: string) {
    setForm((prev) => ({
      ...prev,
      departmentIds: prev.departmentIds.includes(deptId)
        ? prev.departmentIds.filter((d) => d !== deptId)
        : [...prev.departmentIds, deptId],
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

      // Load member
      const res = await fetch(`/api/members/${id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (res.ok && data.member) {
        const m = data.member;
        setMemberName(`${m.first_name} ${m.last_name}`);
        setMemberEmail(m.email ?? null);
        setPortalToken(m.portal_token ?? null);
        setForm({
          firstName: m.first_name ?? "",
          lastName: m.last_name ?? "",
          email: m.email ?? "",
          phone: m.phone ?? "",
          address: m.address ?? "",
          city: m.city ?? "",
          state: m.state ?? "",
          zip: m.zip ?? "",
          birthdate: m.birthdate ?? "",
          anniversary: m.anniversary ?? "",
          spiritualBirthday: m.spiritual_birthday ?? "",
          gender: m.gender ?? "",
          memberType: m.member_type ?? "member",
          status: m.status ?? "active",
          notes: m.notes ?? "",
          departmentIds: (m.member_departments ?? []).map(
            (md: { department_id: string }) => md.department_id
          ),
        });
      }
      setDataLoading(false);
    }
    init();
  }, [router, id]);

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

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch(`/api/members/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to save");
      setSubmitting(false);
      return;
    }
    router.push("/dashboard/members");
  }

  async function handleDelete() {
    if (!confirm(`Delete ${memberName}? This cannot be undone.`)) return;
    setDeleting(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch(`/api/members/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (res.ok) {
      router.push("/dashboard/members");
    } else {
      const d = await res.json();
      setError(d.error ?? "Delete failed");
      setDeleting(false);
    }
  }

  const prayerUrl = portalToken
    ? `https://shepherd-kids.vercel.app/pray/${portalToken}`
    : null;

  async function handleCopyPrayerLink() {
    if (!prayerUrl) return;
    await navigator.clipboard.writeText(prayerUrl);
    setPrayerLinkCopied(true);
    setTimeout(() => setPrayerLinkCopied(false), 2500);
  }

  async function handleSendPrayerLink() {
    if (!token) return;
    setSendingLink(true);
    setPrayerMsg(null);
    const res = await fetch(`/api/members/${id}/send-prayer-link`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const d = await res.json();
    if (res.ok) {
      setPrayerMsg({ type: "success", text: `Prayer link sent to ${memberEmail}` });
    } else {
      setPrayerMsg({ type: "error", text: d.error ?? "Failed to send email" });
    }
    setSendingLink(false);
  }

  async function handleRegenerateToken() {
    if (!token || !confirm("Regenerate the prayer link? The old link will stop working immediately.")) return;
    setRegenerating(true);
    setPrayerMsg(null);
    const res = await fetch(`/api/members/${id}/regenerate-token`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const d = await res.json();
    if (res.ok) {
      setPortalToken(d.portal_token);
      setPrayerMsg({ type: "success", text: "Prayer link regenerated. Share the new link with the member." });
    } else {
      setPrayerMsg({ type: "error", text: d.error ?? "Failed to regenerate token" });
    }
    setRegenerating(false);
  }

  const autoMinistries = useMemo(() =>
    getAutoMinistries({ gender: form.gender, birthdate: form.birthdate, member_type: form.memberType }),
    [form.gender, form.birthdate, form.memberType]
  );

  if (authLoading || dataLoading) {
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
        <Link href="/dashboard/members" className="text-green-300 hover:text-white text-sm transition-colors block mb-2">
          ← Members
        </Link>
        <h1 className="text-3xl font-bold text-white">Edit Member</h1>
        {memberName && <p className="text-green-200 text-sm mt-1">{memberName}</p>}
      </div>

      <div className="px-8 py-8 bg-gray-50 min-h-screen">
        <div className="max-w-2xl space-y-8">
        <form onSubmit={handleSubmit} className="space-y-8">

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
              <Field label="Gender">
                <select
                  value={form.gender}
                  onChange={(e) => set("gender", e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-800 bg-white"
                >
                  <option value="">— Not specified —</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </Field>
              {autoMinistries.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ministry</label>
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {autoMinistries.map((type) => {
                      const cfg = MINISTRY_CONFIG[type];
                      return cfg ? (
                        <Link
                          key={type}
                          href={`/dashboard/ministry/${type}/roster`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white hover:opacity-90 transition-opacity"
                          style={{ backgroundColor: "#F28C28" }}
                        >
                          {cfg.emoji} {cfg.name}
                        </Link>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
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
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
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
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
          )}

          <div className="flex items-center justify-between gap-3 pb-2">
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
                href="/dashboard/members"
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
              {deleting ? "Deleting…" : "Delete Member"}
            </button>
          </div>
        </form>

        {/* Prayer Button section — outside main form */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 pb-8">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🙏</span>
            <h2 className="text-base font-semibold text-gray-800">Prayer Button</h2>
          </div>
          <p className="text-sm text-gray-500 mb-5">
            A personal link this member can use to submit prayer requests from their phone — no login required.
          </p>

          {prayerMsg && (
            <div
              className={`mb-4 text-sm rounded-lg px-4 py-3 border ${
                prayerMsg.type === "success"
                  ? "text-green-700 bg-green-50 border-green-200"
                  : "text-red-600 bg-red-50 border-red-200"
              }`}
            >
              {prayerMsg.text}
            </div>
          )}

          {prayerUrl ? (
            <>
              <div className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-200 mb-4">
                <p className="text-xs text-gray-400 mb-1">Prayer Button URL</p>
                <p className="text-sm text-gray-700 break-all font-mono">{prayerUrl}</p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleCopyPrayerLink}
                  className="px-5 py-2.5 rounded-lg font-semibold text-sm text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: prayerLinkCopied ? "#16a34a" : "#1A4A2E" }}
                >
                  {prayerLinkCopied ? "✓ Copied!" : "Copy Link"}
                </button>

                {memberEmail ? (
                  <button
                    type="button"
                    onClick={handleSendPrayerLink}
                    disabled={sendingLink}
                    className="px-5 py-2.5 rounded-lg font-semibold text-sm border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {sendingLink ? "Sending…" : "Send Link via Email"}
                  </button>
                ) : (
                  <span className="px-5 py-2.5 rounded-lg text-sm text-gray-400 border border-gray-100">
                    No email on file — can&apos;t send
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleRegenerateToken}
                  disabled={regenerating}
                  className="px-5 py-2.5 rounded-lg font-medium text-sm border border-amber-200 text-amber-700 hover:bg-amber-50 transition-colors disabled:opacity-50"
                >
                  {regenerating ? "Regenerating…" : "Regenerate Link"}
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-gray-400 mb-3">No prayer link generated yet.</p>
              <button
                type="button"
                onClick={handleRegenerateToken}
                disabled={regenerating}
                className="px-6 py-2.5 rounded-lg font-semibold text-sm text-white disabled:opacity-50"
                style={{ backgroundColor: "#1A4A2E" }}
              >
                {regenerating ? "Generating…" : "Generate Prayer Link"}
              </button>
            </div>
          )}
        </section>

        </div>
      </div>
    </AppShell>
  );
}
