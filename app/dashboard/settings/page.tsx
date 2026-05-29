"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AppShell, { type NavItem } from "@/components/layout/AppShell";
import { MINISTRY_NAV_ITEMS } from "@/lib/ministry-config";

const supabase = createClient();

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
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  website: string;
  logo_url: string;
  timezone: string;
  senior_pastor: string;
  children_pastor: string;
  youth_pastor: string;
  choir_director: string;
  mens_ministry_leader: string;
  womens_ministry_leader: string;
  young_adult_leader: string;
  senior_ministry_leader: string;
};

type YouthFormState = {
  middle_school_pastor: string;
  senior_high_pastor: string;
  same_pastor: boolean;
  include_6th_grade: boolean;
  permission_renewal_months: number;
};

const EMPTY_YOUTH_FORM: YouthFormState = {
  middle_school_pastor: "",
  senior_high_pastor: "",
  same_pastor: false,
  include_6th_grade: true,
  permission_renewal_months: 12,
};

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  website: "",
  logo_url: "",
  timezone: "America/Los_Angeles",
  senior_pastor: "",
  children_pastor: "",
  youth_pastor: "",
  choir_director: "",
  mens_ministry_leader: "",
  womens_ministry_leader: "",
  young_adult_leader: "",
  senior_ministry_leader: "",
};

function Field({
  label,
  name,
  value,
  onChange,
  fullWidth = false,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  fullWidth?: boolean;
}) {
  return (
    <div className={fullWidth ? "col-span-2" : ""}>
      <label
        htmlFor={name}
        className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5"
      >
        {label}
      </label>

      <input
        id={name}
        name={name}
        type="text"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-800 bg-white"
      />
    </div>
  );
}

