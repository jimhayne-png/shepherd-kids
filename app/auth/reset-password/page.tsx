"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type Status = "idle" | "loading" | "done" | "error";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md px-8 py-12 bg-white rounded-2xl shadow-lg">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <img src="/shepherdwell-logo.png" alt="ShepherdWell" style={{ width: "160px", height: "auto" }} />
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
