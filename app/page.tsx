"use client";

import { useState } from "react";

export default function Home() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Something went wrong");
      }

      setStatus("sent");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md px-8 py-12 bg-white rounded-2xl shadow-lg">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-4">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
              <rect width="36" height="36" rx="8" fill="#1A4A2E" />
              <path d="M18 8 L18 28 M12 14 Q18 8 24 14" stroke="#f0c040" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
            <span className="text-3xl font-bold" style={{ color: "#1A4A2E" }}>
              Shepherd<span style={{ color: "#f0c040" }}>Well</span>
            </span>
          </div>
          <p className="text-gray-500 text-base mt-2">
            Grow your congregation. Care for every member.
          </p>
        </div>

        {status === "sent" ? (
          <div className="text-center py-6">
            <div className="text-5xl mb-4">✉️</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Check your email</h2>
            <p className="text-gray-500">
              We sent a login link to <strong>{email}</strong>. Click it to sign in.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="pastor@mychurch.org"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ "--tw-ring-color": "#1A4A2E" } as React.CSSProperties}
              />
            </div>

            {status === "error" && (
              <p className="text-red-600 text-sm">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full py-3 px-6 rounded-lg font-semibold text-white transition-opacity disabled:opacity-60"
              style={{ backgroundColor: "#1A4A2E" }}
            >
              {status === "loading" ? "Sending…" : "Send Login Link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
