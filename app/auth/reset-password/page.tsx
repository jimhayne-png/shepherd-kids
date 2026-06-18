"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Status = "checking" | "idle" | "loading" | "done" | "error" | "no-session";

export default function ResetPasswordPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [status,   setStatus]   = useState<Status>("checking");
  const [errorMsg, setErrorMsg] = useState("");

  // Guard: verify an active session exists before letting the user type anything.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setStatus(session ? "idle" : "no-session");
    });
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    if (password !== confirm) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      return;
    }

    setStatus("loading");

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErrorMsg(error.message);
      setStatus("error");
      return;
    }

    setStatus("done");
    setTimeout(() => router.push("/dashboard"), 1500);
  }

  if (status === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-400">Verifying session…</p>
      </div>
    );
  }

  if (status === "no-session") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-md px-8 py-12 bg-white rounded-2xl shadow-lg text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-xl font-semibold text-gray-800 mb-2">Link expired or invalid</h1>
          <p className="text-sm text-gray-500 mb-6">
            This password reset link has expired or already been used. Please request a new one.
          </p>
          <button
            onClick={() => router.push("/")}
            className="text-sm font-medium underline underline-offset-2"
            style={{ color: "#1A4A2E" }}
          >
            ← Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md px-8 py-12 bg-white rounded-2xl shadow-lg">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <img src="/shepherd-kids-logo.png" alt="ShepherdKids" style={{ width: "160px", height: "auto" }} />
          </div>
          <h1 className="text-xl font-semibold text-gray-800">Set your password</h1>
          <p className="text-sm text-gray-500 mt-1">Choose a new password for your account.</p>
        </div>

        {status === "done" ? (
          <div className="text-center py-6">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Password updated</h2>
            <p className="text-gray-500 text-sm">Taking you to your dashboard…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
                New password
              </label>
              <input
                id="new-password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ "--tw-ring-color": "#1A4A2E" } as React.CSSProperties}
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat your new password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ "--tw-ring-color": "#1A4A2E" } as React.CSSProperties}
              />
            </div>

            {(status === "error" || errorMsg) && (
              <p className="text-red-600 text-sm">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full py-3 px-6 rounded-lg font-semibold text-white transition-opacity disabled:opacity-60"
              style={{ backgroundColor: "#1A4A2E" }}
            >
              {status === "loading" ? "Saving…" : "Set Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
