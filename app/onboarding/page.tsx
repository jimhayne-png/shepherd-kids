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

const STEPS = ["Ministry Basics", "Location", "Preferences", "Done"];

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
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: "#08060D" }}>
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-2">
            <img src="/shepherd-kids-logo.png" alt="ShepherdKids" style={{ width: "160px", height: "auto" }} />
          </div>
          <p style={{ color: "#A9A9B8", fontSize: "13px", marginTop: "6px" }}>Let&apos;s set up your children&apos;s ministry</p>
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
                      backgroundColor: i <= step ? "#7B2CBF" : "#1E1A2E",
                      color: i <= step ? "#fff" : "#6B6B8A",
                    }}
                  >
                    {i < step ? "✓" : i + 1}
                  </div>
                  <span
                    className="text-xs font-medium hidden sm:block"
                    style={{ color: i <= step ? "#D4AF37" : "#6B6B8A" }}
                  >
                    {label}
                  </span>
                </div>
                {i < 2 && <div className="w-8 h-px mx-1" style={{ background: "rgba(212, 175, 55, 0.2)" }} />}
              </div>
            ))}
          </div>
        )}

        {/* Card */}
        <div className="rounded-2xl p-8" style={{ background: "#120A1F", border: "1px solid rgba(212, 175, 55, 0.35)", boxShadow: "0 25px 60px rgba(0,0,0,0.5)" }}>
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
                  className="px-5 py-2.5 rounded-lg text-sm font-medium transition-colors" style={{ border: "1px solid rgba(212, 175, 55, 0.25)", color: "#A9A9B8", background: "transparent" }}
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
                style={{ background: "linear-gradient(135deg, #7B2CBF, #9D4EDD)" }}
              >
                Continue
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="mt-8 flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="px-5 py-2.5 rounded-lg text-sm font-medium transition-colors" style={{ border: "1px solid rgba(212, 175, 55, 0.25)", color: "#A9A9B8", background: "transparent" }}
              >
                Back
              </button>
              <button
                onClick={handleFinish}
                disabled={submitting}
                className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #7B2CBF, #9D4EDD)" }}
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
      <label className="block text-sm font-medium mb-1" style={{ color: "#D8D8E8" }}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs" style={{ color: "#A9A9B8" }}>{hint}</p>}
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
      className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent input-dark"
      style={{ background: "#1C1230", border: "1px solid rgba(212, 175, 55, 0.2)", color: "#FFFFFF", "--tw-ring-color": "#D4AF37" } as React.CSSProperties}
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
      <h2 className="text-xl font-semibold" style={{ color: "#FFFFFF" }}>Ministry Basics</h2>
      <Field label="Church or Ministry Name" required>
        <Input
          value={form.churchName}
          onChange={(v) => set("churchName", v)}
          placeholder="Grace Kids Ministry"
        />
      </Field>
      <Field label="Email">
        <Input value={form.email} onChange={(v) => set("email", v)} placeholder="kids@yourchurch.org" type="email" />
      </Field>
      <Field label="Phone">
        <Input value={form.phone} onChange={(v) => set("phone", v)} placeholder="(555) 000-0000" type="tel" />
      </Field>
      <Field label="Website">
        <Input value={form.website} onChange={(v) => set("website", v)} placeholder="https://yourchurch.org/kids" />
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
      <h2 className="text-xl font-semibold" style={{ color: "#FFFFFF" }}>Location</h2>
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
            className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent select-dark"
            style={{ background: "#1C1230", border: "1px solid rgba(212, 175, 55, 0.2)", color: "#FFFFFF", "--tw-ring-color": "#D4AF37" } as React.CSSProperties}
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
      <h2 className="text-xl font-semibold" style={{ color: "#FFFFFF" }}>Preferences</h2>

      <div className="flex items-start justify-between gap-4 p-4 rounded-xl" style={{ background: "#0D0820", border: "1px solid rgba(212, 175, 55, 0.15)" }}>
        <div>
          <p className="text-sm font-medium" style={{ color: "#D8D8E8" }}>QR Check-in</p>
          <p className="text-xs mt-0.5 max-w-xs" style={{ color: "#A9A9B8" }}>
            QR check-in lets members scan in at services. You can enable this later from Settings.
          </p>
        </div>
        <button
          type="button"
          onClick={() => set("qrCheckin", !form.qrCheckin)}
          className="relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200"
          style={{ backgroundColor: form.qrCheckin ? "#7B2CBF" : "#2A2A3A" }}
          aria-pressed={form.qrCheckin}
        >
          <span
            className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
            style={{ transform: form.qrCheckin ? "translateX(20px)" : "translateX(0)" }}
          />
        </button>
      </div>

      {error && (
        <p className="text-sm rounded-lg px-4 py-3" style={{ color: "#F87171", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
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
        style={{ backgroundColor: "#D4AF37" }}
      >
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <path d="M7 16 L13 22 L25 10" stroke="#120A1F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: "#FFFFFF" }}>Your ministry is set up!</h2>
        <p style={{ color: "#A9A9B8", fontSize: "14px" }}>
          You&apos;re ready to start welcoming families in ShepherdKids.
        </p>
      </div>
      <button
        onClick={() => router.push("/dashboard")}
        className="px-8 py-3 rounded-lg font-semibold text-white transition-opacity hover:opacity-90"
        style={{ background: "linear-gradient(135deg, #7B2CBF, #9D4EDD)" }}
      >
        Go to Dashboard
      </button>
    </div>
  );
}
