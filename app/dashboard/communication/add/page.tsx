"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AppShell, { type NavItem } from "@/components/layout/AppShell";

const supabase = createClient();

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Members", href: "/dashboard/members" },
  { label: "Departments", href: "/dashboard/departments" },
  { label: "Attendance", href: "/dashboard/attendance" },
  { label: "Calendar", href: "/dashboard/calendar" },
  { label: "Prayer", href: "/dashboard/prayer" },
  { label: "Bulletin", href: "/dashboard/bulletin" },
  { label: "Communication Hub", href: "/dashboard/communication" },
  { label: "Visitation", href: "/dashboard/visitation" },
  { label: "Shepherd Pipeline", href: "/dashboard/shepherd" },
  { label: "Reviews", href: "/dashboard/reviews" },
  { label: "Evangelism", href: "/dashboard/evangelism" },
  { label: "Birthdays", href: "/dashboard/birthdays" },
  { label: "Tutorials", href: "/dashboard/tutorials" },
  { label: "Settings", href: "/dashboard/settings" },
];

type Department = { id: string; name: string; icon: string | null };

function AddPostForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type") === "church_wide" ? "church_wide" : "department";

  const [token, setToken] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [postType, setPostType] = useState<"church_wide" | "department">(initialType);
  const [departmentId, setDepartmentId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [scheduled, setScheduled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function init() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!user || error) {
        console.log("Dashboard client user unavailable:", error?.message ?? null);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setToken(session.access_token);
      const res = await fetch("/api/departments", { headers: { Authorization: `Bearer ${session.access_token}` } });
      const d = await res.json();
      setDepartments(d.departments ?? []);
    }
    init();
  }, [router]);

  async function handleSubmit(status: "draft" | "published") {
    if (!token) return;
    if (!title.trim()) { setError("Title is required."); return; }
    if (!body.trim()) { setError("Message body is required."); return; }
    if (postType === "department" && !departmentId) { setError("Please select a department."); return; }

    setSubmitting(true);
    setError("");

    const res = await fetch("/api/communication", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title,
        postBody: body,
        departmentId: postType === "department" ? departmentId : null,
        status: scheduled ? "scheduled" : status,
        scheduledAt: scheduled ? scheduledAt : null,
        notifyEmail,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to save.");
      setSubmitting(false);
      return;
    }

    router.replace("/dashboard/communication");
  }

  return (
    <AppShell navItems={navItems}>
      <div style={{ padding: "32px", maxWidth: "680px" }}>
        <div style={{ marginBottom: "24px" }}>
          <Link href="/dashboard/communication" style={{ fontFamily: "Georgia, serif", fontSize: "14px", color: "#6b7280", textDecoration: "none" }}>
            ← Communication Hub
          </Link>
        </div>

        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "26px", color: "#1A4A2E", margin: "0 0 28px", fontWeight: "normal" }}>
          New Post
        </h1>

        {/* Post type toggle */}
        <div style={{ marginBottom: "24px" }}>
          <p style={{ fontFamily: "Georgia, serif", fontSize: "14px", color: "#374151", marginBottom: "10px", marginTop: 0 }}>Post type</p>
          <div style={{ display: "flex", gap: "0", border: "2px solid #e5e7eb", borderRadius: "10px", overflow: "hidden", width: "fit-content" }}>
            {([
              { value: "church_wide", label: "🏛️ Church-Wide" },
              { value: "department", label: "🏢 Department" },
            ] as const).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPostType(opt.value)}
                style={{
                  padding: "10px 24px",
                  background: postType === opt.value ? "#1A4A2E" : "white",
                  color: postType === opt.value ? "white" : "#374151",
                  border: "none",
                  fontFamily: "Georgia, serif",
                  fontSize: "14px",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Department selector */}
        {postType === "department" && (
          <div style={{ marginBottom: "20px" }}>
            <label style={{ fontFamily: "Georgia, serif", fontSize: "14px", color: "#374151", display: "block", marginBottom: "8px" }}>
              Department *
            </label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              style={{ width: "100%", padding: "12px 16px", borderRadius: "10px", border: "2px solid #e5e7eb", fontFamily: "Georgia, serif", fontSize: "15px", color: "#374151", background: "white", boxSizing: "border-box" }}
            >
              <option value="">Select a department…</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.icon ? `${d.icon} ` : ""}{d.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Title */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ fontFamily: "Georgia, serif", fontSize: "14px", color: "#374151", display: "block", marginBottom: "8px" }}>Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Post title…"
            style={{ width: "100%", padding: "12px 16px", borderRadius: "10px", border: "2px solid #e5e7eb", fontFamily: "Georgia, serif", fontSize: "15px", color: "#1f2937", outline: "none", boxSizing: "border-box" }}
            onFocus={(e) => (e.target.style.borderColor = "#0e7490")}
            onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
          />
        </div>

        {/* Body */}
        <div style={{ marginBottom: "24px" }}>
          <label style={{ fontFamily: "Georgia, serif", fontSize: "14px", color: "#374151", display: "block", marginBottom: "8px" }}>Message *</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message…"
            rows={8}
            style={{ width: "100%", padding: "14px 16px", borderRadius: "10px", border: "2px solid #e5e7eb", fontFamily: "Georgia, serif", fontSize: "15px", color: "#1f2937", resize: "vertical", outline: "none", lineHeight: "1.6", boxSizing: "border-box" }}
            onFocus={(e) => (e.target.style.borderColor = "#0e7490")}
            onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
          />
        </div>

        {/* Options */}
        <div style={{ background: "#f9fafb", borderRadius: "12px", padding: "20px", marginBottom: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Schedule toggle */}
          <div>
            <button
              type="button"
              onClick={() => setScheduled((s) => !s)}
              style={{ display: "flex", alignItems: "center", gap: "10px", background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              <div style={{ width: "40px", height: "22px", borderRadius: "11px", background: scheduled ? "#0e7490" : "#d1d5db", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: "white", position: "absolute", top: "2px", left: scheduled ? "20px" : "2px", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
              </div>
              <span style={{ fontFamily: "Georgia, serif", fontSize: "14px", color: "#374151" }}>Schedule for later</span>
            </button>
            {scheduled && (
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                style={{ marginTop: "10px", padding: "10px 14px", borderRadius: "8px", border: "2px solid #e5e7eb", fontFamily: "Georgia, serif", fontSize: "14px", outline: "none" }}
              />
            )}
          </div>

          {/* Notify via email toggle */}
          <button
            type="button"
            onClick={() => setNotifyEmail((n) => !n)}
            style={{ display: "flex", alignItems: "center", gap: "10px", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            <div style={{ width: "40px", height: "22px", borderRadius: "11px", background: notifyEmail ? "#0e7490" : "#d1d5db", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
              <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: "white", position: "absolute", top: "2px", left: notifyEmail ? "20px" : "2px", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
            </div>
            <span style={{ fontFamily: "Georgia, serif", fontSize: "14px", color: "#374151" }}>
              Notify via email {notifyEmail ? "(on)" : "(off)"}
            </span>
          </button>
        </div>

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px" }}>
            <p style={{ color: "#dc2626", fontFamily: "Georgia, serif", fontSize: "14px", margin: 0 }}>{error}</p>
          </div>
        )}

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={() => handleSubmit("draft")}
            disabled={submitting}
            style={{ flex: 1, padding: "14px", background: "white", color: "#374151", border: "2px solid #d1d5db", borderRadius: "10px", fontFamily: "Georgia, serif", fontSize: "15px", cursor: submitting ? "not-allowed" : "pointer" }}
          >
            Save as Draft
          </button>
          <button
            onClick={() => handleSubmit("published")}
            disabled={submitting}
            style={{ flex: 2, padding: "14px", background: submitting ? "#4b7a5e" : "#1A4A2E", color: "white", border: "none", borderRadius: "10px", fontFamily: "Georgia, serif", fontSize: "15px", fontWeight: "bold", cursor: submitting ? "not-allowed" : "pointer" }}
          >
            {submitting ? "Publishing…" : scheduled ? "Schedule Post" : "Publish Now"}
          </button>
        </div>
      </div>
    </AppShell>
  );
}

export default function AddPostPage() {
  return (
    <Suspense fallback={
      <AppShell navItems={navItems}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
          <p style={{ fontFamily: "Georgia, serif", color: "#9ca3af" }}>Loading…</p>
        </div>
      </AppShell>
    }>
      <AddPostForm />
    </Suspense>
  );
}
