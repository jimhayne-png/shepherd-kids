"use client";

import { use, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const HEARD_FROM_OPTIONS = [
  "Sunday Service",
  "Friend or Family",
  "Social Media",
  "Website",
  "Other",
];

type Church = { id: string; name: string; slug: string };

type FormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthMonth: string;
  birthDay: string;
  birthYear: string;
  heardFrom: string;
};

function Select({
  value,
  onChange,
  children,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-4 border border-gray-200 rounded-xl text-base text-gray-900 focus:outline-none focus:ring-2 bg-white appearance-none"
      style={{ "--tw-ring-color": "#1A4A2E" } as React.CSSProperties}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {children}
    </select>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: React.InputHTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <input
      type={type}
      inputMode={inputMode}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-4 border border-gray-200 rounded-xl text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2"
      style={{ "--tw-ring-color": "#1A4A2E" } as React.CSSProperties}
    />
  );
}

export default function JoinPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  const [church, setChurch] = useState<Church | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    birthMonth: "",
    birthDay: "",
    birthYear: "",
    heardFrom: "",
  });

  function set<K extends keyof FormData>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  useEffect(() => {
    supabase
      .from("churches")
      .select("id, name, slug")
      .eq("slug", slug)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) setNotFound(true);
        else setChurch(data);
        setLoading(false);
      });
  }, [slug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("First and last name are required.");
      return;
    }
    if (!form.email.trim()) {
      setError("Email is required.");
      return;
    }
    if (!form.birthMonth || !form.birthDay) {
      setError("Please select your birth month and day.");
      return;
    }

    setSubmitting(true);
    setError("");

    const res = await fetch("/api/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, ...form }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }

    setSuccess(true);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 rounded-full border-2 border-gray-200 border-t-green-700 animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">🔗</div>
          <h1 className="text-xl font-semibold text-gray-800 mb-2">
            This link is no longer active
          </h1>
          <p className="text-gray-500 text-sm">
            The church registration link you followed could not be found. Please contact your church for a current link.
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
        <div className="text-center max-w-sm">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl"
            style={{ backgroundColor: "#F28C28" }}
          >
            🙌
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Welcome to {church?.name}!
          </h1>
          <p className="text-gray-500 text-base leading-relaxed">
            We&apos;re so glad you&apos;re here. Your information has been received and someone from our team will be in touch soon.
          </p>
          <div className="mt-8 flex items-center justify-center gap-2">
            <svg width="20" height="20" viewBox="0 0 36 36" fill="none" aria-hidden="true">
              <rect width="36" height="36" rx="8" fill="#1A4A2E" />
              <path d="M18 8 L18 28 M12 14 Q18 8 24 14" stroke="#F28C28" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
            <span className="text-sm font-semibold" style={{ color: "#1A4A2E" }}>
              Shepherd<span style={{ color: "#F28C28" }}>Well</span>
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div
        className="px-6 pt-12 pb-8 text-center"
        style={{ background: "linear-gradient(135deg, #1A4A2E 0%, #2D6B42 100%)" }}
      >
        <div className="flex items-center justify-center gap-2 mb-4">
          <svg width="32" height="32" viewBox="0 0 36 36" fill="none" aria-hidden="true">
            <rect width="36" height="36" rx="8" fill="#F28C28" />
            <path d="M18 8 L18 28 M12 14 Q18 8 24 14" stroke="#1A4A2E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
          <span className="text-xl font-bold text-white">
            Shepherd<span style={{ color: "#F28C28" }}>Well</span>
          </span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-1">{church?.name}</h1>
        <p className="text-green-200 text-sm">We&apos;d love to get to know you</p>
      </div>

      {/* Form */}
      <div className="px-5 py-8 max-w-lg mx-auto">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                First Name <span className="text-red-500">*</span>
              </label>
              <Input value={form.firstName} onChange={(v) => set("firstName", v)} placeholder="Jane" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Last Name <span className="text-red-500">*</span>
              </label>
              <Input value={form.lastName} onChange={(v) => set("lastName", v)} placeholder="Smith" />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Email <span className="text-red-500">*</span>
            </label>
            <Input value={form.email} onChange={(v) => set("email", v)} type="email" placeholder="jane@email.com" inputMode="email" />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
            <Input value={form.phone} onChange={(v) => set("phone", v)} type="tel" placeholder="(555) 000-0000" inputMode="tel" />
          </div>

          {/* Birthday */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Birthday <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Select value={form.birthMonth} onChange={(v) => set("birthMonth", v)} placeholder="Month">
                {MONTHS.map((m, i) => (
                  <option key={m} value={String(i + 1)}>{m}</option>
                ))}
              </Select>
              <Select value={form.birthDay} onChange={(v) => set("birthDay", v)} placeholder="Day">
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={String(d)}>{d}</option>
                ))}
              </Select>
            </div>
          </div>

          {/* Birth Year */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Birth Year</label>
            <p className="text-xs text-gray-400 mb-1.5">Optional — used for milestone birthday celebrations</p>
            <Input
              value={form.birthYear}
              onChange={(v) => set("birthYear", v)}
              placeholder="1985"
              inputMode="numeric"
            />
          </div>

          {/* Heard From */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              How did you hear about us?
            </label>
            <Select value={form.heardFrom} onChange={(v) => set("heardFrom", v)} placeholder="Select one…">
              {HEARD_FROM_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </Select>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 rounded-xl font-bold text-base transition-opacity disabled:opacity-60 mt-2"
            style={{ backgroundColor: "#1A4A2E", color: "#fff" }}
          >
            {submitting ? "Submitting…" : `Join ${church?.name ?? "Us"}`}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Powered by ShepherdWell
        </p>
      </div>
    </div>
  );
}
