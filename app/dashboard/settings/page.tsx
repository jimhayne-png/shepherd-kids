"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AppShell, { type NavItem } from "@/components/layout/AppShell";
import { MINISTRY_NAV_ITEMS } from "@/lib/ministry-config";

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

type FormState = {
  name: string; email: string; phone: string; address: string;
  city: string; state: string; zip: string; website: string; logo_url: string;
  senior_pastor: string; children_pastor: string; youth_pastor: string;
  choir_director: string; mens_ministry_leader: string; womens_ministry_leader: string;
  young_adult_leader: string; senior_ministry_leader: string;
};

const EMPTY_FORM: FormState = {
  name: '', email: '', phone: '', address: '', city: '', state: '', zip: '', website: '', logo_url: '',
  senior_pastor: '', children_pastor: '', youth_pastor: '', choir_director: '',
  mens_ministry_leader: '', womens_ministry_leader: '', young_adult_leader: '', senior_ministry_leader: '',
};

function Field({ label, value, onChange, fullWidth = false }: {
  label: string; value: string; onChange: (v: string) => void; fullWidth?: boolean;
}) {
  return (
    <div className={fullWidth ? "col-span-2" : ""}>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-800 bg-white"
      />
    </div>
  );
}

function isValidUrl(url: string) {
  try { new URL(url); return true; } catch { return false; }
}

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [billing, setBilling] = useState<{ subscription_status?: string; subscription_tier?: string; trial_ends_at?: string }>({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  function set(key: keyof FormState) {
    return (v: string) => setForm(f => ({ ...f, [key]: v }));
  }

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/"); return; }
      const t = session.access_token;
      setToken(t);
      const res = await fetch('/api/settings', { headers: { Authorization: `Bearer ${t}` } });
      if (res.ok) {
        const { church } = await res.json();
        setForm({
          name: church.name ?? '',
          email: church.email ?? '',
          phone: church.phone ?? '',
          address: church.address ?? '',
          city: church.city ?? '',
          state: church.state ?? '',
          zip: church.zip ?? '',
          website: church.website ?? '',
          logo_url: church.logo_url ?? '',
          senior_pastor: church.senior_pastor ?? '',
          children_pastor: church.children_pastor ?? '',
          youth_pastor: church.youth_pastor ?? '',
          choir_director: church.choir_director ?? '',
          mens_ministry_leader: church.mens_ministry_leader ?? '',
          womens_ministry_leader: church.womens_ministry_leader ?? '',
          young_adult_leader: church.young_adult_leader ?? '',
          senior_ministry_leader: church.senior_ministry_leader ?? '',
        });
        setBilling({
          subscription_status: church.subscription_status ?? '',
          subscription_tier: church.subscription_tier ?? '',
          trial_ends_at: church.trial_ends_at ?? '',
        });
      }
      setLoading(false);
    }
    init();
  }, [router]);

  async function handleSave() {
    if (!token) return;
    setSaving(true);
    setError("");
    setSuccess("");
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setSuccess("Settings saved successfully.");
      setTimeout(() => setSuccess(""), 4000);
    } else {
      setError(data.error ?? "Failed to save settings.");
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-gray-400">Loading…</div>
    </div>
  );

  const showLogoPreview = form.logo_url.trim() !== '' && isValidUrl(form.logo_url);

  return (
    <AppShell navItems={navItems}>
      {/* Hero */}
      <div className="px-8 py-8" style={{ background: "linear-gradient(135deg, #1A4A2E 0%, #2D6B42 100%)" }}>
        <Link href="/dashboard" className="text-green-300 hover:text-white text-sm transition-colors block mb-2">← Dashboard</Link>
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>Church Settings</h1>
        <p className="text-green-200 text-sm mt-1">Manage your church profile and ministry leaders</p>
      </div>

      <div className="px-8 py-8 bg-gray-50 min-h-screen">
        <div className="max-w-3xl space-y-8">

          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
          )}
          {success && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">✅ {success}</p>
          )}

          {/* Section 1 — Church Information */}
          <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-0.5">Church Information</h2>
            <p className="text-sm text-gray-500 mb-5">Basic contact and identity details for your church.</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Church Name" value={form.name} onChange={set('name')} fullWidth />
              <Field label="Email" value={form.email} onChange={set('email')} />
              <Field label="Phone" value={form.phone} onChange={set('phone')} />
              <Field label="Address" value={form.address} onChange={set('address')} fullWidth />
              <Field label="City" value={form.city} onChange={set('city')} />
              <Field label="State" value={form.state} onChange={set('state')} />
              <Field label="Zip" value={form.zip} onChange={set('zip')} />
              <Field label="Website" value={form.website} onChange={set('website')} />
              <Field label="Logo URL" value={form.logo_url} onChange={set('logo_url')} fullWidth />
            </div>
            {showLogoPreview && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Logo Preview</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.logo_url} alt="Church logo preview" style={{ maxHeight: 80 }} className="rounded object-contain" />
              </div>
            )}
          </section>

          {/* Section 2 — Ministry Leaders */}
          <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-0.5">Ministry Leaders</h2>
            <p className="text-sm text-gray-500 mb-5">Names used in letters, emails, and reports across the platform.</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Senior Pastor" value={form.senior_pastor} onChange={set('senior_pastor')} />
              <Field label="Children's Pastor" value={form.children_pastor} onChange={set('children_pastor')} />
              <Field label="Youth Pastor" value={form.youth_pastor} onChange={set('youth_pastor')} />
              <Field label="Choir Director" value={form.choir_director} onChange={set('choir_director')} />
              <Field label="Men's Ministry Leader" value={form.mens_ministry_leader} onChange={set('mens_ministry_leader')} />
              <Field label="Women's Ministry Leader" value={form.womens_ministry_leader} onChange={set('womens_ministry_leader')} />
              <Field label="Young Adult Ministry Leader" value={form.young_adult_leader} onChange={set('young_adult_leader')} />
              <Field label="Senior Ministry Leader" value={form.senior_ministry_leader} onChange={set('senior_ministry_leader')} />
            </div>
          </section>

          {/* Section 3 — Billing */}
          <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-0.5">Billing</h2>
            <p className="text-sm text-gray-500 mb-5">Your current subscription details.</p>
            <div className="grid grid-cols-3 gap-4 mb-5">
              {[
                { label: "Status", value: billing.subscription_status },
                { label: "Plan", value: billing.subscription_tier },
                { label: "Trial Ends", value: billing.trial_ends_at ? new Date(billing.trial_ends_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
                  <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                  <p className="text-sm font-semibold text-gray-800 capitalize">{value || <span className="text-gray-400 font-normal italic">—</span>}</p>
                </div>
              ))}
            </div>
            <Link
              href="/dashboard/billing"
              className="inline-block px-5 py-2.5 rounded-lg text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              💳 Manage Billing
            </Link>
          </section>

          {/* Section 4 — Danger Zone */}
          <section className="rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-700 mb-1">Danger Zone</h2>
            <p className="text-sm text-gray-500">
              To make changes to your account, delete your church profile, or transfer ownership, please{" "}
              <a href="mailto:support@shepherdwell.com" className="text-green-800 underline hover:text-green-700">
                contact support
              </a>
              .
            </p>
          </section>

          {/* Save */}
          <div className="pb-8">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-8 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60 transition-opacity"
              style={{ backgroundColor: "#1A4A2E" }}
            >
              {saving ? "Saving…" : "Save Settings"}
            </button>
          </div>

        </div>
      </div>
    </AppShell>
  );
}
