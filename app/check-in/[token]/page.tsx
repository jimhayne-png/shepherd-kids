"use client";

import { use, useEffect, useState } from "react";

type EventInfo = {
  name: string;
  event_date: string;
  church_name: string;
};

export default function PublicCheckInPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [error, setError] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch(`/api/check-in/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) { setError(data.error ?? "Unable to load check-in."); }
        else { setEvent(data); }
        setLoading(false);
      })
      .catch(() => { setError("Unable to connect. Please try again."); setLoading(false); });
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) { setSubmitError("Please enter your first and last name."); return; }
    setSubmitting(true);
    setSubmitError("");
    const res = await fetch(`/api/check-in/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim() || undefined }),
    });
    if (!res.ok) {
      const data = await res.json();
      setSubmitError(data.error ?? "Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }
    setSuccess(true);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#f0faf4" }}>
        <p className="text-gray-400" style={{ fontFamily: "Georgia, serif" }}>Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "#f0faf4" }}>
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2" style={{ fontFamily: "Georgia, serif" }}>Check-In Unavailable</h1>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "#f0faf4" }}>
        <div className="text-center max-w-sm">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto mb-6"
            style={{ backgroundColor: "#1A4A2E" }}
          >
            ✓
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: "Georgia, serif" }}>
            You&rsquo;re checked in!
          </h1>
          <p className="text-gray-500 text-sm mb-1">{event?.name}</p>
          <p className="text-gray-400 text-sm">{event?.church_name}</p>
          <p className="text-green-700 font-semibold mt-6 text-sm">Welcome, {firstName}! 🙏</p>
        </div>
      </div>
    );
  }

  const eventDateDisplay = event
    ? new Date(event.event_date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
    : "";

  return (
    <div className="min-h-screen px-6 py-12" style={{ background: "#f0faf4" }}>
      <div className="max-w-sm mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4"
            style={{ backgroundColor: "#1A4A2E" }}
          >
            📋
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-1" style={{ fontFamily: "Georgia, serif" }}>
            {event?.name}
          </h1>
          <p className="text-gray-400 text-sm">{eventDateDisplay}</p>
          <p className="text-gray-500 text-sm mt-0.5">{event?.church_name}</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <p className="text-sm font-medium text-gray-700 mb-5 text-center">Sign in to check in</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">First name *</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jane"
                  autoComplete="given-name"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-700"
                  style={{ fontFamily: "Georgia, serif" }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Last name *</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  autoComplete="family-name"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-700"
                  style={{ fontFamily: "Georgia, serif" }}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Email (optional)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
                autoComplete="email"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-700"
              />
            </div>

            {submitError && (
              <p className="text-sm text-red-600">{submitError}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 rounded-xl font-bold text-white text-base hover:opacity-90 transition-opacity"
              style={{
                backgroundColor: submitting ? "#4b7a5e" : "#1A4A2E",
                fontFamily: "Georgia, serif",
              }}
            >
              {submitting ? "Checking in…" : "Check In →"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">Powered by ShepherdKids</p>
      </div>
    </div>
  );
}
