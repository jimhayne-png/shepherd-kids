"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/layout/AppShell";

const supabase = createClient();
const ACCENT = "#7B2CBF";

const ALL_GRADES = [
  { value: "Nursery",     label: "Nursery" },
  { value: "Toddlers",    label: "Toddlers" },
  { value: "Pre-K",       label: "Pre-K" },
  { value: "Kindergarten",label: "Kindergarten" },
  { value: "1st",         label: "1st Grade" },
  { value: "2nd",         label: "2nd Grade" },
  { value: "3rd",         label: "3rd Grade" },
  { value: "4th",         label: "4th Grade" },
  { value: "5th",         label: "5th Grade" },
  { value: "6th",         label: "6th Grade" },
];

const DEFAULT_GRADES = ["3rd", "4th", "5th", "6th"];

export default function ChildrenMinistrySettingsPage() {
  const router = useRouter();
  const selectedChurchIdRef = useRef<string | null>(null);

  function ch(): Record<string, string> {
    return selectedChurchIdRef.current
      ? { "x-selected-church-id": selectedChurchIdRef.current }
      : {};
  }

  const [loading, setLoading] = useState(true);
  const [sidebarLabel, setSidebarLabel] = useState("ShepherdKids");
  const [gradeLevels, setGradeLevels] = useState<string[]>(DEFAULT_GRADES);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function init() {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (!user || authError) {
        console.log("Dashboard client user unavailable:", authError?.message ?? null);
        return;
      }
      const urlParams = new URLSearchParams(window.location.search);
      selectedChurchIdRef.current =
        urlParams.get("churchId") ?? localStorage.getItem("selected_church_id");

      const res = await fetch("/api/children-ministry/config", {
        credentials: "include",
        headers: ch(),
      });
      if (res.ok) {
        const d = await res.json();
        if (d.config) {
         setSidebarLabel(d.config.sidebar_label ?? "ShepherdKids");
          setGradeLevels(d.config.grade_levels ?? DEFAULT_GRADES);
        }
      }
      setLoading(false);
    }
    init();
  }, [router]);

  function toggleGrade(value: string) {
    setGradeLevels((prev) =>
      prev.includes(value) ? prev.filter((g) => g !== value) : [...prev, value],
    );
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    setError("");
    const res = await fetch("/api/children-ministry/config", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", ...ch() },
      body: JSON.stringify({ sidebarLabel, gradeLevels }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      const d = await res.json().catch(() => ({}));
      setError((d as { error?: string }).error ?? "Failed to save");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#08060D" }}>
        <div style={{ color: "#D8D8E8" }}>Loading…</div>
      </div>
    );
  }

  return (
    <AppShell navItems={[]}>
      {/* Hero */}
      <div
        className="px-8 py-10"
        style={{ background: "linear-gradient(135deg, #08060D 0%, #1C0A30 100%)" }}
      >
        <p className="text-sm mb-1" style={{ color: "#D4AF37" }}>ShepherdKids</p>
        <h1
          className="text-3xl font-bold text-white"
          style={{ fontFamily: "Georgia, serif" }}
        >
          ⚙️ Settings
        </h1>
        <p className="text-sm mt-1" style={{ color: "#D8D8E8" }}>
          Configure your ShepherdKids platform settings
        </p>
      </div>

      <div className="px-8 py-8" style={{ backgroundColor: "#0A0814", minHeight: "100vh" }}>
        <div className="max-w-xl">
          <div style={{ background: "#120A1F", border: "1px solid rgba(212,175,55,0.25)", borderRadius: "18px", padding: "28px" }}>
            <h2
              style={{ fontSize: "17px", fontWeight: 700, color: "#ffffff", marginBottom: "24px", fontFamily: "Georgia, serif" }}
            >
              Ministry Configuration
            </h2>

            {/* Sidebar Label */}
            <div className="mb-7">
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#A9A9B8", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "6px" }}>
                Sidebar Label
              </label>
              <input
                value={sidebarLabel}
                onChange={(e) => setSidebarLabel(e.target.value)}
                placeholder="e.g. Nursery–6th Grade"
                style={{ width: "100%", padding: "9px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: "8px", fontSize: "13px", color: "#ffffff", outline: "none", boxSizing: "border-box" }}
              />
              <p style={{ fontSize: "11px", color: "#A9A9B8", marginTop: "5px" }}>
                This label appears in the ShepherdKids sidebar.
              </p>
            </div>

            {/* Grade Checkboxes */}
            <div className="mb-7">
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#A9A9B8", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "10px" }}>
                Grade Levels Covered
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_GRADES.map((g) => {
                  const checked = gradeLevels.includes(g.value);
                  return (
                    <label
                      key={g.value}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px 12px",
                        borderRadius: "10px",
                        border: checked ? "1px solid rgba(157,78,221,0.6)" : "1px solid rgba(255,255,255,0.1)",
                        background: checked ? "rgba(123,44,191,0.2)" : "rgba(255,255,255,0.03)",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleGrade(g.value)}
                        className="rounded accent-violet-500"
                      />
                      <span style={{ fontSize: "13px", color: checked ? "#ffffff" : "#D8D8E8" }}>{g.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {error && <p style={{ fontSize: "13px", color: "#f87171", marginBottom: "16px" }}>{error}</p>}

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button
                onClick={save}
                disabled={saving}
                style={{ padding: "9px 20px", borderRadius: "10px", fontSize: "13px", fontWeight: 700, color: "#ffffff", background: saving ? "rgba(123,44,191,0.5)" : "linear-gradient(135deg, #7B2CBF, #9D4EDD)", border: "none", cursor: saving ? "not-allowed" : "pointer" }}
              >
                {saving ? "Saving…" : "Save Settings"}
              </button>
              {saved && (
                <span style={{ fontSize: "13px", color: "#4ade80", fontWeight: 600 }}>✓ Saved</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
