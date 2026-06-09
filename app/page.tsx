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
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#08060D" }}>
      <div className="w-full max-w-md px-6">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-3">
            <img src="/shepherd-kids-logo.png" alt="ShepherdKids" style={{ width: "190px", height: "auto" }} />
          </div>
          <p style={{ color: "#D4AF37", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "5px" }}>
            More Than a Check-In Platform.
          </p>
          <p style={{ color: "#A9A9B8", fontSize: "13px" }}>
            Welcome Every Family. Know Every Child. Shepherd Every Journey.
          </p>
        </div>

        <div className="rounded-2xl px-8 py-8" style={{ border: "1px solid rgba(212, 175, 55, 0.15)" }}>

        {/* Password sign-in (primary) */}
        {mode === "password" && (
          <form onSubmit={handlePassword} className="space-y-5">
            <div>
              <label htmlFor="email-pw" className="block text-sm font-medium mb-1" style={{ color: "#D8D8E8" }}>
                Email address
              </label>
              <input
                id="email-pw"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="pastor@mychurch.org"
                className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent input-dark"
                style={{ background: "#0E0C18", border: "1px solid rgba(212, 175, 55, 0.2)", color: "#FFFFFF", "--tw-ring-color": "#D4AF37" } as React.CSSProperties}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="block text-sm font-medium" style={{ color: "#D8D8E8" }}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => switchMode("reset")}
                  className="text-xs font-medium"
                  style={{ color: "#D4AF37" }}
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
                className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent input-dark"
                style={{ background: "#0E0C18", border: "1px solid rgba(212, 175, 55, 0.2)", color: "#FFFFFF", "--tw-ring-color": "#D4AF37" } as React.CSSProperties}
              />
            </div>

            {status === "error" && (
              <p className="text-red-600 text-sm">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full py-3 px-6 rounded-lg font-semibold text-white transition-opacity disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #7B2CBF, #9D4EDD)" }}
            >
              {status === "loading" ? "Signing in…" : "Sign In"}
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => switchMode("magic")}
                className="text-sm underline underline-offset-2" style={{ color: "#A9A9B8" }}
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
              <h2 className="text-xl font-semibold mb-2" style={{ color: "#FFFFFF" }}>Check your email</h2>
              <p className="mb-6" style={{ color: "#A9A9B8" }}>
                We sent a login link to <strong style={{ color: "#D8D8E8" }}>{email}</strong>. Click it to sign in.
              </p>
              <button
                type="button"
                onClick={() => switchMode("password")}
                className="text-sm underline underline-offset-2" style={{ color: "#A9A9B8" }}
              >
                ← Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={handleMagicLink} className="space-y-5">
              <div>
                <label htmlFor="email-magic" className="block text-sm font-medium mb-1" style={{ color: "#D8D8E8" }}>
                  Email address
                </label>
                <input
                  id="email-magic"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="pastor@mychurch.org"
                  className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent input-dark"
                  style={{ background: "#0E0C18", border: "1px solid rgba(212, 175, 55, 0.2)", color: "#FFFFFF", "--tw-ring-color": "#D4AF37" } as React.CSSProperties}
                />
              </div>

              {status === "error" && (
                <p className="text-red-600 text-sm">{errorMsg}</p>
              )}

              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full py-3 px-6 rounded-lg font-semibold text-white transition-opacity disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #7B2CBF, #9D4EDD)" }}
              >
                {status === "loading" ? "Sending…" : "Send Login Link"}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => switchMode("password")}
                  className="text-sm underline underline-offset-2" style={{ color: "#A9A9B8" }}
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
              <h2 className="text-xl font-semibold mb-2" style={{ color: "#FFFFFF" }}>Check your email</h2>
              <p className="mb-6" style={{ color: "#A9A9B8" }}>
                We sent a password reset link to <strong style={{ color: "#D8D8E8" }}>{email}</strong>.
              </p>
              <button
                type="button"
                onClick={() => switchMode("password")}
                className="text-sm underline underline-offset-2" style={{ color: "#A9A9B8" }}
              >
                ← Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="mb-1">
                <h2 className="text-lg font-semibold" style={{ color: "#FFFFFF" }}>Set or reset your password</h2>
                <p className="text-sm mt-1" style={{ color: "#A9A9B8" }}>
                  Enter your email and we&apos;ll send you a link to set a new password.
                </p>
              </div>

              <div>
                <label htmlFor="email-reset" className="block text-sm font-medium mb-1" style={{ color: "#D8D8E8" }}>
                  Email address
                </label>
                <input
                  id="email-reset"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="pastor@mychurch.org"
                  className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent input-dark"
                  style={{ background: "#0E0C18", border: "1px solid rgba(212, 175, 55, 0.2)", color: "#FFFFFF", "--tw-ring-color": "#D4AF37" } as React.CSSProperties}
                />
              </div>

              {status === "error" && (
                <p className="text-red-600 text-sm">{errorMsg}</p>
              )}

              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full py-3 px-6 rounded-lg font-semibold text-white transition-opacity disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #7B2CBF, #9D4EDD)" }}
              >
                {status === "loading" ? "Sending…" : "Send Reset Link"}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => switchMode("password")}
                  className="text-sm underline underline-offset-2" style={{ color: "#A9A9B8" }}
                >
                  ← Back to sign in
                </button>
              </div>
            </form>
          )
        )}
        </div>
      </div>
    </div>
  );
}