function isValidUrl(url: string) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export default function SettingsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const [youthForm, setYouthForm] =
    useState<YouthFormState>(EMPTY_YOUTH_FORM);

  const [billing, setBilling] = useState<{
    subscription_status?: string;
    subscription_tier?: string;
    trial_ends_at?: string;
  }>({});

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  function set(key: keyof FormState) {
    return (v: string) =>
      setForm((f) => ({
        ...f,
        [key]: v,
      }));
  }

  useEffect(() => {
    async function init() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!user || error) {
        console.log(
          "Dashboard client user unavailable:",
          error?.message ?? null
        );
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      const t = session.access_token;

      const [churchRes, youthRes] = await Promise.all([
        fetch("/api/settings", {
          headers: {
            Authorization: `Bearer ${t}`,
          },
        }),

        fetch("/api/youth-ministry/settings", {
          headers: {
            Authorization: `Bearer ${t}`,
          },
        }),
      ]);

      if (churchRes.ok) {
        const { church } = await churchRes.json();

        setForm({
          name: church.name ?? "",
          email: church.email ?? "",
          phone: church.phone ?? "",
          address: church.address ?? "",
          city: church.city ?? "",
          state: church.state ?? "",
          zip: church.zip ?? "",
          website: church.website ?? "",
          logo_url: church.logo_url ?? "",
          timezone: church.timezone ?? "America/Los_Angeles",
          senior_pastor: church.senior_pastor ?? "",
          children_pastor: church.children_pastor ?? "",
          youth_pastor: church.youth_pastor ?? "",
          choir_director: church.choir_director ?? "",
          mens_ministry_leader:
            church.mens_ministry_leader ?? "",
          womens_ministry_leader:
            church.womens_ministry_leader ?? "",
          young_adult_leader:
            church.young_adult_leader ?? "",
          senior_ministry_leader:
            church.senior_ministry_leader ?? "",
        });

        setBilling({
          subscription_status:
            church.subscription_status ?? "",
          subscription_tier:
            church.subscription_tier ?? "",
          trial_ends_at:
            church.trial_ends_at ?? "",
        });
      }      if (youthRes.ok) {
        const { settings } = await youthRes.json();

        if (settings && Object.keys(settings).length > 0) {
          setYouthForm({
            middle_school_pastor:
              settings.middle_school_pastor ?? "",
            senior_high_pastor:
              settings.senior_high_pastor ?? "",
            same_pastor:
              settings.same_pastor ?? false,
            include_6th_grade:
              settings.include_6th_grade ?? true,
            permission_renewal_months:
              settings.permission_renewal_months ?? 12,
          });
        }
      }

      setLoading(false);
    }

    init();
  }, [router]);

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const freshToken = session?.access_token;

      if (!freshToken) {
        setSaving(false);
        setError("Unauthorized. Please refresh the page and sign in again.");
        return;
      }

      const [res, youthRes] = await Promise.all([
        fetch("/api/settings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${freshToken}`,
          },
          body: JSON.stringify(form),
        }),

        fetch("/api/youth-ministry/settings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${freshToken}`,
          },
          body: JSON.stringify(youthForm),
        }),
      ]);

      const data = await res.json().catch(() => ({}));
      const youthData = await youthRes.json().catch(() => ({}));

      console.log("Main settings response:", data);
      console.log("Youth settings response:", youthData);

      setSaving(false);

      if (res.ok && youthRes.ok) {
        setSuccess("Settings saved successfully.");

        setTimeout(() => {
          setSuccess("");
        }, 4000);
      } else {
        setError(
          data.error ||
            youthData.error ||
            data.message ||
            youthData.message ||
            "Failed to save settings."
        );
      }
    } catch (err) {
      console.error("Unexpected save error:", err);

      setSaving(false);
      setError("Unexpected error saving settings.");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400">Loading…</div>
      </div>
    );
  }

  const showLogoPreview =
    form.logo_url.trim() !== "" && isValidUrl(form.logo_url);

  return (
    <AppShell navItems={navItems}>
      <div
        className="px-8 py-8"
        style={{
          background:
            "linear-gradient(135deg, #1A4A2E 0%, #2D6B42 100%)",
        }}
      >
        <Link
          href="/dashboard"
          className="text-green-300 hover:text-white text-sm transition-colors block mb-2"
        >
          ← Dashboard
        </Link>

        <h1
          className="text-3xl font-bold text-white"
          style={{ fontFamily: "Georgia, serif" }}
        >
          Church Settings
        </h1>

        <p className="text-green-200 text-sm mt-1">
          Manage your church profile and ministry leaders
        </p>
      </div>

      <div className="px-8 py-8 bg-gray-50 min-h-screen">
        <div className="max-w-3xl space-y-8">
          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          {success && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              ✅ {success}
            </p>
          )}

          <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-0.5">
              Church Information
            </h2>

            <p className="text-sm text-gray-500 mb-5">
              Basic contact and identity details for your church.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Church Name"
                name="church_name"
                value={form.name}
                onChange={set("name")}
                fullWidth
              />

              <Field
                label="Email"
                name="email"
                value={form.email}
                onChange={set("email")}
              />

              <Field
                label="Phone"
                name="phone"
                value={form.phone}
                onChange={set("phone")}
              />

              <Field
                label="Address"
                name="address"
                value={form.address}
                onChange={set("address")}
                fullWidth
              />

              <Field
                label="City"
                name="city"
                value={form.city}
                onChange={set("city")}
              />

              <Field
                label="State"
                name="state"
                value={form.state}
                onChange={set("state")}
              />

              <Field
                label="Zip"
                name="zip"
                value={form.zip}
                onChange={set("zip")}
              />

              <Field
                label="Website"
                name="website"
                value={form.website}
                onChange={set("website")}
              />

              <Field
                label="Logo URL"
                name="logo_url"
                value={form.logo_url}
                onChange={set("logo_url")}
                fullWidth
              />

              <div className="col-span-2">
                <label
                  htmlFor="timezone"
                  className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5"
                >
                  Timezone
                </label>

                <select
                  id="timezone"
                  name="timezone"
                  value={form.timezone}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      timezone: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-800 bg-white"
                >
                  <option value="America/New_York">
                    Eastern — America/New_York
                  </option>
                  <option value="America/Chicago">
                    Central — America/Chicago
                  </option>
                  <option value="America/Denver">
                    Mountain — America/Denver
                  </option>
                  <option value="America/Los_Angeles">
                    Pacific — America/Los_Angeles
                  </option>
                  <option value="America/Anchorage">
                    Alaska — America/Anchorage
                  </option>
                  <option value="Pacific/Honolulu">
                    Hawaii — Pacific/Honolulu
                  </option>
                </select>
              </div>
            </div>            {showLogoPreview && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                  Logo Preview
                </p>

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.logo_url}
                  alt="Church logo preview"
                  style={{ maxHeight: 80 }}
                  className="rounded object-contain"
                />
              </div>
            )}
          </section>

          <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-0.5">
              Ministry Leaders
            </h2>

            <p className="text-sm text-gray-500 mb-5">
              Names used in letters, emails, and reports across the platform.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Senior Pastor"
                name="senior_pastor"
                value={form.senior_pastor}
                onChange={set("senior_pastor")}
              />

              <Field
                label="Children's Pastor"
                name="children_pastor"
                value={form.children_pastor}
                onChange={set("children_pastor")}
              />

              <Field
                label="Youth Pastor"
                name="youth_pastor"
                value={form.youth_pastor}
                onChange={set("youth_pastor")}
              />

              <Field
                label="Choir Director"
                name="choir_director"
                value={form.choir_director}
                onChange={set("choir_director")}
              />

              <Field
                label="Men's Ministry Leader"
                name="mens_ministry_leader"
                value={form.mens_ministry_leader}
                onChange={set("mens_ministry_leader")}
              />

              <Field
                label="Women's Ministry Leader"
                name="womens_ministry_leader"
                value={form.womens_ministry_leader}
                onChange={set("womens_ministry_leader")}
              />

              <Field
                label="Young Adult Ministry Leader"
                name="young_adult_leader"
                value={form.young_adult_leader}
                onChange={set("young_adult_leader")}
              />

              <Field
                label="Senior Ministry Leader"
                name="senior_ministry_leader"
                value={form.senior_ministry_leader}
                onChange={set("senior_ministry_leader")}
              />

              <div>
                <label
                  htmlFor="middle_school_pastor"
                  className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5"
                >
                  Middle School Pastor
                </label>

                <input
                  id="middle_school_pastor"
                  name="middle_school_pastor"
                  type="text"
                  value={youthForm.middle_school_pastor}
                  onChange={(e) =>
                    setYouthForm((f) => ({
                      ...f,
                      middle_school_pastor: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-800 bg-white"
                />
              </div>

              <div>
                <label
                  htmlFor="senior_high_pastor"
                  className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5"
                >
                  Senior High Pastor
                </label>

                <input
                  id="senior_high_pastor"
                  name="senior_high_pastor"
                  type="text"
                  value={youthForm.senior_high_pastor}
                  onChange={(e) =>
                    setYouthForm((f) => ({
                      ...f,
                      senior_high_pastor: e.target.value,
                    }))
                  }
                  disabled={youthForm.same_pastor}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-800 bg-white disabled:opacity-50 disabled:bg-gray-50"
                />
              </div>
            </div>
          </section>

          <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-0.5">
              Youth Ministry Preferences
            </h2>

            <p className="text-sm text-gray-500 mb-5">
              Grade groupings and permission form settings for Middle School and
              Senior High.
            </p>

            <div className="space-y-3 mb-4">
              <label
                htmlFor="same_pastor"
                className="flex items-center gap-3 cursor-pointer"
              >
                <input
                  id="same_pastor"
                  name="same_pastor"
                  type="checkbox"
                  checked={youthForm.same_pastor}
                  onChange={(e) =>
                    setYouthForm((f) => ({
                      ...f,
                      same_pastor: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 rounded border-gray-300 text-green-800 focus:ring-green-800"
                />

                <span className="text-sm text-gray-700">
                  Same pastor leads both Middle School and Senior High
                </span>
              </label>

              <label
                htmlFor="include_6th_grade"
                className="flex items-center gap-3 cursor-pointer"
              >
                <input
                  id="include_6th_grade"
                  name="include_6th_grade"
                  type="checkbox"
                  checked={youthForm.include_6th_grade}
                  onChange={(e) =>
                    setYouthForm((f) => ({
                      ...f,
                      include_6th_grade: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 rounded border-gray-300 text-green-800 focus:ring-green-800"
                />

                <span className="text-sm text-gray-700">
                  Include 6th grade in Middle School
                </span>
              </label>
            </div>            <div className="max-w-xs">
              <label
                htmlFor="permission_renewal_months"
                className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5"
              >
                Permission Form Renewal (months)
              </label>

              <input
                id="permission_renewal_months"
                name="permission_renewal_months"
                type="number"
                min={1}
                max={60}
                value={youthForm.permission_renewal_months}
                onChange={(e) =>
                  setYouthForm((f) => ({
                    ...f,
                    permission_renewal_months:
                      parseInt(e.target.value) || 12,
                  }))
                }
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-800 bg-white"
              />
            </div>
          </section>

          <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-0.5">
              Billing
            </h2>

            <p className="text-sm text-gray-500 mb-5">
              Your current subscription details.
            </p>

            <div className="grid grid-cols-3 gap-4 mb-5">
              {(() => {
                const planDisplayName: Record<string, string> = {
                  very_small: "Vine",
                  small: "Vine",
                  medium: "Grove",
                  large: "Orchard",
                  enterprise: "Orchard",
                  vine: "Vine",
                  grove: "Grove",
                  orchard: "Orchard",
                };

                return [
                  {
                    label: "Status",
                    value: billing.subscription_status,
                  },
                  {
                    label: "Plan",
                    value: billing.subscription_tier
                      ? planDisplayName[billing.subscription_tier] ??
                        billing.subscription_tier
                      : "",
                  },
                  {
                    label: "Trial Ends",
                    value: billing.trial_ends_at
                      ? new Date(billing.trial_ends_at).toLocaleDateString(
                          "en-US",
                          {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          }
                        )
                      : "",
                  },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-200"
                  >
                    <p className="text-xs text-gray-400 mb-0.5">{label}</p>

                    <p className="text-sm font-semibold text-gray-800 capitalize">
                      {value || (
                        <span className="text-gray-400 font-normal italic">
                          —
                        </span>
                      )}
                    </p>
                  </div>
                ));
              })()}
            </div>

            <Link
              href="/dashboard/billing"
              className="inline-block px-5 py-2.5 rounded-lg text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              💳 Manage Billing
            </Link>
          </section>

          <section className="rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-700 mb-1">
              Danger Zone
            </h2>

            <p className="text-sm text-gray-500">
              To make changes to your account, delete your church profile, or
              transfer ownership, please{" "}
              <a
                href="mailto:support@shepherdwell.com"
                className="text-green-800 underline hover:text-green-700"
              >
                contact support
              </a>
              .
            </p>
          </section>

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