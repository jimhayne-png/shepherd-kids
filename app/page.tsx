"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://shepherd-well.vercel.app";

type Mode = "password" | "magic" | "reset";
type Status = "idle" | "loading" | "sent" | "error";

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function switchMode(next: Mode) {
    setMode(next);
    setStatus("idle");
    setErrorMsg("");
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setErrorMsg(error.message);
      setStatus("error");
      return;
    }

    router.push("/dashboard");
  }

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

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${APP_URL}/auth/callback?next=/auth/reset-password`,
    });

    if (error) {
      setErrorMsg(error.message);
      setStatus("error");
      return;
    }

    setStatus("sent");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md px-8 py-12 bg-white rounded-2xl shadow-lg">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center mb-4">
            <img src="/shepherd-kids-logo.png" alt="ShepherdKids" style={{ width: "200px", height: "auto" }} />
          </div>
          <p className="text-gray-500 text-base mt-2">
            Welcome Every Family. Know Every Child. Shepherd Every Journey.
          </p>
        </div>

        {/* Password sign-in (primary) */}
        {mode === "password" && (
          <form onSubmit={handlePassword} className="space-y-5">
            <div>
              <label htmlFor="email-pw" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                id="email-pw"
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
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => switchMode("reset")}
                  className="text-xs font-medium"
                  style={{ color: "#1A4A2E" }}
                >
                  Forgot password?
                </button>
              </div>
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

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => switchMode("magic")}
                className="text-sm text-gray-500 hover:text-gray-700 underline underline-offset-2"
              >
                Send me a magic link instead
              </button>
            </div>
          </form>
        )}

        {/* Magic link (secondary) */}
        {mode === "magic" && (
          status === "sent" ? (
            <div className="text-center py-6">
              <div className="text-5xl mb-4">✉️</div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Check your email</h2>
              <p className="text-gray-500 mb-6">
                We sent a login link to <strong>{email}</strong>. Click it to sign in.
              </p>
              <button
                type="button"
                onClick={() => switchMode("password")}
                className="text-sm text-gray-500 hover:text-gray-700 underline underline-offset-2"
              >
                ← Back to sign in
              </button>
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

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => switchMode("password")}
                  className="text-sm text-gray-500 hover:text-gray-700 underline underline-offset-2"
                >
                  ← Sign in with password
                </button>
              </div>
            </form>
          )
        )}

        {/* Reset password / set password */}
        {mode === "reset" && (
          status === "sent" ? (
            <div className="text-center py-6">
              <div className="text-5xl mb-4">✉️</div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Check your email</h2>
              <p className="text-gray-500 mb-6">
                We sent a password reset link to <strong>{email}</strong>.
              </p>
              <button
                type="button"
                onClick={() => switchMode("password")}
                className="text-sm text-gray-500 hover:text-gray-700 underline underline-offset-2"
              >
                ← Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="mb-1">
                <h2 className="text-lg font-semibold text-gray-800">Set or reset your password</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Enter your email and we&apos;ll send you a link to set a new password.
                </p>
              </div>

              <div>
                <label htmlFor="email-reset" className="block text-sm font-medium text-gray-700 mb-1">
                  Email address
                </label>
                <input
                  id="email-reset"
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
                {status === "loading" ? "Sending…" : "Send Reset Link"}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => switchMode("password")}
                  className="text-sm text-gray-500 hover:text-gray-700 underline underline-offset-2"
                >
                  ← Back to sign in
                </button>
              </div>
            </form>
          )
        )}
      </div>
    </div>
  );
}
