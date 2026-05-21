"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Mode = "magic" | "password";
type Status = "idle" | "loading" | "sent" | "error";

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleMagicLink(e: React.FormEvent) {
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

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      console.error("signInWithPassword error:", error);
      setErrorMsg(error.message);
      setStatus("error");
      return;
    }

    router.replace("/dashboard");
  }

  function switchMode(next: Mode) {
    setMode(next);
    setStatus("idle");
    setErrorMsg("");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md px-8 py-12 bg-white rounded-2xl shadow-lg">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center mb-4">
            <img src="/shepherdwell-logo.png" alt="ShepherdWell" style={{ width: "200px", height: "auto" }} />
          </div>
          <p className="text-gray-500 text-base mt-2">
            Grow your congregation. Care for every member.
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex rounded-lg border border-gray-200 mb-6 overflow-hidden">
          <button
            type="button"
            onClick={() => switchMode("magic")}
            className="flex-1 py-2 text-sm font-medium transition-colors"
            style={mode === "magic" ? { backgroundColor: "#1A4A2E", color: "#fff" } : { color: "#6b7280" }}
          >
            Magic Link
          </button>
          <button
            type="button"
            onClick={() => switchMode("password")}
            className="flex-1 py-2 text-sm font-medium transition-colors"
            style={mode === "password" ? { backgroundColor: "#1A4A2E", color: "#fff" } : { color: "#6b7280" }}
          >
            Password
          </button>
        </div>

        {mode === "magic" ? (
          status === "sent" ? (
            <div className="text-center py-6">
              <div className="text-5xl mb-4">✉️</div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Check your email</h2>
              <p className="text-gray-500">
                We sent a login link to <strong>{email}</strong>. Click it to sign in.
              </p>
            </div>
          ) : (
            <form onSubmit={handleMagicLink} className="space-y-5">
              <div>
                <label htmlFor="email-magic" className="block text-sm font-medium text-gray-700 mb-1">
                  Email address
                </label>
                <input
                  id="email-magic"
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
          )
        ) : (
          <form onSubmit={handlePassword} className="space-y-5">
            <div>
              <label htmlFor="email-password" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                id="email-password"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="pastor@mychurch.org"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ "--tw-ring-color": "#1A4A2E" } as React.CSSProperties}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
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
              {status === "loading" ? "Signing in…" : "Sign In"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
