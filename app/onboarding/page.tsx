"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
];

type FormData = {
  churchName: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  qrCheckin: boolean;
};

const STEPS = ["Church Basics", "Location", "Preferences", "Done"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormData>({
    churchName: "",
    email: "",
    phone: "",
    website: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    qrCheckin: false,
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.replace("/");
    });
  }, [router]);

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleFinish() {
    setSubmitting(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/onboarding/create-church", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create church");
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <svg width="28" height="28" viewBox="0 0 36 36" fill="none" aria-hidden="true">
              <rect width="36" height="36" rx="8" fill="#1A4A2E" />
              <path d="M18 8 L18 28 M12 14 Q18 8 24 14" stroke="#F28C28" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
            <span className="text-2xl font-bold" style={{ color: "#1A4A2E" }}>
              Shepherd<span style={{ color: "#F28C28" }}>Well</span>
            </span>
          </div>
          <p className="text-gray-500 text-sm">Let's set up your church</p>
        </div>

        {/* Step indicator */}
        {step < 3 && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {STEPS.slice(0, 3).map((label, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
                    style={{
                      backgroundColor: i <= step ? "#1A4A2E" : "#e5e7eb",
                      color: i <= step ? "#fff" : "#6b7280",
                    }}
                  >
                    {i < step ? "✓" : i + 1}
                  </div>
                  <span
                    className="text-xs font-medium hidden sm:block"
                    style={{ color: i <= step ? "#1A4A2E" : "#9ca3af" }}
                  >
                    {label}
                  </span>
                </div>
                {i < 2 && <div className="w-8 h-px bg-gray-300 mx-1" />}
              </div>
            ))}
          </div>
        )}

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {step === 0 && (
            <StepBasics form={form} set={set} />
          )}
          {step === 1 && <StepLocation form={form} set={set} />}
          {step === 2 && <StepPreferences form={form} set={set} error={error} />}
          {step === 3 && <StepDone />}

          {step < 2 && (
            <div className="mt-8 flex justify-between">
              {step > 0 ? (
                <button
                  onClick={() => setStep((s) => s - 1)}
                  className="px-5 py-2.5 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
              ) : (
                <div />
              )}
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={step === 0 && !form.churchName.trim()}
                className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-40"
                style={{ backgroundColor: "#1A4A2E" }}
              >
                Continue
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="mt-8 flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="px-5 py-2.5 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleFinish}
                disabled={submitting}
                className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                style={{ backgroundColor: "#1A4A2E" }}
              >
                {submitting ? "Setting up…" : "Finish Setup"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
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

function StepBasics({
  form,
  set,
}: {
  form: FormData;
  set: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
}) {
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold text-gray-900">Church Basics</h2>
      <Field label="Church Name" required>
        <Input
          value={form.churchName}
          onChange={(v) => set("churchName", v)}
          placeholder="Grace Community Church"
        />
      </Field>
      <Field label="Email">
        <Input value={form.email} onChange={(v) => set("email", v)} placeholder="info@mychurch.org" type="email" />
      </Field>
      <Field label="Phone">
        <Input value={form.phone} onChange={(v) => set("phone", v)} placeholder="(555) 000-0000" type="tel" />
      </Field>
      <Field label="Website">
        <Input value={form.website} onChange={(v) => set("website", v)} placeholder="https://mychurch.org" />
      </Field>
    </div>
  );
}

function StepLocation({
  form,
  set,
}: {
  form: FormData;
  set: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
}) {
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold text-gray-900">Location</h2>
      <Field label="Address">
        <Input value={form.address} onChange={(v) => set("address", v)} placeholder="123 Main Street" />
      </Field>
      <Field label="City">
        <Input value={form.city} onChange={(v) => set("city", v)} placeholder="Springfield" />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="State">
          <select
            value={form.state}
            onChange={(e) => set("state", e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-800 bg-white"
          >
            <option value="">Select…</option>
            {US_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Zip">
          <Input value={form.zip} onChange={(v) => set("zip", v)} placeholder="62701" />
        </Field>
      </div>
    </div>
  );
}

function StepPreferences({
  form,
  set,
  error,
}: {
  form: FormData;
  set: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
  error: string;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Preferences</h2>

      <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-gray-200 bg-gray-50">
        <div>
          <p className="text-sm font-medium text-gray-800">QR Check-in</p>
          <p className="text-xs text-gray-500 mt-0.5 max-w-xs">
            QR check-in lets members scan in at services. You can enable this later from Settings.
          </p>
        </div>
        <button
          type="button"
          onClick={() => set("qrCheckin", !form.qrCheckin)}
          className="relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200"
          style={{ backgroundColor: form.qrCheckin ? "#1A4A2E" : "#d1d5db" }}
          aria-pressed={form.qrCheckin}
        >
          <span
            className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
            style={{ transform: form.qrCheckin ? "translateX(20px)" : "translateX(0)" }}
          />
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </p>
      )}
    </div>
  );
}

function StepDone() {
  const router = useRouter();
  return (
    <div className="text-center py-6 space-y-5">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
        style={{ backgroundColor: "#F28C28" }}
      >
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <path d="M7 16 L13 22 L25 10" stroke="#1A4A2E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Your church is set up!</h2>
        <p className="text-gray-500 text-sm">
          You&apos;re ready to start managing your congregation in ShepherdWell.
        </p>
      </div>
      <button
        onClick={() => router.push("/dashboard")}
        className="px-8 py-3 rounded-lg font-semibold text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: "#1A4A2E" }}
      >
        Go to Dashboard
      </button>
    </div>
  );
}
